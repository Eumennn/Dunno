import { describe, expect, it } from "vitest";
import {
  BASE_CHANCE,
  CHECK_MS,
  cleanFartState,
  FART_MAX_PER_DAY,
  FART_MIN_GAP_MS,
  fartChance,
  fartCheck,
  inMealWindow,
  initialFartState,
  MEAL_FACTOR,
  type FartContext,
  type FartState,
} from "./fart";

const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m);
const ON: FartContext = { enabled: true, meeting: false, muted: false };
const always = () => 0;

describe("meal windows", () => {
  const table: [number, number, boolean][] = [
    [12, 29, false],
    [12, 30, true],
    [14, 29, true],
    [14, 30, false],
    [19, 30, true],
    [21, 29, true],
    [21, 30, false],
    [3, 0, false],
  ];
  for (const [h, m, want] of table) {
    it(`${h}:${String(m).padStart(2, "0")} -> ${want}`, () => {
      expect(inMealWindow(at(4, h, m))).toBe(want);
      expect(fartChance(at(4, h, m))).toBe(want ? BASE_CHANCE * MEAL_FACTOR : BASE_CHANCE);
    });
  }
});

describe("never", () => {
  // ayar kapalı, toplantı, bugün sus, meşgul: rng 0 bile olsa yok ve rng çekilmez
  const table: [string, FartContext][] = [
    ["setting off", { ...ON, enabled: false }],
    ["meeting guard", { ...ON, meeting: true }],
    ["muted today", { ...ON, muted: true }],
    ["busy talking", { ...ON, busy: true }],
  ];
  for (const [name, ctx] of table) {
    it(name, () => {
      let rolls = 0;
      const r = fartCheck(initialFartState(at(4, 13)), ctx, at(4, 13), () => (rolls++, 0));
      expect(r.fire).toBe(false);
      expect(rolls).toBe(0);
    });
  }
});

describe("limits", () => {
  it("at most 2 a day, at least 2 h apart, resets on a new local day", () => {
    let s: FartState = initialFartState(at(4, 8));
    const fired: string[] = [];
    for (let t = at(4, 8).getTime(); t < at(5, 23).getTime(); t += CHECK_MS) {
      const now = new Date(t);
      const r = fartCheck(s, ON, now, always);
      s = r.state;
      if (r.fire) fired.push(`${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`);
    }
    expect(fired).toEqual(["4 8:00", "4 10:00", "5 0:00", "5 2:00"]);
  });

  it("gap is measured across midnight too", () => {
    const s: FartState = { day: "2026-10-04", count: 2, lastAt: at(4, 23, 30).getTime() };
    expect(fartCheck(s, ON, at(5, 0, 30), always).fire).toBe(false);
    expect(fartCheck(s, ON, new Date(at(4, 23, 30).getTime() + FART_MIN_GAP_MS), always).fire).toBe(true);
  });

  it("store value is cleaned", () => {
    const now = at(4, 12);
    expect(cleanFartState(null, now)).toEqual({ day: "2026-10-04", count: 0, lastAt: null });
    expect(cleanFartState({ day: "2026-10-04", count: 9, lastAt: 5 }, now)).toEqual({ day: "2026-10-04", count: FART_MAX_PER_DAY, lastAt: 5 });
    expect(cleanFartState({ day: "dün", count: 1, lastAt: null }, now)).toEqual(initialFartState(now));
    expect(cleanFartState({ day: "2026-10-04", count: -1, lastAt: null }, now)).toEqual(initialFartState(now));
  });
});

describe("distribution (seeded, 2000 days, check every 10 min)", () => {
  // mulberry32
  const seeded = (seed: number) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = seeded(20261004);
  const perDay: number[] = [];
  let meal = 0;
  let other = 0;
  let s = initialFartState(at(1, 0));
  const start = at(1, 0).getTime();
  for (let day = 0; day < 2000; day++) {
    let n = 0;
    for (let t = start + day * 86_400_000; t < start + (day + 1) * 86_400_000; t += CHECK_MS) {
      const now = new Date(t);
      // uyanık saatler 8-24 (kullanıcı bilgisayar başında)
      if (now.getHours() < 8) continue;
      const r = fartCheck(s, ON, now, rng);
      s = r.state;
      if (r.fire) {
        n++;
        if (inMealWindow(now)) meal++;
        else other++;
      }
    }
    perDay.push(n);
  }
  const mean = perDay.reduce((a, b) => a + b, 0) / perDay.length;

  it("rare: about one a day on average, never more than 2", () => {
    expect(Math.max(...perDay)).toBeLessThanOrEqual(2);
    expect(mean).toBeGreaterThan(0.6);
    expect(mean).toBeLessThan(1.4);
    // bazı günler hiç yok
    expect(perDay.filter((n) => n === 0).length / perDay.length).toBeGreaterThan(0.15);
  });

  it("meal windows are more likely per hour", () => {
    // 4 saat yemek penceresi, 12 saat diğer uyanık saat
    const mealRate = meal / 4;
    const otherRate = other / 12;
    expect(mealRate / otherRate).toBeGreaterThan(2);
  });
});

describe("interaction:fart lines", () => {
  it("real pool: at least 20 per language, shown in polite mode too", async () => {
    const { LineEngine, mergeLines } = await import("../lines/engine");
    const { default: tr } = await import("../../../content/pool/pool_tr.json");
    const { default: en } = await import("../../../content/pool/pool_en.json");
    const lines = mergeLines(tr, en);
    for (const lang of ["tr", "en"] as const) {
      expect(lines.filter((l) => l.trigger === "interaction:fart" && l[lang]).length).toBeGreaterThanOrEqual(20);
      expect(new LineEngine({ lines }).sayExact(["interaction:fart"], lang, "polite")).toBeTruthy();
    }
  });
});
