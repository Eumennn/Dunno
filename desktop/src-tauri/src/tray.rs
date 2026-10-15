//! Tray menüsü (M2, sade): dunno.exe'yi aç · bugün sus · toplantıdayım · çıkış. Ayarların geri kalanı dunno.exe penceresinde.
//! Rust ayar yazmaz: "bugün sus" `tray://action` olayı olur, TS ayarı günceller ve `update_tray_state` ile menüyü senkronlar.
//! İstisnalar: "toplantıdayım" doğrudan watch'a gider (olay da yayılır), "aç" pencereyi açar, "çıkış" olay beklemeden kapatır.
//! Tray simgesine sol tık da dunno.exe'yi açar; menü sağ tıkla.

use std::collections::HashMap;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::menu::{CheckMenuItem, Menu, MenuEvent, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, Wry};

use crate::watch;
use crate::window;

pub const EVENT_TRAY: &str = "tray://action";
pub const TRAY_ID: &str = "dunno";

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Lang {
    #[default]
    Tr,
    En,
}

/// Menüdeki metinler. Tek yer: `tray_label`.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum Label {
    Open,
    MuteToday,
    Meeting,
    /// SPEC 17: Dunno sesi aç/kapa (hızlı sessize alma)
    Voice,
    Quit,
}

/// placeholder: tasarımcının metinleri gelene kadar. Marka sesi: küçük harf, ünlemsiz, kısa.
pub fn tray_label(label: Label, lang: Lang) -> &'static str {
    use Label::*;
    match (label, lang) {
        (Open, Lang::Tr) => "dunno.exe'yi aç",
        (Open, Lang::En) => "open dunno.exe",
        (MuteToday, Lang::Tr) => "bugün sus",
        (MuteToday, Lang::En) => "quiet today",
        (Meeting, Lang::Tr) => "toplantıdayım",
        (Meeting, Lang::En) => "in a meeting",
        (Voice, Lang::Tr) => "dunno sesi",
        (Voice, Lang::En) => "dunno voice",
        (Quit, Lang::Tr) => "çıkış",
        (Quit, Lang::En) => "quit",
    }
}

// Menü öğesi id'leri.
pub const ID_OPEN: &str = "open";
pub const ID_MUTE_TODAY: &str = "mute_today";
pub const ID_MEETING: &str = "meeting";
pub const ID_VOICE: &str = "voice";
pub const ID_QUIT: &str = "quit";

/// İşaretlenebilir öğeler (id, etiket), menüdeki sırayla.
pub const CHECK_ITEMS: &[(&str, Label)] = &[(ID_MUTE_TODAY, Label::MuteToday), (ID_MEETING, Label::Meeting), (ID_VOICE, Label::Voice)];

/// `tray://action` yükü: {action, value?}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
pub struct TrayAction {
    pub action: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<bool>,
}

/// Menü id'si + (işaretli öğenin tıklama sonrası durumu) -> olay. Bilinmeyen id ve "aç": None.
pub fn action_for(id: &str, checked: bool) -> Option<TrayAction> {
    Some(match id {
        ID_MUTE_TODAY => TrayAction { action: "mute_today", value: Some(checked) },
        ID_MEETING => TrayAction { action: "meeting", value: Some(checked) },
        ID_VOICE => TrayAction { action: "voice", value: Some(checked) },
        ID_QUIT => TrayAction { action: "quit", value: None },
        _ => return None,
    })
}

/// TS'ten gelen menü durumu (`update_tray_state`). Bilinmeyen alanlar yok sayılır.
#[derive(Clone, Debug, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrayState {
    pub muted: bool,
    pub lang: Lang,
    pub manual_meeting: bool,
    /// SPEC 17: Dunno sesi açık mı (eski TS sürümü göndermezse açık sayılır)
    #[serde(default = "yes")]
    pub voice: bool,
}

fn yes() -> bool {
    true
}

/// Durum -> işaretli olması gereken öğe id'leri.
pub fn checked_ids(state: &TrayState) -> Vec<&'static str> {
    let mut out = Vec::new();
    if state.muted {
        out.push(ID_MUTE_TODAY);
    }
    if state.manual_meeting {
        out.push(ID_MEETING);
    }
    if state.voice {
        out.push(ID_VOICE);
    }
    out
}

pub struct TrayMenu {
    checks: HashMap<&'static str, CheckMenuItem<Wry>>,
    open: MenuItem<Wry>,
    quit: MenuItem<Wry>,
    lang: Mutex<Lang>,
}

impl TrayMenu {
    fn set_lang(&self, lang: Lang) {
        let mut current = self.lang.lock().unwrap_or_else(|e| e.into_inner());
        if *current == lang {
            return;
        }
        *current = lang;
        for (id, label) in CHECK_ITEMS {
            if let Some(item) = self.checks.get(id) {
                let _ = item.set_text(tray_label(*label, lang));
            }
        }
        let _ = self.open.set_text(tray_label(Label::Open, lang));
        let _ = self.quit.set_text(tray_label(Label::Quit, lang));
    }

    fn set_checked(&self, id: &str, on: bool) {
        if let Some(item) = self.checks.get(id) {
            let _ = item.set_checked(on);
        }
    }

    fn is_checked(&self, id: &str) -> bool {
        self.checks.get(id).and_then(|i| i.is_checked().ok()).unwrap_or(false)
    }
}

pub fn setup(app: &AppHandle) -> tauri::Result<()> {
    let lang = Lang::default();
    let mut checks = HashMap::new();
    for (id, label) in CHECK_ITEMS {
        let item = CheckMenuItem::with_id(app, *id, tray_label(*label, lang), true, false, None::<&str>)?;
        checks.insert(*id, item);
    }
    let open = MenuItem::with_id(app, ID_OPEN, tray_label(Label::Open, lang), true, None::<&str>)?;
    let quit = MenuItem::with_id(app, ID_QUIT, tray_label(Label::Quit, lang), true, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[
            &open,
            &PredefinedMenuItem::separator(app)?,
            &checks[ID_MUTE_TODAY],
            &checks[ID_MEETING],
            &PredefinedMenuItem::separator(app)?,
            &quit,
        ],
    )?;

    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .tooltip("dunno")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(on_menu_event)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                let _ = window::open_app_window(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;

    app.manage(TrayMenu { checks, open, quit, lang: Mutex::new(lang) });
    Ok(())
}

fn on_menu_event(app: &AppHandle, event: MenuEvent) {
    let id = event.id().as_ref();
    match id {
        ID_QUIT => {
            app.exit(0);
            return;
        }
        ID_OPEN => {
            let _ = window::open_app_window(app);
            return;
        }
        _ => {}
    }
    let Some(tray) = app.try_state::<TrayMenu>() else {
        return;
    };
    // Windows menüsü işareti tıklamada kendisi çevirir; okunan değer tıklama sonrası durumdur.
    let checked = tray.is_checked(id);
    if id == ID_MEETING {
        watch::set_manual_meeting(checked);
    }
    if let Some(action) = action_for(id, checked) {
        // tüm pencerelere: pet ayarı yazar, dunno.exe anahtarlarını günceller
        let _ = app.emit(EVENT_TRAY, action);
    }
}

/// TS ayarları değişince (ya da açılışta) menüyü senkronlar; "toplantıdayım" durumunu watch'a da uygular.
#[tauri::command]
pub fn update_tray_state(app: AppHandle, state: TrayState) -> Result<(), String> {
    let tray = app.try_state::<TrayMenu>().ok_or("tray not ready")?;
    tray.set_lang(state.lang);
    let on = checked_ids(&state);
    for (id, _) in CHECK_ITEMS {
        tray.set_checked(id, on.contains(id));
    }
    watch::set_manual_meeting(state.manual_meeting);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tauri::ipc::{InvokeResponseBody, IpcResponse};

    const LABELS: &[Label] = &[Label::Open, Label::MuteToday, Label::Meeting, Label::Quit];

    fn to_json<T: Serialize>(value: T) -> String {
        match value.body().expect("serialize") {
            InvokeResponseBody::Json(s) => s,
            InvokeResponseBody::Raw(_) => panic!("expected json"),
        }
    }

    #[test]
    fn every_label_has_both_languages_in_brand_voice() {
        for label in LABELS {
            for lang in [Lang::Tr, Lang::En] {
                let text = tray_label(*label, lang);
                assert!(!text.is_empty());
                assert_eq!(text, text.to_lowercase(), "{text}");
                assert!(!text.contains('!'), "{text}");
            }
        }
    }

    #[test]
    fn menu_is_the_simple_four() {
        assert_eq!(CHECK_ITEMS.iter().map(|(id, _)| *id).collect::<Vec<_>>(), [ID_MUTE_TODAY, ID_MEETING, ID_VOICE]);
        assert_eq!(tray_label(Label::Open, Lang::Tr), "dunno.exe'yi aç");
    }

    #[test]
    fn check_items_send_their_new_state() {
        assert_eq!(action_for(ID_MUTE_TODAY, true), Some(TrayAction { action: "mute_today", value: Some(true) }));
        assert_eq!(action_for(ID_MEETING, false), Some(TrayAction { action: "meeting", value: Some(false) }));
        assert_eq!(action_for(ID_QUIT, false), Some(TrayAction { action: "quit", value: None }));
        assert_eq!(action_for(ID_OPEN, false), None);
        assert_eq!(action_for("mode:street", true), None);
    }

    #[test]
    fn payload_json_shape() {
        assert_eq!(to_json(action_for(ID_MUTE_TODAY, true).unwrap()), r#"{"action":"mute_today","value":true}"#);
        assert_eq!(to_json(action_for(ID_QUIT, true).unwrap()), r#"{"action":"quit"}"#);
    }

    #[test]
    fn state_to_checked_items() {
        assert!(checked_ids(&TrayState::default()).is_empty());
        let s = TrayState { muted: true, lang: Lang::En, manual_meeting: true, voice: true };
        assert_eq!(checked_ids(&s), [ID_MUTE_TODAY, ID_MEETING, ID_VOICE]);
    }
}
