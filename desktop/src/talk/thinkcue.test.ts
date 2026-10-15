import { describe, expect, it } from "vitest";
import { DOZE_STEPS, LONG_MS, planThinking, POOL_MS, VERB_MS, type ThinkPlan } from "./think";
import { ANSWER_GAP_MS, cueFor, cueStep, FIRST_VERB_MIN_MS, trimVerbs, verbSchedule, type Cue, type CueEvent } from "./thinkcue";

/** sabit dizi rng (döngüsel) */
const seq = (...xs: number[]) => {
  let i = 0;
  return () => xs[i++ % xs.length];
};
const plan = (poolMs: number, long = false, doze = false): ThinkPlan => ({ poolMs, long, doze });

describe("verbSchedule", () => {
  // plan, rng dizisi -> değişim anları
  const table: [string, ThinkPlan, number[], number[]][] = [
    // VERB_MS 1400-2400; rng 0 -> 1400
    ["normal 3.5 s: rhythm fits once", plan(3_500), [0], [1_400]],
    ["normal 3.5 s: second rhythm step would be too close to the answer", plan(3_500), [0, 0], [1_400]],
    ["normal 2.4 s, slow rhythm does not fit: one change spread in [400, 1800]", plan(2_400), [1, 0.5], [1_100]],
    ["normal 1.2 s (shortest): one change in [400, 600]", plan(1_200), [0, 0], [400]],
    ["normal 1.2 s, high roll", plan(1_200), [0.99, 1], [600]],
    ["long 7 s: rhythm, capped at 3", plan(7_000, true), [0], [1_400, 2_800, 4_200]],
    ["long 7 s slow rhythm: 2 fit", plan(7_000, true), [1], [2_400, 4_800]],
    ["long 4 s slow rhythm: only 1 fits -> 2 evenly spread", plan(4_000, true), [1], [400, 3_400]],
    ["long 4 s fast rhythm: 2 fit", plan(4_000, true), [0], [1_400, 2_800]],
    ["doze: one change before zzz", plan(2_000, false, true), [0, 0.5], [800]],
    ["doze ignores long", plan(7_000, true, true), [0, 0], [400]],
  ];
  for (const [name, p, rolls, want] of table) {
    it(name, () => expect(verbSchedule(p, seq(...rolls))).toEqual(want));
  }

  it("guarantees for every real plan: count, gap before the answer / zzz, first verb visible, increasing", () => {
    let s = 3;
    const rng = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 3_000; i++) {
      const p = planThinking(rng);
      const v = verbSchedule(p, rng);
      const end = p.doze ? DOZE_STEPS.asleep : p.poolMs;
      const [min, max] = p.doze ? [1, 1] : p.long ? [2, 3] : [1, 1];
      expect(v.length, JSON.stringify(p)).toBeGreaterThanOrEqual(min);
      expect(v.length).toBeLessThanOrEqual(max);
      expect(v[0]).toBeGreaterThanOrEqual(FIRST_VERB_MIN_MS);
      expect(v.at(-1)!).toBeLessThanOrEqual(end - ANSWER_GAP_MS);
      for (let k = 1; k < v.length; k++) expect(v[k]).toBeGreaterThan(v[k - 1]);
    }
    expect([POOL_MS, LONG_MS, VERB_MS]).toEqual([[1_200, 3_500], [4_000, 7_000], [1_400, 2_400]]);
  });

  it("an early answer trims later changes (honest)", () => {
    expect(trimVerbs([1_400, 2_800, 4_200], 3_000)).toEqual([1_400]);
    expect(trimVerbs([1_400, 2_800], 10_000)).toEqual([1_400, 2_800]);
    expect(trimVerbs([400], 900)).toEqual([]);
  });
});

describe("pet cue", () => {
  const normal = plan(2_000);
  const long = plan(5_000, true);
  // olay dizisi -> her adımdan sonraki işaret
  const table: [string, ThinkPlan, CueEvent[], Cue[]][] = [
    ["normal: dots while thinking, off on answer", normal, ["think", "answer"], ["dots", "off"]],
    ["long: hourglass", long, ["think", "answer"], ["hourglass", "off"]],
    ["doze: off at zzz, back on rethink, off on answer", plan(2_000, false, true), ["think", "doze", "rethink", "answer"], ["dots", "off", "dots", "off"]],
    ["cancel turns it off", normal, ["think", "cancel"], ["dots", "off"]],
    ["rethink while on keeps it", long, ["think", "rethink"], ["hourglass", "hourglass"]],
  ];
  for (const [name, p, events, want] of table) {
    it(name, () => {
      let c: Cue = "off";
      expect(events.map((e) => (c = cueStep(c, e, p)))).toEqual(want);
    });
  }

  it("kind follows the plan", () => {
    expect([cueFor(normal), cueFor(long)]).toEqual(["dots", "hourglass"]);
  });
});
