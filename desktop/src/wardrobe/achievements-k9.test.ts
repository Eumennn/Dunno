// SPEC 09 K9: yeni tembel başarımlar. Her biri gerçek olaylarla (step) açılır; ilerleme yolda görünür.
import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENTS,
  cleanProgress,
  fillTo,
  initialProgress,
  progressOf,
  step,
  type AchEvent,
  type AchievementId,
  type Progress,
} from "./achievements";

/** i. tekrar için (olay, an). Gün sayan başarımlar her tekrarda bir sonraki güne geçer. */
type Recipe = (i: number) => [AchEvent, Date];
const noon = (i: number) => new Date(2026, 9, 1, 12, 0, i);
const dayN = (i: number, h = 12) => new Date(2026, 9, 1 + i, h);
const qt = (qtype: string): Recipe => (i) => [{ type: "question", qtype }, noon(i)];
const ev = (e: AchEvent): Recipe => (i) => [e, noon(i)];

const RECIPES: Record<string, Recipe> = {
  sweet_tooth: qt("hungry"),
  early_bird: (i) => [{ type: "question" }, new Date(2026, 9, 1, 7, 0, i)],
  edge_dweller: ev({ type: "edge" }),
  two_weeks: (i) => [{ type: "open" }, dayN(i)],
  thank_you_10: qt("thanks"),
  quiet_days: (i) => [{ type: "mute" }, dayN(i)],
  good_morning_10: qt("good_morning"),
  good_night_10: qt("good_night"),
  questions_100: ev({ type: "question" }),
  love_5: qt("love"),
  bored_10: qt("bored"),
  drag_200: ev({ type: "drag" }),
  too_fast_10: ev({ type: "too_fast" }),
  honest_15: ev({ type: "honest" }),
  ghost_hours: ev({ type: "idle_hour" }),
  fossil_30: (i) => [{ type: "open" }, dayN(i * 2)], // ardışık olmak zorunda değil
  night_frog_20: (i) => [{ type: "question" }, new Date(2026, 9, 1, 2, 0, i)],
  meetings_50: ev({ type: "meeting_guard" }),
  hungry_25: qt("hungry"),
  drag_100: ev({ type: "drag" }),
  out_of_questions_15: (i) => [{ type: "limit_reached" }, dayN(i)],
  fart_5: ev({ type: "fart" }),
  why_20: qt("why"),
  honest_3: ev({ type: "honest" }),
  sorry_10: qt("sorry"),
  what_30: qt("what"),
  math_20: qt("math"),
  streak_7: (i) => [{ type: "open" }, dayN(i)],
  hello_20: qt("greeting"),
  bye_10: qt("bye"),
  how_are_you_10: qt("how_are_you"),
  questions_50: ev({ type: "question" }),
  app_lines_50: ev({ type: "line", app: "vscode" }),
};

// SPEC 09 K9 bloğu (SPEC 05'in 9'u ile SPEC 12'nin yaratıkları arasında)
const K9 = ACHIEVEMENTS.slice(9, 9 + 33);

describe("K9 table", () => {
  it("33 new achievements: 11 themes, 8 costumes, 14 accessories, all unlock targets distinct", () => {
    expect(K9).toHaveLength(33);
    const kinds = (k: string) => K9.filter((a) => a.unlocks.kind === k).map((a) => a.unlocks.id);
    expect(kinds("theme")).toEqual(["strawberry", "lemon", "ocean", "forest", "peach", "gray_cat", "coffee", "midnight", "retro_green", "cotton_candy", "watermelon"]);
    expect(kinds("costume")).toEqual(["bug", "fly", "bee", "ghost", "dino", "frog", "astronaut", "pizza"]);
    expect(kinds("accessory")).toEqual([
      "cowboy_hat",
      "pirate_bandana",
      "chef_hat",
      "wizard_hat",
      "cape",
      "bow_tie",
      "monocle",
      "nerd_glasses",
      "scarf",
      "cat_ears",
      "ribbon",
      "flower",
      "grad_cap",
      "hard_hat",
    ]);
    const all = ACHIEVEMENTS.map((a) => `${a.unlocks.kind}:${a.unlocks.id}`);
    expect(new Set(all).size).toBe(all.length);
    expect(Object.keys(RECIPES).sort()).toEqual(K9.map((a) => a.id).sort());
  });
});

describe("every K9 achievement unlocks through real events", () => {
  for (const a of K9) {
    it(`${a.id} -> ${a.unlocks.kind}:${a.unlocks.id} (${a.target})`, () => {
      let p: Progress = initialProgress();
      let unlockedAt = -1;
      for (let i = 0; i < a.target + 2 && unlockedAt < 0; i++) {
        const [e, at] = RECIPES[a.id](i);
        const r = step(p, e, at);
        p = r.progress;
        if (r.unlocked.some((d) => d.id === a.id)) unlockedAt = i + 1;
        // yarı yolda ilerleme görünür
        if (i + 1 === Math.floor(a.target / 2) && a.target > 2) {
          const pr = progressOf(p, a.id as AchievementId, at);
          expect(pr.done).toBe(false);
          expect(pr.value).toBe(Math.floor(a.target / 2));
        }
      }
      expect(unlockedAt).toBe(a.target);
      expect(progressOf(p, a.id as AchievementId, new Date(2026, 11, 1))).toEqual({ value: a.target, target: a.target, done: true });
    });
  }
});

describe("new counters", () => {
  it("streak: consecutive local days, broken by a gap; max is kept", () => {
    let p = initialProgress();
    for (const d of [1, 2, 3, 5, 6]) p = step(p, { type: "open" }, new Date(2026, 9, d, 9)).progress;
    expect([p.streak, p.maxStreak, p.openDays]).toEqual([2, 3, 5]);
    // aynı gün tekrar sayılmaz, gece yarısı sonrası yeni gün
    p = step(p, { type: "click" }, new Date(2026, 9, 6, 23, 59)).progress;
    p = step(p, { type: "click" }, new Date(2026, 9, 7, 0, 1)).progress;
    expect(p.streak).toBe(3);
  });

  it("question types: only the counted ones are stored, no text ever", () => {
    let p = initialProgress();
    for (const qtype of ["hungry", "hungry", "who", "nonsense", undefined]) p = step(p, { type: "question", qtype }, noon(0)).progress;
    expect(p.qtypes).toEqual({ hungry: 2 });
    expect(p.questions).toBe(5);
    expect(JSON.stringify(p)).not.toMatch(/nonsense|who/);
  });

  it("morning (05-09) and night (00-05) questions are separate", () => {
    let p = initialProgress();
    for (const h of [2, 4, 5, 8, 9, 12]) p = step(p, { type: "question" }, new Date(2026, 9, 1, h)).progress;
    expect([p.nightQuestions, p.morningQuestions, p.questions]).toEqual([2, 2, 6]);
  });

  it("mute counts once a day; app lines count any app, excel still counts for spreadsheet_10", () => {
    let p = initialProgress();
    p = step(p, { type: "mute" }, dayN(0, 9)).progress;
    p = step(p, { type: "mute" }, dayN(0, 18)).progress;
    p = step(p, { type: "line", app: "excel" }, noon(0)).progress;
    p = step(p, { type: "line", app: null }, noon(0)).progress;
    expect([p.muteDays, p.appLines, p.excelLines]).toEqual([1, 1, 1]);
  });

  it("an old SPEC 05 store loads with the new counters at zero; junk qtypes are dropped", () => {
    const old = { openDays: 4, clicks: 12, unlocked: { poke_100: "2026-10-01T00:00:00.000Z", nope: "x" }, qtypes: { love: 2, bad: 9, why: -1 } };
    const p = cleanProgress(old);
    expect(p).toMatchObject({ openDays: 4, clicks: 12, questions: 0, streak: 0, maxStreak: 0, farts: 0, qtypes: { love: 2 } });
    expect(Object.keys(p.unlocked)).toEqual(["poke_100"]);
  });

  it("fillTo (test mode) reaches the target for every achievement, then step unlocks it", () => {
    for (const a of ACHIEVEMENTS) {
      const now = new Date(2026, 9, 10, 12);
      const r = step(fillTo(a.id, initialProgress(), now), { type: "open" }, now);
      expect(r.unlocked.map((d) => d.id), a.id).toContain(a.id);
    }
  });
});

describe("K9 texts", () => {
  it("every new achievement has a title and goal in both languages, brand voice", async () => {
    const { K9_ACHIEVEMENT_TEXT } = await import("./achievements-k9.strings");
    for (const lang of ["tr", "en"] as const) {
      expect(Object.keys(K9_ACHIEVEMENT_TEXT[lang]).sort()).toEqual(K9.map((a) => a.id).sort());
      for (const a of K9) {
        const t = K9_ACHIEVEMENT_TEXT[lang][a.id as keyof (typeof K9_ACHIEVEMENT_TEXT)["tr"]];
        for (const s of [t.title, t.goal(a.target)]) {
          expect(s, s).toBe(s.toLocaleLowerCase(lang));
          expect(s, s).not.toMatch(/[!¡！]|\p{Extended_Pictographic}/u);
          expect(s.length, s).toBeLessThanOrEqual(48);
        }
        expect(t.goal(a.target)).toContain(String(a.target));
      }
    }
  });
});
