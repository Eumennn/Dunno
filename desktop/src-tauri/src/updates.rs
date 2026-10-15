//! İmzalı otomatik güncelleme (SPEC 10 CL1). Clicky'deki Sparkle + appcast fikri; Tauri updater eklentisiyle.
//! Kontrol: tauri.conf.json `plugins.updater.endpoints` (GitHub Releases latest.json), sadece GET; kimlik/cihaz bilgisi gitmez.
//! İmza: `plugins.updater.pubkey` ile doğrulanır (özel anahtar kullanıcının makinesinde, repoya girmez; docs/RELEASE.md).
//! `requireSignedVersion`: imzadaki sürüm uç noktanın dediğiyle aynı olmalı (eski imzalı sürüme düşürme saldırısı yok).
//! Kurulum sadece kullanıcı isteyince (about.txt "kur"); kontrol hatası sessiz: güncelleme yok sayılır, log yok.

use std::time::Duration;

use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_updater::{Updater, UpdaterExt};

/// FB12: kontrol isteği bu sürede bitmezse "güncelleme yok" sayılır (ağ takılınca about.txt "bakıyorum"da kalıyordu).
const CHECK_TIMEOUT: Duration = Duration::from_secs(20);
/// Kurulum indirmesi (birkaç MB) yavaş bağlantıda daha uzun sürebilir.
const INSTALL_TIMEOUT: Duration = Duration::from_secs(300);

fn updater(app: &AppHandle, timeout: Duration) -> Option<Updater> {
    app.updater_builder().timeout(timeout).build().ok()
}

/// webview'e giden özet: sadece sürüm ve not.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct UpdateInfo {
    pub version: String,
    pub notes: Option<String>,
}

/// Hata metni (about.txt'de elle kontrolde gösterilir; teşhis için). Kısa tutulur.
fn short(e: impl std::fmt::Display) -> String {
    e.to_string().chars().take(140).collect()
}

/// Yeni sürüm var mı (yoksa Ok(None)). FB12: hata artık yutulmaz, metni döner (ağ, zaman aşımı, imza, yapılandırma).
#[tauri::command]
pub async fn update_check(app: AppHandle) -> Result<Option<UpdateInfo>, String> {
    let updater = updater(&app, CHECK_TIMEOUT).ok_or("updater unavailable")?;
    let update = updater.check().await.map_err(short)?;
    Ok(update.map(|u| UpdateInfo {
        version: u.version.clone(),
        notes: u.body.clone(),
    }))
}

/// İndirir, imzayı doğrular, kurar (NSIS passive) ve yeniden başlatır. Başarısızsa hata metni; uygulama aynen sürer.
#[tauri::command]
pub async fn update_install(app: AppHandle) -> Result<(), String> {
    let updater = updater(&app, INSTALL_TIMEOUT).ok_or("updater unavailable")?;
    let update = updater.check().await.map_err(short)?.ok_or("no update")?;
    update.download_and_install(|_, _| {}, || {}).await.map_err(short)?;
    app.restart()
}
