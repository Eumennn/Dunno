import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ACHIEVEMENTS,
  cleanProgress,
  initialProgress,
  progressOf,
  STARTER,
  step,
  unlockedItems,
  type AchEvent,
  type AchievementId,
  type Progress,
} from "./achievements";

const at = (d: number, h = 12, m = 0) => new Date(2026, 9, d, h, m);

/** Olayları sırayla uygular; açılan id'leri döndürür. */
function run(events: [AchEvent, Date][], start: Progress = initialProgress()) {
  let p = start;
  const opened: AchievementId[] = [];
  for (const [ev, now] of events) {
    const r = step(p, ev, now);
    p = r.progress;
    opened.push(...r.unlocked.map((a) => a.id));
  }
  return { p, opened };
}

const times = (n: number, ev: AchEvent, now: Date): [AchEvent, Date][] => Array.from({ length: n }, () => [ev, now]);

afterEach(() => vi.unstubAllGlobals());

describe("table", () => {
  it("keeps the 9 SPEC 05 achievements first, unchanged", () => {
    expect(ACHIEVEMENTS.slice(0, 9).map((a) => `${a.id}:${a.unlocks.kind}:${a.unlocks.id}:${a.target}`)).toEqual([
      "learned_nothing_7:accessory:crown:7",
      "poke_100:accessory:party_hat:100",
      "night_owl:accessory:nightcap:1",
      "out_of_questions_5:accessory:sunglasses:5",
      "drag_50:accessory:headphones:50",
      "meeting_survivor:theme:night:10",
      "spreadsheet_10:theme:burnt_toast:10",
      "idle_hour:theme:lavender:3",
      "street_mode_day:theme:mint:24",
    ]);
    expect(STARTER).toEqual([
      { kind: "theme", id: "classic" },
      { kind: "accessory", id: "beanie" },
    ]);
  });
});

describe("unlock conditions", () => {
  it("learned_nothing_7: 7 different days with the app open, repeats on a day do not count", () => {
    const events: [AchEvent, Date][] = [];
    for (let d = 1; d <= 7; d++) events.push([{ type: "open" }, at(d, 9)], [{ type: "click" }, at(d, 10)]);
    const six = run(events.slice(0, 12));
    expect(six.opened).not.toContain("learned_nothing_7");
    expect(six.p.openDays).toBe(6);
    expect(run(events).opened).toContain("learned_nothing_7");
  });

  it("poke_100 at exactly 100 clicks", () => {
    expect(run(times(99, { type: "click" }, at(2))).opened).toEqual([]);
    expect(run(times(100, { type: "click" }, at(2))).opened).toEqual(["poke_100"]);
  });

  it("night_owl: a question between 00:00 and 05:00", () => {
    expect(run([[{ type: "question" }, at(2, 23, 59)], [{ type: "question" }, at(3, 5, 0)]]).opened).toEqual([]);
    expect(run([[{ type: "question" }, at(3, 0, 0)]]).opened).toEqual(["night_owl"]);
    expect(run([[{ type: "question" }, at(3, 4, 59)]]).opened).toEqual(["night_owl"]);
  });

  it("out_of_questions_5: 5 different days, several hits on one day count once", () => {
    const events: [AchEvent, Date][] = [];
    for (let d = 1; d <= 5; d++) events.push(...times(3, { type: "limit_reached" }, at(d)));
    const r = run(events);
    expect(r.p.outDays).toBe(5);
    expect(r.opened).toContain("out_of_questions_5");
    expect(run(events.slice(0, 12)).opened).not.toContain("out_of_questions_5");
  });

  it("drag_50, meeting_survivor (10), idle_hour (3)", () => {
    expect(run(times(50, { type: "drag" }, at(2))).opened).toEqual(["drag_50"]);
    expect(run(times(9, { type: "meeting_guard" }, at(2))).opened).toEqual([]);
    expect(run(times(10, { type: "meeting_guard" }, at(2))).opened).toEqual(["meeting_survivor"]);
    expect(run(times(3, { type: "idle_hour" }, at(2))).opened).toEqual(["idle_hour"]);
  });

  it("spreadsheet_10: only lines spoken while excel is in front", () => {
    const mixed = [...times(9, { type: "line", app: "excel" }, at(2)), ...times(5, { type: "line", app: "word" }, at(2))];
    expect(run(mixed).opened).toEqual([]);
    expect(run([...mixed, [{ type: "line", app: "excel" }, at(2)]]).opened).toEqual(["spreadsheet_10"]);
  });

  it("street_mode_day: 24 uninterrupted hours in street mode", () => {
    const start = at(2, 10);
    const later = (h: number) => new Date(start.getTime() + h * 3_600_000);
    expect(run([[{ type: "mode", mode: "street" }, start], [{ type: "click" }, later(23)]]).opened).toEqual([]);
    expect(run([[{ type: "mode", mode: "street" }, start], [{ type: "click" }, later(24)]]).opened).toEqual(["street_mode_day"]);
    // aradaki polite sayacı sıfırlar; tekrar street aynı anı korur
    const broken = run([
      [{ type: "mode", mode: "street" }, start],
      [{ type: "mode", mode: "polite" }, later(12)],
      [{ type: "mode", mode: "street" }, later(13)],
      [{ type: "mode", mode: "street" }, later(20)],
      [{ type: "click" }, later(30)],
    ]);
    expect(broken.opened).toEqual([]);
    expect(progressOf(broken.p, "street_mode_day", later(30)).value).toBe(17);
  });
});

describe("state", () => {
  it("an achievement unlocks once and stores its time", () => {
    const r = run(times(150, { type: "click" }, at(2, 14)));
    expect(r.opened.filter((id) => id === "poke_100")).toHaveLength(1);
    expect(r.p.unlocked.poke_100).toBe(at(2, 14).toISOString());
  });

  it("step is pure", () => {
    const p = initialProgress();
    const before = JSON.stringify(p);
    step(p, { type: "click" }, at(2));
    expect(JSON.stringify(p)).toBe(before);
  });

  it("progress for the ui and unlocked items", () => {
    const r = run(times(37, { type: "click" }, at(2)));
    expect(progressOf(r.p, "poke_100", at(2))).toEqual({ value: 37, target: 100, done: false });
    const done = run(times(100, { type: "click" }, at(2)));
    expect(progressOf(done.p, "poke_100", at(2))).toEqual({ value: 100, target: 100, done: true });
    expect(unlockedItems(done.p)).toEqual([...STARTER, { kind: "accessory", id: "party_hat" }]);
  });

  it("round-trips through json and survives garbage", () => {
    const r = run(times(100, { type: "click" }, at(2)));
    expect(cleanProgress(JSON.parse(JSON.stringify(r.p)))).toEqual(r.p);
    const junk = cleanProgress({ clicks: -4, drags: "x", unlocked: { poke_100: 5, nope: "2026", drag_50: "2026-10-02" }, streetSince: 3 });
    expect(junk.clicks).toBe(0);
    expect(junk.unlocked).toEqual({ drag_50: "2026-10-02" });
    expect(junk.streetSince).toBeNull();
    expect(cleanProgress(null)).toEqual(initialProgress());
  });

  it("never touches the network", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    run(times(120, { type: "click" }, at(2)));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
