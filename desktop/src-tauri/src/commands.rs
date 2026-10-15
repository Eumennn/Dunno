// TS -> Rust komutları (karşılığı: src/ipc.ts).
use tauri::{AppHandle, State, WebviewWindow};

use crate::window::{self, PetWindow, Rect, WorkAreaInfo};

/// Tıklamayı alan bölgeleri günceller (pencereye göre, mantıksal piksel). İlki pet kutusu.
#[tauri::command]
pub fn set_hit_rects(state: State<'_, PetWindow>, rects: Vec<Rect>) {
    state.set_rects(rects);
}

/// Pet'in dolu piksel rect'leri (pencereye göre, mantıksal; SPEC 08 SZ1c). Tıklama sadece bunlarda; kutu yakınlık için.
#[tauri::command]
pub fn set_pet_mask(state: State<'_, PetWindow>, rects: Vec<Rect>) {
    state.set_mask(rects);
}

/// Sürükleme sırasında pencere imleç kutudan kaysa bile tıklamayı alsın.
#[tauri::command]
pub fn set_capture(state: State<'_, PetWindow>, on: bool) {
    state.set_capture(on);
}

/// Birincil ekran çalışma alanı (mantıksal piksel).
#[tauri::command]
pub fn get_work_area(app: AppHandle, state: State<'_, PetWindow>) -> Option<WorkAreaInfo> {
    state
        .work_area()
        .or_else(|| window::read_work_area(&app))
        .map(|wa| wa.info())
}

/// Pencerenin sol üst köşesini çalışma alanına göre mantıksal konuma taşır.
#[tauri::command]
pub fn move_window(win: WebviewWindow, state: State<'_, PetWindow>, x: f64, y: f64) -> Result<(), String> {
    let wa = state.work_area().ok_or("work area unknown")?;
    window::move_to(&win, &state, &wa, x, y).map_err(|e| e.to_string())
}

/// İlk açılış / soru kutusu gibi klavye gereken anlarda pencere odak alabilir; bitince bırakır.
#[tauri::command]
pub fn set_interactive(win: WebviewWindow, state: State<'_, PetWindow>, on: bool) -> Result<(), String> {
    if on {
        state.remember_focus(window::foreground_handle());
        win.set_focusable(true).map_err(|e| e.to_string())?;
        win.set_focus().map_err(|e| e.to_string())
    } else {
        win.set_focusable(false).map_err(|e| e.to_string())?;
        if let Some(h) = state.take_focus() {
            window::restore_foreground(h);
        }
        Ok(())
    }
}

/// Açılır yüzey (UP1): pencereyi çalışma alanına göre mantıksal kutuya taşı + boyutla; kapanınca taban boyuta döner.
#[tauri::command]
pub fn set_window_box(win: WebviewWindow, state: State<'_, PetWindow>, x: f64, y: f64, w: f64, h: f64) -> Result<(), String> {
    let wa = state.work_area().ok_or("work area unknown")?;
    window::set_box(&win, &state, &wa, x, y, w, h).map_err(|e| e.to_string())
}

/// Toplantı koruması: pet'i gizler ya da odak çalmadan geri getirir.
#[tauri::command]
pub fn set_pet_visible(win: WebviewWindow, visible: bool) -> Result<(), String> {
    window::set_visible(&win, visible).map_err(|e| e.to_string())
}

/// Teşhis anahtarları (ortam değişkeni; bkz. window::DebugFlags).
#[tauri::command]
pub fn get_debug_flags() -> window::DebugFlags {
    window::debug_flags()
}

/// Teşhis: şimdiye kadar yapılan SetWindowPos sayısı (hız ölçümü için).
#[tauri::command]
pub fn get_move_count(state: State<'_, PetWindow>) -> u64 {
    state.move_count()
}

/// dunno.exe penceresini aç (pet penceresinden de çağrılabilir). async: pencere ilk kez burada oluşturulabilir ve
/// Windows'ta senkron komuttan pencere oluşturmak kilitlenir (Tauri belgesi).
#[tauri::command]
pub async fn open_app_window(app: AppHandle) -> Result<(), String> {
    window::open_app_window(&app).map_err(|e| e.to_string())
}

/// Çağıran pencerenin kendi başlık çubuğu (ui-kit .bar): sürükle / küçült / kapat (= gizle).
/// JS pencere API'si izinleri kapalı olduğu için komutla.
#[tauri::command]
pub fn window_drag(win: WebviewWindow) -> Result<(), String> {
    win.start_dragging().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn window_minimize(win: WebviewWindow) -> Result<(), String> {
    win.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn window_hide(win: WebviewWindow) -> Result<(), String> {
    if win.label() == crate::window::APP_LABEL {
        crate::app_window::save(&win, true);
    }
    win.hide().map_err(|e| e.to_string())
}

/// dunno.exe büyüt / eski boyut (SPEC 07 FB3). Dönen: şimdi büyütülmüş mü.
#[tauri::command]
pub fn window_toggle_maximize(win: WebviewWindow) -> Result<bool, String> {
    let max = win.is_maximized().map_err(|e| e.to_string())?;
    if max { win.unmaximize() } else { win.maximize() }.map_err(|e| e.to_string())?;
    if win.label() == crate::window::APP_LABEL {
        crate::app_window::save(&win, true);
    }
    Ok(!max)
}

/// FB10-2: dunno.exe büyük pencerede (ekranı kaplayınca, tam ekran) arayüzü orantılı büyütür (Ctrl+ yakınlaştırma gibi;
/// düzen küçük bir pencere görür, piksel yoğunluğu artar). Değer webview'dan (app/zoom.ts), 1-2 arası.
#[tauri::command]
pub fn set_app_zoom(win: WebviewWindow, factor: f64) -> Result<(), String> {
    if !factor.is_finite() {
        return Err("bad zoom".into());
    }
    win.set_zoom(factor.clamp(1.0, 2.0)).map_err(|e| e.to_string())
}

/// FB10-2: F11 tam ekran (sadece dunno.exe). Dönen: yeni durum.
#[tauri::command]
pub fn window_toggle_fullscreen(win: WebviewWindow) -> Result<bool, String> {
    let on = !win.is_fullscreen().map_err(|e| e.to_string())?;
    win.set_fullscreen(on).map_err(|e| e.to_string())?;
    Ok(on)
}

/// Windows ile başlat: gerçek durum kayıt defterinden okunur.
#[tauri::command]
pub fn get_autostart(app: AppHandle) -> bool {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch().is_enabled().unwrap_or(false)
}

#[tauri::command]
pub fn set_autostart(app: AppHandle, on: bool) -> bool {
    use tauri_plugin_autostart::ManagerExt;
    let launcher = app.autolaunch();
    let _ = if on { launcher.enable() } else { launcher.disable() };
    launcher.is_enabled().unwrap_or(false)
}

/// Mods klasörü (SPEC 12 B): `%APPDATA%\app.dunno.desktop\mods`. Okunamazsa None.
fn mods_root(app: &AppHandle) -> Option<std::path::PathBuf> {
    use tauri::Manager;
    app.path().app_data_dir().ok().map(|d| d.join("mods"))
}

/// SPEC 18 workshop / AI dünya: paketi mods klasörüne kurar (Rust yeniden denetler). Döner: klasör adı.
#[tauri::command]
pub fn install_pack(app: AppHandle, pack: crate::mods::PackIn) -> Result<String, String> {
    let root = mods_root(&app).ok_or("no mods dir")?;
    crate::mods::install(&root, &pack)
}

/// SPEC 18 workshop: kurulu paketi kaldırır.
#[tauri::command]
pub fn remove_pack(app: AppHandle, dir: String) -> Result<(), String> {
    let root = mods_root(&app).ok_or("no mods dir")?;
    crate::mods::remove(&root, &dir)
}

/// Tüm mod klasörlerini ham okur (doğrulama webview'de, mods.ts). Mod kodu çalıştırılmaz.
#[tauri::command]
pub fn list_mods(app: AppHandle) -> Vec<crate::mods::ModDir> {
    mods_root(&app).map(|r| crate::mods::read_mods(&r)).unwrap_or_default()
}

/// settings.exe'de gösterilecek mods klasörü yolu.
#[tauri::command]
pub fn mods_dir(app: AppHandle) -> Option<String> {
    mods_root(&app).map(|p| p.to_string_lossy().into_owned())
}

/// settings.exe "klasörü aç": mods klasörünü (yoksa oluşturup) Gezgin'de açar. Sadece bu klasör; yol kullanıcıdan gelmez.
#[tauri::command]
pub fn open_mods_dir(app: AppHandle) -> bool {
    let Some(dir) = mods_root(&app) else { return false };
    if std::fs::create_dir_all(&dir).is_err() {
        return false;
    }
    #[cfg(windows)]
    {
        std::process::Command::new("explorer.exe").arg(&dir).spawn().is_ok()
    }
    #[cfg(not(windows))]
    {
        std::process::Command::new("xdg-open").arg(&dir).spawn().is_ok()
    }
}

/// Modlar açılıp kapanınca "şimdi yeniden başlat" (modlar açılışta yüklenir).
#[tauri::command]
pub fn restart_app(app: AppHandle) {
    app.restart();
}

/// SPEC 17 paylaşım kartı: en fazla bu kadar bayt (300x180 PNG birkaç KB; sınır kötüye kullanıma karşı)
pub const CARD_MAX_BYTES: usize = 2_000_000;
const PNG_MAGIC: &[u8] = b"\x89PNG\r\n\x1a\n";

/// Kart PNG'si geçerli mi (imza + boyut). Yol ve ad kullanıcıdan gelmez.
pub fn is_card_png(bytes: &[u8]) -> bool {
    bytes.len() <= CARD_MAX_BYTES && bytes.starts_with(PNG_MAGIC)
}

/// Kart dosya adı: dunno-card-<unix saniye>.png (tarih kütüphanesi yok; sıralanabilir).
pub fn card_file_name(unix_secs: u64) -> String {
    format!("dunno-card-{unix_secs}.png")
}

/// pet.txt "kaydet" (SPEC 17 R9): kartı Resimler/Dunno klasörüne yazar, yolu döner ve klasörü açar. Ağ yok.
#[tauri::command]
pub fn save_card(app: AppHandle, png: Vec<u8>) -> Result<String, String> {
    use tauri::Manager;
    if !is_card_png(&png) {
        return Err("not a card".into());
    }
    let base = app.path().picture_dir().or_else(|_| app.path().download_dir()).map_err(|e| e.to_string())?;
    let dir = base.join("Dunno");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let secs = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
    let path = dir.join(card_file_name(secs));
    std::fs::write(&path, &png).map_err(|e| e.to_string())?;
    #[cfg(windows)]
    {
        let _ = std::process::Command::new("explorer.exe").arg("/select,").arg(&path).spawn();
    }
    Ok(path.to_string_lossy().into_owned())
}

/// Paylaşım GIF'i (dunno.exe pet.txt): en fazla 4 MB, GIF89a imzası şart.
pub const GIF_MAX_BYTES: usize = 4_000_000;

pub fn is_share_gif(bytes: &[u8]) -> bool {
    bytes.len() <= GIF_MAX_BYTES && bytes.starts_with(b"GIF89a") && bytes.last() == Some(&0x3b)
}

/// pet.txt "gif kaydet": Resimler/Dunno klasörüne dunno-<unix saniye>.gif yazar, yolu döner, klasörü açar. Ağ yok.
#[tauri::command]
pub fn save_gif(app: AppHandle, gif: Vec<u8>) -> Result<String, String> {
    use tauri::Manager;
    if !is_share_gif(&gif) {
        return Err("not a gif".into());
    }
    let base = app.path().picture_dir().or_else(|_| app.path().download_dir()).map_err(|e| e.to_string())?;
    let dir = base.join("Dunno");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let secs = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
    let path = dir.join(format!("dunno-{secs}.gif"));
    std::fs::write(&path, &gif).map_err(|e| e.to_string())?;
    #[cfg(windows)]
    {
        let _ = std::process::Command::new("explorer.exe").arg("/select,").arg(&path).spawn();
    }
    Ok(path.to_string_lossy().into_owned())
}

/// Lisans dosyası (SPEC 15): `%APPDATA%\app.dunno.desktop\license.txt`.
fn license_path(app: &AppHandle) -> Option<std::path::PathBuf> {
    use tauri::Manager;
    app.path().app_data_dir().ok().map(|d| d.join("license.txt"))
}

/// Pro durumu: kayıtlı lisans her çağrıda yeniden doğrulanır (çevrimdışı).
#[tauri::command]
pub fn license_status(app: AppHandle) -> crate::license::LicenseStatus {
    let saved = license_path(&app).and_then(|p| std::fs::read_to_string(p).ok());
    crate::license::status_of(saved.as_deref(), crate::license::builtin_key().as_ref())
}

/// Anahtarı doğrular; geçerliyse kaydeder. Geçersizse kayıtlı lisans değişmez, hata nedeni döner.
#[tauri::command]
pub fn license_activate(app: AppHandle, key: String) -> crate::license::LicenseStatus {
    let Some(pk) = crate::license::builtin_key() else {
        return crate::license::status_of(None, None);
    };
    // SPEC 18: Pro ya da sadece kozmetik paket lisansı
    match crate::license::verify_full(&key, &pk) {
        Ok(_) => {
            if let Some(p) = license_path(&app) {
                if let Some(dir) = p.parent() {
                    let _ = std::fs::create_dir_all(dir);
                }
                let _ = std::fs::write(&p, key.trim());
            }
            license_status(app)
        }
        Err(e) => crate::license::LicenseStatus { error: Some(e.into()), ..license_status(app) },
    }
}

/// SPEC 18 AI dünya üretici: sunucunun Pro'yu doğrulaması için kayıtlı lisans metni (sadece geçerli Pro lisansıysa).
/// Lisansta kişisel veri yok (rastgele kimlik + tür + tarih + imza).
#[tauri::command]
pub fn license_token(app: AppHandle) -> Option<String> {
    let pk = crate::license::builtin_key()?;
    let saved = license_path(&app).and_then(|p| std::fs::read_to_string(p).ok())?;
    // imzası geçerli her lisans (süresi geçmiş abonelik dahil: yenileme için); Pro kontrolünü sunucu yapar
    crate::license::verify_full(&saved, &pk).ok().map(|_| saved.trim().to_string())
}

/// Lisansı bu bilgisayardan kaldırır.
#[tauri::command]
pub fn license_remove(app: AppHandle) -> crate::license::LicenseStatus {
    if let Some(p) = license_path(&app) {
        let _ = std::fs::remove_file(p);
    }
    license_status(app)
}


#[cfg(test)]
mod tests {
    #[test]
    fn share_gif_is_checked() {
        assert!(super::is_share_gif(b"GIF89a\x01\x00;"));
        assert!(!super::is_share_gif(b"GIF87a\x01\x00;"));
        assert!(!super::is_share_gif(b"GIF89a\x01\x00"));
        let mut big = b"GIF89a".to_vec();
        big.resize(super::GIF_MAX_BYTES + 1, 0x3b);
        assert!(!super::is_share_gif(&big));
    }

    #[test]
    fn card_png_is_checked() {
        let mut ok = super::PNG_MAGIC.to_vec();
        ok.extend_from_slice(&[0; 16]);
        assert!(super::is_card_png(&ok));
        assert!(!super::is_card_png(b"GIF89a"));
        assert!(!super::is_card_png(&vec![0x89; super::CARD_MAX_BYTES + 1]));
        assert_eq!(super::card_file_name(42), "dunno-card-42.png");
    }
}
