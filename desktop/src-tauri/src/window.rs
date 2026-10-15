//! Pet penceresi: konumlandırma, çalışma alanı, tıklama geçirme (cursor-ignore) geçişi, imleç yakınlığı.
//!
//! Pencere küçük ve şeffaf. İmleç pet'in dolu alanı (hit rect) dışındayken pencere
//! `set_ignore_cursor_events(true)` ile tıklamayı arkaya geçirir, üstündeyken alır.
//! Klavye hiç dinlenmez; sadece imleç konumu ~30 Hz okunur ve TS'e yalnızca
//! "üstünde / yakında / hangi yönde" bilgisi gider, ham konum gitmez.
//!
//! Konum birimi (TS <-> Rust): birincil ekranın çalışma alanı başlangıcına göre mantıksal piksel.

use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};

use crate::monitors::{choose_active, drag_switch, logical_in, MonitorArea};

pub const MAIN_LABEL: &str = "main";
/// dunno.exe ana penceresi (tray, Başlat menüsü kısayolu); kapatınca gizlenir, pet çalışmaya devam eder.
pub const APP_LABEL: &str = "app";

/// dunno.exe penceresini gösterir ve öne getirir.
pub fn open_app_window(app: &AppHandle) -> tauri::Result<()> {
    // FB6 performans: dunno.exe penceresi ilk açılışta oluşturulur (tauri.conf "create": false); Windows ile başlatılınca
    // hiç açılmazsa ikinci WebView hiç yüklenmez (~30-50 MB). Kapatınca gizlenir, sonraki açılışlar anında.
    let win = match app.get_webview_window(APP_LABEL) {
        Some(w) => w,
        None => {
            let Some(cfg) = app.config().app.windows.iter().find(|w| w.label == APP_LABEL).cloned() else {
                return Ok(());
            };
            tauri::WebviewWindowBuilder::from_config(app, &cfg)?.build()?;
            crate::app_window::restore(app);
            match app.get_webview_window(APP_LABEL) {
                Some(w) => w,
                None => return Ok(()),
            }
        }
    };
    win.unminimize()?;
    win.show()?;
    win.set_focus()
}

/// Açılış argümanı: Windows ile başlatılınca (autostart) pencere açılmaz, sadece pet.
pub const AUTOSTART_ARG: &str = "--autostart";

pub fn launched_by_autostart(args: impl IntoIterator<Item = String>) -> bool {
    args.into_iter().any(|a| a == AUTOSTART_ARG)
}
pub const EVENT_CURSOR: &str = "cursor://state";
pub const EVENT_WORK_AREA: &str = "workarea://changed";
/// FB10-3: kullanıcı klavyede yazıyor mu (true/false, sadece değişince).
pub const EVENT_TYPING: &str = "pet://typing";
/// Son tuştan sonra bu kadar süre "yazıyor" sayılır.
pub const TYPING_HOLD_MS: u64 = 2_000;

/// FB10-3: yazarken pet pencereyi oynatmasın. Windows "yazarken işaretçiyi gizle" ile imleci saklar; her pencere taşıma
/// (SetWindowPos) imleci yeniden gösterir, her tuşta yanıp söner. Son giriş zamanı ilerledi ama imleç kıpırdamadıysa: klavye.
#[derive(Debug, Default)]
pub struct TypingWatch {
    last_input: Option<u32>,
    last_cursor: Option<(f64, f64)>,
    until_ms: u64,
    typing: bool,
}

impl TypingWatch {
    /// Bir okuma; durum değiştiyse yeni durum.
    pub fn feed(&mut self, input_tick: u32, cursor: (f64, f64), now_ms: u64) -> Option<bool> {
        let moved = self.last_cursor.is_some_and(|c| c != cursor);
        let advanced = self.last_input.is_some_and(|t| t != input_tick);
        self.last_input = Some(input_tick);
        self.last_cursor = Some(cursor);
        if moved {
            self.until_ms = 0;
        } else if advanced {
            self.until_ms = now_ms + TYPING_HOLD_MS;
        }
        let typing = now_ms < self.until_ms;
        (typing != self.typing).then(|| {
            self.typing = typing;
            typing
        })
    }
}

const CURSOR_POLL: Duration = Duration::from_millis(33);
/// FB6 performans: imleç pet'ten uzaktayken (ve sürükleme yokken) daha seyrek bakılır
const CURSOR_POLL_FAR: Duration = Duration::from_millis(100);
/// "yakın" sayılan pay (mantıksal px): imleç bu kadar yaklaşınca tam hıza dönülür, ilk temas kaçmaz
const NEAR_MARGIN: f64 = 160.0;

/// Sonraki imleç yoklamasına kadar bekleme (saf): sürüklerken ya da imleç pet/balonların yakınındayken tam hız.
pub fn poll_delay(rects: &[Rect], scale: f64, px: f64, py: f64, capture: bool) -> Duration {
    let near = rects.iter().any(|r| to_physical(grow(*r, NEAR_MARGIN), scale).contains(px, py));
    if capture || near {
        CURSOR_POLL
    } else {
        CURSOR_POLL_FAR
    }
}
/// Çalışma alanı kaç turda bir yeniden okunur (~1 sn).
const WORK_AREA_EVERY: u32 = 30;
/// Pet merkezine bu kadar (mantıksal px) yakın imleç "yakında" sayılır.
const NEAR_RADIUS: f64 = 120.0;
/// Yön bilgisinde bu kadar (mantıksal px) sapma 0 sayılır.
const DIR_DEADZONE: f64 = 8.0;
/// Tıklama alırken alan bu kadar (mantıksal px) genişler: imleç sınırda gidip gelince
/// set_ignore_cursor_events (WS_EX_LAYERED/TRANSPARENT + SWP_FRAMECHANGED) tekrar tekrar tetiklenmesin.
const HYSTERESIS: f64 = 4.0;
/// Durum değişimi için art arda kaç okuma aynı olmalı (~66 ms).
const SETTLE_POLLS: u8 = 2;

/// Dikdörtgen. Hangi birimde olduğu kullanıldığı yerde belirtilir.
#[derive(Clone, Copy, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct Rect {
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
}

impl Rect {
    pub fn contains(&self, px: f64, py: f64) -> bool {
        px >= self.x && px < self.x + self.w && py >= self.y && py < self.y + self.h
    }
}

/// Mantıksal -> fiziksel piksel. DPI dönüşümünün tek yeri.
pub fn to_physical(r: Rect, scale: f64) -> Rect {
    Rect {
        x: r.x * scale,
        y: r.y * scale,
        w: r.w * scale,
        h: r.h * scale,
    }
}

/// İmleç (pencereye göre, fiziksel) mantıksal hit rect'lerden birinin içinde mi?
pub fn hit_test(rects: &[Rect], scale: f64, px: f64, py: f64) -> bool {
    rects.iter().any(|r| to_physical(*r, scale).contains(px, py))
}

/// Tıklamayı alan bölgeler (SPEC 08 SZ1c): pet için dolu piksel rect'leri (mask; yoksa pet kutusu) + açılır yüzeyler (rects[1..]).
/// rects[0] (pet kutusu) sadece yakınlık/hover içindir; saydam köşeler alttaki pencereye tıklama geçirir.
pub fn click_rects(rects: &[Rect], mask: Option<&[Rect]>) -> Vec<Rect> {
    match mask {
        Some(m) if !rects.is_empty() => m.iter().chain(rects[1..].iter()).copied().collect(),
        _ => rects.to_vec(),
    }
}

/// Dikdörtgeni her yönde büyütür.
pub fn grow(r: Rect, by: f64) -> Rect {
    Rect { x: r.x - by, y: r.y - by, w: r.w + 2.0 * by, h: r.h + 2.0 * by }
}

/// Pencere tıklamayı almalı mı? Alırken alan HYSTERESIS kadar geniş tutulur.
pub fn wants_accept(rects: &[Rect], scale: f64, px: f64, py: f64, accepting: bool, capture: bool) -> bool {
    if capture {
        return true;
    }
    if accepting {
        rects.iter().any(|r| to_physical(grow(*r, HYSTERESIS), scale).contains(px, py))
    } else {
        hit_test(rects, scale, px, py)
    }
}

/// Tıklama geçirme anahtarı: istenen durum SETTLE_POLLS okuma boyunca aynı kalınca değişir.
#[derive(Default)]
pub struct AcceptToggle {
    current: Option<bool>,
    candidate: Option<bool>,
    count: u8,
}

impl AcceptToggle {
    pub fn current(&self) -> bool {
        self.current.unwrap_or(false)
    }

    /// Yeni okuma; değişim yapılacaksa Some(yeni durum). immediate: beklemeden geç (sürükleme başlangıcı).
    pub fn feed(&mut self, want: bool, immediate: bool) -> Option<bool> {
        if self.current.is_none() || (immediate && self.current != Some(want)) {
            self.current = Some(want);
            self.candidate = None;
            self.count = 0;
            return Some(want);
        }
        if self.current == Some(want) {
            self.candidate = None;
            self.count = 0;
            return None;
        }
        if self.candidate == Some(want) {
            self.count += 1;
        } else {
            self.candidate = Some(want);
            self.count = 1;
        }
        if self.count >= SETTLE_POLLS {
            self.current = Some(want);
            self.candidate = None;
            self.count = 0;
            return Some(want);
        }
        None
    }
}

/// Konum gerçekten (fiziksel piksel) değiştiyse taşı.
pub fn should_move(last: Option<(i32, i32)>, next: (i32, i32)) -> bool {
    last != Some(next)
}

/// Teşhis anahtarları (kurulu sürümde ortam değişkeniyle): hangisi caret titremesine sebep, kullanıcı ayrı ayrı deneyebilsin.
/// DUNNO_FREEZE_MOVEMENT=1: pet kendiliğinden hareket etmez. DUNNO_NO_CURSOR_WATCH=1: tıklama geçirme anahtarı hiç değişmez.
#[derive(Clone, Copy, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DebugFlags {
    pub freeze_movement: bool,
    pub no_cursor_watch: bool,
}

pub fn debug_flags_from(get: impl Fn(&str) -> Option<String>) -> DebugFlags {
    let on = |k: &str| matches!(get(k).as_deref().map(str::trim), Some("1" | "true" | "yes" | "on"));
    DebugFlags {
        freeze_movement: on("DUNNO_FREEZE_MOVEMENT"),
        no_cursor_watch: on("DUNNO_NO_CURSOR_WATCH"),
    }
}

pub fn debug_flags() -> DebugFlags {
    debug_flags_from(|k| std::env::var(k).ok())
}

/// Etkin monitörün (SPEC 10 CL5; ilk açılışta birincil) çalışma alanı (görev çubuğu hariç), fiziksel piksel + ölçek.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct WorkArea {
    pub phys: Rect,
    pub scale: f64,
}

/// TS'e giden çalışma alanı bilgisi (mantıksal piksel).
#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
pub struct WorkAreaInfo {
    pub width: f64,
    pub height: f64,
    pub scale: f64,
}

/// workarea://changed yükü: alan + sürüklerken monitör değiştiyse imlecin yeni alandaki mantıksal konumu (SPEC 10 CL5).
#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
pub struct WorkAreaChange {
    #[serde(flatten)]
    pub info: WorkAreaInfo,
    /// sürükleme başka monitöre geçti: pet imlecin altına (bu konuma) taşınır
    pub cursor: Option<CursorAt>,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
pub struct CursorAt {
    pub x: f64,
    pub y: f64,
}

impl WorkArea {
    pub fn info(&self) -> WorkAreaInfo {
        let one = to_physical(Rect { x: 0.0, y: 0.0, w: 1.0, h: 1.0 }, self.scale);
        WorkAreaInfo {
            width: self.phys.w / one.w,
            height: self.phys.h / one.h,
            scale: self.scale,
        }
    }

    /// Çalışma alanına göre mantıksal konum -> ekran fiziksel konumu.
    /// Çalışma alanına göre mantıksal kutu -> ekran fiziksel konum + boyut (boyut en az 1 px).
    pub fn screen_box(self, x: f64, y: f64, w: f64, h: f64) -> (i32, i32, i32, i32) {
        let (px, py) = self.screen_pos(x, y);
        let s = to_physical(Rect { x: 0.0, y: 0.0, w, h }, self.scale);
        (px, py, (s.w.round() as i32).max(1), (s.h.round() as i32).max(1))
    }

    pub fn screen_pos(self, x: f64, y: f64) -> (i32, i32) {
        let p = to_physical(Rect { x, y, w: 0.0, h: 0.0 }, self.scale);
        (
            (self.phys.x + p.x).round() as i32,
            (self.phys.y + p.y).round() as i32,
        )
    }
}

/// İmlecin pet'e göre durumu. Ham konum içermez.
#[derive(Clone, Copy, Debug, Default, PartialEq, Serialize)]
pub struct CursorState {
    /// imleç pet kutusunun üstünde
    pub over: bool,
    /// imleç pet'e yakın ama üstünde değil
    pub near: bool,
    /// yakındayken imlecin pet merkezine göre yönü (-1, 0, 1); uzaktayken 0
    pub dx: i8,
    pub dy: i8,
    /// imleç pet kutusu dışındaki bir yüzeyin (balon, ask.exe) üstünde (SPEC 07 FB5: balon hover durması)
    pub pop: bool,
}

fn sign(v: f64) -> i8 {
    if v.abs() < DIR_DEADZONE {
        0
    } else if v < 0.0 {
        -1
    } else {
        1
    }
}

/// İlk hit rect pet kutusudur. İmleç pencereye göre fiziksel.
pub fn cursor_state(rects: &[Rect], scale: f64, px: f64, py: f64) -> CursorState {
    let over = hit_test(rects, scale, px, py);
    // pencere imleci bırakınca DOM pointerleave gelmeyebilir; balon hover bunu da dinler
    let pop = rects.len() > 1 && hit_test(&rects[1..], scale, px, py);
    let Some(pet) = rects.first() else {
        return CursorState::default();
    };
    let p = to_physical(*pet, scale);
    // mantıksal uzaklık
    let dx = (px - (p.x + p.w / 2.0)) / scale;
    let dy = (py - (p.y + p.h / 2.0)) / scale;
    let near = !over && dx.hypot(dy) <= NEAR_RADIUS;
    if !near {
        return CursorState { over, pop, ..CursorState::default() };
    }
    CursorState {
        over,
        near,
        dx: sign(dx),
        dy: sign(dy),
        pop,
    }
}

/// Paylaşılan pencere durumu.
#[derive(Default)]
pub struct PetWindow {
    /// TS'ten gelen hit rect'ler (pencereye göre, mantıksal); ilki pet kutusu (yakınlık/hover)
    rects: Mutex<Vec<Rect>>,
    /// pet'in o anki karesinin dolu piksel rect'leri (pencereye göre, mantıksal); tıklama bunlarla (SPEC 08 SZ1c)
    mask: Mutex<Option<Vec<Rect>>>,
    /// sürükleme sırasında imleç kutudan kaysa bile pencere tıklamayı almaya devam eder
    capture: AtomicBool,
    work_area: Mutex<Option<WorkArea>>,
    /// etkin monitörün tüm sınırları (görev çubuğu taşınınca aynı monitörü tanımak için; SPEC 10 CL5)
    monitor_bounds: Mutex<Option<Rect>>,
    /** odak almadan önce öndeki pencere (sadece tanıtıcı; başlık okunmaz) */
    prev_focus: Mutex<Option<isize>>,
    /** son SetWindowPos konumu (fiziksel); aynı piksele tekrar taşınmaz */
    last_pos: Mutex<Option<(i32, i32)>>,
    /** teşhis: yapılan SetWindowPos sayısı */
    moves: AtomicU64,
}

impl PetWindow {
    pub fn set_rects(&self, rects: Vec<Rect>) {
        *self.rects.lock().unwrap_or_else(|e| e.into_inner()) = rects;
    }

    fn rects(&self) -> Vec<Rect> {
        self.rects.lock().unwrap_or_else(|e| e.into_inner()).clone()
    }

    /// Kare/yön/konum değişince TS gönderir; boş liste = maske yok (pet kutusu tıklanır).
    pub fn set_mask(&self, rects: Vec<Rect>) {
        *self.mask.lock().unwrap_or_else(|e| e.into_inner()) = if rects.is_empty() { None } else { Some(rects) };
    }

    fn mask(&self) -> Option<Vec<Rect>> {
        self.mask.lock().unwrap_or_else(|e| e.into_inner()).clone()
    }

    pub fn set_capture(&self, on: bool) {
        self.capture.store(on, Ordering::Relaxed);
    }

    pub fn remember_focus(&self, handle: Option<isize>) {
        *self.prev_focus.lock().unwrap_or_else(|e| e.into_inner()) = handle;
    }

    pub fn take_focus(&self) -> Option<isize> {
        self.prev_focus.lock().unwrap_or_else(|e| e.into_inner()).take()
    }

    /// Taşıma gerekiyorsa konumu kaydeder ve true döner.
    fn claim_move(&self, next: (i32, i32)) -> bool {
        let mut last = self.last_pos.lock().unwrap_or_else(|e| e.into_inner());
        if !should_move(*last, next) {
            return false;
        }
        *last = Some(next);
        self.moves.fetch_add(1, Ordering::Relaxed);
        true
    }

    pub fn move_count(&self) -> u64 {
        self.moves.load(Ordering::Relaxed)
    }

    pub fn work_area(&self) -> Option<WorkArea> {
        *self.work_area.lock().unwrap_or_else(|e| e.into_inner())
    }

    /// Etkin monitör (alan + sınırlar); choose_active için.
    fn active(&self) -> Option<(WorkArea, Rect)> {
        let wa = self.work_area()?;
        let bounds = (*self.monitor_bounds.lock().unwrap_or_else(|e| e.into_inner())).unwrap_or(wa.phys);
        Some((wa, bounds))
    }

    /// Etkin monitörü kaydeder; alan değiştiyse true döner.
    fn store_monitor(&self, m: &MonitorArea) -> bool {
        *self.monitor_bounds.lock().unwrap_or_else(|e| e.into_inner()) = Some(m.bounds);
        self.store_work_area(m.work_area())
    }

    /// Değiştiyse true döner.
    fn store_work_area(&self, wa: WorkArea) -> bool {
        let mut cur = self.work_area.lock().unwrap_or_else(|e| e.into_inner());
        let changed = *cur != Some(wa);
        *cur = Some(wa);
        changed
    }
}

/// Bağlı monitörler (fiziksel sanal ekran koordinatı). Okunamazsa boş.
pub fn read_monitors(app: &AppHandle) -> Vec<MonitorArea> {
    let primary = app.primary_monitor().ok().flatten().map(|m| (m.position().x, m.position().y));
    app.available_monitors()
        .unwrap_or_default()
        .iter()
        .map(|m| {
            let (pos, size, wa) = (m.position(), m.size(), m.work_area());
            MonitorArea {
                bounds: Rect { x: pos.x as f64, y: pos.y as f64, w: size.width as f64, h: size.height as f64 },
                work: Rect {
                    x: wa.position.x as f64,
                    y: wa.position.y as f64,
                    w: wa.size.width as f64,
                    h: wa.size.height as f64,
                },
                scale: m.scale_factor(),
                primary: primary == Some((pos.x, pos.y)),
            }
        })
        .collect()
}

/// Etkin monitörün çalışma alanı (SPEC 10 CL5): önceki etkin monitör bağlıysa o, çıkarıldıysa birincil.
/// Seçilen monitör PetWindow'a kaydedilir.
pub fn read_work_area(app: &AppHandle) -> Option<WorkArea> {
    let pet = app.state::<PetWindow>();
    let m = choose_active(&read_monitors(app), pet.active())?;
    pet.store_monitor(&m);
    Some(m.work_area())
}

/// Pencereyi (sol üst köşe) çalışma alanına göre mantıksal konuma taşır; aynı fiziksel piksele tekrar taşımaz.
pub fn move_to(win: &WebviewWindow, pet: &PetWindow, wa: &WorkArea, x: f64, y: f64) -> tauri::Result<()> {
    let p = wa.screen_pos(x, y);
    if !pet.claim_move(p) {
        return Ok(());
    }
    set_window_pos(win, p)
}

/// Pencereyi kutuya taşır ve boyutlar (açılır yüzey için geçici büyüme / geri dönüş). Konum hafızası güncellenir.
pub fn set_box(win: &WebviewWindow, pet: &PetWindow, wa: &WorkArea, x: f64, y: f64, w: f64, h: f64) -> tauri::Result<()> {
    let (px, py, pw, ph) = wa.screen_box(x, y, w, h);
    pet.claim_move((px, py));
    set_window_pos_size(win, (px, py), (pw, ph))?;
    // büyüyen/küçülen pencerede yeni alan webview boyamadan önce yerel zeminle (beyaz) görünmesin: zemin her boyutta saydam
    clear_background(win);
    Ok(())
}

/// Pencere + webview zemini tamamen saydam (yerel pencere fırçası ve WebView2 DefaultBackgroundColor).
/// Kenarda/köşede açılır yüzey için pencere boyut değiştirince beyaz kutu görünüyordu.
pub fn clear_background(win: &WebviewWindow) {
    let _ = win.set_background_color(Some(tauri::window::Color(0, 0, 0, 0)));
}

#[cfg(windows)]
fn set_window_pos_size(win: &WebviewWindow, (x, y): (i32, i32), (w, h): (i32, i32)) -> tauri::Result<()> {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{
        SetWindowPos, SWP_NOACTIVATE, SWP_NOSENDCHANGING, SWP_NOZORDER,
    };

    let hwnd = HWND(win.hwnd()?.0);
    // eşzamanlı (ASYNC değil): webview yeni boyutu gelmeden içerik yerleşmesin
    let flags = SWP_NOACTIVATE | SWP_NOZORDER | SWP_NOSENDCHANGING;
    // Güvenli: hwnd bu pencerenin canlı tanıtıcısı; SetWindowPos sadece konum/boyut değiştirir, işaretçi deref edilmez.
    let _ = unsafe { SetWindowPos(hwnd, None, x, y, w, h, flags) };
    Ok(())
}

#[cfg(not(windows))]
fn set_window_pos_size(win: &WebviewWindow, (x, y): (i32, i32), (w, h): (i32, i32)) -> tauri::Result<()> {
    win.set_position(tauri::PhysicalPosition::new(x, y))?;
    win.set_size(tauri::PhysicalSize::new(w as u32, h as u32))
}

/// Doğrudan SetWindowPos: tao'nun set_position'ı her çağrıda InvalidateRgn ile tüm pencereyi yeniden boyatır;
/// burada boyama isteği, z-sırası, etkinleştirme ve WM_WINDOWPOSCHANGING yok, çağrı beklemez.
#[cfg(windows)]
fn set_window_pos(win: &WebviewWindow, (x, y): (i32, i32)) -> tauri::Result<()> {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{
        SetWindowPos, SWP_ASYNCWINDOWPOS, SWP_NOACTIVATE, SWP_NOSENDCHANGING, SWP_NOSIZE, SWP_NOZORDER,
    };

    let hwnd = HWND(win.hwnd()?.0);
    let flags = SWP_NOACTIVATE | SWP_NOZORDER | SWP_NOSIZE | SWP_NOSENDCHANGING | SWP_ASYNCWINDOWPOS;
    // Güvenli: hwnd bu pencerenin canlı tanıtıcısı; SetWindowPos sadece konumu değiştirir, işaretçi deref edilmez.
    let _ = unsafe { SetWindowPos(hwnd, None, x, y, 0, 0, flags) };
    Ok(())
}

#[cfg(not(windows))]
fn set_window_pos(win: &WebviewWindow, (x, y): (i32, i32)) -> tauri::Result<()> {
    win.set_position(tauri::PhysicalPosition::new(x, y))
}

/// Açılışta, TS konum verene kadar pencereyi sağ alta koyar (titreme olmasın diye).
pub fn place_initial(app: &AppHandle, win: &WebviewWindow) -> tauri::Result<()> {
    let Some(wa) = read_work_area(app) else {
        return Ok(());
    };
    let pet = app.state::<PetWindow>();
    pet.store_work_area(wa);
    clear_background(win);
    let size = win.outer_size()?;
    let info = wa.info();
    let (w, h) = (size.width as f64 / wa.scale, size.height as f64 / wa.scale);
    move_to(win, &pet, &wa, info.width - w, info.height - h)
}

/// İmleci ~30 Hz izler: tıklama geçirmeyi değiştirir, imleç durumu ve çalışma alanı değişince olay yayar.
pub fn spawn_cursor_watch(app: AppHandle) {
    thread::spawn(move || {
        let flags = debug_flags();
        let mut toggle = AcceptToggle::default();
        let mut last_state: Option<CursorState> = None;
        let mut tick: u32 = 0;
        let mut delay = CURSOR_POLL;
        let mut typing = TypingWatch::default();
        let started = std::time::Instant::now();
        loop {
            thread::sleep(delay);
            delay = CURSOR_POLL;
            tick = tick.wrapping_add(1);
            let Some(win) = app.get_webview_window(MAIN_LABEL) else {
                break;
            };
            let pet = app.state::<PetWindow>();

            if tick.is_multiple_of(WORK_AREA_EVERY) {
                let monitors = read_monitors(&app);
                if let Some(m) = choose_active(&monitors, pet.active()) {
                    if pet.store_monitor(&m) {
                        let change = WorkAreaChange { info: m.work_area().info(), cursor: None };
                        let _ = app.emit_to(MAIN_LABEL, EVENT_WORK_AREA, change);
                    }
                }
            }

            // sürüklerken imleç başka monitöre geçti (SPEC 10 CL5): o monitör etkin olur, pet imlecin altına taşınır
            if pet.capture.load(Ordering::Relaxed) {
                if let (Some((active, _)), Some((cx, cy))) = (pet.active(), cursor_pos(&app)) {
                    let monitors = read_monitors(&app);
                    let current = monitors.iter().find(|m| m.work == active.phys).copied();
                    if let Some(next) = current.and_then(|cur| drag_switch(&monitors, &cur, (cx, cy))) {
                        pet.store_monitor(&next);
                        let (x, y) = logical_in(&next, cx, cy);
                        let change = WorkAreaChange { info: next.work_area().info(), cursor: Some(CursorAt { x, y }) };
                        let _ = app.emit_to(MAIN_LABEL, EVENT_WORK_AREA, change);
                    }
                }
            }

            if flags.no_cursor_watch {
                // teşhis: anahtar bir kez kapanır, bir daha hiç değişmez (pet tıklanamaz)
                if toggle.feed(false, false).is_some() {
                    let _ = win.set_ignore_cursor_events(true);
                }
                continue;
            }

            let (Ok(pos), Ok(scale), Some((cx, cy))) =
                (win.outer_position(), win.scale_factor(), cursor_pos(&app))
            else {
                continue;
            };
            if let Some(tick) = last_input_tick() {
                if let Some(on) = typing.feed(tick, (cx, cy), started.elapsed().as_millis() as u64) {
                    let _ = app.emit_to(MAIN_LABEL, EVENT_TYPING, on);
                }
            }
            let (px, py) = (cx - pos.x as f64, cy - pos.y as f64);
            let rects = pet.rects();
            let state = cursor_state(&rects, scale, px, py);
            let capture = pet.capture.load(Ordering::Relaxed);
            let mask = pet.mask();
            let clickable = click_rects(&rects, mask.as_deref());
            let want = wants_accept(&clickable, scale, px, py, toggle.current(), capture);
            delay = poll_delay(&rects, scale, px, py, capture);
            // stil değişimi (SWP_FRAMECHANGED) sadece durum gerçekten değişince; sürükleme başlarken beklemeden
            if let Some(accept) = toggle.feed(want, capture) {
                let _ = win.set_ignore_cursor_events(!accept);
            }
            if last_state != Some(state) {
                last_state = Some(state);
                let _ = app.emit_to(MAIN_LABEL, EVENT_CURSOR, state);
            }
        }
    });
}

/// Son klavye/fare girişinin sistem saati (GetLastInputInfo; içerik değil, sadece zaman).
#[cfg(windows)]
fn last_input_tick() -> Option<u32> {
    use windows::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};
    let mut info = LASTINPUTINFO { cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32, dwTime: 0 };
    // Güvenli: `info` yığında, cbSize doğru; API sadece dwTime'a yazar.
    unsafe { GetLastInputInfo(&mut info) }.as_bool().then_some(info.dwTime)
}

#[cfg(not(windows))]
fn last_input_tick() -> Option<u32> {
    None
}

/// Ekran koordinatında imleç (fiziksel piksel).
#[cfg(windows)]
fn cursor_pos(_app: &AppHandle) -> Option<(f64, f64)> {
    use windows::Win32::Foundation::POINT;
    use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

    let mut p = POINT::default();
    // Güvenli: `p` yığında yaşayan geçerli bir POINT; GetCursorPos yalnızca ona yazar.
    unsafe { GetCursorPos(&mut p) }.ok()?;
    Some((p.x as f64, p.y as f64))
}

/// Pet'i gizler/gösterir (toplantı koruması). Gösterirken odak çalmaz.
#[cfg(windows)]
pub fn set_visible(win: &WebviewWindow, visible: bool) -> tauri::Result<()> {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{ShowWindow, SW_HIDE, SW_SHOWNOACTIVATE};

    // tauri farklı windows sürümü kullanıyor olabilir: ham işaretçiyle köprüle
    let hwnd = HWND(win.hwnd()?.0);
    let cmd = if visible { SW_SHOWNOACTIVATE } else { SW_HIDE };
    // Güvenli: hwnd tauri'nin bu pencere için verdiği canlı tanıtıcı; ShowWindow sadece görünürlüğü değiştirir,
    // dönen değer (önceki görünürlük) hata değildir.
    let _ = unsafe { ShowWindow(hwnd, cmd) };
    Ok(())
}

#[cfg(not(windows))]
pub fn set_visible(win: &WebviewWindow, visible: bool) -> tauri::Result<()> {
    if visible {
        win.show()
    } else {
        win.hide()
    }
}

/// Öndeki pencerenin tanıtıcısı (odak geri verilsin diye).
#[cfg(windows)]
pub fn foreground_handle() -> Option<isize> {
    use windows::Win32::UI::WindowsAndMessaging::GetForegroundWindow;

    // Güvenli: parametresiz salt okuma çağrısı; null dönebilir, aşağıda elenir.
    let h = unsafe { GetForegroundWindow() };
    (!h.is_invalid()).then_some(h.0 as isize)
}

/// Odağı önceki pencereye geri verir (hâlâ varsa).
#[cfg(windows)]
pub fn restore_foreground(handle: isize) {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{IsWindow, SetForegroundWindow};

    let h = HWND(handle as *mut core::ffi::c_void);
    // Güvenli: IsWindow her tanıtıcıyı kabul eder; SetForegroundWindow yalnızca geçerli pencereye
    // çağrılır ve en kötü ihtimalle false döner (işaretçi deref edilmez).
    unsafe {
        if IsWindow(Some(h)).as_bool() {
            let _ = SetForegroundWindow(h);
        }
    }
}

#[cfg(not(windows))]
pub fn foreground_handle() -> Option<isize> {
    None
}

#[cfg(not(windows))]
pub fn restore_foreground(_handle: isize) {}

#[cfg(not(windows))]
fn cursor_pos(app: &AppHandle) -> Option<(f64, f64)> {
    app.cursor_position().ok().map(|p| (p.x, p.y))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn typing_is_input_without_cursor_motion() {
        let mut t = TypingWatch::default();
        assert_eq!(t.feed(100, (5.0, 5.0), 0), None); // ilk okuma: karşılaştıracak bir şey yok
        assert_eq!(t.feed(150, (5.0, 5.0), 100), Some(true)); // giriş ilerledi, imleç yerinde: tuş
        assert_eq!(t.feed(200, (5.0, 5.0), 500), None); // yazmaya devam
        assert_eq!(t.feed(200, (5.0, 5.0), 2_400), None); // son tuştan 1.9 sn
        assert_eq!(t.feed(200, (5.0, 5.0), 2_600), Some(false)); // 2 sn geçti
        assert_eq!(t.feed(300, (9.0, 5.0), 2_700), None); // fare hareketi yazmak değil
        assert_eq!(t.feed(310, (9.0, 5.0), 2_800), Some(true));
        assert_eq!(t.feed(320, (12.0, 5.0), 2_900), Some(false)); // fare oynadı: hemen bırak
    }

    const PET: Rect = Rect { x: 48.0, y: 96.0, w: 144.0, h: 144.0 };

    #[test]
    fn cursor_poll_slows_down_far_from_the_pet() {
        assert_eq!(poll_delay(&[PET], 1.0, 100.0, 150.0, false), CURSOR_POLL);
        assert_eq!(poll_delay(&[PET], 1.0, 48.0 + 144.0 + 100.0, 150.0, false), CURSOR_POLL);
        assert_eq!(poll_delay(&[PET], 1.0, 2000.0, 1500.0, false), CURSOR_POLL_FAR);
        // sürüklerken her zaman tam hız; yüksek DPI'da pay da ölçeklenir
        assert_eq!(poll_delay(&[PET], 1.0, 2000.0, 1500.0, true), CURSOR_POLL);
        assert_eq!(poll_delay(&[PET], 2.0, 2.0 * (48.0 + 144.0 + 100.0), 300.0, false), CURSOR_POLL);
    }

    #[test]
    fn hit_inside_and_outside_at_100() {
        assert!(hit_test(&[PET], 1.0, 50.0, 100.0));
        assert!(!hit_test(&[PET], 1.0, 47.0, 100.0));
        assert!(!hit_test(&[PET], 1.0, 100.0, 95.0));
        // sağ/alt kenar dışarıda sayılır
        assert!(!hit_test(&[PET], 1.0, 192.0, 100.0));
    }

    #[test]
    fn hit_scales_with_dpi() {
        // %150: mantıksal (48,96) -> fiziksel (72,144)
        assert!(!hit_test(&[PET], 1.5, 60.0, 150.0));
        assert!(hit_test(&[PET], 1.5, 72.0, 144.0));
        assert!(hit_test(&[PET], 1.5, 287.0, 359.0));
        assert!(!hit_test(&[PET], 1.5, 288.0, 359.0));
    }

    #[test]
    fn pop_is_only_the_surfaces_not_the_pet() {
        let bubble = Rect { x: 20.0, y: 10.0, w: 200.0, h: 60.0 };
        // balonun üstünde: over ve pop
        let s = cursor_state(&[PET, bubble], 1.0, 100.0, 40.0);
        assert!(s.over && s.pop);
        // pet'in üstünde: over, pop değil
        let s = cursor_state(&[PET, bubble], 1.0, 120.0, 168.0);
        assert!(s.over && !s.pop);
        // dışarıda: ikisi de değil; balon yoksa pop asla
        assert!(!cursor_state(&[PET, bubble], 1.0, 400.0, 400.0).pop);
        assert!(!cursor_state(&[PET], 1.0, 100.0, 40.0).pop);
        // %200: mantıksal balon fiziksel 2x
        assert!(cursor_state(&[PET, bubble], 2.0, 200.0, 80.0).pop);
    }

    #[test]
    fn no_rects_never_hits() {
        assert!(!hit_test(&[], 1.0, 0.0, 0.0));
        assert_eq!(cursor_state(&[], 1.0, 0.0, 0.0), CursorState::default());
    }

    #[test]
    fn to_physical_scales_all_fields() {
        let r = to_physical(Rect { x: 1.0, y: 2.0, w: 3.0, h: 4.0 }, 2.0);
        assert_eq!(r, Rect { x: 2.0, y: 4.0, w: 6.0, h: 8.0 });
    }

    #[test]
    fn work_area_info_is_logical() {
        let wa = WorkArea { phys: Rect { x: 0.0, y: 0.0, w: 2880.0, h: 1560.0 }, scale: 1.5 };
        assert_eq!(wa.info(), WorkAreaInfo { width: 1920.0, height: 1040.0, scale: 1.5 });
    }

    #[test]
    fn work_area_change_payload_is_flat_with_optional_cursor() {
        let info = WorkAreaInfo { width: 1920.0, height: 1040.0, scale: 1.0 };
        let plain = serde_json::to_string(&WorkAreaChange { info, cursor: None }).unwrap();
        assert_eq!(plain, r#"{"width":1920.0,"height":1040.0,"scale":1.0,"cursor":null}"#);
        let moved = serde_json::to_string(&WorkAreaChange { info, cursor: Some(CursorAt { x: 40.0, y: 300.0 }) }).unwrap();
        assert!(moved.ends_with(r#""cursor":{"x":40.0,"y":300.0}}"#), "{moved}");
    }

    #[test]
    fn screen_pos_adds_origin_and_scales() {
        // görev çubuğu solda/üstte olabilir: çalışma alanı başlangıcı 0 olmayabilir
        let wa = WorkArea { phys: Rect { x: 60.0, y: 40.0, w: 1860.0, h: 1040.0 }, scale: 1.25 };
        assert_eq!(wa.screen_pos(0.0, 0.0), (60, 40));
        assert_eq!(wa.screen_pos(100.0, 10.4), (185, 53));
        // negatif konum (pencere kısmen ekran dışında) da çalışır
        assert_eq!(wa.screen_pos(-48.0, 0.0), (0, 40));
    }

    #[test]
    fn transparent_corner_passes_clicks_but_still_counts_as_over() {
        // SPEC 08 SZ1c: kutu 0..100, dolu piksel sadece ortada (40..60); balon ayrı
        let pet = Rect { x: 0.0, y: 0.0, w: 100.0, h: 100.0 };
        let body = Rect { x: 40.0, y: 40.0, w: 20.0, h: 20.0 };
        let bubble = Rect { x: 0.0, y: -80.0, w: 100.0, h: 60.0 };
        let rects = [pet, bubble];
        let clickable = click_rects(&rects, Some(&[body]));
        assert_eq!(clickable, vec![body, bubble]);
        // saydam köşe: tıklama geçer, hover/yakınlık için hâlâ pet üstü
        assert!(!wants_accept(&clickable, 1.0, 5.0, 5.0, false, false));
        assert!(cursor_state(&rects, 1.0, 5.0, 5.0).over);
        // dolu piksel ve balon tıklanır
        assert!(wants_accept(&clickable, 1.0, 50.0, 50.0, false, false));
        assert!(wants_accept(&clickable, 1.0, 50.0, -50.0, false, false));
        // %150: fiziksel koordinatta da aynı
        assert!(wants_accept(&clickable, 1.5, 75.0, 75.0, false, false));
        assert!(!wants_accept(&clickable, 1.5, 10.0, 10.0, false, false));
        // sürüklerken her yer
        assert!(wants_accept(&clickable, 1.0, 5.0, 5.0, false, true));
    }

    #[test]
    fn without_a_mask_the_pet_box_is_clickable() {
        let pet = Rect { x: 0.0, y: 0.0, w: 100.0, h: 100.0 };
        assert_eq!(click_rects(&[pet], None), vec![pet]);
        assert!(click_rects(&[], Some(&[pet])).is_empty());
    }

    #[test]
    fn cursor_over_pet_is_not_near() {
        let s = cursor_state(&[PET], 1.0, 120.0, 168.0);
        assert!(s.over && !s.near);
        assert_eq!((s.dx, s.dy), (0, 0));
    }

    #[test]
    fn cursor_near_reports_direction_only() {
        // pet merkezi (120,168); imleç solda 100 px
        let s = cursor_state(&[PET], 1.0, 20.0, 168.0);
        assert_eq!(s, CursorState { over: false, near: true, dx: -1, dy: 0, pop: false });
        // sağ üst çapraz
        let s = cursor_state(&[PET], 1.0, 200.0, 88.0);
        assert_eq!((s.near, s.dx, s.dy), (true, 1, -1));
    }

    #[test]
    fn cursor_far_is_quiet() {
        let s = cursor_state(&[PET], 1.0, 400.0, 168.0);
        assert_eq!(s, CursorState::default());
    }

    #[test]
    fn hysteresis_keeps_accepting_near_the_edge() {
        // kutu x 48..192; 46 dışarıda ama alırken 4 px pay var
        assert!(!wants_accept(&[PET], 1.0, 46.0, 168.0, false, false));
        assert!(wants_accept(&[PET], 1.0, 46.0, 168.0, true, false));
        assert!(!wants_accept(&[PET], 1.0, 43.0, 168.0, true, false));
        assert!(wants_accept(&[], 1.0, 0.0, 0.0, false, true));
    }

    #[test]
    fn toggle_switches_only_after_settled_reads() {
        let mut t = AcceptToggle::default();
        assert_eq!(t.feed(false, false), Some(false)); // ilk durum hemen
        assert_eq!(t.feed(true, false), None); // tek okuma yetmez
        assert_eq!(t.feed(false, false), None); // geri döndü: değişim yok
        assert_eq!(t.feed(true, false), None);
        assert_eq!(t.feed(true, false), Some(true));
        assert_eq!(t.feed(true, false), None);
        assert_eq!(t.feed(false, true), Some(false)); // immediate
    }

    #[test]
    fn jitter_at_the_edge_causes_no_style_changes() {
        // imleç her okumada içeri/dışarı gidip gelirse: sıfır stil değişimi
        let mut t = AcceptToggle::default();
        t.feed(false, false);
        let changes = (0..100).filter(|i| t.feed(i % 2 == 0, false).is_some()).count();
        assert_eq!(changes, 0);
    }

    #[test]
    fn move_only_on_pixel_change() {
        assert!(should_move(None, (1, 2)));
        assert!(!should_move(Some((1, 2)), (1, 2)));
        assert!(should_move(Some((1, 2)), (2, 2)));
        let pet = PetWindow::default();
        assert!(pet.claim_move((10, 10)));
        assert!(!pet.claim_move((10, 10)));
        assert!(pet.claim_move((11, 10)));
        assert_eq!(pet.move_count(), 2);
    }

    #[test]
    fn debug_flags_from_env() {
        let f = debug_flags_from(|k| (k == "DUNNO_FREEZE_MOVEMENT").then(|| "1".to_string()));
        assert_eq!(f, DebugFlags { freeze_movement: true, no_cursor_watch: false });
        let f = debug_flags_from(|k| (k == "DUNNO_NO_CURSOR_WATCH").then(|| " yes ".to_string()));
        assert!(f.no_cursor_watch && !f.freeze_movement);
        assert_eq!(debug_flags_from(|_| Some("0".into())), DebugFlags::default());
    }

    #[test]
    fn autostart_arg_detected() {
        assert!(launched_by_autostart(["dunno.exe".to_string(), AUTOSTART_ARG.to_string()]));
        assert!(!launched_by_autostart(["dunno.exe".to_string()]));
    }

    #[test]
    fn screen_box_scales_position_and_size() {
        let wa = WorkArea { phys: Rect { x: 1920.0, y: 0.0, w: 2400.0, h: 1300.0 }, scale: 1.25 };
        assert_eq!(wa.screen_box(100.0, 40.0, 256.0, 180.4), (2045, 50, 320, 226));
        assert_eq!(wa.screen_box(-12.0, 0.0, 0.1, 0.0), (1905, 0, 1, 1));
    }

    #[test]
    fn near_radius_is_logical() {
        // %200: 110 mantıksal px = 220 fiziksel px -> yakın; 130 mantıksal -> uzak
        let center = (240.0, 336.0);
        assert!(cursor_state(&[PET], 2.0, center.0 - 220.0, center.1).near);
        assert!(!cursor_state(&[PET], 2.0, center.0 - 260.0, center.1).near);
    }
}
