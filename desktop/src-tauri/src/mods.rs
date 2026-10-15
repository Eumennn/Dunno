//! Veri modlarını güvenle okur (SPEC 12 B). Mod klasörü: `%APPDATA%\app.dunno.desktop\mods\<klasör>\`.
//! Okuyucu sadece okur ve ham verir; doğrulama ve birleştirme webview'de (desktop/src/mods/mods.ts). Mod kodu çalıştırılmaz.
//! Güvenlik: sembolik bağlantı/junction izlenmez (`symlink_metadata`), klasör dışına çıkılmaz (yollar klasöre göre),
//! derinlik, dosya sayısı ve boyut sınırlı, içerik sadece .json/.md/.txt (metin) ve .png (base64) için okunur.

use std::fs;
use std::path::{Path, PathBuf};

use base64::Engine;
use serde::{Deserialize, Serialize};

/// mods.ts ile aynı sınırlar (TS de denetler; burada okumayı kısar)
pub const MAX_FILES: usize = 64;
pub const MAX_FILE_BYTES: u64 = 256 * 1024;
pub const MAX_DEPTH: usize = 4;
pub const MAX_MODS: usize = 32;

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct ModFile {
    pub path: String,
    pub size: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub base64: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct ModDir {
    pub dir: String,
    pub files: Vec<ModFile>,
}

fn ext(name: &str) -> String {
    name.rsplit_once('.').map(|(_, e)| e.to_ascii_lowercase()).unwrap_or_default()
}

/// Bir mod klasörünü okur. Sembolik bağlantı `.symlink:<ad>` olarak listelenir (TS güvensiz yol diye reddeder), izlenmez.
/// Sınır aşılırsa fazladan bir giriş eklenir ki TS "çok dosya" desin; içerik okunmaz.
pub fn read_mod_dir(root: &Path) -> std::io::Result<ModDir> {
    let dir = root.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default();
    let mut files = Vec::new();
    walk(root, root, 0, &mut files)?;
    files.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(ModDir { dir, files })
}

fn walk(root: &Path, dir: &Path, depth: usize, out: &mut Vec<ModFile>) -> std::io::Result<()> {
    let mut entries: Vec<PathBuf> = fs::read_dir(dir)?.filter_map(|e| e.ok().map(|e| e.path())).collect();
    entries.sort();
    for p in entries {
        if out.len() > MAX_FILES {
            return Ok(());
        }
        let rel = p.strip_prefix(root).unwrap_or(&p).to_string_lossy().replace('\\', "/");
        let meta = fs::symlink_metadata(&p)?;
        if meta.file_type().is_symlink() {
            out.push(ModFile { path: format!(".symlink:{rel}"), size: 0, text: None, base64: None });
            continue;
        }
        if meta.is_dir() {
            if depth + 1 >= MAX_DEPTH {
                out.push(ModFile { path: format!("{rel}/.too-deep"), size: 0, text: None, base64: None });
                continue;
            }
            walk(root, &p, depth + 1, out)?;
            continue;
        }
        let size = meta.len();
        let e = ext(&rel);
        let (mut text, mut b64) = (None, None);
        if size <= MAX_FILE_BYTES {
            match e.as_str() {
                "json" | "md" | "txt" => text = fs::read(&p).ok().and_then(|b| String::from_utf8(b).ok()),
                "png" => b64 = fs::read(&p).ok().map(|b| base64::engine::general_purpose::STANDARD.encode(b)),
                _ => {}
            }
        }
        out.push(ModFile { path: rel, size, text, base64: b64 });
    }
    Ok(())
}

/// Mods klasöründeki tüm modlar (en fazla MAX_MODS, ada göre). Klasör yoksa oluşturulur (kullanıcı nereye koyacağını görsün).
pub fn read_mods(mods_root: &Path) -> Vec<ModDir> {
    let _ = fs::create_dir_all(mods_root);
    let Ok(rd) = fs::read_dir(mods_root) else { return vec![] };
    let mut dirs: Vec<PathBuf> = rd
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().map(|t| t.is_dir() && !t.is_symlink()).unwrap_or(false))
        .map(|e| e.path())
        .collect();
    dirs.sort();
    dirs.into_iter().take(MAX_MODS).filter_map(|d| read_mod_dir(&d).ok()).collect()
}

// ---------------------------------------------------------------- SPEC 18 workshop kurulumu
// Paket (workshop'tan ya da AI dünya üreticiden) webview'den gelir; burada yazılmadan önce yapısal olarak yeniden denetlenir:
// klasör adı, güvenli göreli yol (.. / mutlak / sürücü / ters bölü yok), sadece veri uzantıları, boyut, PNG imzası.
// Önce geçici klasöre yazılır, sonra eski sürümün yerine konur (yarım kurulum kalmaz). İçerik doğrulaması yine mods.ts'te.

pub const MAX_TOTAL_BYTES: usize = 2 * 1024 * 1024;

#[derive(Clone, Debug, Deserialize)]
pub struct PackFileIn {
    pub path: String,
    #[serde(default)]
    pub text: Option<String>,
    #[serde(default)]
    pub base64: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct PackIn {
    pub dir: String,
    pub files: Vec<PackFileIn>,
}

fn valid_dir(d: &str) -> bool {
    let b = d.as_bytes();
    (2..=32).contains(&b.len()) && b[0].is_ascii_lowercase() && b.iter().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || *c == b'_')
}

fn valid_rel(p: &str) -> bool {
    !p.is_empty()
        && p.len() <= 96
        && !p.starts_with('/')
        && !p.starts_with('.')
        && !p.contains("..")
        && !p.contains("//")
        && !p.contains('\\')
        && !p.contains(':')
        && p.split('/').count() <= MAX_DEPTH
        && p.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '-' | '.' | '/'))
}

/// Yazılacak dosyalar (göreli yol, bayt). Saf: testlenebilir.
pub fn plan_install(pack: &PackIn) -> Result<Vec<(String, Vec<u8>)>, &'static str> {
    if !valid_dir(&pack.dir) {
        return Err("bad dir");
    }
    if pack.files.is_empty() || pack.files.len() > MAX_FILES {
        return Err("file count");
    }
    let mut out = Vec::new();
    let mut total = 0usize;
    for f in &pack.files {
        if !valid_rel(&f.path) {
            return Err("unsafe path");
        }
        let e = ext(&f.path);
        let bytes = match (e.as_str(), &f.text, &f.base64) {
            ("json" | "md" | "txt", Some(t), _) => t.as_bytes().to_vec(),
            ("png", _, Some(b)) => {
                let raw = base64::engine::general_purpose::STANDARD.decode(b).map_err(|_| "bad png")?;
                if !raw.starts_with(b"\x89PNG\r\n\x1a\n") {
                    return Err("bad png");
                }
                raw
            }
            _ => return Err("file type"),
        };
        if bytes.len() as u64 > MAX_FILE_BYTES {
            return Err("file size");
        }
        total += bytes.len();
        out.push((f.path.clone(), bytes));
    }
    if total > MAX_TOTAL_BYTES {
        return Err("pack size");
    }
    if !out.iter().any(|(p, _)| p == "manifest.json") {
        return Err("no manifest");
    }
    Ok(out)
}

/// Paketi mods kökü altına kurar (varsa günceller). Döner: klasör adı.
pub fn install(mods_root: &Path, pack: &PackIn) -> Result<String, String> {
    let files = plan_install(pack).map_err(str::to_string)?;
    fs::create_dir_all(mods_root).map_err(|e| e.to_string())?;
    let tmp = mods_root.join(format!(".tmp-{}", pack.dir));
    let _ = fs::remove_dir_all(&tmp);
    for (rel, bytes) in &files {
        let p = tmp.join(rel);
        if let Some(parent) = p.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        fs::write(&p, bytes).map_err(|e| e.to_string())?;
    }
    let dest = mods_root.join(&pack.dir);
    if fs::symlink_metadata(&dest).is_ok() {
        fs::remove_dir_all(&dest).map_err(|e| e.to_string())?;
    }
    fs::rename(&tmp, &dest).map_err(|e| e.to_string())?;
    Ok(pack.dir.clone())
}

/// Workshop'tan kurulan modu siler (sadece geçerli ad, sadece mods kökü altında).
pub fn remove(mods_root: &Path, dir: &str) -> Result<(), String> {
    if !valid_dir(dir) {
        return Err("bad dir".into());
    }
    let dest = mods_root.join(dir);
    if fs::symlink_metadata(&dest).map(|m| m.file_type().is_symlink()).unwrap_or(true) {
        return Err("not found".into());
    }
    fs::remove_dir_all(&dest).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    fn pack(files: Vec<(&str, Option<&str>, Option<&str>)>) -> PackIn {
        PackIn {
            dir: "cozy_pack".into(),
            files: files.into_iter().map(|(p, t, b)| PackFileIn { path: p.into(), text: t.map(Into::into), base64: b.map(Into::into) }).collect(),
        }
    }

    #[test]
    fn install_plan_rejects_unsafe_packs() {
        let ok = pack(vec![("manifest.json", Some("{}"), None), ("reactions/tr.json", Some("[]"), None)]);
        assert_eq!(plan_install(&ok).unwrap().len(), 2);
        for bad in [
            pack(vec![("manifest.json", Some("{}"), None), ("../evil.json", Some("{}"), None)]),
            pack(vec![("manifest.json", Some("{}"), None), ("c:/win.json", Some("{}"), None)]),
            pack(vec![("manifest.json", Some("{}"), None), ("a\\b.json", Some("{}"), None)]),
            pack(vec![("manifest.json", Some("{}"), None), ("run.exe", Some("x"), None)]),
            pack(vec![("manifest.json", Some("{}"), None), ("img.png", None, Some("AAAA"))]),
            pack(vec![("reactions/tr.json", Some("[]"), None)]),
        ] {
            assert!(plan_install(&bad).is_err());
        }
        let mut bad_dir = ok.clone();
        bad_dir.dir = "../x".into();
        assert!(plan_install(&bad_dir).is_err());
    }

    #[test]
    fn install_writes_then_replaces_and_removes() {
        let root = std::env::temp_dir().join(format!("dunno-ws-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        let p = pack(vec![("manifest.json", Some("{\"v\":1}"), None), ("reactions/tr.json", Some("[]"), None)]);
        assert_eq!(install(&root, &p).unwrap(), "cozy_pack");
        assert!(root.join("cozy_pack/reactions/tr.json").exists());
        let p2 = pack(vec![("manifest.json", Some("{\"v\":2}"), None)]);
        install(&root, &p2).unwrap();
        assert!(!root.join("cozy_pack/reactions/tr.json").exists());
        assert_eq!(fs::read_to_string(root.join("cozy_pack/manifest.json")).unwrap(), "{\"v\":2}");
        remove(&root, "cozy_pack").unwrap();
        assert!(!root.join("cozy_pack").exists());
        assert!(remove(&root, "..").is_err());
        let _ = fs::remove_dir_all(&root);
    }

    use super::*;

    fn tmp(name: &str) -> PathBuf {
        let p = std::env::temp_dir().join(format!("dunno-mods-test-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&p);
        fs::create_dir_all(&p).unwrap();
        p
    }

    #[test]
    fn reads_text_and_png_only_with_relative_paths() {
        let root = tmp("basic");
        let m = root.join("pastel");
        fs::create_dir_all(m.join("themes")).unwrap();
        fs::write(m.join("manifest.json"), r#"{"id":"pastel"}"#).unwrap();
        fs::write(m.join("themes/a.json"), "{}").unwrap();
        fs::write(m.join("icon.png"), [0x89u8, b'P', b'N', b'G']).unwrap();
        fs::write(m.join("evil.js"), "alert(1)").unwrap();
        let mods = read_mods(&root);
        assert_eq!(mods.len(), 1);
        let d = &mods[0];
        assert_eq!(d.dir, "pastel");
        let paths: Vec<&str> = d.files.iter().map(|f| f.path.as_str()).collect();
        assert_eq!(paths, vec!["evil.js", "icon.png", "manifest.json", "themes/a.json"]);
        let js = &d.files[0];
        assert!(js.text.is_none() && js.base64.is_none(), "kod dosyasının içeriği okunmaz");
        assert_eq!(d.files[1].base64.as_deref(), Some("iVBORw=="));
        assert_eq!(d.files[2].text.as_deref(), Some(r#"{"id":"pastel"}"#));
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn big_files_are_listed_without_content_and_too_many_files_stop() {
        let root = tmp("limits");
        let m = root.join("big");
        fs::create_dir_all(&m).unwrap();
        fs::write(m.join("huge.json"), vec![b' '; (MAX_FILE_BYTES + 1) as usize]).unwrap();
        for i in 0..(MAX_FILES + 10) {
            fs::write(m.join(format!("n{i:03}.txt")), "x").unwrap();
        }
        let d = read_mod_dir(&m).unwrap();
        assert!(d.files.len() > MAX_FILES && d.files.len() <= MAX_FILES + 1);
        let huge = d.files.iter().find(|f| f.path == "huge.json");
        if let Some(h) = huge {
            assert!(h.text.is_none());
        }
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn depth_is_limited() {
        let root = tmp("deep");
        let m = root.join("deep");
        fs::create_dir_all(m.join("a/b/c/d/e")).unwrap();
        fs::write(m.join("a/b/c/d/e/x.json"), "{}").unwrap();
        let d = read_mod_dir(&m).unwrap();
        assert!(d.files.iter().any(|f| f.path.ends_with(".too-deep")));
        assert!(!d.files.iter().any(|f| f.path.ends_with("x.json")));
        let _ = fs::remove_dir_all(&root);
    }

    #[cfg(unix)]
    #[test]
    fn symlinks_are_not_followed() {
        let root = tmp("symlink");
        let m = root.join("sneaky");
        fs::create_dir_all(&m).unwrap();
        let secret = root.join("secret.json");
        fs::write(&secret, r#"{"token":"x"}"#).unwrap();
        std::os::unix::fs::symlink(&secret, m.join("manifest.json")).unwrap();
        let d = read_mod_dir(&m).unwrap();
        assert_eq!(d.files.len(), 1);
        assert!(d.files[0].path.starts_with(".symlink:"));
        assert!(d.files[0].text.is_none());
        let _ = fs::remove_dir_all(&root);
    }
}
