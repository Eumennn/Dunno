// Kalıcı ayarlar (tauri-plugin-store sarmalayıcı). Tek anahtar altında tek nesne; bozuk/eksik alanlar varsayılana döner.
// Değişince "settings://changed" olayı yayılır (laf motoru, tray dinler).
import { emit } from "@tauri-apps/api/event";
import { load } from "@tauri-apps/plugin-store";
import { SPEED_FACTOR, type BubbleSpeed } from "./talk/reading";
import { cleanSize, isSize, LEGACY_SIZES, type SizeLevel } from "./size/size";
import { cleanVolume, DEFAULT_VOLUME, isVolume, LEGACY_VOLUME, type VoiceVolume } from "./voice/voice";
import { BUBBLE_STYLES, PERSONALITIES, VOICE_STYLES, type BubbleStyleId, type Personality, type VoiceStyleId } from "./pro/entitlements";

export type Lang = "tr" | "en";
export type Mode = "polite" | "street";
export type Frequency = "low" | "normal" | "high";

export const DARK_MODES = ["off", "on", "system"] as const;
export type DarkMode = (typeof DARK_MODES)[number];

/** Karanlık mod etkin mi (system: Windows/WebView koyu tercih). */
export function isDark(mode: DarkMode, prefersDark: boolean): boolean {
  return mode === "on" || (mode === "system" && prefersDark);
}

export interface Settings {
  lang: Lang;
  mode: Mode;
  frequency: Frequency;
  /** rastgele cihaz kimliği; backend rate limit için. Kişisel veri değil. */
  deviceId: string;
  autostart: boolean;
  /** "bugün sus": bu yerel tarih (YYYY-MM-DD) dahil susar; null = susmuyor */
  muteUntil: string | null;
  firstRunDone: boolean;
  /** konuşma balonu süresi (SPEC 07 FB5): kısa 0.75x / normal / uzun 1.5x */
  bubbleSpeed: BubbleSpeed;
  /** SPEC 17 karanlık mod (kullanıcı isteği): kapalı / açık / sistem (Windows koyu tema) */
  darkMode: DarkMode;
  /** pet boyutu (SPEC 08): minik..dev = 1x..5x, varsayılan küçük (2x, eski boyut) */
  size: SizeLevel;
  /** "osuruk: açık/kapalı" (SPEC 09 K3); varsayılan açık */
  fart: boolean;
  /** "sekme adlarına bak" (SPEC 09 K7): başlık sadece cihazda kategoriye çevrilir; varsayılan açık */
  tabTitles: boolean;
  /** FB8 "müziğe tepki": çalan müziğin sadece özeti (aynı şarkı mı, atlama, süre); varsayılan KAPALI */
  music: boolean;
  /** isteğe bağlı kullanım istatistiği (SPEC 10 CL6): varsayılan KAPALI, açık rıza */
  telemetry: boolean;
  /** FB6: bir haftalık kullanımdan sonra sayaç izni bir kez soruldu mu (cevap ne olursa olsun bir daha sorulmaz) */
  telemetryAsked: boolean;
  /** Dunno sesi (SPEC 11): varsayılan açık, orta */
  voice: boolean;
  voiceVolume: VoiceVolume;
  /** veri modları (SPEC 12 B): mod id -> açık mı. Yeni bulunan mod KAPALI başlar (kullanıcı settings.exe'den açar). */
  mods: Record<string, boolean>;
  /** SPEC 15: kişilik ön ayarı (Pro; Free'de dengeli uygulanır, ayar korunur) */
  personality: Personality;
  /** SPEC 15: başarım ilerlemesiyle açılan balon ve ses stilleri (açılmamışsa klasik uygulanır) */
  bubbleStyle: BubbleStyleId;
  voiceStyle: VoiceStyleId;
}

export const SETTINGS_EVENT = "settings://changed";
export const DEVICE_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STORE_KEY = "settings";

const LANGS: readonly Lang[] = ["tr", "en"];
const MODES: readonly Mode[] = ["polite", "street"];
const FREQUENCIES: readonly Frequency[] = ["low", "normal", "high"];
const SPEEDS = Object.keys(SPEED_FACTOR) as BubbleSpeed[];

/** Store erişimi (gerçeği tauri-plugin-store, testte bellek içi). */
export interface Backend {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  save(): Promise<void>;
}

export type Emit = (event: string, payload: Settings) => void | Promise<void>;

export function newDeviceId(): string {
  return crypto.randomUUID();
}

export function defaultSettings(deviceId: string): Settings {
  return {
    lang: "tr",
    mode: "polite",
    frequency: "normal",
    deviceId,
    autostart: false,
    muteUntil: null,
    firstRunDone: false,
    bubbleSpeed: "normal",
    darkMode: "off",
    size: cleanSize(undefined),
    fart: true,
    tabTitles: true,
    music: false,
    telemetry: false,
    telemetryAsked: false,
    voice: true,
    voiceVolume: DEFAULT_VOLUME,
    mods: {},
    personality: "balanced",
    bubbleStyle: "classic",
    voiceStyle: "classic",
  };
}

const oneOf = <T>(list: readonly T[], v: unknown): v is T => list.includes(v as T);

/**
 * Ham store değerini doğrular. Geçersiz alanlar varsayılana döner ve `repaired` listesine yazılır.
 */
export function sanitize(raw: unknown, newId: () => string = newDeviceId): { settings: Settings; repaired: string[] } {
  const r = typeof raw === "object" && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const repaired: string[] = [];
  const pick = <K extends keyof Settings>(key: K, ok: boolean, fallback: Settings[K]): Settings[K] => {
    if (ok) return r[key] as Settings[K];
    repaired.push(key);
    return fallback;
  };
  const deviceId = typeof r.deviceId === "string" && DEVICE_ID_RE.test(r.deviceId) ? r.deviceId : newId();
  const d = defaultSettings(deviceId);
  if (deviceId !== r.deviceId) repaired.push("deviceId");
  const settings: Settings = {
    lang: pick("lang", oneOf(LANGS, r.lang), d.lang),
    mode: pick("mode", oneOf(MODES, r.mode), d.mode),
    frequency: pick("frequency", oneOf(FREQUENCIES, r.frequency), d.frequency),
    deviceId,
    autostart: pick("autostart", typeof r.autostart === "boolean", d.autostart),
    muteUntil: pick(
      "muteUntil",
      r.muteUntil === null || (typeof r.muteUntil === "string" && DATE_RE.test(r.muteUntil)),
      d.muteUntil,
    ),
    firstRunDone: pick("firstRunDone", typeof r.firstRunDone === "boolean", d.firstRunDone),
    bubbleSpeed: pick("bubbleSpeed", oneOf(SPEEDS, r.bubbleSpeed), d.bubbleSpeed),
    darkMode: pick("darkMode", oneOf(DARK_MODES, r.darkMode), d.darkMode),
    // FB4-2: 0..100; eski seviye adı sayıya çevrilir
    size: typeof r.size === "string" && r.size in LEGACY_SIZES ? cleanSize(r.size) : pick("size", isSize(r.size), d.size),
    fart: pick("fart", typeof r.fart === "boolean", d.fart),
    tabTitles: pick("tabTitles", typeof r.tabTitles === "boolean", d.tabTitles),
    music: pick("music", typeof r.music === "boolean", d.music),
    telemetry: pick("telemetry", typeof r.telemetry === "boolean", d.telemetry),
    telemetryAsked: pick("telemetryAsked", typeof r.telemetryAsked === "boolean", d.telemetryAsked),
    voice: pick("voice", typeof r.voice === "boolean", d.voice),
    // FB4-2: 0..100; eski low/medium/high kaydı sayıya çevrilir (onarım sayılmaz)
    voiceVolume: typeof r.voiceVolume === "string" && r.voiceVolume in LEGACY_VOLUME ? cleanVolume(r.voiceVolume) : pick("voiceVolume", isVolume(r.voiceVolume), d.voiceVolume),
    mods: pick("mods", isModMap(r.mods), d.mods),
    personality: pick("personality", (PERSONALITIES as readonly unknown[]).includes(r.personality), d.personality),
    bubbleStyle: pick("bubbleStyle", (BUBBLE_STYLES as readonly unknown[]).includes(r.bubbleStyle), d.bubbleStyle),
    voiceStyle: pick("voiceStyle", (VOICE_STYLES as readonly unknown[]).includes(r.voiceStyle), d.voiceStyle),
  };
  return { settings, repaired };
}

const MOD_ID_RE = /^[a-z][a-z0-9_]{1,31}$/;
const isModMap = (v: unknown): boolean =>
  typeof v === "object" && v !== null && !Array.isArray(v) && Object.keys(v).length <= 64 &&
  Object.entries(v).every(([k, b]) => MOD_ID_RE.test(k) && typeof b === "boolean");

/** Yerel tarih, YYYY-MM-DD. */
export function localDate(now: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export function isMuted(s: Settings, now: Date): boolean {
  return s.muteUntil !== null && localDate(now) <= s.muteUntil;
}

export class SettingsStore {
  private listeners = new Set<(s: Settings) => void>();

  private constructor(
    private current: Settings,
    private readonly backend: Backend,
    private readonly emit?: Emit,
  ) {}

  /** Store'u açar; bozuk ya da eksikse varsayılanlarla onarıp kaydeder. */
  static async open(backend: Backend, opts: { emit?: Emit; newId?: () => string } = {}): Promise<SettingsStore> {
    let raw: unknown;
    try {
      raw = await backend.get(STORE_KEY);
    } catch {
      raw = undefined;
    }
    const { settings, repaired } = sanitize(raw, opts.newId);
    const store = new SettingsStore(settings, backend, opts.emit);
    if (raw === undefined || repaired.length > 0) await store.persist();
    return store;
  }

  get(): Readonly<Settings> {
    return this.current;
  }

  /** Alanları günceller (deviceId değişmez). Geçersiz değerler reddedilir. */
  async update(patch: Partial<Omit<Settings, "deviceId">>): Promise<Settings> {
    const next = { ...this.current, ...patch, deviceId: this.current.deviceId };
    const { settings, repaired } = sanitize(next, () => this.current.deviceId);
    if (repaired.length > 0) throw new Error(`settings: invalid ${repaired.join(", ")}`);
    const changed = (Object.keys(settings) as (keyof Settings)[]).some((k) => settings[k] !== this.current[k]);
    if (!changed) return this.current;
    this.current = settings;
    await this.persist();
    for (const cb of this.listeners) cb(settings);
    await this.emit?.(SETTINGS_EVENT, settings);
    return settings;
  }

  onChange(cb: (s: Settings) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private async persist(): Promise<void> {
    await this.backend.set(STORE_KEY, this.current);
    await this.backend.save();
  }
}

const STORE_FILE = "settings.json";

/**
 * Uygulamanın kalıcı store'u (ayarlar + konuşma durumu aynı dosyada, ayrı anahtarlarda).
 * Dosya okunamazsa bu oturum bellekte çalışır.
 */
export async function openAppStore(): Promise<Backend> {
  try {
    return await load(STORE_FILE, { autoSave: false, defaults: {} });
  } catch (e) {
    console.warn("settings: store unreadable, using defaults for this session", e);
    const mem = new Map<string, unknown>();
    return {
      get: async (k) => mem.get(k),
      set: async (k, v) => void mem.set(k, v),
      save: async () => {},
    };
  }
}

export function openSettings(backend: Backend): Promise<SettingsStore> {
  return SettingsStore.open(backend, { emit: (event, payload) => emit(event, payload) });
}
