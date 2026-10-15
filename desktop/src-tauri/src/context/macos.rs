//! macOS okumaları (SPEC 19 M3/M5). Windows'taki gibi anlık ve yerel: saklama, loglama yok.
//! - öndeki uygulama: NSWorkspace.frontmostApplication paket kimliği -> tablodaki exe adı (apps::exe_for_bundle),
//!   yoksa çalıştırılabilir dosya adı. İzin istemez.
//! - pencere başlığı (sekme adı): sadece "sekme adlarına bak" açıksa VE kullanıcı Erişilebilirlik izni verdiyse (SPEC 19 M4).
//!   İzin sorusu sadece settings.exe'deki "izin ver" düğmesiyle açılır; izleyici asla sormaz. Başlık bu dosyada düşer:
//!   dönen sadece site kategorisi ve "toplantı gibi mi" (Windows'takiyle aynı saf fonksiyonlar).
//! - pil: IOKit güç kaynağı özeti (yüzde + prizde mi). İzin istemez.
//! - boşta kalma: CGEventSourceSecondsSinceLastEventType (tuş/fare içeriği değil, sadece son girişten beri süre).
//! - toplantı: çalışan uygulamalar listesinde zoom/teams/webex.

use std::ffi::{c_char, c_void};

use objc2_app_kit::{NSRunningApplication, NSWorkspace};

use super::apps::{app_for_exe, exe_for_bundle, exe_stem};
use super::ContextSnapshot;
use crate::context::sites::{site_match, SiteMatch};
use crate::meeting::{title_suggests_meeting, MEETING_APPS};

#[link(name = "CoreGraphics", kind = "framework")]
extern "C" {
    fn CGEventSourceSecondsSinceLastEventType(state_id: i32, event_type: u32) -> f64;
}
type CFTypeRef = *const c_void;

#[repr(C)]
struct Opaque {
    _p: [u8; 0],
}

#[link(name = "CoreFoundation", kind = "framework")]
extern "C" {
    static kCFTypeDictionaryKeyCallBacks: Opaque;
    static kCFTypeDictionaryValueCallBacks: Opaque;
    static kCFBooleanTrue: CFTypeRef;
    fn CFRelease(cf: CFTypeRef);
    fn CFGetTypeID(cf: CFTypeRef) -> usize;
    fn CFStringGetTypeID() -> usize;
    fn CFNumberGetTypeID() -> usize;
    fn CFStringCreateWithCString(alloc: CFTypeRef, s: *const c_char, encoding: u32) -> CFTypeRef;
    fn CFStringGetLength(s: CFTypeRef) -> isize;
    fn CFStringGetMaximumSizeForEncoding(len: isize, encoding: u32) -> isize;
    fn CFStringGetCString(s: CFTypeRef, buf: *mut c_char, size: isize, encoding: u32) -> u8;
    fn CFDictionaryCreate(
        alloc: CFTypeRef,
        keys: *const CFTypeRef,
        values: *const CFTypeRef,
        n: isize,
        key_cb: *const Opaque,
        value_cb: *const Opaque,
    ) -> CFTypeRef;
    fn CFDictionaryGetValue(d: CFTypeRef, key: CFTypeRef) -> CFTypeRef;
    fn CFArrayGetCount(a: CFTypeRef) -> isize;
    fn CFArrayGetValueAtIndex(a: CFTypeRef, i: isize) -> CFTypeRef;
    fn CFNumberGetValue(n: CFTypeRef, kind: isize, out: *mut c_void) -> u8;
}

#[link(name = "ApplicationServices", kind = "framework")]
extern "C" {
    static kAXTrustedCheckOptionPrompt: CFTypeRef;
    fn AXIsProcessTrusted() -> u8;
    fn AXIsProcessTrustedWithOptions(options: CFTypeRef) -> u8;
    fn AXUIElementCreateApplication(pid: i32) -> CFTypeRef;
    fn AXUIElementCopyAttributeValue(element: CFTypeRef, attribute: CFTypeRef, value: *mut CFTypeRef) -> i32;
    fn AXUIElementSetMessagingTimeout(element: CFTypeRef, seconds: f32) -> i32;
}

#[link(name = "IOKit", kind = "framework")]
extern "C" {
    fn IOPSCopyPowerSourcesInfo() -> CFTypeRef;
    fn IOPSCopyPowerSourcesList(blob: CFTypeRef) -> CFTypeRef;
    fn IOPSGetPowerSourceDescription(blob: CFTypeRef, source: CFTypeRef) -> CFTypeRef;
}

const UTF8: u32 = 0x0800_0100;
/// kCFNumberSInt64Type
const SINT64: isize = 4;

/// Sahip olunan (Create/Copy) CF nesnesi; düşünce bırakılır.
struct Owned(CFTypeRef);

impl Owned {
    fn new(p: CFTypeRef) -> Option<Self> {
        (!p.is_null()).then_some(Self(p))
    }
}

impl Drop for Owned {
    fn drop(&mut self) {
        // Güvenli: işaretçi null değil ve Create/Copy kuralıyla bize ait; bir kez bırakılır.
        unsafe { CFRelease(self.0) }
    }
}

fn cfstr(s: &std::ffi::CStr) -> Option<Owned> {
    // Güvenli: s sonlandırılmış UTF-8; dönen dize bize ait (Owned bırakır).
    Owned::new(unsafe { CFStringCreateWithCString(std::ptr::null(), s.as_ptr(), UTF8) })
}

/// CFString ise Rust dizesine çevirir (değilse None). Sahiplik almaz.
fn string_of(v: CFTypeRef) -> Option<String> {
    // Güvenli: v null değil (çağıran kontrol eder) ve geçerli bir CF nesnesi; tampon boyutu API'nin verdiği en büyük boyut.
    unsafe {
        if v.is_null() || CFGetTypeID(v) != CFStringGetTypeID() {
            return None;
        }
        let max = CFStringGetMaximumSizeForEncoding(CFStringGetLength(v), UTF8) + 1;
        if !(1..=64 * 1024).contains(&max) {
            return None;
        }
        let mut buf = vec![0u8; max as usize];
        if CFStringGetCString(v, buf.as_mut_ptr().cast(), max, UTF8) == 0 {
            return None;
        }
        let end = buf.iter().position(|&b| b == 0).unwrap_or(buf.len());
        Some(String::from_utf8_lossy(&buf[..end]).into_owned())
    }
}

fn number_of(v: CFTypeRef) -> Option<i64> {
    // Güvenli: tür kontrolünden sonra yığındaki i64'e yazılır.
    unsafe {
        if v.is_null() || CFGetTypeID(v) != CFNumberGetTypeID() {
            return None;
        }
        let mut out: i64 = 0;
        (CFNumberGetValue(v, SINT64, (&mut out as *mut i64).cast()) != 0).then_some(out)
    }
}

/// Erişilebilirlik izni var mı. prompt: true ise macOS kendi izin penceresini açar (sadece settings.exe düğmesi).
pub fn accessibility(prompt: bool) -> bool {
    if !prompt {
        // Güvenli: argümansız sorgu.
        return unsafe { AXIsProcessTrusted() } != 0;
    }
    // Güvenli: anahtar/değer sabit CF nesneleri; sözlük bize ait ve Owned ile bırakılır.
    unsafe {
        let keys = [kAXTrustedCheckOptionPrompt];
        let values = [kCFBooleanTrue];
        let Some(opts) = Owned::new(CFDictionaryCreate(
            std::ptr::null(),
            keys.as_ptr(),
            values.as_ptr(),
            1,
            &kCFTypeDictionaryKeyCallBacks,
            &kCFTypeDictionaryValueCallBacks,
        )) else {
            return AXIsProcessTrusted() != 0;
        };
        AXIsProcessTrustedWithOptions(opts.0) != 0
    }
}

/// Öndeki uygulamanın odaktaki pencere başlığı. Sadece izin varsa; yanıt vermeyen uygulamada en fazla 0.25 sn bekler.
fn focused_title(pid: i32) -> Option<String> {
    if pid <= 0 || !accessibility(false) {
        return None;
    }
    let focused = cfstr(c"AXFocusedWindow")?;
    let title = cfstr(c"AXTitle")?;
    // Güvenli: app ve window Create/Copy ile alındı (Owned bırakır); çıktı işaretçisi yığında.
    unsafe {
        let app = Owned::new(AXUIElementCreateApplication(pid))?;
        AXUIElementSetMessagingTimeout(app.0, 0.25);
        let mut win: CFTypeRef = std::ptr::null();
        if AXUIElementCopyAttributeValue(app.0, focused.0, &mut win) != 0 {
            return None;
        }
        let win = Owned::new(win)?;
        let mut t: CFTypeRef = std::ptr::null();
        if AXUIElementCopyAttributeValue(win.0, title.0, &mut t) != 0 {
            return None;
        }
        let t = Owned::new(t)?;
        string_of(t.0)
    }
}

/// Pil: (yüzde, prizde mi). Pil yoksa (masaüstü Mac) (None, None).
pub fn power_status() -> (Option<u8>, Option<bool>) {
    let (Some(cur), Some(max), Some(state)) = (cfstr(c"Current Capacity"), cfstr(c"Max Capacity"), cfstr(c"Power Source State")) else {
        return (None, None);
    };
    let Some(kind) = cfstr(c"Type") else {
        return (None, None);
    };
    // Güvenli: blob ve liste Copy ile alındı (Owned bırakır); açıklama sözlüğü blob'a ait (bırakılmaz), blob yaşarken okunur.
    unsafe {
        let Some(blob) = Owned::new(IOPSCopyPowerSourcesInfo()) else {
            return (None, None);
        };
        let Some(list) = Owned::new(IOPSCopyPowerSourcesList(blob.0)) else {
            return (None, None);
        };
        for i in 0..CFArrayGetCount(list.0) {
            let desc = IOPSGetPowerSourceDescription(blob.0, CFArrayGetValueAtIndex(list.0, i));
            if desc.is_null() {
                continue;
            }
            if string_of(CFDictionaryGetValue(desc, kind.0)).as_deref() != Some("InternalBattery") {
                continue;
            }
            let pct = match (number_of(CFDictionaryGetValue(desc, cur.0)), number_of(CFDictionaryGetValue(desc, max.0))) {
                (Some(c), Some(m)) => super::battery_percent(c, m),
                _ => None,
            };
            let on_ac = string_of(CFDictionaryGetValue(desc, state.0)).map(|s| s == "AC Power");
            return (pct, on_ac);
        }
    }
    (None, None)
}

/// kCGEventSourceStateCombinedSessionState
const COMBINED_SESSION: i32 = 0;
/// kCGAnyInputEventType
const ANY_INPUT: u32 = u32::MAX;

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Reading {
    pub snapshot: ContextSnapshot,
    pub meeting_app_running: bool,
    pub meeting_app_front: bool,
    /// öndeki tarayıcı başlığı toplantı gibi (izin ve ayar varsa; yoksa false)
    pub title_hint: bool,
    pub read_error: bool,
}

fn exe_of(app: &NSRunningApplication) -> Option<String> {
    // salt okunur özellikler; nil olabilirler (Option)
    let bundle = app.bundleIdentifier().map(|s| s.to_string());
    if let Some(exe) = bundle.as_deref().and_then(exe_for_bundle) {
        return Some(exe.to_string());
    }
    let url = app.executableURL()?;
    let name = url.lastPathComponent()?.to_string();
    Some(exe_stem(&name))
}

/// tab_titles: "sekme adlarına bak" ayarı. Kapalıysa ya da izin yoksa başlık hiç okunmaz.
pub fn read(tab_titles: bool) -> Reading {
    // paylaşılan çalışma alanı; salt okunur sorgular
    let ws = NSWorkspace::sharedWorkspace();
    let front_app = ws.frontmostApplication();
    let front = front_app.as_ref().and_then(|a| exe_of(a));
    let running: Vec<String> = ws.runningApplications().iter().filter_map(|a| exe_of(&a)).collect();
    let meeting_app_running = running.iter().any(|e| MEETING_APPS.iter().any(|m| e.contains(m)));
    let meeting_app_front = front.as_deref().is_some_and(|e| MEETING_APPS.iter().any(|m| e.contains(m)));
    let app = front.as_deref().and_then(app_for_exe).map(str::to_string);
    // başlık sadece bu blokta yaşar: site kategorisi ve toplantı ipucu çıkar, başlık düşer
    let (title_site, title_hint): (Option<SiteMatch>, bool) = match front_app.as_ref() {
        Some(a) if tab_titles => match focused_title(a.processIdentifier()) {
            Some(t) => (site_match(&t), app.as_deref() == Some("browser") && title_suggests_meeting(&t)),
            None => (None, false),
        },
        _ => (None, false),
    };
    let site = title_site.or_else(|| front.as_deref().and_then(crate::context::sites::site_for_exe));
    let (battery_pct, on_ac) = power_status();
    Reading {
        snapshot: ContextSnapshot {
            app,
            idle_secs: idle_secs(),
            battery_pct,
            on_ac,
            site_silent: site.as_ref().is_some_and(|m| m.silent),
            site: site.map(|m| m.category),
        },
        meeting_app_running,
        meeting_app_front,
        title_hint,
        read_error: false,
    }
}

pub fn idle_secs() -> u64 {
    // Güvenli: saf C fonksiyonu, sadece süre döner.
    let s = unsafe { CGEventSourceSecondsSinceLastEventType(COMBINED_SESSION, ANY_INPUT) };
    if s.is_finite() && s >= 0.0 {
        s as u64
    } else {
        0
    }
}

pub fn local_hour() -> u8 {
    // Güvenli: time/localtime_r yığındaki tm yapısına yazar.
    unsafe {
        let t = libc::time(std::ptr::null_mut());
        let mut tm: libc::tm = std::mem::zeroed();
        if libc::localtime_r(&t, &mut tm).is_null() {
            return 12;
        }
        (tm.tm_hour.rem_euclid(24)) as u8
    }
}
