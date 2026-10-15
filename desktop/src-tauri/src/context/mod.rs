//! Bağlam (cihazda): öndeki uygulama etiketi, boşta kalma, pil, saat dilimi.
//! Ekran görüntüsü yok, klavye takibi yok (GetLastInputInfo sadece "son giriş ne zamandı" der),
//! pencere başlığı saklanmaz/gönderilmez (SPEC 09 K7b: başlıktan sadece site kategorisi çıkar, sites.rs).
//! Bu modül sadece okur; polling ve olaylar masaüstü tarafında.

pub mod apps;
pub mod sites;
#[cfg(windows)]
pub mod windows;
#[cfg(target_os = "macos")]
pub mod macos;

use serde::Serialize;

/// Tek bir okuma. `app` tablo etiketi (exe adı değil); tanınmayan uygulamada None.
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize)]
pub struct ContextSnapshot {
    pub app: Option<String>,
    pub idle_secs: u64,
    /// 0-100; pil yoksa ya da bilinmiyorsa None
    pub battery_pct: Option<u8>,
    /// prizde mi; bilinmiyorsa None
    pub on_ac: Option<bool>,
    /// öndeki pencere başlığının site kategorisi (SPEC 09 K7b; ayar kapalıysa ya da eşleşme yoksa None). Başlık değil.
    pub site: Option<String>,
    /// sessiz kategori (adult/kumar): o pencere öndeyken laf yok
    pub site_silent: bool,
}

/// Pil bu yüzdenin altında ve prizde değilse `battery:low`.
pub const BATTERY_LOW_PCT: u8 = 20;

/// Ham kapasite -> yüzde (0-100). Geçersiz ölçümde None (laf atılmaz). macOS IOKit okuması kullanır.
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
pub fn battery_percent(current: i64, max: i64) -> Option<u8> {
    (max > 0 && current >= 0).then(|| (current.min(max) * 100 / max) as u8)
}

/// Boşta kalma -> `idle:10|30|60` (dakika eşikleri); 10 dk altında None.
pub fn idle_trigger(idle_secs: u64) -> Option<&'static str> {
    match idle_secs / 60 {
        m if m >= 60 => Some("idle:60"),
        m if m >= 30 => Some("idle:30"),
        m if m >= 10 => Some("idle:10"),
        _ => None,
    }
}

/// Yerel saat (0-23) -> `time:*`.
/// late_night 0-4, morning 5-10, noon 11-15, evening 16-20, night 21-23.
pub fn time_trigger(hour: u8) -> &'static str {
    match hour % 24 {
        0..=4 => "time:late_night",
        5..=10 => "time:morning",
        11..=15 => "time:noon",
        16..=20 => "time:evening",
        _ => "time:night",
    }
}

/// Pil düşük ve prizde değilse `battery:low`. Bilinmeyen durumda None (laf atma).
pub fn battery_trigger(battery_pct: Option<u8>, on_ac: Option<bool>) -> Option<&'static str> {
    match (battery_pct, on_ac) {
        (Some(pct), Some(false)) if pct <= BATTERY_LOW_PCT => Some("battery:low"),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn idle_thresholds() {
        assert_eq!(idle_trigger(0), None);
        assert_eq!(idle_trigger(10 * 60 - 1), None);
        assert_eq!(idle_trigger(10 * 60), Some("idle:10"));
        assert_eq!(idle_trigger(30 * 60 - 1), Some("idle:10"));
        assert_eq!(idle_trigger(30 * 60), Some("idle:30"));
        assert_eq!(idle_trigger(60 * 60 - 1), Some("idle:30"));
        assert_eq!(idle_trigger(60 * 60), Some("idle:60"));
        assert_eq!(idle_trigger(u64::MAX), Some("idle:60"));
    }

    #[test]
    fn time_slots_cover_every_hour() {
        let want = [
            "time:late_night",
            "time:late_night",
            "time:late_night",
            "time:late_night",
            "time:late_night",
            "time:morning",
            "time:morning",
            "time:morning",
            "time:morning",
            "time:morning",
            "time:morning",
            "time:noon",
            "time:noon",
            "time:noon",
            "time:noon",
            "time:noon",
            "time:evening",
            "time:evening",
            "time:evening",
            "time:evening",
            "time:evening",
            "time:night",
            "time:night",
            "time:night",
        ];
        for (hour, slot) in want.iter().enumerate() {
            assert_eq!(time_trigger(hour as u8), *slot, "hour {hour}");
        }
        assert_eq!(time_trigger(24), "time:late_night");
    }

    #[test]
    fn battery_percent_from_raw_capacity() {
        assert_eq!(battery_percent(50, 100), Some(50));
        assert_eq!(battery_percent(4000, 5000), Some(80));
        assert_eq!(battery_percent(120, 100), Some(100));
        assert_eq!(battery_percent(5, 0), None);
        assert_eq!(battery_percent(-1, 100), None);
    }

    #[test]
    fn battery_low_only_on_battery_power() {
        assert_eq!(battery_trigger(Some(20), Some(false)), Some("battery:low"));
        assert_eq!(battery_trigger(Some(5), Some(false)), Some("battery:low"));
        assert_eq!(battery_trigger(Some(21), Some(false)), None);
        assert_eq!(battery_trigger(Some(5), Some(true)), None);
        assert_eq!(battery_trigger(Some(5), None), None);
        assert_eq!(battery_trigger(None, Some(false)), None);
    }
}
