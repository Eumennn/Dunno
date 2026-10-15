//! Çalan müzik özeti (FB8, isteğe bağlı, varsayılan KAPALI). Windows'un sistem medya denetimi (ses panelindeki "şu an çalan"):
//! Spotify, tarayıcıda YouTube, Müzik uygulaması... Giriş/hesap bağlama yok, ağ yok.
//! Şarkı adı ve sanatçı Rust'tan HİÇ çıkmaz: sadece karması (aynı şarkı mı), çalıyor mu ve kaynak uygulama etiketi.
//! Dunno sanatçı/şarkı adı söylemez (gerçek kişi kuralı), saklamaz, göndermez.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::OnceLock;
use std::thread::{self, Thread};
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::window::MAIN_LABEL;

pub const EVENT_MEDIA: &str = "media://now";
/// medya sorgusu WinRT çağrısı: bağlam yoklamasından seyrek
pub const MEDIA_POLL: Duration = Duration::from_secs(3);

static ON: AtomicBool = AtomicBool::new(false);
static THREAD: OnceLock<Thread> = OnceLock::new();

/// `media://now` yükü. Metin yok.
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize)]
pub struct MediaNow {
    /// kaynak uygulama etiketi ("spotify", "browser"); tanınmazsa null
    pub app: Option<String>,
    pub playing: bool,
    /// şarkı adı + sanatçının karması (0: bilgi yok). Geri çevrilemez, sadece "aynı mı" için.
    pub track: u64,
}

/// karma: süreç içi sabit (DefaultHasher::new sabit anahtarlı)
#[cfg_attr(not(windows), allow(dead_code))] // medya okuma şimdilik sadece Windows'ta
pub fn track_key(title: &str, artist: &str) -> u64 {
    use std::hash::{Hash, Hasher};
    if title.trim().is_empty() {
        return 0;
    }
    let mut h = std::collections::hash_map::DefaultHasher::new();
    title.trim().to_lowercase().hash(&mut h);
    artist.trim().to_lowercase().hash(&mut h);
    h.finish().max(1)
}

#[cfg(windows)]
fn read() -> Option<MediaNow> {
    use windows::Media::Control::{
        GlobalSystemMediaTransportControlsSessionManager as Manager, GlobalSystemMediaTransportControlsSessionPlaybackStatus as Status,
    };
    let manager = Manager::RequestAsync().ok()?.get().ok()?;
    let session = manager.GetCurrentSession().ok()?;
    let source = session.SourceAppUserModelId().map(|h| h.to_string()).unwrap_or_default();
    let app = crate::context::apps::app_for_exe(&source_stem(&source)).map(str::to_string);
    let playing = session.GetPlaybackInfo().ok()?.PlaybackStatus().ok()? == Status::Playing;
    let props = session.TryGetMediaPropertiesAsync().ok()?.get().ok()?;
    let title = props.Title().map(|h| h.to_string()).unwrap_or_default();
    let artist = props.Artist().map(|h| h.to_string()).unwrap_or_default();
    // başlık ve sanatçı bu fonksiyonun yığınında kalır; dışarı sadece karma
    Some(MediaNow { app, playing, track: track_key(&title, &artist) })
}

#[cfg(not(windows))]
fn read() -> Option<MediaNow> {
    None
}

/// "Spotify.exe", "Chrome", "Microsoft.ZuneMusic_8wekyb3d8bbwe!Microsoft.ZuneMusic" -> exe adı benzeri kök
#[cfg_attr(not(windows), allow(dead_code))] // medya okuma şimdilik sadece Windows'ta
pub fn source_stem(source: &str) -> String {
    let s = source.split('!').next().unwrap_or(source);
    let s = s.split('_').next().unwrap_or(s);
    crate::context::apps::exe_stem(s)
}

/// settings.exe "müziğe tepki" anahtarı; kapalıyken medya hiç sorgulanmaz
#[tauri::command]
pub fn set_music_watch(on: bool) {
    ON.store(on, Ordering::Relaxed);
    if let Some(t) = THREAD.get() {
        t.unpark();
    }
}

pub fn spawn(app: AppHandle) {
    thread::spawn(move || {
        let _ = THREAD.set(thread::current());
        let mut last: Option<MediaNow> = None;
        loop {
            if ON.load(Ordering::Relaxed) {
                let now = std::panic::catch_unwind(read).ok().flatten();
                if now != last {
                    let _ = app.emit_to(MAIN_LABEL, EVENT_MEDIA, &now);
                    last = now;
                }
            } else if last.take().is_some() {
                let _ = app.emit_to(MAIN_LABEL, EVENT_MEDIA, Option::<MediaNow>::None);
            }
            thread::park_timeout(MEDIA_POLL);
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn key_is_stable_and_textless() {
        assert_eq!(track_key("Song", "Artist"), track_key(" song ", "ARTIST"));
        assert_ne!(track_key("Song", "Artist"), track_key("Song 2", "Artist"));
        assert_eq!(track_key("", "x"), 0);
        let json = serde_json::to_string(&MediaNow { app: Some("spotify".into()), playing: true, track: track_key("secret title", "someone") }).unwrap();
        assert!(!json.contains("secret") && !json.contains("someone"));
    }

    #[test]
    fn source_ids_map_to_app_tags() {
        assert_eq!(source_stem("Spotify.exe"), "spotify");
        assert_eq!(source_stem("Microsoft.ZuneMusic_8wekyb3d8bbwe!Microsoft.ZuneMusic"), "microsoft.zunemusic");
        assert_eq!(crate::context::apps::app_for_exe(&source_stem("Spotify.exe")), Some("spotify"));
        assert_eq!(crate::context::apps::app_for_exe(&source_stem("Chrome")), Some("browser"));
    }
}
