// Osurma tetiği (SPEC 09 K3, saf): rastgele ve seyrek, günde en fazla 2; yemek sonrası pencerelerde (12:30–14:30, 19:30–21:30)
// daha olası; toplantı korumasında, "bugün sus"ta ve ayar kapalıyken ASLA. Saat, rng ve durum dışarıdan verilir.
// Kullanım: çağıran CHECK_MS aralıkla (ör. kendiliğinden laf zamanlayıcısının yanında) fartCheck çağırır; fire ise
// fart animasyonu + interaction:fart lafı (sayExact) gösterir ve dönen durumu kaydeder. Ses yok.
import { localDay } from "../lines/engine";

export const FART_MAX_PER_DAY = 2;
/** iki osuruk arası en az */
export const FART_MIN_GAP_MS = 2 * 60 * 60 * 1000;
/** önerilen kontrol aralığı; olasılıklar buna göre ayarlı */
export const CHECK_MS = 10 * 60 * 1000;
/** kontrol başına olasılık: normal saat */
export const BASE_CHANCE = 0.008;
/** yemek sonrası pencerelerde katsayı */
export const MEAL_FACTOR = 3;
/** dakika cinsinden [başlangıç, bitiş) yerel saat */
export const MEAL_WINDOWS: readonly (readonly [number, number])[] = [
  [12 * 60 + 30, 14 * 60 + 30],
  [19 * 60 + 30, 21 * 60 + 30],
];

/** store'a düz JSON */
export interface FartState {
  /** yerel gün YYYY-MM-DD */
  day: string;
  count: number;
  /** son osuruk (ms epoch); yoksa null */
  lastAt: number | null;
}

export interface FartContext {
  /** ayar "osuruk: açık/kapalı" */
  enabled: boolean;
  /** toplantı koruması (shh/saklı ya da bilinmiyor) */
  meeting: boolean;
  /** "bugün sus" */
  muted: boolean;
  /** başka bir konuşma/soru açık: bu kontrol atlanır (sayılmaz) */
  busy?: boolean;
}

export const initialFartState = (now: Date): FartState => ({ day: localDay(now), count: 0, lastAt: null });

/** Store'dan gelen bozuk/eksik değer temiz duruma döner. */
export function cleanFartState(raw: unknown, now: Date): FartState {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const ok =
    typeof r.day === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(r.day) &&
    Number.isInteger(r.count) &&
    (r.count as number) >= 0 &&
    (r.lastAt === null || (typeof r.lastAt === "number" && Number.isFinite(r.lastAt)));
  return ok ? { day: r.day as string, count: Math.min(r.count as number, FART_MAX_PER_DAY), lastAt: r.lastAt as number | null } : initialFartState(now);
}

/** Yerel saat yemek sonrası penceresinde mi. */
export function inMealWindow(now: Date): boolean {
  const m = now.getHours() * 60 + now.getMinutes();
  return MEAL_WINDOWS.some(([a, b]) => m >= a && m < b);
}

/** Bu kontroldeki olasılık (yasaklar ve günlük sınır hariç). */
export function fartChance(now: Date): number {
  return inMealWindow(now) ? BASE_CHANCE * MEAL_FACTOR : BASE_CHANCE;
}

/**
 * Bir kontrol: osursun mu. Yasak durumda (ayar kapalı, toplantı, bugün sus, meşgul) rng çekilmez ve hiç olmaz.
 * Gün dönünce sayaç sıfırlanır. fire true ise dönen durum sayılmış haldedir (kaydet).
 */
export function fartCheck(state: FartState, ctx: FartContext, now: Date, rng: () => number): { fire: boolean; state: FartState } {
  const today = localDay(now);
  const s: FartState = state.day === today ? state : { day: today, count: 0, lastAt: state.lastAt };
  if (!ctx.enabled || ctx.meeting || ctx.muted || ctx.busy) return { fire: false, state: s };
  if (s.count >= FART_MAX_PER_DAY) return { fire: false, state: s };
  if (s.lastAt !== null && now.getTime() - s.lastAt < FART_MIN_GAP_MS) return { fire: false, state: s };
  if (rng() >= fartChance(now)) return { fire: false, state: s };
  return { fire: true, state: { day: today, count: s.count + 1, lastAt: now.getTime() } };
}
