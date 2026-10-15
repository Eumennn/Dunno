// dunno.exe <-> pet penceresi köprüsü. Ayarları ve sayaçları tek yazan pet penceresidir:
// dunno.exe isteklerini `ui://action` olayıyla gönderir, durumu `app://status` ile alır.
// Pencere kontrolleri (sürükle/küçült/gizle) ve autostart Rust komutlarıyla: JS pencere API izinleri kapalı.
import { DARK_MODES, type DarkMode } from "./settings";
import { FORMS, type Form } from "./companion/evolution";
import type { CompanionView } from "./companion/view";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { parseTrayAction, type TrayAction } from "./ipc-tray";
import type { Frequency, Lang, Mode } from "./lines/types";
import type { StatsSnapshot } from "./stats/stats";
import type { WardrobeView } from "./wardrobe/wardrobe";
import { EDGE_TARGETS, type EdgeTarget } from "./devmode/edges";
import type { TestMode } from "./devmode/testmode";
import { SPEED_FACTOR, type BubbleSpeed } from "./talk/reading";
import { ACHIEVEMENTS, type AchievementId } from "./wardrobe/achievements";
import { isSize, type SizeLevel } from "./size/size";
import { isVolume, type VoiceVolume } from "./voice/voice";
import { WORLDS, type World } from "./eggs/eggs";
import { PRESETS } from "./pro/presets";
import type { Profile, ProfileInput, Reject } from "./personal/profile";
import { BUBBLE_STYLES, PERSONALITIES, VOICE_STYLES, type BubbleStyleId, type Personality, type Tier, type VoiceStyleId } from "./pro/entitlements";

export const EVENT_UI_ACTION = "ui://action";
export const EVENT_APP_STATUS = "app://status";
export const EVENT_STATUS_REQUEST = "app://status-request";

/** Tray aksiyonları + dunno.exe'ye özel olanlar. */
export type UiAction =
  | TrayAction
  | { action: "summon" }
  /** about.txt "karşılamayı tekrar oynat" (SPEC 10 CL4) */
  | { action: "welcome" }
  /** about.txt güncelleme (SPEC 10 CL1) */
  | { action: "update_check" }
  | { action: "update_install" }
  | { action: "send_edge" }
  | { action: "stats_reset" }
  /** gardırop seçimi; accessory null = çıkar (pet penceresi kilit kontrolü yapar) */
  | { action: "wardrobe"; theme?: string; accessory?: string | null; costume?: string | null }
  /** settings.exe "balon süresi" (SPEC 07 FB5) */
  | { action: "bubble_speed"; value: BubbleSpeed }
  /** SPEC 17 karanlık mod */
  | { action: "dark_mode"; value: DarkMode }
  /** settings.exe "osuruk" (SPEC 09 K3) */
  | { action: "fart"; value: boolean }
  | { action: "tab_titles"; value: boolean }
  | { action: "music"; value: boolean }
  | { action: "telemetry"; value: boolean }
  /** FB6: haftalık izin kartına cevap (açar ya da kapalı bırakır; bir daha sorulmaz) */
  | { action: "telemetry_answer"; value: boolean }
  | { action: "voice"; value: boolean }
  | { action: "voice_volume"; value: VoiceVolume }
  /** settings.exe gizli (SPEC 14): dünya seçimi, canavar modu (sadece açılanlar; pet penceresi denetler) */
  | { action: "egg_world"; value: World }
  | { action: "monster"; value: boolean }
  /** SPEC 15: kişilik (Pro), balon/ses stili (başarım ilerlemesi), lisans değişti (anahtar olayla taşınmaz; pet Rust'a yeniden sorar) */
  | { action: "personality"; value: Personality }
  | { action: "bubble_style"; value: BubbleStyleId }
  | { action: "voice_style"; value: VoiceStyleId }
  | { action: "license_changed" }
  /** SPEC 16 kişisel dunno: aç (rıza kutusu işaretliyken), kaydet (pet penceresi süzer), sil+kapat */
  | { action: "personal_on" }
  | { action: "personal_off" }
  | { action: "personal_save"; profile: ProfileInput }
  /** SPEC 15 hazır görünüm (pet penceresi kilitleri denetler) */
  | { action: "preset"; id: string }
  /** SPEC 17 pet.txt: Pro evrim yolu seçimi (pet penceresi Pro'yu ve dalı denetler) */
  | { action: "evolve_choose"; form: Form }
  /** FB7 alarms.txt: alarmı sil */
  | { action: "reminder_delete"; id: string }
  /** FB6 about.txt: ilk adımları baştan göster */
  | { action: "onboard_restart" }
  /** FB6 ilk adımlar: dunno.exe açıldı / pet.txt görüldü */
  | { action: "onboard"; value: "open" | "tree" }
  /** settings.exe modlar (SPEC 12 B): modu aç/kapat (açılışta uygulanır) */
  | { action: "mod"; id: string; on: boolean }
  /** settings.exe "boyut" (SPEC 08) */
  | { action: "pet_size"; value: SizeLevel }
  /** test modu (SPEC 07 FB2): toggle = about.txt 5 tık; diğerleri sadece mod açıkken etkili */
  | { action: "test"; op: "toggle" | "off" | "reset_quota" | "size_next" | "fart" }
  /** SPEC 17: test modunda eğlenceli animasyonu oynat */
  | { action: "test"; op: "anim"; anim: "wave" | "jump" | "dance" | "yawn" | "sneeze" }
  | { action: "test"; op: "tempo"; on: boolean }
  /** SPEC 15: Pro simülasyonu (test modu) */
  | { action: "test"; op: "pro"; on: boolean }
  | { action: "test"; op: "trigger"; id: AchievementId }
  | { action: "test"; op: "edge"; target: EdgeTarget };

const MOD_ID = /^[a-z][a-z0-9_]{1,31}$/;

export function parseUiAction(raw: unknown): UiAction | null {
  if (typeof raw === "object" && raw !== null) {
    const a = (raw as { action?: unknown }).action;
    if (a === "summon" || a === "send_edge" || a === "stats_reset" || a === "welcome" || a === "onboard_restart" || a === "update_check" || a === "update_install" || a === "license_changed" || a === "personal_on" || a === "personal_off") return { action: a };
    if (a === "personal_save") {
      const p = (raw as { profile?: unknown }).profile;
      return typeof p === "object" && p !== null && !Array.isArray(p) ? { action: a, profile: p as ProfileInput } : null;
    }
    if (a === "reminder_delete") {
      const id = (raw as { id?: unknown }).id;
      return typeof id === "string" && /^rem_[a-z0-9]{1,16}$/.test(id) ? { action: a, id } : null;
    }
    if (a === "onboard") {
      const v = (raw as { value?: unknown }).value;
      return v === "open" || v === "tree" ? { action: a, value: v } : null;
    }
    if (a === "evolve_choose") {
      const f = (raw as { form?: unknown }).form;
      return (FORMS as readonly unknown[]).includes(f) ? { action: a, form: f as Form } : null;
    }
    if (a === "preset") {
      const id = (raw as { id?: unknown }).id;
      return typeof id === "string" && PRESETS.some((p) => p.id === id) ? { action: a, id } : null;
    }
    if (a === "personality" || a === "bubble_style" || a === "voice_style") {
      const v = (raw as { value?: unknown }).value;
      const list: readonly unknown[] = a === "personality" ? PERSONALITIES : a === "bubble_style" ? BUBBLE_STYLES : VOICE_STYLES;
      return list.includes(v) ? ({ action: a, value: v } as UiAction) : null;
    }
    if (a === "dark_mode") {
      const v = (raw as { value?: unknown }).value;
      return (DARK_MODES as readonly unknown[]).includes(v) ? { action: a, value: v as DarkMode } : null;
    }
    if (a === "bubble_speed") {
      const v = (raw as { value?: unknown }).value;
      return typeof v === "string" && v in SPEED_FACTOR ? { action: a, value: v as BubbleSpeed } : null;
    }
    if (a === "voice_volume") {
      const v = (raw as { value?: unknown }).value;
      return isVolume(v) ? { action: a, value: Math.round(v) } : null;
    }
    if (a === "tab_titles" || a === "telemetry" || a === "voice" || a === "telemetry_answer" || a === "music") {
      const v = (raw as { value?: unknown }).value;
      return typeof v === "boolean" ? { action: a, value: v } : null;
    }
    if (a === "egg_world") {
      const v = (raw as { value?: unknown }).value;
      return (WORLDS as readonly unknown[]).includes(v) ? { action: a, value: v as World } : null;
    }
    if (a === "monster") {
      const v = (raw as { value?: unknown }).value;
      return typeof v === "boolean" ? { action: a, value: v } : null;
    }
    if (a === "mod") {
      const r = raw as { id?: unknown; on?: unknown };
      return typeof r.id === "string" && MOD_ID.test(r.id) && typeof r.on === "boolean" ? { action: a, id: r.id, on: r.on } : null;
    }
    if (a === "fart") {
      const v = (raw as { value?: unknown }).value;
      return typeof v === "boolean" ? { action: a, value: v } : null;
    }
    if (a === "pet_size") {
      const v = (raw as { value?: unknown }).value;
      return isSize(v) ? { action: a, value: Math.round(v) } : null;
    }
    if (a === "test") return parseTestAction(raw as Record<string, unknown>);
    if (a === "wardrobe") {
      const r = raw as { theme?: unknown; accessory?: unknown; costume?: unknown };
      // mod parçaları rakam içerebilir (SPEC 12 B: <modid>_<ad>)
      const id = (v: unknown) => typeof v === "string" && /^[a-z][a-z0-9_]{0,63}$/.test(v);
      const out: UiAction = { action: "wardrobe" };
      if (id(r.theme)) out.theme = r.theme as string;
      if (r.accessory === null || id(r.accessory)) out.accessory = r.accessory as string | null;
      if (r.costume === null || id(r.costume)) out.costume = r.costume as string | null;
      return out.theme !== undefined || out.accessory !== undefined || out.costume !== undefined ? out : null;
    }
  }
  return parseTrayAction(raw);
}

function parseTestAction(r: Record<string, unknown>): UiAction | null {
  const op = r.op;
  if (op === "toggle" || op === "off" || op === "reset_quota" || op === "size_next" || op === "fart") return { action: "test", op };
  if (op === "anim" && ["wave", "jump", "dance", "yawn", "sneeze"].includes(r.anim as string)) return { action: "test", op, anim: r.anim as "wave" };
  if (op === "tempo" && typeof r.on === "boolean") return { action: "test", op, on: r.on };
  if (op === "pro" && typeof r.on === "boolean") return { action: "test", op, on: r.on };
  if (op === "trigger" && ACHIEVEMENTS.some((x) => x.id === r.id)) return { action: "test", op, id: r.id as AchievementId };
  if (op === "edge" && (EDGE_TARGETS as readonly unknown[]).includes(r.target)) return { action: "test", op, target: r.target as EdgeTarget };
  return null;
}

/** dunno.exe'nin gösterdiği anlık durum (sadece cihaz içi). */
export interface AppStatus {
  /** pet animasyon durumu (idle, walk, sleep...) */
  state: string;
  /** pet'in baktığı yön (sprite sağa çizili; sol = ayna) */
  facing: "left" | "right";
  left: number;
  total: number;
  mode: Mode;
  lang: Lang;
  frequency: Frequency;
  autostart: boolean;
  muted: boolean;
  inMeeting: boolean;
  manualMeeting: boolean;
  /** stats.txt (sadece cihazda); yüklenmediyse null */
  stats: StatsSnapshot | null;
  /** wardrobe.exe: seçimler, açılanlar, başarım ilerlemesi */
  wardrobe: WardrobeView | null;
  bubbleSpeed: BubbleSpeed;
  darkMode?: DarkMode;
  /** pet boyutu (SPEC 08) */
  size: SizeLevel;
  /** "osuruk: açık/kapalı" (SPEC 09 K3) */
  fart: boolean;
  /** "sekme adlarına bak" (SPEC 09 K7) */
  tabTitles: boolean;
  /** kullanım istatistiği (SPEC 10 CL6), varsayılan kapalı */
  telemetry: boolean;
  /** FB8 müziğe tepki */
  music?: boolean;
  /** FB7: kurulu alarmlar (sadece yerel pencereler arası) */
  reminders?: { id: string; at: string; label: string }[];
  /** FB6: dunno.exe home'da sayaç izni kartı gösterilsin mi (7 aktif günden sonra, bir kez) */
  telemetryAsk?: boolean;
  /** Dunno sesi (SPEC 11) */
  voice?: boolean;
  voiceVolume?: VoiceVolume;
  /** veri modları (SPEC 12 B): ayardaki aç/kapa ve şu an yüklü olanlar (fark varsa yeniden başlatma gerekir) */
  mods?: Record<string, boolean>;
  modsActive?: string[];
  /** gizli dünyalar (SPEC 14): açılanlar, seçili, canavar; settings.exe "gizli" bölümü sadece bir şey açıldıysa görünür */
  eggs?: { worlds: string[]; world: string; monster: boolean; monsterFound: boolean };
  /** SPEC 15: katman (lisans ya da test simülasyonu), lisans sistemi açık mı, lisans kimliği sonu */
  pro?: { tier: Tier; enabled: boolean; tail: string | null; sim: boolean; packs?: string[]; until?: string | null; expired?: boolean };
  modsBlocked?: Record<string, string[]>;
  /** SPEC 16: sadece açıkken profil (yerel pencereler arası; ağa gitmez) */
  personal?: { on: boolean; consentAt: string | null; profile: Profile | null; rejected: Partial<Record<string, Reject>> };
  personality?: Personality;
  bubbleStyle?: BubbleStyleId;
  voiceStyle?: VoiceStyleId;
  /** test modu (SPEC 07 FB2); kapalıyken settings.exe bölümü görünmez */
  testMode: TestMode;
  /** güncelleme (SPEC 10 CL1): bulunan yeni sürüm, kontrol sürüyor mu, elle kontrol sonucu "güncel" */
  update?: { available: string | null; busy: boolean; upToDate: boolean; error?: string | null };
  /** SPEC 18 workshop: rastgele cihaz kimliği (beğeni / yükleme / ai dünya; kişisel değil) */
  deviceId?: string;
  /** SPEC 17: pet.txt / memories.log (sadece sayı, enum, şablon id) */
  companion?: CompanionView;
}

export function sendUiAction(a: UiAction): Promise<void> {
  return emit(EVENT_UI_ACTION, a);
}

export function onUiAction(cb: (a: UiAction) => void): Promise<UnlistenFn> {
  return listen<unknown>(EVENT_UI_ACTION, (e) => {
    const a = parseUiAction(e.payload);
    if (a) cb(a);
  });
}

export function emitStatus(s: AppStatus): Promise<void> {
  return emit(EVENT_APP_STATUS, s);
}

export function onStatus(cb: (s: AppStatus) => void): Promise<UnlistenFn> {
  return listen<AppStatus>(EVENT_APP_STATUS, (e) => cb(e.payload));
}

export function requestStatus(): Promise<void> {
  return emit(EVENT_STATUS_REQUEST, null);
}

export function onStatusRequest(cb: () => void): Promise<UnlistenFn> {
  return listen(EVENT_STATUS_REQUEST, () => cb());
}

export function openAppWindow(): Promise<void> {
  return invoke("open_app_window");
}

/** Çağıran pencerenin kendisi için (ui-kit başlık çubuğu). */
export const windowDrag = (): Promise<void> => invoke("window_drag");
export const windowMinimize = (): Promise<void> => invoke("window_minimize");
export const windowHide = (): Promise<void> => invoke("window_hide");
/** büyüt / eski boyut (SPEC 07 FB3); dönen: şimdi büyütülmüş mü */
export const windowToggleMaximize = (): Promise<boolean> => invoke("window_toggle_maximize");

export const getAutostart = (): Promise<boolean> => invoke("get_autostart");
/** Gerçek (kayıt defterindeki) durumu döner. */
export const setAutostart = (on: boolean): Promise<boolean> => invoke("set_autostart", { on });

export function setManualMeeting(on: boolean): Promise<void> {
  return invoke("set_manual_meeting", { on });
}
