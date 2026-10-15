//! Bağlam + toplantı izleyicisi: ayrı thread, POLL aralığında okur, sadece değişince olay yayar.
//! Olaylara sadece etiketler girer (app etiketi, trigger'lar, bool); exe yolu ve pencere başlığı asla.
//! Okuma hatası ya da panik döngüyü öldürmez; o tur toplantı sayılır (güvenli taraf).

use std::panic::catch_unwind;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, OnceLock};
use std::thread::{self, Thread};
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::context::{self, ContextSnapshot};
use crate::meeting::{meeting_state, Meeting, MeetingGate, MEETING_APPS};
use crate::window::MAIN_LABEL;

pub const EVENT_CONTEXT: &str = "context://changed";
pub const EVENT_MEETING: &str = "meeting://state";
/// Toplantı tespiti ≤1 sn, uygulama kapanınca geri dönüş ≤1.5 sn (SPEC 07 FB4).
pub const POLL: Duration = Duration::from_millis(500);
/// İzleyici thread'i: anahtar değişince POLL beklenmeden uyandırılır (park_timeout).
static WATCHER: OnceLock<Thread> = OnceLock::new();

/// Tray'deki "toplantıdayım" anahtarı.
static MANUAL: AtomicBool = AtomicBool::new(false);
/// settings.exe "sekme adlarına bak" (SPEC 09 K7b). Webview ayarı bildirene kadar kapalı: başlık okunmaz.
static TAB_TITLES: AtomicBool = AtomicBool::new(false);
/// Son yayınlanan durum; webview olaylardan önce yüklenirse get_watch_state ile çeker.
/// İlk okumadan önce güvenli taraf: toplantıda.
static LAST: Mutex<WatchState> = Mutex::new(WatchState {
    context: None,
    in_meeting: true,
});

/// `context://changed` yükü.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextPayload {
    /// app etiketi ("excel", "browser" ...); tanınmayan uygulamada null
    pub app: Option<String>,
    pub idle_trigger: Option<&'static str>,
    pub battery_trigger: Option<&'static str>,
    pub time_trigger: &'static str,
    /// öndeki sekme/pencere başlığının site kategorisi (SPEC 09 K7b); başlığın kendisi asla
    pub site: Option<String>,
    /// sessiz kategori: o pencere öndeyken laf yok
    pub site_silent: bool,
}

/// `meeting://state` yükü.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MeetingPayload {
    pub in_meeting: bool,
}

/// get_watch_state cevabı.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WatchState {
    pub context: Option<ContextPayload>,
    pub in_meeting: bool,
}

/// Bir okumanın girdileri (platformdan bağımsız, testte elle kurulur).
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Inputs {
    pub snapshot: ContextSnapshot,
    pub hour: u8,
    pub title_hint: bool,
    pub meeting_procs_running: bool,
    /// zoom/teams/webex süreci çalışıyor (önde olmasa da)
    pub meeting_app_running: bool,
    pub read_error: bool,
}

/// Toplantıyı başlatan işaret: çıkışta ne kadar bekleneceğini belirler.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
enum Source {
    #[default]
    None,
    /// zoom/teams/webex önde: uygulama açık kaldıkça uzun bekleme (alt-tab), kapanınca hızlı
    App,
    /// tarayıcı toplantısı: tarayıcı açık kalır, uzun bekleme
    Browser,
    /// toplantı süreci (cpthost/atmgr) ya da elle anahtar: bitince hemen
    Direct,
    /// okuma hatası / panik: güvenli taraf, uzun bekleme
    Unknown,
}

fn source_of(i: Option<&Inputs>, manual: bool) -> Source {
    let Some(i) = i else { return Source::Unknown };
    if manual || i.meeting_procs_running {
        Source::Direct
    } else if i.read_error {
        Source::Unknown
    } else if i.snapshot.app.as_deref().is_some_and(|a| MEETING_APPS.contains(&a)) {
        Source::App
    } else if i.title_hint {
        Source::Browser
    } else {
        Source::None
    }
}

/// Ham okuma -> olay yükü. Ham idle_secs girmez, sadece eşik etiketi.
pub fn context_payload(snapshot: &ContextSnapshot, hour: u8) -> ContextPayload {
    ContextPayload {
        app: snapshot.app.clone(),
        idle_trigger: context::idle_trigger(snapshot.idle_secs),
        battery_trigger: context::battery_trigger(snapshot.battery_pct, snapshot.on_ac),
        time_trigger: context::time_trigger(hour),
        site: snapshot.site.clone(),
        site_silent: snapshot.site_silent,
    }
}

/// Yayınlanacak bir değişiklik var mı (app / idle eşiği / pil eşiği / saat dilimi).
pub fn diff_snapshot(prev: Option<&ContextPayload>, next: &ContextPayload) -> bool {
    prev != Some(next)
}

/// Bir turun yayınlanacakları.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Emit {
    pub context: Option<ContextPayload>,
    pub meeting: Option<bool>,
}

/// Döngünün saf kısmı: girdiler + saat -> yayınlanacaklar.
#[derive(Debug, Default)]
pub struct Watcher {
    gate: MeetingGate,
    last_context: Option<ContextPayload>,
    last_meeting: Option<bool>,
    last_manual: bool,
    source: Source,
}

impl Watcher {
    /// `inputs` None = okuma panikledi; o tur toplantı sayılır, bağlam yayınlanmaz.
    pub fn step(&mut self, inputs: Option<&Inputs>, manual: bool, now_ms: u64) -> Emit {
        let mut out = Emit::default();
        let raw = match inputs {
            None => Meeting::InMeeting,
            Some(i) => {
                if !i.read_error {
                    let payload = context_payload(&i.snapshot, i.hour);
                    if diff_snapshot(self.last_context.as_ref(), &payload) {
                        self.last_context = Some(payload.clone());
                        out.context = Some(payload);
                    }
                }
                meeting_state(
                    i.snapshot.app.as_deref(),
                    i.title_hint,
                    i.meeting_procs_running,
                    manual,
                    i.read_error,
                )
            }
        };
        let source = source_of(inputs, manual);
        if raw == Meeting::InMeeting {
            self.source = source;
        }
        // elle kapatıldı: başka işaret yoksa beklemeden çık (aşağıdaki update yine InMeeting görürse kalır)
        if self.last_manual && !manual {
            self.gate.release();
        }
        self.last_manual = manual;
        let long_hold = match self.source {
            Source::App => inputs.is_some_and(|i| i.meeting_app_running),
            Source::Browser | Source::Unknown => true,
            Source::Direct | Source::None => false,
        };
        let in_meeting = self.gate.update_app(raw, now_ms, long_hold) == Meeting::InMeeting;
        if self.last_meeting != Some(in_meeting) {
            self.last_meeting = Some(in_meeting);
            out.meeting = Some(in_meeting);
        }
        out
    }
}

/// Tray / dunno.exe anahtarı; izleyici hemen uyanır (POLL beklenmez, SPEC 07 FB4: kapatınca ≤ 300 ms).
#[tauri::command]
pub fn set_manual_meeting(on: bool) {
    MANUAL.store(on, Ordering::Relaxed);
    if let Some(t) = WATCHER.get() {
        t.unpark();
    }
}

/// settings.exe "sekme adlarına bak" (SPEC 09 K7b): kapalıyken başlık hiç okunmaz. İzleyici hemen uyanır.
#[tauri::command]
pub fn set_tab_titles(on: bool) {
    TAB_TITLES.store(on, Ordering::Relaxed);
    if let Some(t) = WATCHER.get() {
        t.unpark();
    }
}

/// macOS Erişilebilirlik izni (SPEC 19 M4): "granted" | "missing"; başka platformda "na" (izin gerekmez).
/// prompt sadece settings.exe "izin ver" düğmesinden true gelir: macOS kendi penceresini açar.
#[tauri::command]
pub fn accessibility_status(prompt: bool) -> &'static str {
    #[cfg(target_os = "macos")]
    {
        let ok = context::macos::accessibility(prompt);
        if ok {
            if let Some(t) = WATCHER.get() {
                t.unpark();
            }
        }
        if ok { "granted" } else { "missing" }
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = prompt;
        "na"
    }
}

/// Son yayınlanan durum (webview geç yüklenirse ilk olayları kaçırmasın).
#[tauri::command]
pub fn get_watch_state() -> WatchState {
    LAST.lock().map(|s| s.clone()).unwrap_or(WatchState {
        context: None,
        in_meeting: true,
    })
}

#[cfg(windows)]
fn read_inputs() -> Inputs {
    let r = context::windows::read(TAB_TITLES.load(Ordering::Relaxed));
    Inputs {
        snapshot: r.snapshot,
        hour: context::windows::local_hour(),
        title_hint: r.title_hint,
        meeting_procs_running: r.meeting_procs_running,
        meeting_app_running: r.meeting_app_running,
        read_error: r.read_error,
    }
}

/// macOS (SPEC 19): öndeki uygulama + çalışan toplantı uygulamaları + boşta kalma + pil.
/// Başlık sadece ayar açık ve Erişilebilirlik izni varsa (M4).
#[cfg(target_os = "macos")]
fn read_inputs() -> Inputs {
    let r = context::macos::read(TAB_TITLES.load(Ordering::Relaxed));
    Inputs {
        snapshot: r.snapshot,
        hour: context::macos::local_hour(),
        title_hint: r.title_hint,
        meeting_procs_running: r.meeting_app_front,
        meeting_app_running: r.meeting_app_running,
        read_error: r.read_error,
    }
}

/// Bu platformda okuma yok: her zaman güvenli taraf.
#[cfg(not(any(windows, target_os = "macos")))]
fn read_inputs() -> Inputs {
    Inputs {
        read_error: true,
        ..Inputs::default()
    }
}

pub fn spawn(app: AppHandle) {
    thread::spawn(move || {
        let _ = WATCHER.set(thread::current());
        let start = Instant::now();
        let mut watcher = Watcher::default();
        loop {
            let inputs = catch_unwind(read_inputs).ok();
            let now_ms = start.elapsed().as_millis() as u64;
            let emit = watcher.step(inputs.as_ref(), MANUAL.load(Ordering::Relaxed), now_ms);
            publish(&app, &emit);
            #[cfg(debug_assertions)]
            probe(&emit);
            thread::park_timeout(POLL);
        }
    });
}

fn publish(app: &AppHandle, emit: &Emit) {
    if emit.context.is_none() && emit.meeting.is_none() {
        return;
    }
    // Panik (zehirli kilit) yayını durdurmasın: içerik yine de güncellenir.
    let mut last = LAST.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(c) = &emit.context {
        last.context = Some(c.clone());
        let _ = app.emit_to(MAIN_LABEL, EVENT_CONTEXT, c);
    }
    if let Some(m) = emit.meeting {
        last.in_meeting = m;
        let _ = app.emit_to(MAIN_LABEL, EVENT_MEETING, MeetingPayload { in_meeting: m });
    }
}

/// Sadece debug build + DUNNO_WATCH_PROBE=<dosya> iken: yayınlanan olayları zamanla dosyaya ekler
/// (app etiketi ve bool; başlık/exe yolu yok). Toplantı tespit süresini ölçmek için.
#[cfg(debug_assertions)]
fn probe(emit: &Emit) {
    use std::io::Write;
    let Ok(path) = std::env::var("DUNNO_WATCH_PROBE") else {
        return;
    };
    let Ok(mut f) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
    else {
        return;
    };
    // duvar saati: dış ölçüm aracı aynı saatle karşılaştırır
    let unix_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    if let Some(c) = &emit.context {
        let _ = writeln!(
            f,
            "{unix_ms} context app={}",
            c.app.as_deref().unwrap_or("-")
        );
    }
    if let Some(m) = emit.meeting {
        let _ = writeln!(f, "{unix_ms} meeting in_meeting={m}");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tauri::ipc::{InvokeResponseBody, IpcResponse};

    /// Tauri'nin olay/komut yüklerini serileştirdiği yol (serde_json), ek bağımlılık olmadan.
    fn to_json<T: Serialize>(value: T) -> String {
        match value.body().expect("serialize") {
            InvokeResponseBody::Json(s) => s,
            InvokeResponseBody::Raw(_) => panic!("expected json"),
        }
    }

    fn inputs(app: Option<&str>, idle_secs: u64) -> Inputs {
        Inputs {
            snapshot: ContextSnapshot {
                app: app.map(str::to_string),
                idle_secs,
                battery_pct: Some(80),
                on_ac: Some(true),
                ..ContextSnapshot::default()
            },
            hour: 14,
            ..Inputs::default()
        }
    }

    #[test]
    fn site_category_only_never_title() {
        let mut i = inputs(Some("browser"), 5);
        i.snapshot.site = Some("video".into());
        let json = to_json(context_payload(&i.snapshot, 14));
        assert!(json.contains(r#""site":"video","siteSilent":false"#), "{json}");
        let mut quiet = inputs(Some("browser"), 5);
        quiet.snapshot.site = Some("adult".into());
        quiet.snapshot.site_silent = true;
        let a = context_payload(&i.snapshot, 14);
        let b = context_payload(&quiet.snapshot, 14);
        assert!(diff_snapshot(Some(&a), &b), "kategori değişimi yayınlanır");
        assert!(to_json(b).contains(r#""siteSilent":true"#));
    }

    #[test]
    fn payload_uses_labels_only() {
        let p = context_payload(&inputs(Some("excel"), 31 * 60).snapshot, 14);
        assert_eq!(
            p,
            ContextPayload {
                app: Some("excel".into()),
                idle_trigger: Some("idle:30"),
                battery_trigger: None,
                time_trigger: "time:noon",
                site: None,
                site_silent: false,
            }
        );
        let json = to_json(p);
        assert_eq!(
            json,
            r#"{"app":"excel","idleTrigger":"idle:30","batteryTrigger":null,"timeTrigger":"time:noon","site":null,"siteSilent":false}"#
        );
        assert_eq!(
            to_json(MeetingPayload { in_meeting: true }),
            r#"{"inMeeting":true}"#
        );
    }

    #[test]
    fn diff_ignores_raw_idle_seconds_but_sees_thresholds() {
        let a = context_payload(&inputs(Some("excel"), 5).snapshot, 14);
        let b = context_payload(&inputs(Some("excel"), 9 * 60).snapshot, 14);
        let c = context_payload(&inputs(Some("excel"), 10 * 60).snapshot, 14);
        assert!(diff_snapshot(None, &a));
        assert!(!diff_snapshot(Some(&a), &b));
        assert!(diff_snapshot(Some(&b), &c));
        let night = context_payload(&inputs(Some("excel"), 5).snapshot, 22);
        assert!(diff_snapshot(Some(&a), &night));
        let mut low = inputs(Some("excel"), 5);
        low.snapshot.battery_pct = Some(10);
        low.snapshot.on_ac = Some(false);
        assert!(diff_snapshot(Some(&a), &context_payload(&low.snapshot, 14)));
    }

    #[test]
    fn first_step_publishes_both_then_only_changes() {
        let mut w = Watcher::default();
        let first = w.step(Some(&inputs(Some("excel"), 5)), false, 0);
        assert!(first.context.is_some());
        assert_eq!(first.meeting, Some(false));
        assert_eq!(
            w.step(Some(&inputs(Some("excel"), 6)), false, 750),
            Emit::default()
        );
        let switched = w.step(Some(&inputs(Some("vscode"), 0)), false, 1500);
        assert_eq!(switched.context.unwrap().app.as_deref(), Some("vscode"));
        assert_eq!(switched.meeting, None);
    }

    #[test]
    fn meeting_enters_on_the_same_tick_and_leaves_after_the_hold() {
        let mut w = Watcher::default();
        w.step(Some(&inputs(Some("excel"), 0)), false, 0);
        let mut browser_meet = inputs(Some("browser"), 0);
        browser_meet.title_hint = true;
        assert_eq!(w.step(Some(&browser_meet), false, 750).meeting, Some(true));
        assert_eq!(
            w.step(Some(&inputs(Some("excel"), 0)), false, 1500).meeting,
            None
        );
        assert_eq!(
            w.step(Some(&inputs(Some("excel"), 0)), false, 11_499)
                .meeting,
            None
        );
        assert_eq!(
            w.step(Some(&inputs(Some("excel"), 0)), false, 11_500)
                .meeting,
            Some(false)
        );
    }

    #[test]
    fn zoom_teams_and_meeting_processes_are_meetings() {
        for app in ["zoom", "teams", "webex"] {
            let mut w = Watcher::default();
            assert_eq!(
                w.step(Some(&inputs(Some(app), 0)), false, 0).meeting,
                Some(true)
            );
        }
        let mut w = Watcher::default();
        let mut share = inputs(Some("excel"), 0);
        share.meeting_procs_running = true;
        assert_eq!(w.step(Some(&share), false, 0).meeting, Some(true));
    }

    #[test]
    fn manual_toggle_read_error_and_panic_mean_meeting() {
        let mut w = Watcher::default();
        assert_eq!(w.step(Some(&inputs(None, 0)), true, 0).meeting, Some(true));

        let mut w = Watcher::default();
        let mut broken = inputs(Some("excel"), 0);
        broken.read_error = true;
        let e = w.step(Some(&broken), false, 0);
        assert_eq!(e.meeting, Some(true));
        assert_eq!(e.context, None);

        let mut w = Watcher::default();
        w.step(Some(&inputs(Some("excel"), 0)), false, 0);
        assert_eq!(
            w.step(None, false, 750),
            Emit {
                context: None,
                meeting: Some(true)
            }
        );
    }

    #[test]
    fn closed_meeting_app_returns_within_1500_ms() {
        // SPEC 07 FB4: teams önde -> kapandı; POLL aralığıyla örnekle, çıkış ≤ 1.5 sn
        let mut w = Watcher::default();
        let mut teams = inputs(Some("teams"), 0);
        teams.meeting_app_running = true;
        assert_eq!(w.step(Some(&teams), false, 0).meeting, Some(true));
        let closed = inputs(Some("excel"), 0);
        let poll = POLL.as_millis() as u64;
        let mut t = 0;
        let left = loop {
            t += poll;
            if w.step(Some(&closed), false, t).meeting == Some(false) {
                break t;
            }
            assert!(t < 5_000);
        };
        assert!(left <= 1_500, "left after {left} ms");
    }

    #[test]
    fn meeting_app_still_open_keeps_the_long_hold() {
        let mut w = Watcher::default();
        let mut zoom = inputs(Some("zoom"), 0);
        zoom.meeting_app_running = true;
        w.step(Some(&zoom), false, 0);
        let mut alt_tab = inputs(Some("excel"), 0);
        alt_tab.meeting_app_running = true;
        assert_eq!(w.step(Some(&alt_tab), false, 5_000).meeting, None);
        assert_eq!(w.step(Some(&alt_tab), false, 15_000).meeting, Some(false));
    }

    #[test]
    fn manual_off_leaves_on_the_next_step_unless_a_meeting_app_is_in_front() {
        let mut w = Watcher::default();
        w.step(Some(&inputs(Some("excel"), 0)), false, 0);
        assert_eq!(w.step(Some(&inputs(Some("excel"), 0)), true, 100).meeting, Some(true));
        assert_eq!(w.step(Some(&inputs(Some("excel"), 0)), false, 200).meeting, Some(false));
        // zoom önde: elle kapatmak toplantıdan çıkarmaz
        let mut w = Watcher::default();
        let zoom = inputs(Some("zoom"), 0);
        w.step(Some(&zoom), true, 0);
        assert_eq!(w.step(Some(&zoom), false, 100).meeting, None);
    }

    #[test]
    fn manual_switch_round_trip() {
        set_manual_meeting(true);
        assert!(MANUAL.load(Ordering::Relaxed));
        set_manual_meeting(false);
        assert!(!MANUAL.load(Ordering::Relaxed));
    }

    #[test]
    fn poll_is_under_a_second() {
        assert!(POLL < Duration::from_secs(1));
    }
}
