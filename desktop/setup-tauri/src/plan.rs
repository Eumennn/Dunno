//! Saf kurulum kararları (test edilir). Dosya/süreç işi main.rs'te.

use std::path::{Path, PathBuf};

/// Tauri NSIS sessiz kurulum: arayüz yok, başlat menüsü + masaüstü kısayolu, kullanıcı başına (yönetici izni yok).
pub const SILENT_ARGS: &[&str] = &["/S"];

/// Uygulamanın kurulduğu yer: NSIS şablonu currentUser için `$LOCALAPPDATA\Dunno` (installer.nsi), exe adı Cargo paketi.
pub fn installed_exe(local_app_data: &Path) -> PathBuf {
    local_app_data.join("Dunno").join("dunno.exe")
}

/// NSIS Kaldır kaydı (HKCU): DisplayIcon = "\"C:\\...\\dunno.exe\"" (tırnaklı, bazen ",0" ikon indisli).
#[cfg_attr(not(windows), allow(dead_code))]
pub const UNINSTALL_KEY: &str = "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Dunno";

/// DisplayIcon değeri -> exe yolu (tırnak ve ",0" atılır). Boşsa ya da .exe değilse None.
#[cfg_attr(not(windows), allow(dead_code))]
pub fn exe_from_display_icon(v: &str) -> Option<PathBuf> {
    let mut s = v.trim();
    if let Some(i) = s.rfind(',') {
        if s[i + 1..].trim().parse::<i32>().is_ok() {
            s = s[..i].trim();
        }
    }
    let s = s.trim_matches('"').trim();
    (s.to_ascii_lowercase().ends_with(".exe")).then(|| PathBuf::from(s))
}

/// Geçici klasöre yazılan gömülü kurulumun adı (aynı anda iki kurulum birbirini ezmesin).
pub fn payload_name(pid: u32) -> String {
    format!("dunno-install-{pid}.exe")
}

/// FB11: programın çalışma şekli (komut satırından).
/// Ayarlar > Uygulamalar > Kaldır, kurulu klasördeki dunno-uninstall.exe'yi `--uninstall` ile açar (NSIS kaydı).
#[derive(Debug, PartialEq, Eq)]
pub enum Mode {
    Install,
    /// kurulu klasörden açıldı: kendini geçici klasöre kopyalayıp oradan yeniden açar (klasör silinebilsin)
    Relaunch { dir: PathBuf },
    /// geçici kopya: arayüzlü kaldırma
    Uninstall { dir: PathBuf },
}

/// args: program adı hariç. `exe_dir`: çalışan exe'nin klasörü (Relaunch için kurulu klasör).
pub fn parse_mode(args: &[String], exe_dir: &Path) -> Mode {
    if !args.iter().any(|a| a == "--uninstall") {
        return Mode::Install;
    }
    let dir = args
        .iter()
        .position(|a| a == "--dir")
        .and_then(|i| args.get(i + 1))
        .map(PathBuf::from);
    match (args.iter().any(|a| a == "--from-temp"), dir) {
        (true, Some(dir)) => Mode::Uninstall { dir },
        _ => Mode::Relaunch { dir: exe_dir.to_path_buf() },
    }
}

/// NSIS kaldırıcısı sessiz ve yerinde (_?= : kendini kopyalayıp beklemeden dönmesin; en sonda olmalı). /DATA: ayarlar da gitsin.
pub fn nsis_uninstall_args(dir: &Path, delete_data: bool) -> Vec<String> {
    let mut a = vec!["/S".to_string()];
    if delete_data {
        a.push("/DATA".into());
    }
    a.push(format!("_?={}", dir.display()));
    a
}

#[derive(Debug, PartialEq, Eq)]
pub enum Outcome {
    Ok,
    /// NSIS 1: kullanıcı iptal etti ya da kurulum durdu; 2: yarıda kesildi (ör. eski sürümden indirme/downgrade)
    Failed(String),
}

/// NSIS çıkış kodu -> sonuç. Süreç başlamadıysa (None) da hata.
pub fn outcome(code: Option<i32>) -> Outcome {
    match code {
        Some(0) => Outcome::Ok,
        Some(c) => Outcome::Failed(format!("installer exit {c}")),
        None => Outcome::Failed("installer did not run".into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn paths_and_names() {
        assert_eq!(installed_exe(Path::new("C:/x/Local")), PathBuf::from("C:/x/Local/Dunno/dunno.exe"));
        assert_eq!(payload_name(42), "dunno-install-42.exe");
        assert_eq!(SILENT_ARGS, &["/S"]);
    }

    #[test]
    fn display_icon_to_exe() {
        let want = Some(PathBuf::from(r"C:\Users\öz\AppData\Local\Dunno\dunno.exe"));
        assert_eq!(exe_from_display_icon(r#""C:\Users\öz\AppData\Local\Dunno\dunno.exe""#), want);
        assert_eq!(exe_from_display_icon(r#""C:\Users\öz\AppData\Local\Dunno\dunno.exe",0"#), want);
        assert_eq!(exe_from_display_icon(r"C:\Users\öz\AppData\Local\Dunno\dunno.exe"), want);
        assert_eq!(exe_from_display_icon(""), None);
        assert_eq!(exe_from_display_icon(r#""C:\x\icon.ico""#), None);
    }

    #[test]
    fn modes() {
        let d = Path::new("D:/Dunno");
        let a = |v: &[&str]| v.iter().map(|s| s.to_string()).collect::<Vec<_>>();
        assert_eq!(parse_mode(&a(&[]), d), Mode::Install);
        assert_eq!(parse_mode(&a(&["--uninstall"]), d), Mode::Relaunch { dir: d.into() });
        assert_eq!(
            parse_mode(&a(&["--uninstall", "--dir", "D:/Dunno", "--from-temp"]), Path::new("C:/tmp")),
            Mode::Uninstall { dir: d.into() }
        );
        // geçici kopya ama klasör yok: güvenli taraf, yeniden kopyalama (bulunduğu yer)
        assert_eq!(parse_mode(&a(&["--uninstall", "--from-temp"]), d), Mode::Relaunch { dir: d.into() });
        assert_eq!(nsis_uninstall_args(d, false), vec!["/S".to_string(), "_?=D:/Dunno".into()]);
        assert_eq!(nsis_uninstall_args(d, true), vec!["/S".to_string(), "/DATA".into(), "_?=D:/Dunno".into()]);
    }

    #[test]
    fn exit_codes() {
        assert_eq!(outcome(Some(0)), Outcome::Ok);
        assert_eq!(outcome(Some(2)), Outcome::Failed("installer exit 2".into()));
        assert!(matches!(outcome(None), Outcome::Failed(_)));
    }
}
