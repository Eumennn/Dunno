//! Çoklu monitör (SPEC 10 CL5, saf). Clicky'deki ekran koordinat eşlemesi fikri; kod taşınmadı.
//! Pet tek bir monitörün çalışma alanında yaşar (kenar yolu ve UP1 yerleşimi o alana göre). Sürüklerken imleç başka
//! monitöre geçince o monitör etkin olur; etkin monitör çıkarılırsa birincil ekrana döner.
//! Koordinatlar Windows sanal ekranında fiziksel piksel: birincilin sol üstü (0,0), soldaki monitör negatif x alabilir,
//! her monitörün kendi ölçeği (DPI) var.

use crate::window::{Rect, WorkArea};

/// Bir monitör: tüm alan (imlecin hangi monitörde olduğu için) ve çalışma alanı (görev çubuğu hariç, pet burada yaşar).
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct MonitorArea {
    pub bounds: Rect,
    pub work: Rect,
    pub scale: f64,
    pub primary: bool,
}

impl MonitorArea {
    pub fn work_area(&self) -> WorkArea {
        WorkArea {
            phys: self.work,
            scale: self.scale,
        }
    }
}

/// Fiziksel noktayı içeren monitör (sağ/alt kenar hariç); hiçbiri içermiyorsa None.
pub fn monitor_at(monitors: &[MonitorArea], x: f64, y: f64) -> Option<usize> {
    monitors.iter().position(|m| m.bounds.contains(x, y))
}

/// Aynı monitör mü (çalışma alanı + ölçek eşit; görev çubuğu taşınırsa yeni alan olarak görülür).
fn same(a: &WorkArea, m: &MonitorArea) -> bool {
    a.phys == m.work && a.scale == m.scale
}

/// Etkin monitör: önceki hâlâ bağlıysa o (görev çubuğu değiştiyse aynı sınırlardaki monitör), yoksa birincil, o da yoksa ilk.
pub fn choose_active(monitors: &[MonitorArea], prev: Option<(WorkArea, Rect)>) -> Option<MonitorArea> {
    if let Some((wa, bounds)) = prev {
        if let Some(m) = monitors.iter().find(|m| same(&wa, m)).or_else(|| monitors.iter().find(|m| m.bounds == bounds)) {
            return Some(*m);
        }
    }
    monitors.iter().find(|m| m.primary).or(monitors.first()).copied()
}

/// Sürükleme sırasında: imleç etkin monitörün dışında başka bir monitördeyse o monitör (geçiş); değilse None.
pub fn drag_switch(monitors: &[MonitorArea], active: &MonitorArea, cursor: (f64, f64)) -> Option<MonitorArea> {
    if active.bounds.contains(cursor.0, cursor.1) {
        return None;
    }
    monitor_at(monitors, cursor.0, cursor.1).map(|i| monitors[i]).filter(|m| m != active)
}

/// Fiziksel ekran noktası -> monitörün çalışma alanına göre mantıksal konum (TS'in koordinatı).
pub fn logical_in(m: &MonitorArea, x: f64, y: f64) -> (f64, f64) {
    ((x - m.work.x) / m.scale, (y - m.work.y) / m.scale)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rect(x: f64, y: f64, w: f64, h: f64) -> Rect {
        Rect { x, y, w, h }
    }

    /// birincil 1920x1080 %100 (görev çubuğu 40 px), sağda 2560x1440 %150, solda negatif koordinatlı 1280x1024 %125
    fn setup() -> Vec<MonitorArea> {
        vec![
            MonitorArea { bounds: rect(0.0, 0.0, 1920.0, 1080.0), work: rect(0.0, 0.0, 1920.0, 1040.0), scale: 1.0, primary: true },
            MonitorArea { bounds: rect(1920.0, -200.0, 2560.0, 1440.0), work: rect(1920.0, -200.0, 2560.0, 1380.0), scale: 1.5, primary: false },
            MonitorArea { bounds: rect(-1280.0, 56.0, 1280.0, 1024.0), work: rect(-1280.0, 56.0, 1280.0, 984.0), scale: 1.25, primary: false },
        ]
    }

    #[test]
    fn finds_the_monitor_under_the_cursor_including_negative_left() {
        let m = setup();
        assert_eq!(monitor_at(&m, 10.0, 10.0), Some(0));
        assert_eq!(monitor_at(&m, 3000.0, 0.0), Some(1));
        assert_eq!(monitor_at(&m, 3000.0, -150.0), Some(1));
        assert_eq!(monitor_at(&m, -1.0, 500.0), Some(2));
        assert_eq!(monitor_at(&m, -1280.0, 56.0), Some(2));
        assert_eq!(monitor_at(&m, -1281.0, 500.0), None);
        // sağ kenar dahil değil: 1920 ikinci monitöre ait
        assert_eq!(monitor_at(&m, 1920.0, 10.0), Some(1));
    }

    #[test]
    fn logical_coordinates_use_each_monitors_dpi() {
        let m = setup();
        assert_eq!(logical_in(&m[0], 960.0, 520.0), (960.0, 520.0));
        // %150: 1500 fiziksel px = 1000 mantıksal
        assert_eq!(logical_in(&m[1], 1920.0 + 1500.0, -200.0 + 300.0), (1000.0, 200.0));
        // %125 solda: work.x -1280'den 640 fiziksel = 512 mantıksal
        assert_eq!(logical_in(&m[2], -640.0, 56.0 + 125.0), (512.0, 100.0));
        assert_eq!(m[1].work_area().info().width, 2560.0 / 1.5);
    }

    #[test]
    fn drag_into_another_monitor_switches() {
        let m = setup();
        assert_eq!(drag_switch(&m, &m[0], (100.0, 100.0)), None);
        assert_eq!(drag_switch(&m, &m[0], (2500.0, 100.0)), Some(m[1]));
        assert_eq!(drag_switch(&m, &m[0], (-50.0, 600.0)), Some(m[2]));
        // monitörler arası boşluk (solda üstte 0..56): geçiş yok
        assert_eq!(drag_switch(&m, &m[0], (-50.0, 10.0)), None);
        assert_eq!(drag_switch(&m, &m[1], (500.0, 500.0)), Some(m[0]));
    }

    #[test]
    fn active_monitor_survives_taskbar_change_and_falls_back_to_primary_when_removed() {
        let m = setup();
        let prev = Some((m[1].work_area(), m[1].bounds));
        assert_eq!(choose_active(&m, prev), Some(m[1]));
        // görev çubuğu değişti: aynı sınırlar, yeni çalışma alanı
        let mut moved = m.clone();
        moved[1].work = rect(1920.0, -160.0, 2560.0, 1400.0);
        assert_eq!(choose_active(&moved, prev), Some(moved[1]));
        // monitör çıkarıldı: birincile döner
        let removed = vec![m[0], m[2]];
        assert_eq!(choose_active(&removed, prev), Some(m[0]));
        // birincil yoksa ilk; liste boşsa None
        assert_eq!(choose_active(&[m[2]], None), Some(m[2]));
        assert_eq!(choose_active(&[], None), None);
        // ilk açılış: birincil
        assert_eq!(choose_active(&m, None), Some(m[0]));
    }
}
