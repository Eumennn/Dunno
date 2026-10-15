//! Toplantı koruması: saf karar + çıkış histerezisi. Başarısızlık modu güvenli taraf: emin değilsen toplantı say.
//! Girdiler cihazda okunur (context::windows); pencere başlığı buraya sadece anlık &str olarak gelir,
//! hiçbir yere kopyalanmaz, saklanmaz, loglanmaz.

use serde::Serialize;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
pub enum Meeting {
    InMeeting,
    Clear,
}

/// Önde olunca her zaman toplantı sayılan uygulama etiketleri (context::apps).
pub const MEETING_APPS: &[&str] = &["zoom", "teams", "webex"];

/// Çalışıyorsa toplantı/paylaşım var demek olan süreçler (exe adı küçük harf, ".exe" yok).
/// cpthost: Zoom toplantı/ekran paylaşımı; atmgr: Webex toplantı yöneticisi.
#[cfg_attr(not(windows), allow(dead_code))] // Windows'a özel (başlık/süreç okuma); macOS'ta başlık okunmuyor
pub const MEETING_PROCESSES: &[&str] = &["cpthost", "atmgr"];

/// Tarayıcı başlığında toplantı belirtisi (küçük harf, içerir).
#[cfg_attr(not(any(windows, target_os = "macos")), allow(dead_code))] // başlık okuma: Windows, macOS (izinle)
const TITLE_PATTERNS: &[&str] = &[
    "meet.google.com",
    "google meet",
    "meet - ",
    "meet \u{2013} ",
    "zoom meeting",
    "zoom webinar",
    "zoom workplace",
    "microsoft teams",
    "teams.microsoft.com",
    "webex",
];

/// Çıkış için bu kadar süre kesintisiz Clear görülmeli (toplantı uygulaması hâlâ açıkken: alt-tab titremesi olmasın).
pub const EXIT_HOLD_MS: u64 = 10_000;
/// Toplantı uygulaması kapandıysa (ya da tarayıcı toplantısı) kısa bekleme: geri dönüş ≤ 1.5 sn (SPEC 07 FB4).
pub const FAST_EXIT_MS: u64 = 500;

/// Başlık toplantı kalıbına uyuyor mu. Sadece bool döner; başlık burada da tutulmaz.
#[cfg_attr(not(any(windows, target_os = "macos")), allow(dead_code))] // başlık okuma: Windows, macOS (izinle)
pub fn title_suggests_meeting(title: &str) -> bool {
    let lower = title.to_lowercase();
    TITLE_PATTERNS.iter().any(|p| lower.contains(p))
}

/// Exe adı (küçük harf, ".exe" yok) bilinen toplantı süreci mi.
#[cfg_attr(not(windows), allow(dead_code))] // Windows'a özel (başlık/süreç okuma); macOS'ta başlık okunmuyor
pub fn is_meeting_process(exe_stem: &str) -> bool {
    MEETING_PROCESSES.contains(&exe_stem)
}

/// Anlık karar.
/// - okuma hatası, manuel anahtar ya da bilinen toplantı süreci -> InMeeting
/// - zoom/teams/webex önde -> InMeeting
/// - tarayıcı önde ve başlık toplantı kalıbına uyuyor -> InMeeting
/// - diğer her şey -> Clear
pub fn meeting_state(
    app: Option<&str>,
    title_hint: bool,
    meeting_procs_running: bool,
    manual_toggle: bool,
    read_error: bool,
) -> Meeting {
    if read_error || manual_toggle || meeting_procs_running {
        return Meeting::InMeeting;
    }
    match app {
        Some(a) if MEETING_APPS.contains(&a) => Meeting::InMeeting,
        Some("browser") if title_hint => Meeting::InMeeting,
        _ => Meeting::Clear,
    }
}

/// Giriş anında, çıkış `hold_ms` boyunca kesintisiz Clear görülünce.
/// Saat dışarıdan (monoton ms) verilir; saf ve test edilebilir.
#[derive(Clone, Debug)]
pub struct MeetingGate {
    hold_ms: u64,
    state: Meeting,
    clear_since: Option<u64>,
}

impl Default for MeetingGate {
    fn default() -> Self {
        Self::new(EXIT_HOLD_MS)
    }
}

impl MeetingGate {
    pub fn new(hold_ms: u64) -> Self {
        Self {
            hold_ms,
            state: Meeting::Clear,
            clear_since: None,
        }
    }

    /// Yeni anlık kararı işler, geçerli (yumuşatılmış) durumu döner. Toplantı uygulaması açık sayılır (uzun bekleme).
    #[cfg(test)]
    pub fn update(&mut self, raw: Meeting, now_ms: u64) -> Meeting {
        self.update_app(raw, now_ms, true)
    }

    /// app_running: zoom/teams/webex süreci hâlâ çalışıyor mu. Değilse çıkış FAST_EXIT_MS sonra.
    pub fn update_app(&mut self, raw: Meeting, now_ms: u64, app_running: bool) -> Meeting {
        let hold = if app_running { self.hold_ms } else { self.hold_ms.min(FAST_EXIT_MS) };
        match raw {
            Meeting::InMeeting => {
                self.state = Meeting::InMeeting;
                self.clear_since = None;
            }
            Meeting::Clear if self.state == Meeting::InMeeting => {
                let since = *self.clear_since.get_or_insert(now_ms);
                if now_ms.saturating_sub(since) >= hold {
                    self.state = Meeting::Clear;
                    self.clear_since = None;
                }
            }
            Meeting::Clear => {}
        }
        self.state
    }

    /// Kullanıcı "toplantıdayım"ı kapattı ve başka işaret yok: beklemeden çık.
    pub fn release(&mut self) {
        self.state = Meeting::Clear;
        self.clear_since = None;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use Meeting::{Clear, InMeeting};

    #[test]
    fn meeting_apps_in_front() {
        for app in ["zoom", "teams", "webex"] {
            assert_eq!(
                meeting_state(Some(app), false, false, false, false),
                InMeeting,
                "{app}"
            );
        }
    }

    #[test]
    fn browser_needs_a_title_hint() {
        assert_eq!(
            meeting_state(Some("browser"), true, false, false, false),
            InMeeting
        );
        assert_eq!(
            meeting_state(Some("browser"), false, false, false, false),
            Clear
        );
        // başlık ipucu tarayıcı dışında karar vermez
        assert_eq!(
            meeting_state(Some("excel"), true, false, false, false),
            Clear
        );
    }

    #[test]
    fn meeting_process_manual_toggle_and_read_error_win() {
        for app in [None, Some("excel"), Some("browser")] {
            assert_eq!(meeting_state(app, false, true, false, false), InMeeting);
            assert_eq!(meeting_state(app, false, false, true, false), InMeeting);
            assert_eq!(meeting_state(app, false, false, false, true), InMeeting);
        }
    }

    #[test]
    fn everything_else_is_clear() {
        for app in [
            None,
            Some("excel"),
            Some("vscode"),
            Some("spotify"),
            Some("slack"),
        ] {
            assert_eq!(
                meeting_state(app, false, false, false, false),
                Clear,
                "{app:?}"
            );
        }
    }

    #[test]
    fn title_patterns() {
        for t in [
            "Meet - abc-defg-hij - Google Chrome",
            "Meet \u{2013} abc-defg-hij",
            "Google Meet - Mozilla Firefox",
            "meet.google.com/abc-defg-hij",
            "Zoom Meeting",
            "Zoom Workplace - Microsoft Edge",
            "Chat | Sprint planning | Microsoft Teams",
            "Cisco Webex Meetings",
        ] {
            assert!(title_suggests_meeting(t), "{t}");
        }
        for t in [
            "",
            "Inbox - Gmail",
            "zoom in on photos - Google Search",
            "Meeting notes.docx",
            "YouTube",
        ] {
            assert!(!title_suggests_meeting(t), "{t}");
        }
    }

    #[test]
    fn meeting_processes() {
        assert!(is_meeting_process("cpthost"));
        assert!(is_meeting_process("atmgr"));
        assert!(!is_meeting_process("zoom"));
        assert!(!is_meeting_process("ms-teams"));
    }

    #[test]
    fn gate_enters_at_once_and_leaves_after_hold() {
        let mut g = MeetingGate::new(10_000);
        assert_eq!(g.update(Clear, 0), Clear);
        assert_eq!(g.update(InMeeting, 1_000), InMeeting);
        assert_eq!(g.update(Clear, 2_000), InMeeting);
        assert_eq!(g.update(Clear, 11_999), InMeeting);
        assert_eq!(g.update(Clear, 12_000), Clear);
    }

    #[test]
    fn gate_restarts_the_hold_on_any_meeting_blip() {
        let mut g = MeetingGate::new(10_000);
        g.update(InMeeting, 0);
        g.update(Clear, 1_000);
        g.update(Clear, 9_000);
        assert_eq!(g.update(InMeeting, 10_000), InMeeting);
        assert_eq!(g.update(Clear, 11_000), InMeeting);
        assert_eq!(g.update(Clear, 20_999), InMeeting);
        assert_eq!(g.update(Clear, 21_000), Clear);
    }

    #[test]
    fn gate_survives_a_clock_going_backwards() {
        let mut g = MeetingGate::default();
        g.update(InMeeting, 50_000);
        g.update(Clear, 60_000);
        assert_eq!(g.update(Clear, 1_000), InMeeting);
    }

    #[test]
    fn closed_meeting_app_exits_fast() {
        // SPEC 07 FB4: uygulama kapandı -> ilk iki Clear örneğinde çıkış (POLL 500 ms ile ≤ 1.5 sn)
        let mut g = MeetingGate::default();
        g.update_app(InMeeting, 0, true);
        assert_eq!(g.update_app(Clear, 500, false), InMeeting);
        assert_eq!(g.update_app(Clear, 1_000, false), Clear);
        // açık ama önde değil (alt-tab): uzun bekleme sürer
        let mut h = MeetingGate::default();
        h.update_app(InMeeting, 0, true);
        assert_eq!(h.update_app(Clear, 1_000, true), InMeeting);
        assert_eq!(h.update_app(Clear, 5_000, true), InMeeting);
        assert_eq!(h.update_app(Clear, 6_000, false), Clear); // sonra kapandı: hemen
    }

    #[test]
    fn release_exits_immediately() {
        let mut g = MeetingGate::default();
        g.update(InMeeting, 0);
        g.update(Clear, 100);
        g.release();
        assert_eq!(g.update(Clear, 200), Clear);
    }
}
