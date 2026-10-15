// Sahte düşünme (SPEC 06 Q5, saf): hiçbir cevap anında gelmez. rng enjekte.
// havuz: 1.2–3.5 sn, %20 "uzun düşünme" 4–7 sn; honest (LLM): gerçek süre + en az 1.5 sn;
// %10 "uyuyakaldı" akışı (landing ask.exe: zzz… -> yeniden düşünür -> huh. what. oh. + cevap).

export const POOL_MS = [1_200, 3_500] as const;
export const LONG_MS = [4_000, 7_000] as const;
export const LONG_CHANCE = 0.2;
export const HONEST_MIN_MS = 1_500;
export const DOZE_CHANCE = 0.1;
/** landing zamanlaması: 1.8 sn sonra zzz, 1.6 sn sonra yeniden düşünür, 1.2 sn sonra cevap */
export const DOZE_STEPS = { asleep: 1_800, rethink: 1_600, wake: 1_200 } as const;
/** düşünme metni değişim aralığı */
export const VERB_MS = [1_400, 2_400] as const;

export interface ThinkPlan {
  /** havuz cevabı için toplam düşünme süresi (ms) */
  poolMs: number;
  long: boolean;
  doze: boolean;
}

const between = (rng: () => number, [a, b]: readonly [number, number]) => Math.round(a + rng() * (b - a));

export function planThinking(rng: () => number): ThinkPlan {
  const doze = rng() < DOZE_CHANCE;
  const long = rng() < LONG_CHANCE;
  return { poolMs: between(rng, long ? LONG_MS : POOL_MS), long, doze };
}

/** Cevap hazır olduktan sonra daha ne kadar düşünülmüş gibi yapılacak. */
export function remainingMs(plan: ThinkPlan, source: "llm" | "pool" | "local", elapsedMs: number): number {
  const target = source === "llm" ? HONEST_MIN_MS : plan.poolMs;
  return Math.max(0, target - elapsedMs);
}

export const nextVerbMs = (rng: () => number): number => between(rng, VERB_MS);
