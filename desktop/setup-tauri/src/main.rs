// FB9: Dunno'nun kendi kurulum programı. Pencere ve akış bizim (../src/setup); dosyaları Tauri'nin NSIS kurulumu
// koyar: içine gömülü, geçici klasöre yazılıp sessiz çalıştırılır, sonra silinir. Kaldırma ve güncelleme aynı NSIS kaydını kullanır.
// WebView2 yoksa (eski Windows 10) kendi penceremiz açılamaz: klasik NSIS kurulumu açılır, WebView2'yi o kurar.
// FB11: aynı program `--uninstall` ile kaldırıcıdır (içi boş derleme, kurulu klasörde dunno-uninstall.exe).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod plan;

use std::path::PathBuf;
use std::process::Command;
use std::sync::OnceLock;

use plan::{Mode, Outcome};
use serde::Serialize;

/// kaldırma modunda kurulu klasör
static UNINSTALL_DIR: OnceLock<PathBuf> = OnceLock::new();

static PAYLOAD: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/payload.exe"));

fn local_app_data() -> Option<PathBuf> {
    std::env::var_os("LOCALAPPDATA").map(PathBuf::from)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SetupInfo {
    /// "install" | "uninstall"
    mode: &'static str,
    /// zaten kurulu: "güncelle" dili
    existing: bool,
    version: &'static str,
    /// gömülü kurulum var mı (geliştirme derlemesinde yok)
    ready: bool,
}

#[tauri::command]
fn setup_info() -> SetupInfo {
    SetupInfo {
        mode: if UNINSTALL_DIR.get().is_some() { "uninstall" } else { "install" },
        existing: local_app_data().is_some_and(|d| plan::installed_exe(&d).exists()),
        version: option_env!("DUNNO_VERSION").unwrap_or(env!("CARGO_PKG_VERSION")),
        ready: !PAYLOAD.is_empty(),
    }
}

/// Gömülü kurulumu geçici dosyaya yazar ve args ile çalıştırıp bekler. Dosya her yolda silinir.
fn run_payload(args: &[&str]) -> Outcome {
    if PAYLOAD.is_empty() {
        return Outcome::Failed("empty setup".into());
    }
    let path = std::env::temp_dir().join(plan::payload_name(std::process::id()));
    if let Err(e) = std::fs::write(&path, PAYLOAD) {
        return Outcome::Failed(format!("write: {e}"));
    }
    let code = Command::new(&path).args(args).status().ok().and_then(|s| s.code());
    let _ = std::fs::remove_file(&path);
    plan::outcome(code)
}

#[tauri::command]
async fn install() -> Result<(), String> {
    let r = tauri::async_runtime::spawn_blocking(|| run_payload(plan::SILENT_ARGS))
        .await
        .map_err(|e| e.to_string())?;
    match r {
        Outcome::Ok => Ok(()),
        Outcome::Failed(why) => Err(why),
    }
}

/// NSIS Kaldır kaydındaki exe yolu (kurulum önceki bir yere yapılmışsa da doğru yer).
#[cfg(windows)]
fn registry_exe() -> Option<PathBuf> {
    use windows::core::HSTRING;
    use windows::Win32::System::Registry::{RegGetValueW, HKEY_CURRENT_USER, RRF_RT_REG_SZ};
    let mut buf = vec![0u16; 1024];
    let mut size = (buf.len() * 2) as u32;
    // Güvenli: buf yığında `size` bayt; API en fazla o kadar yazar ve yazdığını size'a koyar.
    let r = unsafe {
        RegGetValueW(
            HKEY_CURRENT_USER,
            &HSTRING::from(plan::UNINSTALL_KEY),
            &HSTRING::from("DisplayIcon"),
            RRF_RT_REG_SZ,
            None,
            Some(buf.as_mut_ptr().cast()),
            Some(&mut size),
        )
    };
    if r.is_err() {
        return None;
    }
    let n = (size as usize / 2).min(buf.len());
    let s = String::from_utf16_lossy(&buf[..n]);
    plan::exe_from_display_icon(s.trim_end_matches('\0'))
}

#[cfg(not(windows))]
fn registry_exe() -> Option<PathBuf> {
    None
}

/// Kurulan Dunno'yu açar (bitir ekranındaki kutu). Kurulum programı kapanınca Dunno açık kalır: explorer üzerinden
/// açılır (çift tıklama gibi), kurulum programının süreç ağacına bağlı kalmaz.
#[tauri::command]
fn launch() -> Result<(), String> {
    let exe = registry_exe()
        .filter(|p| p.exists())
        .or_else(|| local_app_data().map(|d| plan::installed_exe(&d)).filter(|p| p.exists()))
        .ok_or("dunno.exe not found")?;
    #[cfg(windows)]
    let r = Command::new("explorer.exe").arg(&exe).spawn();
    #[cfg(not(windows))]
    let r = Command::new(&exe).spawn();
    r.map(|_| ()).map_err(|e| e.to_string())
}

/// FB11: NSIS kaldırıcısını sessiz ve yerinde çalıştırır, sonra onun silemediği kendi dosyasını ve boş klasörü siler.
#[tauri::command]
async fn uninstall(delete_data: bool) -> Result<(), String> {
    let dir = UNINSTALL_DIR.get().cloned().ok_or("not in uninstall mode")?;
    tauri::async_runtime::spawn_blocking(move || {
        let nsis = dir.join("uninstall.exe");
        if !nsis.exists() {
            return Err("uninstall.exe not found".to_string());
        }
        let code = Command::new(&nsis)
            .args(plan::nsis_uninstall_args(&dir, delete_data))
            .status()
            .ok()
            .and_then(|s| s.code());
        match plan::outcome(code) {
            Outcome::Ok => {
                let _ = std::fs::remove_file(&nsis);
                let _ = std::fs::remove_file(dir.join("dunno-uninstall.exe"));
                let _ = std::fs::remove_dir(&dir); // boşsa
                Ok(())
            }
            Outcome::Failed(why) => Err(why),
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Geçici kopya kapanınca kendini sildirir (çalışırken silinemez): 2 sn sonra cmd siler, pencere açmadan.
fn schedule_self_delete() {
    let Ok(me) = std::env::current_exe() else { return };
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        let _ = Command::new("cmd")
            .args(["/C", "ping", "-n", "3", "127.0.0.1", ">nul", "&", "del", "/f", "/q"])
            .arg(&me)
            .creation_flags(CREATE_NO_WINDOW)
            .spawn();
    }
    #[cfg(not(windows))]
    let _ = me;
}

#[tauri::command]
fn quit(app: tauri::AppHandle) {
    // run() geri dönmez (olay döngüsü süreci bitirir): geçici kopyanın silinmesi burada ayarlanır
    if UNINSTALL_DIR.get().is_some() {
        schedule_self_delete();
    }
    app.exit(0);
}

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let me = std::env::current_exe().ok();
    let exe_dir = me.as_ref().and_then(|p| p.parent()).map(PathBuf::from).unwrap_or_default();
    match plan::parse_mode(&args, &exe_dir) {
        Mode::Relaunch { dir } => {
            // kurulu klasörden: geçici klasöre kopyala, oradan aç (bu dosya ve klasör silinebilsin)
            let tmp = std::env::temp_dir().join(format!("dunno-uninstall-{}.exe", std::process::id()));
            let ok = me.is_some_and(|m| std::fs::copy(m, &tmp).is_ok())
                && Command::new(&tmp)
                    .arg("--uninstall")
                    .arg("--dir")
                    .arg(&dir)
                    .arg("--from-temp")
                    .spawn()
                    .is_ok();
            if !ok {
                // kopyalanamadı: klasik NSIS kaldırıcısı
                let _ = Command::new(dir.join("uninstall.exe")).spawn();
            }
            return;
        }
        Mode::Uninstall { dir } => {
            if tauri::webview_version().is_err() {
                let _ = Command::new(dir.join("uninstall.exe")).spawn();
                schedule_self_delete();
                return;
            }
            let _ = UNINSTALL_DIR.set(dir);
        }
        Mode::Install => {
            if tauri::webview_version().is_err() {
                // WebView2 yok: klasik kurulum (arayüzlü), WebView2'yi indirip kurar
                let _ = run_payload(&[]);
                return;
            }
        }
    }
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![setup_info, install, launch, uninstall, quit])
        .run(tauri::generate_context!())
        .expect("dunno setup");
}
