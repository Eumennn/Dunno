//! Win32 okumaları. Hepsi anlık ve yerel: polling, saklama, loglama yok.
//! Pencere başlığı yalnız `meeting_title_hint` ve `foreground_site` içinde yığında okunur, kalıpla/site tablosuyla
//! eşleştirilir ve atılır; dışarı sadece bool ya da kategori çıkar.

use ::windows::core::PWSTR;
use ::windows::Win32::Foundation::{CloseHandle, HANDLE, HWND};
use ::windows::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};
use ::windows::Win32::System::ProcessStatus::EnumProcesses;
use ::windows::Win32::System::SystemInformation::{GetLocalTime, GetTickCount};
use ::windows::Win32::System::Threading::{
    OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
};
use ::windows::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};
use ::windows::Win32::UI::WindowsAndMessaging::{
    GetForegroundWindow, GetWindowTextLengthW, GetWindowTextW, GetWindowThreadProcessId,
};

use super::apps::{app_for_exe, exe_stem};
use super::sites::{site_match, SiteMatch};
use super::ContextSnapshot;
use crate::meeting::{is_meeting_process, title_suggests_meeting, MEETING_APPS};

/// Okunamadı (izin, geçersiz pencere/süreç vb.). Ayrıntı taşımaz.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ReadError;

/// Toplantı kararı + bağlam için tek seferlik okuma.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Reading {
    pub snapshot: ContextSnapshot,
    pub title_hint: bool,
    pub meeting_procs_running: bool,
    /// zoom/teams/webex süreci çalışıyor mu (önde olmasa da); kapandıysa toplantıdan hızlı çıkış (SPEC 07 FB4)
    pub meeting_app_running: bool,
    /// öndeki uygulama ya da süreç listesi okunamadı -> karar güvenli tarafta (InMeeting)
    pub read_error: bool,
}

/// Hepsini bir kerede okur. tab_titles: "sekme adlarına bak" ayarı (kapalıysa başlık site için hiç okunmaz).
pub fn read(tab_titles: bool) -> Reading {
    // FB11: öndeki pencerenin süreci okunamıyorsa (yönetici olarak çalışan uygulama, Görev Yöneticisi, korumalı oyun)
    // uygulama bilinmiyor sayılır; toplantı DEĞİL. Eskiden güvenli taraf diye toplantı sayılıyordu: Dunno sebepsiz saklanıyordu.
    let exe = foreground_exe().unwrap_or(None);
    let app = exe.as_deref().and_then(app_for_exe).map(str::to_string);
    let (procs, app_running, procs_err) = match meeting_processes_running() {
        Ok(scan) => (scan.meeting_procs, scan.meeting_app, false),
        Err(ReadError) => (false, true, true),
    };
    let (battery_pct, on_ac) = power_status();
    let title_hint = app.as_deref() == Some("browser") && meeting_title_hint();
    // başlık sadece ayar açıksa; oyunlar exe adından da tanınır (SPEC 17, exe adı zaten uygulama etiketi için okunuyor)
    let site = (if tab_titles { foreground_site() } else { None })
        .or_else(|| exe.as_deref().and_then(|e| crate::context::sites::site_for_exe(&crate::context::apps::exe_stem(e))));
    Reading {
        snapshot: ContextSnapshot {
            app,
            idle_secs: idle_secs(),
            battery_pct,
            on_ac,
            site_silent: site.as_ref().is_some_and(|m| m.silent),
            site: site.map(|m| m.category),
        },
        title_hint,
        meeting_procs_running: procs,
        meeting_app_running: app_running,
        read_error: procs_err,
    }
}

/// Öndeki pencerenin süreç exe adı (küçük harf, ".exe" yok).
/// Ön pencere yoksa (masaüstü, kilit ekranı geçişi) Ok(None); süreç okunamazsa Err.
pub fn foreground_exe() -> Result<Option<String>, ReadError> {
    // Güvenli: argümansız, sadece bir HWND değeri döner (null olabilir, aşağıda kontrol edilir).
    let hwnd = unsafe { GetForegroundWindow() };
    if hwnd.is_invalid() {
        return Ok(None);
    }
    let mut pid = 0u32;
    // Güvenli: hwnd az önce alındı (geçersizleşmişse fonksiyon 0 döner); `pid` yığında geçerli bir u32.
    unsafe { GetWindowThreadProcessId(hwnd, Some(&mut pid)) };
    if pid == 0 {
        return Err(ReadError);
    }
    process_exe(pid).map(Some)
}

/// PID -> exe adı (küçük harf, ".exe" yok).
fn process_exe(pid: u32) -> Result<String, ReadError> {
    // Güvenli: salt-okuma sınırlı erişimle açılır; dönen handle aşağıda her yolda kapatılır.
    let handle = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) }
        .map_err(|_| ReadError)?;
    let result = image_name(handle);
    // Güvenli: handle OpenProcess'ten geldi ve bir kez kapatılıyor.
    let _ = unsafe { CloseHandle(handle) };
    result.map(|path| exe_stem(&path))
}

fn image_name(handle: HANDLE) -> Result<String, ReadError> {
    let mut buf = [0u16; 1024];
    let mut len = buf.len() as u32;
    // Güvenli: `buf` yığında `len` u16 uzunluğunda; API en fazla `len` yazar ve yazdığı uzunluğu `len`e koyar.
    unsafe {
        QueryFullProcessImageNameW(
            handle,
            PROCESS_NAME_WIN32,
            PWSTR(buf.as_mut_ptr()),
            &mut len,
        )
    }
    .map_err(|_| ReadError)?;
    Ok(String::from_utf16_lossy(&buf[..len as usize]))
}

/// Yerel saat (0-23), zaman dilimi trigger'ı için.
pub fn local_hour() -> u8 {
    // Güvenli: argümansız, SYSTEMTIME değeri döner.
    let now = unsafe { GetLocalTime() };
    (now.wHour % 24) as u8
}

/// Son klavye/fare girişinden beri geçen saniye (tuşlar okunmaz, sadece zaman damgası).
pub fn idle_secs() -> u64 {
    let mut info = LASTINPUTINFO {
        cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32,
        dwTime: 0,
    };
    // Güvenli: `info` yığında, cbSize doğru ayarlı; API sadece dwTime'a yazar.
    if !unsafe { GetLastInputInfo(&mut info) }.as_bool() {
        return 0;
    }
    // Güvenli: argümansız sayaç okuması.
    let now = unsafe { GetTickCount() };
    // ~49 günde bir sarar; wrapping_sub doğru farkı verir.
    u64::from(now.wrapping_sub(info.dwTime)) / 1000
}

/// (pil %, prizde mi). Pil yoksa ya da bilinmiyorsa None.
pub fn power_status() -> (Option<u8>, Option<bool>) {
    let mut status = SYSTEM_POWER_STATUS::default();
    // Güvenli: `status` yığında geçerli bir yapı; API sadece ona yazar.
    if unsafe { GetSystemPowerStatus(&mut status) }.is_err() {
        return (None, None);
    }
    let on_ac = match status.ACLineStatus {
        0 => Some(false),
        1 => Some(true),
        _ => None,
    };
    // BatteryFlag 128: pil yok; BatteryLifePercent 255: bilinmiyor
    let pct = if status.BatteryFlag & 128 != 0 || status.BatteryLifePercent > 100 {
        None
    } else {
        Some(status.BatteryLifePercent)
    };
    (pct, on_ac)
}

/// Tek süreç taraması: bilinen toplantı süreci (meeting::MEETING_PROCESSES) ve toplantı uygulaması (zoom/teams/webex).
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct ProcScan {
    pub meeting_procs: bool,
    pub meeting_app: bool,
}

/// Liste alınamazsa Err; tek tek açılamayan süreçler (izin) atlanır.
pub fn meeting_processes_running() -> Result<ProcScan, ReadError> {
    let mut pids = vec![0u32; 4096];
    let mut needed = 0u32;
    // Güvenli: `pids` `cb` bayt uzunluğunda; API en fazla `cb` bayt yazar, yazdığını `needed`e koyar.
    unsafe {
        EnumProcesses(
            pids.as_mut_ptr(),
            (pids.len() * std::mem::size_of::<u32>()) as u32,
            &mut needed,
        )
    }
    .map_err(|_| ReadError)?;
    let count = needed as usize / std::mem::size_of::<u32>();
    let mut scan = ProcScan::default();
    for exe in pids[..count].iter().filter(|&&pid| pid != 0).filter_map(|&pid| process_exe(pid).ok()) {
        scan.meeting_procs |= is_meeting_process(&exe);
        scan.meeting_app |= app_for_exe(&exe).is_some_and(|a| MEETING_APPS.contains(&a));
        if scan.meeting_procs && scan.meeting_app {
            break;
        }
    }
    Ok(scan)
}

/// Öndeki pencerenin başlığı (yığında, geçici). Pencere yoksa / başlık boşsa None.
fn foreground_title() -> Option<String> {
    // Güvenli: argümansız, sadece bir HWND değeri döner.
    let hwnd: HWND = unsafe { GetForegroundWindow() };
    if hwnd.is_invalid() {
        return None;
    }
    // Güvenli: hwnd geçersizleşmişse 0 döner; bellek yazılmaz.
    let len = unsafe { GetWindowTextLengthW(hwnd) };
    if len <= 0 {
        return None;
    }
    let mut buf = vec![0u16; len as usize + 1];
    // Güvenli: `buf` len+1 uzunluğunda; API en fazla buf.len() u16 (sonlandırıcı dahil) yazar.
    let read = unsafe { GetWindowTextW(hwnd, &mut buf) };
    (read > 0).then(|| String::from_utf16_lossy(&buf[..read as usize]))
}

/// Öndeki pencere başlığının site kategorisi (SPEC 09 K7b). Başlık bu fonksiyonda düşer; dönen sadece kategori.
pub fn foreground_site() -> Option<SiteMatch> {
    foreground_title().and_then(|title| site_match(&title))
}

/// Öndeki pencerenin başlığı toplantı kalıbına uyuyor mu.
/// Başlık sadece bu fonksiyonun yığınında yaşar; döndürülmez, saklanmaz, loglanmaz.
/// Başlık var ama okunamadıysa güvenli taraf: true.
pub fn meeting_title_hint() -> bool {
    // Güvenli: argümansız, sadece bir HWND değeri döner.
    let hwnd: HWND = unsafe { GetForegroundWindow() };
    if hwnd.is_invalid() {
        return false;
    }
    // Güvenli: hwnd geçersizleşmişse 0 döner; bellek yazılmaz.
    let len = unsafe { GetWindowTextLengthW(hwnd) };
    if len <= 0 {
        return false;
    }
    let mut buf = vec![0u16; len as usize + 1];
    // Güvenli: `buf` len+1 uzunluğunda; API en fazla buf.len() u16 (sonlandırıcı dahil) yazar.
    let read = unsafe { GetWindowTextW(hwnd, &mut buf) };
    if read <= 0 {
        return true;
    }
    title_suggests_meeting(&String::from_utf16_lossy(&buf[..read as usize]))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// SPEC 07 FB4 ölçümü (elle: cargo test -- --ignored --nocapture): anahtar kapanınca izleyici uyanır ve bir okuma yapar;
    /// geri dönüş süresi ≈ bu okuma. Sadece salt-okuma sorguları.
    #[test]
    #[ignore]
    fn read_latency() {
        let n = 20;
        let start = std::time::Instant::now();
        for _ in 0..n {
            let _ = read(true);
        }
        let avg = start.elapsed().as_millis() / n;
        println!("read() ortalama {avg} ms");
        assert!(avg < 200);
    }

    // Gerçek Win32 çağrıları: değer makineye göre değişir, sadece çökmediğini ve aralıkları doğrular.
    #[test]
    fn live_reads_do_not_panic() {
        let r = read(true);
        if let Some(app) = r.snapshot.app.as_deref() {
            assert!(!app.is_empty());
        }
        if let Some(pct) = r.snapshot.battery_pct {
            assert!(pct <= 100);
        }
        let _ = meeting_title_hint();
        assert!(meeting_processes_running().is_ok());
    }

    #[test]
    fn own_process_is_readable() {
        let exe = process_exe(std::process::id()).expect("own process");
        assert!(!exe.is_empty());
        assert!(!exe.ends_with(".exe"));
    }
}
