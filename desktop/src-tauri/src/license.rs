//! Dunno Pro lisansı (SPEC 15). Çevrimdışı doğrulama: `DUNNO1.<base64url(json)>.<base64url(imza)>`, Ed25519.
//! - Açık anahtar derlemede gömülür (`DUNNO_LICENSE_PUBKEY`, 32 bayt base64). Yoksa lisans sistemi kapalı: hiçbir anahtar geçmez.
//! - Özel anahtar repoda YOK (orchestrator/repo-split denetimi); anahtar üretme/imzalama `desktop/scripts/license.mjs`, ortam değişkeninden.
//! - Lisans içeriğinde kişisel veri yok: sadece rastgele lisans kimliği, tür ve tarih. Ağ çağrısı yok, cihaz kimliği bağlanmaz.
//! - Lisans dosyası: `%APPDATA%\app.dunno.desktop\license.txt` (her açılışta yeniden doğrulanır).

use base64::engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD};
use base64::Engine;
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};

const PREFIX: &str = "DUNNO1.";
const MAX_KEY_LEN: usize = 1024;

#[derive(Clone, Debug, Deserialize, PartialEq)]
struct Payload {
    v: u32,
    /// rastgele lisans kimliği (kişisel veri değil)
    id: String,
    tier: String,
    /// YYYY-MM-DD
    issued: String,
    /// SPEC 18 Faz 4: tek seferlik kozmetik paketler (ör. "halloween"); abonelikten bağımsız
    #[serde(default)]
    packs: Vec<String>,
    /// abonelik (launch ödeme akışı): YYYY-MM-DD'ye kadar geçerli (dahil); yoksa süresiz
    #[serde(default)]
    until: Option<String>,
}

/// Doğrulanmış lisans: Pro mu + sahip olunan kozmetik paketler
#[derive(Clone, Debug, PartialEq)]
pub struct License {
    pub id: String,
    pub pro: bool,
    pub packs: Vec<String>,
    /// abonelik sonu (YYYY-MM-DD, dahil); süresizse None
    pub until: Option<String>,
}

fn valid_date(d: &str) -> bool {
    let b = d.as_bytes();
    b.len() == 10 && b[4] == b'-' && b[7] == b'-' && b.iter().enumerate().all(|(i, c)| i == 4 || i == 7 || c.is_ascii_digit())
}

/// UTC bugün (YYYY-MM-DD), tarih kütüphanesi olmadan (Howard Hinnant civil_from_days)
pub fn today_utc() -> String {
    let secs = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
    civil(secs / 86_400)
}

pub fn civil(days: u64) -> String {
    let z = days as i64 + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = yoe + era * 400 + i64::from(m <= 2);
    format!("{y:04}-{m:02}-{d:02}")
}

fn valid_pack(p: &str) -> bool {
    let b = p.as_bytes();
    (2..=24).contains(&b.len()) && b[0].is_ascii_lowercase() && b.iter().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || *c == b'_')
}

#[derive(Clone, Debug, Default, Serialize, PartialEq)]
pub struct LicenseStatus {
    pub pro: bool,
    /// lisans kimliğinin son 6 hanesi (settings.exe'de "pro · ...a1b2c3")
    pub tail: Option<String>,
    /// lisans sistemi bu derlemede açık mı (açık anahtar gömülü mü)
    pub enabled: bool,
    /// son etkinleştirme hatası (geçersiz anahtar vb.)
    pub error: Option<String>,
    /// SPEC 18: sahip olunan kozmetik paketler
    pub packs: Vec<String>,
    /// abonelik sonu (YYYY-MM-DD); süresizse None
    pub until: Option<String>,
    /// abonelik süresi geçti (Pro kapalı; yenileme denenir)
    pub expired: bool,
}

/// Derlemede gömülü açık anahtar; yoksa None (lisans sistemi kapalı).
pub fn builtin_key() -> Option<VerifyingKey> {
    option_env!("DUNNO_LICENSE_PUBKEY").and_then(parse_pubkey)
}

pub fn parse_pubkey(b64: &str) -> Option<VerifyingKey> {
    let bytes = STANDARD.decode(b64.trim()).ok()?;
    let arr: [u8; 32] = bytes.try_into().ok()?;
    VerifyingKey::from_bytes(&arr).ok()
}

/// Anahtarı doğrular; geçerli Pro lisansıysa kimliği döner (testler; uygulama verify_full kullanır).
#[cfg(test)]
pub fn verify(key: &str, pubkey: &VerifyingKey) -> Result<String, &'static str> {
    match verify_full(key, pubkey)? {
        License { pro: true, id, .. } => Ok(id),
        _ => Err("payload"),
    }
}

/// Anahtarı doğrular: Pro ("pro") ya da sadece kozmetik paket ("packs") lisansı.
pub fn verify_full(key: &str, pubkey: &VerifyingKey) -> Result<License, &'static str> {
    let key = key.trim();
    if key.len() > MAX_KEY_LEN || !key.starts_with(PREFIX) {
        return Err("format");
    }
    let mut parts = key[PREFIX.len()..].split('.');
    let (Some(body), Some(sig), None) = (parts.next(), parts.next(), parts.next()) else {
        return Err("format");
    };
    let body_bytes = URL_SAFE_NO_PAD.decode(body).map_err(|_| "format")?;
    let sig_bytes: [u8; 64] = URL_SAFE_NO_PAD.decode(sig).map_err(|_| "format")?.try_into().map_err(|_| "format")?;
    pubkey
        .verify(&body_bytes, &Signature::from_bytes(&sig_bytes))
        .map_err(|_| "signature")?;
    let p: Payload = serde_json::from_slice(&body_bytes).map_err(|_| "payload")?;
    let tier_ok = p.tier == "pro" || (p.tier == "packs" && !p.packs.is_empty());
    if p.v != 1 || !tier_ok || p.id.len() < 6 || p.id.len() > 64 || p.issued.len() != 10 || p.packs.len() > 16 || !p.packs.iter().all(|x| valid_pack(x)) {
        return Err("payload");
    }
    if p.until.as_deref().is_some_and(|u| !valid_date(u)) {
        return Err("payload");
    }
    Ok(License { pro: p.tier == "pro", id: p.id, packs: p.packs, until: p.until })
}

/// Kayıtlı lisans metninden durum (bugünün tarihiyle).
pub fn status_of(saved: Option<&str>, pubkey: Option<&VerifyingKey>) -> LicenseStatus {
    status_on(saved, pubkey, &today_utc())
}

/// Saf: verilen günde durum. Süresi geçmiş abonelik lisansı Pro vermez ama kimliği ve sonu görünür (yenileme için).
pub fn status_on(saved: Option<&str>, pubkey: Option<&VerifyingKey>, today: &str) -> LicenseStatus {
    let Some(pk) = pubkey else {
        return LicenseStatus { enabled: false, ..Default::default() };
    };
    match saved.map(|k| verify_full(k, pk)) {
        Some(Ok(lic)) => {
            let expired = lic.until.as_deref().is_some_and(|u| u < today);
            LicenseStatus {
                pro: lic.pro && !expired,
                tail: Some(lic.id.chars().rev().take(6).collect::<Vec<_>>().into_iter().rev().collect()),
                enabled: true,
                error: None,
                packs: lic.packs,
                until: lic.until,
                expired,
            }
        }
        _ => LicenseStatus { enabled: true, ..Default::default() },
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use ed25519_dalek::{Signer, SigningKey};

    fn key_with(sk: &SigningKey, json: &str) -> String {
        let sig = sk.sign(json.as_bytes());
        format!("{PREFIX}{}.{}", URL_SAFE_NO_PAD.encode(json), URL_SAFE_NO_PAD.encode(sig.to_bytes()))
    }

    fn sk() -> SigningKey {
        SigningKey::from_bytes(&[7u8; 32])
    }

    const GOOD: &str = r#"{"v":1,"id":"lic_8f3a2b1c9d","tier":"pro","issued":"2026-10-07"}"#;

    #[test]
    fn subscription_until_expires_pro_but_keeps_identity() {
        let k = sk();
        let pk = k.verifying_key();
        let sub = key_with(&k, r#"{"v":1,"id":"lic_8f3a2b1c9d","tier":"pro","issued":"2026-10-07","until":"2026-11-10"}"#);
        let on = status_on(Some(&sub), Some(&pk), "2026-11-10");
        assert!(on.pro && !on.expired);
        assert_eq!(on.until.as_deref(), Some("2026-11-10"));
        let off = status_on(Some(&sub), Some(&pk), "2026-11-11");
        assert!(!off.pro && off.expired && off.tail.is_some());
        // bozuk tarih reddedilir; until'siz lisans süresiz
        assert_eq!(verify_full(&key_with(&k, r#"{"v":1,"id":"lic_8f3a2b1c9d","tier":"pro","issued":"2026-10-07","until":"soon"}"#), &pk).err(), Some("payload"));
        assert!(status_on(Some(&key_with(&k, GOOD)), Some(&pk), "2099-01-01").pro);
    }

    #[test]
    fn civil_dates() {
        assert_eq!(civil(0), "1970-01-01");
        assert_eq!(civil(20_371), "2025-10-10");
        assert_eq!(civil(11_016), "2000-02-29");
    }

    #[test]
    fn valid_key_activates_pro() {
        let k = sk();
        let pk = k.verifying_key();
        assert_eq!(verify(&key_with(&k, GOOD), &pk), Ok("lic_8f3a2b1c9d".into()));
        let st = status_of(Some(&key_with(&k, GOOD)), Some(&pk));
        assert!(st.pro && st.enabled);
        assert_eq!(st.tail.as_deref(), Some("2b1c9d"));
        // açık anahtar base64 ile de okunur
        assert_eq!(parse_pubkey(&STANDARD.encode(pk.to_bytes())), Some(pk));
    }

    #[test]
    fn rejects_tampered_wrong_key_and_bad_payloads() {
        let k = sk();
        let pk = k.verifying_key();
        let good = key_with(&k, GOOD);
        // gövde değişti, imza aynı
        let forged = good.replacen(&URL_SAFE_NO_PAD.encode(GOOD), &URL_SAFE_NO_PAD.encode(GOOD.replace("pro", "pro ")), 1);
        assert_eq!(verify(&forged, &pk), Err("signature"));
        // başka anahtarla imzalı
        let other = SigningKey::from_bytes(&[9u8; 32]);
        assert_eq!(verify(&key_with(&other, GOOD), &pk), Err("signature"));
        // imzalı ama içerik geçersiz
        assert_eq!(verify(&key_with(&k, r#"{"v":1,"id":"lic_8f3a2b1c9d","tier":"free","issued":"2026-10-07"}"#), &pk), Err("payload"));
        assert_eq!(verify(&key_with(&k, r#"{"v":2,"id":"lic_8f3a2b1c9d","tier":"pro","issued":"2026-10-07"}"#), &pk), Err("payload"));
        assert_eq!(verify(&key_with(&k, "not json"), &pk), Err("payload"));
        for bad in ["", "DUNNO1.", "DUNNO1.a.b.c", "XYZ.a.b", "DUNNO1.!!.??"] {
            assert_eq!(verify(bad, &pk), Err("format"), "{bad}");
        }
        assert_eq!(verify(&"A".repeat(5000), &pk), Err("format"));
    }

    /// desktop/scripts/license.mjs (Node) ile üretilen anahtar Rust'ta doğrulanır (özel anahtar atıldı, sadece test).
    #[test]
    fn node_issued_key_verifies() {
        let pk = parse_pubkey("9/OJV0WZ+gbG3sC5Xft/bbt/g6oU9vbwzFXE8NiysJU=").unwrap();
        assert_eq!(verify("DUNNO1.eyJ2IjoxLCJpZCI6ImxpY190ZXN0MTIzNDU2IiwidGllciI6InBybyIsImlzc3VlZCI6IjIwMjYtMTAtMDcifQ.2Fk_04YtlemKFyQZHyKC4yemNjNOhKBOw4hgKY8HUZeGdAT5TKOFT1j5x8xdlK_rm1Q_4TKGErANZXkq0O83Bw", &pk), Ok("lic_test123456".into()));
    }

    #[test]
    fn cosmetic_pack_license_and_pro_with_packs() {
        let k = sk();
        let pk = k.verifying_key();
        let packs_only = key_with(&k, r#"{"v":1,"id":"lic_pack0001","tier":"packs","issued":"2026-10-10","packs":["halloween"]}"#);
        let st = status_of(Some(&packs_only), Some(&pk));
        assert!(!st.pro);
        assert_eq!(st.packs, vec!["halloween".to_string()]);
        assert_eq!(verify(&packs_only, &pk), Err("payload"));
        let pro = key_with(&k, r#"{"v":1,"id":"lic_pro00001","tier":"pro","issued":"2026-10-10","packs":["cyberpunk"]}"#);
        let st = status_of(Some(&pro), Some(&pk));
        assert!(st.pro && st.packs == vec!["cyberpunk".to_string()]);
        // boş paket listeli paket lisansı ve bozuk paket adı geçmez
        assert!(verify_full(&key_with(&k, r#"{"v":1,"id":"lic_pack0002","tier":"packs","issued":"2026-10-10"}"#), &pk).is_err());
        assert!(verify_full(&key_with(&k, r#"{"v":1,"id":"lic_pack0003","tier":"packs","issued":"2026-10-10","packs":["../x"]}"#), &pk).is_err());
    }

    #[test]
    fn no_builtin_key_means_disabled_and_never_pro() {
        let k = sk();
        let st = status_of(Some(&key_with(&k, GOOD)), None);
        assert_eq!(st, LicenseStatus { pro: false, tail: None, enabled: false, error: None, packs: vec![], until: None, expired: false });
        assert!(!status_of(None, Some(&k.verifying_key())).pro);
        assert!(!status_of(Some("garbage"), Some(&k.verifying_key())).pro);
    }
}
