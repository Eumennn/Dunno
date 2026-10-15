// İlk 10 dakika (FB6, saf): yeni kullanıcıya beş kısa adım. Her adım bir kez XP verir (16 x 5 = 80: level 3, stats.txt açılır),
// Dunno sıradakini kısa bir lafla söyler; tamamlanmamışsa birkaç dakikada bir hatırlatır (en fazla MAX_HINTS kez, sonra susar).
// Suçlama yok, zorunluluk yok. Bu özellikten önceki kayıtlar da baştan görür; about.txt'den yeniden başlatılabilir (XP bir kez).
import type { CompanionEvent } from "./events";

// kronolojik sıra (FB6): önce dunno.exe açılır (kurulum sonu zaten açar), sonra soru, sürükle, dolap, ağaç
export const FIRST_STEPS = ["open", "ask", "drag", "dress", "tree"] as const;
export type FirstStep = (typeof FIRST_STEPS)[number];

export interface OnboardState {
  done: FirstStep[];
  /** verilen hatırlatma sayısı */
  hints: number;
  /** son hatırlatma / adım lafı (ISO) */
  lastHint: string | null;
  finished: boolean;
  /** XP'si verilmiş adımlar (yeniden başlatınca ikinci kez verilmez) */
  rewarded: FirstStep[];
}

export const HINT_EVERY_MIN = 3;
export const MAX_HINTS = 10;

export const initialOnboard = (): OnboardState => ({ done: [], hints: 0, lastHint: null, finished: false, rewarded: [] });
export const finishedOnboard = (): OnboardState => ({ done: [...FIRST_STEPS], hints: 0, lastHint: null, finished: true, rewarded: [...FIRST_STEPS] });

/** Kayıtta ilk adımlar yoksa (yeni kurulum ya da bu özellikten önceki kayıt) baştan başlar: eski kullanıcı da görür. */
export function cleanOnboard(raw: unknown): OnboardState {
  if (typeof raw !== "object" || raw === null) return initialOnboard();
  const r = raw as Record<string, unknown>;
  const done = Array.isArray(r.done) ? FIRST_STEPS.filter((s) => (r.done as unknown[]).includes(s)) : [];
  return {
    done,
    hints: typeof r.hints === "number" && r.hints >= 0 ? Math.min(MAX_HINTS, Math.floor(r.hints)) : 0,
    lastHint: typeof r.lastHint === "string" && !Number.isNaN(Date.parse(r.lastHint)) ? r.lastHint : null,
    finished: r.finished === true || done.length === FIRST_STEPS.length,
    rewarded: Array.isArray(r.rewarded) ? FIRST_STEPS.filter((x) => (r.rewarded as unknown[]).includes(x)) : [...done],
  };
}

export function stepOf(ev: CompanionEvent): FirstStep | null {
  switch (ev.type) {
    case "question":
      return "ask";
    case "drag":
      return "drag";
    case "customize":
      return "dress";
    case "onboard":
      return ev.step;
    default:
      return null;
  }
}

export const nextStep = (s: OnboardState): FirstStep | null => FIRST_STEPS.find((x) => !s.done.includes(x)) ?? null;

export interface OnboardResult {
  state: OnboardState;
  /** bu olayla biten adım */
  completed: FirstStep | null;
  /** adımın XP'si bu olayla verilmeli (ilk kez) */
  reward: boolean;
  /** hepsi bu olayla bitti */
  finished: boolean;
  /** hatırlatılacak adım */
  hint: FirstStep | null;
}

export function onboardOnEvent(prev: OnboardState, ev: CompanionEvent, now: Date): OnboardResult {
  const none = { state: prev, completed: null, reward: false, finished: false, hint: null };
  if (prev.finished) return none;
  const step = stepOf(ev);
  if (step && !prev.done.includes(step)) {
    const done = FIRST_STEPS.filter((x) => x === step || prev.done.includes(x));
    const finished = done.length === FIRST_STEPS.length;
    const reward = !prev.rewarded.includes(step);
    const rewarded = reward ? [...prev.rewarded, step] : prev.rewarded;
    return { state: { ...prev, done, finished, rewarded, lastHint: now.toISOString() }, completed: step, reward, finished, hint: null };
  }
  // açılışta da (karşılama sürüyorsa laf kuyrukta bekler); sonra dakikalık nabızda
  if ((ev.type === "session_start" || (ev.type === "heartbeat" && !ev.idle)) && prev.hints < MAX_HINTS) {
    const since = prev.lastHint ? (now.getTime() - Date.parse(prev.lastHint)) / 60_000 : Infinity;
    const next = nextStep(prev);
    if (next && since >= HINT_EVERY_MIN) return { state: { ...prev, hints: prev.hints + 1, lastHint: now.toISOString() }, completed: null, reward: false, finished: false, hint: next };
  }
  return none;
}
