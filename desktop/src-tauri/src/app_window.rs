//! dunno.exe pencere yerleşimi (SPEC 07 FB3): boyut, konum ve büyütülmüş durumu hatırlanır.
//! Store'a değil ayrı dosyaya yazılır (app config dizini, app-window.json): store'un tek yazanı pet penceresi.
//! Kayıtlı yer artık hiçbir ekrana düşmüyorsa (monitör söküldü, çözünürlük değişti) yok sayılır, varsayılan ortalanır.

use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, LogicalSize, Manager, PhysicalPosition, PhysicalSize, WebviewWindow};

use crate::window::APP_LABEL;

/// Varsayılan ve en küçük boyut (mantıksal px).
pub const DEFAULT_SIZE: (f64, f64) = (900.0, 620.0);
pub const MIN_SIZE: (f64, f64) = (720.0, 580.0);
/// Kayıtlı pencerenin en az bu kadarı (fiziksel px) bir ekranda görünmeli.
const MIN_VISIBLE: (i64, i64) = (120, 60);
/// Taşırken/boyutlarken dosyaya en sık bu aralıkla yazılır.
const SAVE_EVERY: Duration = Duration::from_millis(500);
const FILE: &str = "app-window.json";

/// Fiziksel px: Windows'un verdiği değerler; ölçek değişse de ekranda aynı yere oturur.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Placement {
    pub x: i32,
    pub y: i32,
    pub w: u32,
    pub h: u32,
    pub maximized: bool,
}

/// Ekran dikdörtgeni (fiziksel px).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Screen {
    pub x: i32,
    pub y: i32,
    pub w: u32,
    pub h: u32,
}

/// Kayıt hâlâ kullanılabilir mi: pozitif boyut ve bir ekranla en az MIN_VISIBLE kadar kesişim.
pub fn sanitize(p: Placement, screens: &[Screen]) -> Option<Placement> {
    if p.w == 0 || p.h == 0 {
        return None;
    }
    let visible = screens.iter().any(|s| {
        let ix = (i64::from(p.x) + i64::from(p.w)).min(i64::from(s.x) + i64::from(s.w)) - i64::from(p.x).max(i64::from(s.x));
        let iy = (i64::from(p.y) + i64::from(p.h)).min(i64::from(s.y) + i64::from(s.h)) - i64::from(p.y).max(i64::from(s.y));
        ix >= MIN_VISIBLE.0 && iy >= MIN_VISIBLE.1
    });
    visible.then_some(p)
}

struct Saver {
    last: Option<Instant>,
    /// büyütülmüşken normal boyut ezilmesin diye son normal yer
    normal: Option<Placement>,
}

static SAVER: Mutex<Saver> = Mutex::new(Saver { last: None, normal: None });

fn path(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_config_dir().ok().map(|d| d.join(FILE))
}

fn screens(win: &WebviewWindow) -> Vec<Screen> {
    win.available_monitors()
        .unwrap_or_default()
        .iter()
        .map(|m| Screen {
            x: m.position().x,
            y: m.position().y,
            w: m.size().width,
            h: m.size().height,
        })
        .collect()
}

/// Açılışta (pencere görünmeden önce): kayıtlı yer geçerliyse oraya, değilse varsayılan boyutta ortala.
pub fn restore(app: &AppHandle) {
    let Some(win) = app.get_webview_window(APP_LABEL) else { return };
    let _ = win.set_min_size(Some(LogicalSize::new(MIN_SIZE.0, MIN_SIZE.1)));
    let saved = path(app)
        .and_then(|p| fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str::<Placement>(&s).ok())
        .and_then(|p| sanitize(p, &screens(&win)));
    match saved {
        Some(p) => {
            let _ = win.set_size(PhysicalSize::new(p.w, p.h));
            let _ = win.set_position(PhysicalPosition::new(p.x, p.y));
            if let Ok(mut s) = SAVER.lock() {
                s.normal = Some(Placement { maximized: false, ..p });
            }
            if p.maximized {
                let _ = win.maximize();
            }
        }
        None => {
            let _ = win.set_size(LogicalSize::new(DEFAULT_SIZE.0, DEFAULT_SIZE.1));
            let _ = win.center();
        }
    }
}

/// Taşındı / boyutlandı / gizlendi: yeri kaydeder (force değilse SAVE_EVERY sınırıyla).
pub fn save(win: &WebviewWindow, force: bool) {
    let Ok(mut s) = SAVER.lock() else { return };
    if !force && s.last.is_some_and(|t| t.elapsed() < SAVE_EVERY) {
        return;
    }
    let maximized = win.is_maximized().unwrap_or(false);
    let minimized = win.is_minimized().unwrap_or(false);
    if minimized {
        return; // küçültülmüşken konum anlamsız (-32000)
    }
    if !maximized {
        if let (Ok(pos), Ok(size)) = (win.outer_position(), win.inner_size()) {
            s.normal = Some(Placement {
                x: pos.x,
                y: pos.y,
                w: size.width,
                h: size.height,
                maximized: false,
            });
        }
    }
    let Some(normal) = s.normal else { return };
    s.last = Some(Instant::now());
    let out = Placement { maximized, ..normal };
    if let (Some(p), Ok(json)) = (path(win.app_handle()), serde_json::to_string(&out)) {
        if let Some(dir) = p.parent() {
            let _ = fs::create_dir_all(dir);
        }
        let _ = fs::write(p, json);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const MAIN: Screen = Screen { x: 0, y: 0, w: 1920, h: 1080 };
    const LEFT: Screen = Screen { x: -1280, y: 0, w: 1280, h: 1024 };
    const P: Placement = Placement { x: 100, y: 100, w: 1350, h: 930, maximized: false };

    #[test]
    fn keeps_a_placement_on_some_screen() {
        assert_eq!(sanitize(P, &[MAIN]), Some(P));
        let on_left = Placement { x: -1260, ..P }; // sadece 90 px ana ekranda, gerisi solda
        assert_eq!(sanitize(on_left, &[MAIN, LEFT]), Some(on_left));
        // biraz taşan da olur: en az 120x60 görünüyor
        assert!(sanitize(Placement { x: 1810, y: 1000, ..P }, &[MAIN]).is_none()); // 110 px görünür
        assert!(sanitize(Placement { x: 1780, y: 1000, ..P }, &[MAIN]).is_some());
    }

    #[test]
    fn drops_a_placement_on_a_removed_screen_or_empty() {
        assert_eq!(sanitize(Placement { x: -1260, ..P }, &[MAIN]), None);
        assert_eq!(sanitize(Placement { w: 0, ..P }, &[MAIN]), None);
        assert_eq!(sanitize(P, &[]), None);
    }

    #[test]
    fn round_trips_as_json() {
        let p = Placement { maximized: true, ..P };
        let json = serde_json::to_string(&p).unwrap();
        assert_eq!(serde_json::from_str::<Placement>(&json).unwrap(), p);
    }
}
