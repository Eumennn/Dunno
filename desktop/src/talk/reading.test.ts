import { describe, expect, it } from "vitest";
import { bubbleStep, cleanSpeed, LEAVE_MS, openBubble, readingMs, type BubbleEvent, type BubbleSpeed, type BubbleTimer } from "./reading";

describe("readingMs", () => {
  const x = (n: number) => "x".repeat(n);
  // metin, seçenekler -> ms
  const table: [string, { honest?: boolean; speed?: BubbleSpeed }, number][] = [
    ["", {}, 4_000], // alt sınır
    [x(10), {}, 4_000], // 2000 + 1100 = 3100 -> 4000
    [x(19), {}, 4_090],
    [x(40), {}, 6_400],
    [x(60), {}, 8_600], // en uzun normal laf
    [x(91), {}, 12_000],
    [x(200), {}, 12_000], // üst sınır
    [x(100), { honest: true }, 13_000],
    [x(120), { honest: true }, 14_000], // honest üst sınır
    [x(300), { honest: true }, 14_000],
    [x(40), { speed: "short" }, 4_800],
    [x(40), { speed: "long" }, 9_600],
    ["", { speed: "short" }, 3_000], // katsayı sınırdan sonra
    [x(200), { speed: "long" }, 18_000],
    [x(300), { honest: true, speed: "long" }, 21_000],
    ["çşğüöı", {}, 4_000],
    ["🙂".repeat(40), {}, 6_400], // kod noktası sayılır
  ];
  for (const [text, opts, want] of table) {
    it(`${Array.from(text).length} chars ${JSON.stringify(opts)} -> ${want}`, () => expect(readingMs(text, opts)).toBe(want));
  }

  it("settings value", () => {
    expect([cleanSpeed("short"), cleanSpeed("long"), cleanSpeed("normal"), cleanSpeed("fast"), cleanSpeed(null)]).toEqual([
      "short",
      "long",
      "normal",
      "normal",
      "normal",
    ]);
  });
});

describe("hover pause", () => {
  /** olay dizisini oynatır; her adımda close değerini döner */
  function play(start: BubbleTimer, events: [BubbleEvent, number][]): { closes: boolean[]; last: BubbleTimer } {
    let t = start;
    const closes = events.map(([ev, now]) => {
      const r = bubbleStep(t, ev, now);
      t = r.timer;
      return r.close;
    });
    return { closes, last: t };
  }
  const open = openBubble(0, 5_000);

  const table: [string, [BubbleEvent, number][], boolean[]][] = [
    ["closes when reading time is over", [["tick", 4_999], ["tick", 5_000]], [false, true]],
    ["hover keeps it open past the deadline", [["enter", 1_000], ["tick", 5_000], ["tick", 60_000]], [false, false, false]],
    ["leaving late: 2 s after leaving", [["enter", 1_000], ["leave", 10_000], ["tick", 11_999], ["tick", 12_000]], [false, false, false, true]],
    ["leaving early: reading time still counts", [["enter", 500], ["leave", 1_000], ["tick", 3_000], ["tick", 5_000]], [false, false, false, true]],
    ["leaving just before the deadline: 2 s grace", [["enter", 100], ["leave", 4_500], ["tick", 5_000], ["tick", 6_500]], [false, false, false, true]],
    ["click closes at once, even while hovering", [["enter", 100], ["click", 200]], [false, true]],
    ["click closes an open bubble", [["click", 10]], [true]],
    ["after closing everything is ignored", [["click", 10], ["tick", 9_000], ["enter", 9_001], ["click", 9_002]], [true, false, false, false]],
    ["leave without enter does nothing", [["leave", 1_000], ["tick", 4_999], ["tick", 5_000]], [false, false, true]],
    ["re-entering pauses again", [["enter", 100], ["leave", 6_000], ["enter", 7_000], ["tick", 9_000], ["leave", 9_500], ["tick", 11_500]], [false, false, false, false, false, true]],
  ];
  for (const [name, events, want] of table) {
    it(name, () => expect(play(open, events).closes).toEqual(want));
  }

  it("state is plain data and inputs are not mutated", () => {
    const t = openBubble(1_000, 4_000);
    const copy = structuredClone(t);
    bubbleStep(t, "enter", 2_000);
    expect(t).toEqual(copy);
    expect(t).toEqual({ phase: "open", deadline: 5_000, closeAt: 5_000 });
    expect(bubbleStep(bubbleStep(t, "enter", 2_000).timer, "leave", 6_000).timer.closeAt).toBe(6_000 + LEAVE_MS);
  });
});
