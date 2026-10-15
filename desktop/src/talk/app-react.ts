// Uygulamaya geçince tepki (SPEC 13, saf): kullanıcı bir uygulamaya / site kategorisine geçip orada kalınca Dunno bazen o uygulamaya
// özel bir laf eder. Gürültü olmasın diye: önce bir süre kalması gerekir (dwell), ziyaret başına en fazla bir zar, uygulama başına ve
// genel bekleme süresi. Bastırma (bugün sus, toplantı, sessiz site) ve meşguliyet çağıranda (talker): burası sadece "şimdi mi" der.
// Girdi sadece etiket ("app:excel", "site:video"); başlık/exe adı buraya gelmez.
import type { Frequency } from "../lines/types";

/** uygulamada bu kadar kalınca tepki düşünülür (alt-tab geçişlerinde konuşmasın) */
export const DWELL_MS = 25_000;
/** herhangi iki uygulama tepkisi arası en az */
export const GLOBAL_COOLDOWN_MS = 6 * 60_000;
/** aynı uygulamaya tekrar tepki için en az */
export const APP_COOLDOWN_MS = 40 * 60_000;
/** ziyaret başına bir kez çekilen zar; sıklık ayarına göre */
export const REACT_CHANCE: Record<Frequency, number> = { low: 0.25, normal: 0.45, high: 0.65 };
/** sıklık "az" ise bekleme süreleri bu kadar uzar */
export const LOW_COOLDOWN_SCALE = 2;

export interface AppReactState {
  /** şu anki etiket ve ne zamandan beri */
  current: string | null;
  since: number;
  /** bu ziyarette zar atıldı mı */
  rolled: boolean;
  lastAny: number | null;
  lastBy: Record<string, number>;
}

export const initialAppReact = (): AppReactState => ({ current: null, since: 0, rolled: false, lastAny: null, lastBy: {} });

/** Bağlamdaki tepki etiketi: site kategorisi (daha spesifik) yoksa uygulama. */
export function reactKey(triggers: readonly string[]): string | null {
  return triggers.find((t) => t.startsWith("site:")) ?? triggers.find((t) => t.startsWith("app:")) ?? null;
}

/** Bağlam değişti: yeni etikete geçildiyse ziyaret sıfırlanır. */
export function noteContext(s: AppReactState, key: string | null, now: number): AppReactState {
  if (key === s.current) return s;
  return { ...s, current: key, since: now, rolled: false };
}

/**
 * Periyodik kontrol: tepki zamanı mı. Dwell dolmadan, bekleme sürelerinde ya da bu ziyarette zar atıldıysa hayır.
 * Zar ziyaret başına bir kez atılır (kaybedince bu ziyarette bir daha denenmez). fire ise çağıran konuşmayı dener ve
 * gerçekten konuştuysa `markSpoken` ile bekleme süresini başlatır.
 */
export function checkReact(s: AppReactState, now: number, frequency: Frequency, rng: () => number): { fire: string | null; state: AppReactState } {
  const key = s.current;
  if (!key || s.rolled || now - s.since < DWELL_MS) return { fire: null, state: s };
  const scale = frequency === "low" ? LOW_COOLDOWN_SCALE : 1;
  if (s.lastAny !== null && now - s.lastAny < GLOBAL_COOLDOWN_MS * scale) return { fire: null, state: s };
  const last = s.lastBy[key];
  if (last !== undefined && now - last < APP_COOLDOWN_MS * scale) return { fire: null, state: { ...s, rolled: true } };
  const state = { ...s, rolled: true };
  return { fire: rng() < REACT_CHANCE[frequency] ? key : null, state };
}

/** Konuştu: bekleme süreleri başlar. */
export function markSpoken(s: AppReactState, key: string, now: number): AppReactState {
  return { ...s, lastAny: now, lastBy: { ...s.lastBy, [key]: now } };
}
