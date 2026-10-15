import { describe, expect, it } from "vitest";
import themes from "../../../content/wardrobe/themes.json";
import { HonestQuota } from "../talk/quota";
import { COOLDOWN_MS, initialTempo, record } from "../talk/tempo";
import { ACHIEVEMENTS } from "../wardrobe/achievements";
import { cleanWardrobe, initialWardrobe, isUnlocked, select, wardrobeView } from "../wardrobe/wardrobe";
import {
  allUnlocks,
  cleanTestMode,
  initialTaps,
  initialTestMode,
  onTestModeChange,
  tap,
  TAP_WINDOW_MS,
  tempoActive,
  testGate,
  toggle,
  triggerAchievement,
  unlockOverride,
  type TestMode,
} from "./testmode";

const THEMES = themes.themes.map((t) => t.id);
const ON: TestMode = { on: true, tempoOff: false };
const OFF = initialTestMode();
const day = (d: number, h = 12) => new Date(2026, 9, d, h, 0, 0);

describe("store schema", () => {
  it("broken or missing values mean off", () => {
    for (const raw of [null, undefined, "on", 1, {}, { on: "true" }, { on: 1, tempoOff: true }]) {
      expect(cleanTestMode(raw)).toEqual({ on: false, tempoOff: false });
    }
    expect(cleanTestMode({ on: true, tempoOff: true, extra: 1 })).toEqual({ on: true, tempoOff: true });
  });

  it("toggle on starts with pace on; toggle off clears everything", () => {
    expect(toggle(OFF)).toEqual({ on: true, tempoOff: false });
    expect(toggle({ on: true, tempoOff: true })).toEqual({ on: false, tempoOff: false });
  });
});

describe("5 taps on the version line", () => {
  // [tık anları (ms)] -> beklenen fired dizisi
  const table: [string, number[], boolean[]][] = [
    ["five quick taps fire on the fifth", [0, 200, 400, 600, 800], [false, false, false, false, true]],
    ["four taps never fire", [0, 100, 200, 300], [false, false, false, false]],
    ["slow taps fall out of the window", [0, 1000, 2000, 3000, 4000], [false, false, false, false, false]],
    ["window is from first to fifth tap", [0, 700, 1400, 2100, TAP_WINDOW_MS - 1], [false, false, false, false, true]],
    ["counter resets after firing", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [false, false, false, false, true, false, false, false, false, true]],
    ["a late tap starts a new run", [0, 100, 200, 5000, 5100, 5200, 5300, 5400], [false, false, false, false, false, false, false, true]],
  ];
  for (const [name, times, want] of table) {
    it(name, () => {
      let t = initialTaps();
      const got = times.map((now) => {
        const r = tap(t, now);
        t = r.taps;
        return r.fired;
      });
      expect(got).toEqual(want);
    });
  }

  it("reports taps left for a hint", () => {
    expect(tap(initialTaps(), 0).left).toBe(4);
    expect(tap(tap(initialTaps(), 0).taps, 10).left).toBe(3);
  });
});

describe("unlock override (progress kept)", () => {
  it("everything is selectable in test mode, nothing is written to progress", () => {
    const s = initialWardrobe();
    const all = unlockOverride(ON, THEMES)!;
    expect(all).toHaveLength(THEMES.length + 20 + 20);
    expect(isUnlocked(s, { kind: "accessory", id: "crown" })).toBe(false);
    expect(isUnlocked(s, { kind: "accessory", id: "crown" }, all)).toBe(true);
    const dressed = select(s, { theme: "night", accessory: "headphones" }, all);
    expect([dressed.theme, dressed.accessories]).toEqual(["night", ["headphones"]]);
    expect(select(dressed, { costume: "astronaut" }, all).costume).toBe("astronaut");
    expect(dressed.progress).toEqual(s.progress);
    expect(wardrobeView(dressed, day(3), all).unlocked).toHaveLength(all.length);
    expect(wardrobeView(dressed, day(3)).unlocked).toHaveLength(2); // normal görünüm değişmedi
  });

  it("off: no override, locked picks are still ignored", () => {
    expect(unlockOverride(OFF, THEMES)).toBeUndefined();
    const s = select(initialWardrobe(), { accessory: "crown" }, unlockOverride(OFF, THEMES));
    expect(s.accessories).toEqual([]);
  });

  it("unknown ids stay locked even in test mode", () => {
    const all = allUnlocks(THEMES);
    expect(select(initialWardrobe(), { theme: "neon", accessory: "jetpack", costume: "dragon" }, all)).toEqual(initialWardrobe());
  });

  it("turning test mode off returns locked picks to open ones, keeps progress and open picks", () => {
    const all = allUnlocks(THEMES);
    const worn = select(initialWardrobe(), { theme: "mint", accessory: "crown", costume: "dino" }, all);
    const back = onTestModeChange(worn, OFF);
    expect([back.theme, back.accessories, back.costume]).toEqual(["classic", [], null]);
    expect(back.progress).toBe(worn.progress);
    const legit = select(initialWardrobe(), { accessory: "beanie" });
    expect(onTestModeChange(legit, OFF)).toBe(legit);
    expect(onTestModeChange(worn, ON)).toBe(worn);
    // store'dan tekrar yüklenince de aynı sonuç (cleanWardrobe kilitliyi zaten reddeder)
    expect(cleanWardrobe(JSON.parse(JSON.stringify(worn)))).toMatchObject({ theme: "classic", accessories: [], costume: null });
  });
});

describe("trigger achievements", () => {
  for (const a of ACHIEVEMENTS) {
    it(`${a.id} unlocks through step and lands in pending`, () => {
      const r = triggerAchievement(initialWardrobe(), a.id, day(3), ON);
      expect(r.unlocked).toContain(a.id);
      expect(r.state.pending).toContain(a.id);
      expect(isUnlocked(r.state, a.unlocks)).toBe(true);
    });
  }

  it("nothing happens when off or already open; other progress is kept", () => {
    let s = initialWardrobe();
    s = { ...s, progress: { ...s.progress, clicks: 42 } };
    expect(triggerAchievement(s, "poke_100", day(3), OFF)).toEqual({ state: s, unlocked: [] });
    const once = triggerAchievement(s, "drag_50", day(3), ON).state;
    expect(once.progress.clicks).toBe(42);
    expect(triggerAchievement(once, "drag_50", day(3), ON)).toEqual({ state: once, unlocked: [] });
  });
});

describe("honest quota reset", () => {
  it("gives back today's answers", () => {
    let now = day(3);
    const q = new HonestQuota(() => now);
    q.charge();
    q.exhaust();
    expect(q.remaining()).toBe(0);
    q.reset();
    expect(q.remaining()).toBe(3);
    expect(q.state).toEqual({ day: "2026-10-03", used: 0 });
    now = day(4);
    expect(q.remaining()).toBe(3);
  });
});

describe("question pace switch", () => {
  it("only test mode with pace off skips cooldown and lock", () => {
    const t = record(initialTempo(), 0).tempo;
    expect(testGate(t, 1000, OFF).kind).toBe("cooldown");
    expect(testGate(t, 1000, ON).kind).toBe("cooldown");
    expect(testGate(t, 1000, { on: true, tempoOff: true })).toEqual({ kind: "ok" });
    expect(testGate(t, COOLDOWN_MS, OFF)).toEqual({ kind: "ok" });
    expect(tempoActive(OFF)).toBe(true);
    expect(tempoActive({ on: false, tempoOff: true })).toBe(true); // bayrak tek başına etkisiz
    expect(tempoActive({ on: true, tempoOff: true })).toBe(false);
  });
});
