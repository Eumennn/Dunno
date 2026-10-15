//! Sekme / pencere başlığı -> site kategorisi (SPEC 09 K7b). talk/sites.ts ile aynı kural, Rust'ta:
//! başlık bu modülün dışına hiç çıkmaz; webview'e sadece kategori ("video") ve sessiz bayrağı gider.
//! Başlık saklanmaz, loglanmaz, ağa/LLM'e gitmez. Tablo derlemeye gömülü: content/context/sites.json (sıra = öncelik).
//! Ortak örnek tablo content/context/sites.cases.json: TS (src/talk/sites.test.ts) ve bu modülün testi aynı sonucu bekler.

use std::sync::OnceLock;

use serde::Deserialize;

const SITES_JSON: &str = include_str!("../../../../content/context/sites.json");

#[derive(Deserialize)]
struct RawCategory {
    id: String,
    silent: bool,
    keys: Vec<String>,
    /// SPEC 17: öndeki programın exe adı (küçük harf, .exe yok) bu kategoriyi verir; başlık okunmaz
    #[serde(default)]
    exes: Vec<String>,
}

#[derive(Deserialize)]
struct RawFile {
    categories: Vec<RawCategory>,
}

/// Normalize edilmiş anahtarlarıyla kategori.
#[derive(Debug)]
struct Category {
    id: String,
    silent: bool,
    #[cfg_attr(not(windows), allow(dead_code))] // Windows'a özel (başlık/süreç okuma); macOS'ta başlık okunmuyor
    keys: Vec<String>,
    exes: Vec<String>,
}

/// Eşleşme: sadece kategori ve sessiz bayrağı.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SiteMatch {
    pub category: String,
    /// true: o sekme öndeyken dunno hiç laf atmaz (adult/kumar)
    pub silent: bool,
}

fn table() -> &'static [Category] {
    static TABLE: OnceLock<Vec<Category>> = OnceLock::new();
    TABLE.get_or_init(|| {
        // Gömülü dosya build'de sabit; bozuksa tablo boş (eşleşme yok = laf yok, güvenli taraf).
        let raw: RawFile = serde_json::from_str(SITES_JSON).unwrap_or(RawFile { categories: vec![] });
        raw.categories
            .into_iter()
            .map(|c| Category {
                id: c.id,
                silent: c.silent,
                keys: c.keys.iter().map(|k| normalize(k)).filter(|k| !k.is_empty()).collect(),
                exes: c.exes.iter().map(|e| e.to_lowercase()).collect(),
            })
            .collect()
    })
}

/// talk/classify.ts fold + talk/sites.ts normalizeTitle: Türkçe harf katlama, küçük harf,
/// harf/rakam/+ dışı her şey boşluk, boşluklar teke.
pub fn normalize(text: &str) -> String {
    let mut folded = String::with_capacity(text.len());
    for ch in text.chars() {
        if ch == 'İ' || ch == 'I' {
            folded.push('i');
            continue;
        }
        for c in ch.to_lowercase() {
            match c {
                '\u{307}' => {}
                'ç' => folded.push('c'),
                'ğ' => folded.push('g'),
                'ı' => folded.push('i'),
                'ö' => folded.push('o'),
                'ş' => folded.push('s'),
                'ü' => folded.push('u'),
                'â' => folded.push('a'),
                'î' => folded.push('i'),
                'û' => folded.push('u'),
                c => folded.push(c),
            }
        }
    }
    let mut out = String::with_capacity(folded.len());
    let mut space = true;
    for c in folded.chars() {
        if c.is_ascii_lowercase() || c.is_ascii_digit() || c == '+' {
            out.push(c);
            space = false;
        } else if !space {
            out.push(' ');
            space = true;
        }
    }
    out.truncate(out.trim_end().len());
    out
}

/// Başlık -> ilk eşleşen kategori (kelime sınırıyla). Başlık sadece bu çağrının yığınında yaşar.
#[cfg_attr(not(windows), allow(dead_code))] // Windows'a özel (başlık/süreç okuma); macOS'ta başlık okunmuyor
pub fn site_match(title: &str) -> Option<SiteMatch> {
    let norm = normalize(title);
    if norm.is_empty() {
        return None;
    }
    let hay = format!(" {norm} ");
    table()
        .iter()
        .find(|c| c.keys.iter().any(|k| hay.contains(&format!(" {k} "))))
        .map(|c| SiteMatch {
            category: c.id.clone(),
            silent: c.silent,
        })
}

/// SPEC 17: exe adı (apps::exe_stem çıktısı) -> kategori (oyunlar: başlık okunmadan da tanınır).
pub fn site_for_exe(stem: &str) -> Option<SiteMatch> {
    let stem = stem.to_lowercase();
    table()
        .iter()
        .find(|c| c.exes.contains(&stem))
        .map(|c| SiteMatch {
            category: c.id.clone(),
            silent: c.silent,
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn games_match_by_exe_and_title() {
        assert_eq!(site_for_exe("valorant-win64-shipping").map(|m| m.category), Some("game_valorant".into()));
        assert_eq!(site_for_exe("cs2").map(|m| m.category), Some("game_cs2".into()));
        assert_eq!(site_for_exe("excel"), None);
        assert_eq!(site_match("League of Legends (TM) Client").map(|m| m.category), Some("game_lol".into()));
        assert_eq!(site_match("Counter-Strike 2").map(|m| m.category), Some("game_cs2".into()));
        // youtube music hâlâ müzik (genel kategori önce), youtube videosu özel
        assert_eq!(site_match("Lofi - YouTube Music").map(|m| m.category), Some("music".into()));
        assert_eq!(site_match("Funny cats - YouTube").map(|m| m.category), Some("web_youtube".into()));
    }

    #[derive(Deserialize)]
    struct Case {
        title: String,
        category: Option<String>,
        silent: bool,
    }

    #[test]
    fn table_loads() {
        assert!(table().len() >= 14);
        assert!(table().iter().all(|c| !c.keys.is_empty()));
    }

    #[test]
    fn normalize_folds_turkish_and_punctuation() {
        assert_eq!(normalize("İstanbul ŞIK Çay"), "istanbul sik cay");
        assert_eq!(normalize("amazon.com.tr - Sepetim"), "amazon com tr sepetim");
        assert_eq!(normalize("  ...  "), "");
        assert_eq!(normalize("+18 içerik"), "+18 icerik");
    }

    #[test]
    fn shared_cases_match_typescript() {
        let cases: Vec<Case> = serde_json::from_str(include_str!("../../../../content/context/sites.cases.json")).unwrap();
        assert!(cases.len() >= 20);
        for c in cases {
            let got = site_match(&c.title);
            assert_eq!(got.as_ref().map(|m| m.category.clone()), c.category, "{}", c.title);
            assert_eq!(got.map(|m| m.silent).unwrap_or(false), c.silent, "{}", c.title);
        }
    }
}
