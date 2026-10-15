import { describe, expect, it } from "vitest";
import { HONEST_MIN_MS, LONG_MS, nextVerbMs, planThinking, POOL_MS, remainingMs, VERB_MS } from "./think";

/** sırayla verilen değerleri döndüren rng */
const seq = (...xs: number[]) => {
  let i = 0;
  return () => xs[i++ % xs.length];
};

/** basit tohumlu rng (mulberry32) */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("sahte düşünme", () => {
  it("havuz: 1.2–3.5 sn, uzun: 4–7 sn, uçlar dahil", () => {
    expect(planThinking(seq(0.5, 0.5, 0))).toEqual({ poolMs: POOL_MS[0], long: false, doze: false });
    expect(planThinking(seq(0.5, 0.5, 0.999999)).poolMs).toBe(POOL_MS[1]);
    expect(planThinking(seq(0.5, 0.1, 0))).toEqual({ poolMs: LONG_MS[0], long: true, doze: false });
    expect(planThinking(seq(0.05, 0.9, 0.5)).doze).toBe(true);
  });

  it("dağılım: ~%20 uzun, ~%10 uyuyakalma, hiçbiri 1.2 sn altında", () => {
    const rng = seeded(42);
    const n = 20_000;
    let long = 0;
    let doze = 0;
    for (let i = 0; i < n; i++) {
      const p = planThinking(rng);
      if (p.long) long++;
      if (p.doze) doze++;
      expect(p.poolMs).toBeGreaterThanOrEqual(POOL_MS[0]);
      expect(p.poolMs).toBeLessThanOrEqual(p.long ? LONG_MS[1] : POOL_MS[1]);
      if (p.long) expect(p.poolMs).toBeGreaterThanOrEqual(LONG_MS[0]);
    }
    expect(long / n).toBeGreaterThan(0.18);
    expect(long / n).toBeLessThan(0.22);
    expect(doze / n).toBeGreaterThan(0.085);
    expect(doze / n).toBeLessThan(0.115);
  });

  it("kalan süre: havuz plana kadar, honest en az 1.5 sn, geçmişse 0", () => {
    const plan = { poolMs: 3_000, long: false, doze: false };
    expect(remainingMs(plan, "pool", 400)).toBe(2_600);
    expect(remainingMs(plan, "local", 5_000)).toBe(0);
    expect(remainingMs(plan, "llm", 300)).toBe(HONEST_MIN_MS - 300); // LLM hızlıysa bile 1.5 sn
    expect(remainingMs(plan, "llm", 2_400)).toBe(0); // gerçek süre zaten uzun
  });

  it("düşünme metni 1.4–2.4 sn'de bir değişir", () => {
    expect(nextVerbMs(seq(0))).toBe(VERB_MS[0]);
    expect(nextVerbMs(seq(0.999999))).toBe(VERB_MS[1]);
  });
});
