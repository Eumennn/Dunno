// Dunno sesi (SPEC 11, saf): her anlamlı tepkiye kısa, özgün, robotik anlamsız ses. TTS değil, mikrofon yok.
// SES METNİ OKUMAZ: plan sadece kategori + varyasyon numarasından (tohumlu) üretilir; metnin içeriği/uzunluğu girdi değildir.
// Ses dosyası yok: hece listesi (frekans, süre, aralık, düzey, kayma, dalga) Web Audio ile çalınır (voice/player.ts).

export const VOICE_CATEGORIES = ["greet", "answer", "honest", "sulk", "too_fast", "achievement", "warn", "context", "wave", "jump", "dance", "yawn", "sneeze"] as const;
export type VoiceCategory = (typeof VOICE_CATEGORIES)[number];

/** kategori başına varyasyon sayısı (küçük havuz) */
export const VARIANTS = 5;

export type Wave = "square" | "triangle" | "sawtooth";

/** Kategori karakteri: perde aralığı, hece sayısı ve süresi, dalga, eğilim (soru gibi yükselen / homurtu gibi düşen). */
export interface VoiceProfile {
  /** taban perde aralığı (Hz) */
  base: [number, number];
  syllables: [number, number];
  /** hece süresi (ms) */
  dur: [number, number];
  /** heceler arası (ms) */
  gap: [number, number];
  wave: Wave;
  /** hece boyunca perde kayması oranı (1 = yok; 1.2 yükselir, 0.8 düşer) */
  glide: [number, number];
  /** cümle boyunca perde eğilimi (son hece / ilk hece) */
  contour: number;
}

export const PROFILES: Record<VoiceCategory, VoiceProfile> = {
  // dürtme / selam: kısa, tiz, zıplayan
  greet: { base: [520, 700], syllables: [2, 3], dur: [45, 70], gap: [25, 45], wave: "square", glide: [1.05, 1.25], contour: 1.15 },
  // havuz cevabı: orta perde, kayıtsız mırıltı
  answer: { base: [330, 440], syllables: [3, 5], dur: [55, 85], gap: [30, 55], wave: "triangle", glide: [0.92, 1.08], contour: 0.95 },
  // doğru cevap: daha düzenli, kendinden emin, sonda kinayeli yükseliş
  honest: { base: [380, 480], syllables: [4, 6], dur: [60, 80], gap: [25, 40], wave: "square", glide: [0.98, 1.04], contour: 1.2 },
  // hak bitti: alçak, düşen homurtu
  sulk: { base: [150, 210], syllables: [2, 3], dur: [110, 160], gap: [50, 80], wave: "sawtooth", glide: [0.75, 0.9], contour: 0.8 },
  // çok hızlı: hızlı, gergin, kesik
  too_fast: { base: [600, 820], syllables: [4, 6], dur: [30, 45], gap: [15, 25], wave: "square", glide: [0.95, 1.1], contour: 1.0 },
  // başarım: sevinçli yükselen arpej
  achievement: { base: [500, 620], syllables: [3, 4], dur: [60, 80], gap: [20, 30], wave: "triangle", glide: [1.0, 1.06], contour: 1.5 },
  // uyarı (bugün sus, hata): iki kısa düz bip
  warn: { base: [420, 460], syllables: [2, 2], dur: [70, 90], gap: [60, 80], wave: "square", glide: [1.0, 1.0], contour: 0.9 },
  // bağlam lafı (uygulama, site, saat, boşta): sohbet havası
  context: { base: [360, 520], syllables: [3, 5], dur: [50, 75], gap: [30, 50], wave: "triangle", glide: [0.94, 1.12], contour: 1.05 },
  // SPEC 17 animasyon sesleri (konuşma değil, efekt): el sallama iki tiz "hey", zıplama yükselen "boing", dans küçük arpej,
  // esneme uzun düşen "haaa", hapşırma "a-a-çu" (son hece yüksek ve kısa)
  wave: { base: [560, 680], syllables: [2, 2], dur: [50, 65], gap: [40, 60], wave: "square", glide: [1.1, 1.25], contour: 1.2 },
  jump: { base: [280, 340], syllables: [1, 1], dur: [140, 170], gap: [10, 10], wave: "square", glide: [1.4, 1.5], contour: 1.0 },
  dance: { base: [440, 520], syllables: [6, 7], dur: [65, 80], gap: [35, 50], wave: "triangle", glide: [1.0, 1.04], contour: 1.3 },
  yawn: { base: [300, 360], syllables: [2, 2], dur: [180, 200], gap: [10, 15], wave: "triangle", glide: [0.6, 0.7], contour: 0.7 },
  sneeze: { base: [420, 500], syllables: [3, 3], dur: [60, 80], gap: [70, 110], wave: "sawtooth", glide: [1.0, 1.15], contour: 1.5 },
};

export interface Syllable {
  /** başlangıç (ms, sesin başından) */
  at: number;
  dur: number;
  freq: number;
  /** hece sonu frekansı (kayma) */
  to: number;
  /** 0..1 göreli düzey (genel ses düzeyiyle çarpılır) */
  vol: number;
  wave: Wave;
}

/** Küçük deterministik üreteç (mulberry32): aynı tohum aynı ses. */
function rng32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (r: () => number, [a, b]: readonly [number, number]) => a + r() * (b - a);

/** Kategori + varyasyon (0..VARIANTS-1) -> hece planı. Metin girdi değildir. */
export function planBabble(category: VoiceCategory, variant: number, profiles: Partial<Record<VoiceCategory, VoiceProfile>> = PROFILES): Syllable[] {
  // SPEC 12: mod ses profili (sınırları mods.ts checkProfile denetler) varsa o, yoksa yerleşik
  const p = profiles[category] ?? PROFILES[category];
  const v = ((Math.floor(variant) % VARIANTS) + VARIANTS) % VARIANTS;
  const r = rng32(VOICE_CATEGORIES.indexOf(category) * 1000 + v * 7 + 1);
  const n = Math.round(between(r, p.syllables));
  const base = between(r, p.base);
  const out: Syllable[] = [];
  let at = 0;
  for (let i = 0; i < n; i++) {
    const k = n === 1 ? 0 : i / (n - 1);
    // eğilim + hece başına küçük oynama (anlamsız konuşma)
    const freq = Math.round(base * (1 + (p.contour - 1) * k) * (0.9 + r() * 0.2));
    const dur = Math.round(between(r, p.dur));
    const glide = between(r, p.glide);
    out.push({ at, dur, freq, to: Math.round(freq * glide), vol: Number((0.75 + r() * 0.25).toFixed(2)), wave: p.wave });
    at += dur + Math.round(between(r, p.gap));
  }
  return out;
}

/** Toplam süre (ms). */
export const babbleMs = (s: readonly Syllable[]): number => (s.length ? s[s.length - 1].at + s[s.length - 1].dur : 0);

/** Laf trigger'ı -> kategori; null = sessiz (fart: K3 kuralı, ses yok). */
export function categoryForTrigger(trigger: string): VoiceCategory | null {
  if (trigger === "interaction:fart") return null;
  if (trigger === "interaction:unlock") return "achievement";
  if (trigger === "interaction:too_fast") return "too_fast";
  if (trigger === "interaction:brain_off") return "answer";
  if (trigger.startsWith("interaction:")) return "greet";
  if (trigger.startsWith("answer:")) return "answer";
  if (/^(app|site|time|idle|battery):/.test(trigger)) return "context";
  return "context";
}

/** Ask cevabı -> kategori: doğru cevap honest, yasak konu omuz silkme answer. */
export const categoryForAnswer = (r: { honest: boolean }): VoiceCategory => (r.honest ? "honest" : "answer");

/** FB4-2 (kullanıcı): ses düzeyi 0..100 (0 = sessiz). Eski low/medium/high kayıtları LEGACY_VOLUME ile taşınır. */
export type VoiceVolume = number;
export const DEFAULT_VOLUME: VoiceVolume = 50;
export const LEGACY_VOLUME: Readonly<Record<string, VoiceVolume>> = { low: 25, medium: 50, high: 85 };
/** eski adlar (dev araçları, örnek dosya) */
export const VOLUME_LEVELS = ["low", "medium", "high"] as const;
export const isVolume = (v: unknown): v is VoiceVolume => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100;
export function cleanVolume(raw: unknown): VoiceVolume {
  if (isVolume(raw)) return Math.round(raw);
  if (typeof raw === "string" && raw in LEGACY_VOLUME) return LEGACY_VOLUME[raw];
  return DEFAULT_VOLUME;
}
/** 0..100 -> kazanç: algıya yakın eğri; 50 ≈ eski "orta" (0.11), 100 = 0.24 */
export const volumeGain = (v: VoiceVolume): number => (v <= 0 ? 0 : 0.24 * Math.pow(Math.min(100, v) / 100, 1.1));
/** düzey -> kazanç (Web Audio gain; kısık/orta/yüksek, kulak tırmalamasın) */
export const VOLUME_GAIN: Record<(typeof VOLUME_LEVELS)[number], number> = { low: 0.05, medium: 0.11, high: 0.2 };

/** Ses çalınır mı: ayar açık, toplantı yok, bugün sus yok, sessiz site önde değil. */
export function shouldSpeak(s: { enabled: boolean; meeting: boolean; muted: boolean; siteSilent: boolean }): boolean {
  return s.enabled && !s.meeting && !s.muted && !s.siteSilent;
}

/** Tepki ile balon arası kısa düşünme (ms): poz -> düşünme -> balon -> ses -> daktilo. */
export const BRIEF_THOUGHT_MS = 240;
