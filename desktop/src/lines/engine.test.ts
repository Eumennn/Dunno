import { describe, expect, it } from "vitest";
import {
  RARE_CHANCE,
  FREQUENCY_MINUTES,
  HISTORY_SIZE,
  LineEngine,
  localDay,
  mergeLines,
  nextDelayMs,
  normalizeLine,
  QuestionLimiter,
  renderText,
  STREET_TAIL_WEIGHT,
} from "./engine";
import type { Line } from "./types";

/** sırayla verilen değerleri döndüren rng; bitince sonuncuyu tekrarlar */
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
};

const L = (id: string, trigger: string, en: string, tr?: string): Line => ({ id, trigger, en, ...(tr ? { tr } : {}) });

describe("renderText", () => {
  it("{K:...} is removed in polite and shown without braces in street", () => {
    const t = "normalde böyle dosya mı yapılır ya{K:, senin yapacağın dosyanın ***}";
    expect(renderText(t, "polite")).toBe("normalde böyle dosya mı yapılır ya");
    expect(renderText(t, "street")).toBe("normalde böyle dosya mı yapılır ya, senin yapacağın dosyanın ***");
  });

  it("[K] becomes *** in street and disappears in polite, with tidy spacing", () => {
    expect(renderText("who the [K] asks that", "street")).toBe("who the *** asks that");
    expect(renderText("who the [K] asks that", "polite")).toBe("who the asks that");
    expect(renderText("the answer is [K]. next", "polite")).toBe("the answer is. next");
    expect(renderText("dunno. google it, [K]", "polite")).toBe("dunno. google it");
    expect(renderText("[K] mesai bitti", "polite")).toBe("mesai bitti");
    expect(renderText("fish. [k] fish", "street")).toBe("fish. *** fish");
  });

  it("cleans doubled punctuation left behind", () => {
    expect(renderText("well, [K], fine", "polite")).toBe("well, fine");
    expect(renderText("no{K:, ***}.", "polite")).toBe("no.");
    expect(renderText("no, {K:***}.", "polite")).toBe("no.");
    expect(renderText("  a   b  ", "street")).toBe("a b");
  });

  it("only-street text renders empty in polite", () => {
    expect(renderText("{K:***}", "polite")).toBe("");
    expect(renderText("[K]", "polite")).toBe("");
  });
});

describe("normalizeLine + mergeLines", () => {
  it("normalizes pool and single-language /v1/lines objects to the same shape", () => {
    expect(normalizeLine({ id: "excel_003", trigger: "app:excel", intent: "x", tr: " a ", en: "b" })).toEqual({
      id: "excel_003",
      trigger: "app:excel",
      intent: "x",
      tr: "a",
      en: "b",
    });
    expect(normalizeLine({ id: "gen_tr_20261002_017", trigger: "random", intent: "y", tr: "c" })).toEqual({
      id: "gen_tr_20261002_017",
      trigger: "random",
      intent: "y",
      tr: "c",
    });
  });

  it("rejects broken entries", () => {
    for (const raw of [null, 3, {}, { id: "a" }, { id: "a", trigger: "random" }, { id: "", trigger: "random", en: "x" },
      { id: "a", trigger: "weird:thing", en: "x" }, { id: "a", trigger: "random", en: "  " }]) {
      expect(normalizeLine(raw)).toBeNull();
    }
  });

  it("is unique by id and merges languages of the same id", () => {
    const merged = mergeLines(
      [{ id: "x", trigger: "random", tr: "tr metin" }, { id: "y", trigger: "random", en: "old" }],
      [{ id: "x", trigger: "random", en: "en text" }, { id: "y", trigger: "random", en: "new" }, "junk"],
    );
    expect(merged).toEqual([
      { id: "x", trigger: "random", tr: "tr metin", en: "en text" },
      { id: "y", trigger: "random", en: "new" },
    ]);
  });
});

describe("LineEngine.pick", () => {
  const lines = [
    L("excel", "app:excel", "excel line"),
    L("night", "time:night", "night line"),
    L("idle", "idle:30", "idle line"),
    L("battery", "battery:low", "battery line"),
    L("click", "interaction:click", "click line"),
    L("rand", "random", "random line"),
  ];

  it("prefers app > time > idle > battery > interaction > random", () => {
    const active = ["interaction:click", "battery:low", "idle:30", "time:night", "app:excel"];
    const engine = new LineEngine({ lines, rng: () => 0 });
    const order = Array.from({ length: 6 }, () => engine.pick(active, "en", "polite")?.id);
    expect(order).toEqual(["excel", "night", "idle", "battery", "click", "rand"]);
  });

  it("ignores triggers that are not active, random is always eligible", () => {
    const engine = new LineEngine({ lines, rng: () => 0 });
    expect(engine.pick(["app:figma"], "en", "polite")?.id).toBe("rand");
    expect(engine.pick([], "en", "polite")?.id).toBe("rand");
  });

  it("does not repeat any of the last 20 lines", () => {
    const many = Array.from({ length: 25 }, (_, i) => L(`r${i}`, "random", `line ${i}`));
    const engine = new LineEngine({ lines: many, rng: Math.random });
    const said: string[] = [];
    for (let i = 0; i < 200; i++) said.push(engine.pick([], "en", "polite")!.id);
    for (let i = HISTORY_SIZE; i < said.length; i++) {
      expect(said.slice(i - HISTORY_SIZE, i)).not.toContain(said[i]);
    }
  });

  it("with a tiny pool it still talks but never says the same line twice in a row", () => {
    const engine = new LineEngine({ lines: [L("a", "random", "a"), L("b", "random", "b")], rng: () => 0 });
    const said = Array.from({ length: 6 }, () => engine.pick([], "en", "polite")!.id);
    for (let i = 1; i < said.length; i++) expect(said[i]).not.toBe(said[i - 1]);
  });

  it("skips lines without text in the language, or empty in polite", () => {
    const engine = new LineEngine({
      lines: [L("en_only", "app:excel", "english"), L("k_only", "app:word", "{K:***}"), L("tr", "random", "x", "türkçe")],
      rng: () => 0,
    });
    expect(engine.pick(["app:excel"], "tr", "polite")?.id).toBe("tr");
    expect(engine.pick(["app:word"], "en", "polite")?.id).not.toBe("k_only");
    expect(engine.pick(["app:word"], "en", "street")?.id).toBe("k_only");
  });

  it("restores history from a previous session", () => {
    const engine = new LineEngine({ lines: [L("a", "random", "a"), L("b", "random", "b")], rng: () => 0, history: ["a"] });
    expect(engine.pick([], "en", "polite")?.id).toBe("b");
    expect(engine.recent).toEqual(["a", "b"]);
  });

  it("say renders by mode", () => {
    const engine = new LineEngine({ lines: [L("k", "random", "fine{K:, ***}")], rng: () => 0 });
    expect(engine.say([], "en", "street")).toBe("fine, ***");
    expect(engine.say([], "en", "polite")).toBe("fine");
  });
});

describe("suppress", () => {
  const engine = () => new LineEngine({ lines: [L("r", "random", "r"), L("a", "answer:generic", "ans")], rng: () => 0 });

  it("mute or meeting suppresses everything until both are off", () => {
    const e = engine();
    e.setSuppressed("meeting", true);
    expect(e.pick([], "en", "street")).toBeNull();
    expect(e.say([], "en", "street")).toBeNull();
    expect(e.answer("en", "street")).toBeNull();
    e.setSuppressed("mute", true);
    e.setSuppressed("meeting", false);
    expect(e.isSuppressed).toBe(true);
    expect(e.say([], "en", "polite")).toBeNull();
    e.setSuppressed("mute", false);
    expect(e.say([], "en", "polite")).toBe("r");
  });

  it("answer prefers answer:* and falls back to random", () => {
    expect(engine().answer("en", "polite")).toBe("ans");
    const onlyRandom = new LineEngine({ lines: [L("r", "random", "r")], rng: () => 0 });
    expect(onlyRandom.answer("en", "polite")).toBe("r");
    expect(new LineEngine().answer("en", "polite")).toBeNull();
  });
});

describe("answer by question type (SPEC 06 Q2)", () => {
  const lines = [
    L("w", "answer:who", "who-line", "kim-lafı"),
    L("g", "answer:generic", "generic"),
    L("x", "answer:where", "where-only-en"),
    L("r", "random", "r"),
    L("t", "interaction:thinking", "thinking"),
  ];
  const fresh = (ls: Line[] = lines) => new LineEngine({ lines: ls, rng: () => 0 });

  // qtype, dil -> beklenen (her satır yeni motor: geçmiş etkilemesin)
  const table: [string | undefined, "en" | "tr", string | null, Line[]?][] = [
    ["who", "en", "who-line"],
    ["who", "tr", "kim-lafı"],
    ["where", "en", "where-only-en"],
    ["where", "tr", null, [L("x", "answer:where", "where-only-en")]], // tr metni yok, yedek de yok
    ["when", "en", "generic"], // answer:when yok -> generic
    ["other", "en", "generic"],
    [undefined, "en", "generic"], // tip yok -> generic önce
    ["when", "en", "where-only-en", [L("x", "answer:where", "where-only-en"), L("r", "random", "r")]], // generic yok -> diğer answer:*
    ["when", "en", "r", [L("r", "random", "r")]], // answer hiç yok -> random
  ];
  for (const [qtype, lang, want, ls] of table) {
    it(`answer(${lang}, ${qtype ?? "-"}) -> ${want}`, () => {
      expect(fresh(ls).answer(lang, "polite", qtype)).toBe(want);
    });
  }

  it("say with an answer:* trigger now picks it instead of random", () => {
    expect(fresh().say(["answer:who"], "en", "polite")).toBe("who-line");
  });

  it("sayExact never falls back to random", () => {
    const table: [string[], string | null][] = [
      [["interaction:thinking"], "thinking"],
      [["interaction:too_fast"], null],
      [["interaction:too_fast", "interaction:thinking"], "thinking"], // sıra = öncelik, ilk boşsa sonraki
      [["answer:who", "interaction:thinking"], "who-line"],
      [[], null],
    ];
    for (const [triggers, want] of table) expect(fresh().sayExact(triggers, "en", "polite"), triggers.join(",")).toBe(want);
    const e = fresh();
    e.setSuppressed("mute", true);
    expect(e.sayExact(["interaction:thinking"], "en", "polite")).toBeNull();
  });

  it("hasTrigger checks the language", () => {
    const e = fresh();
    expect(e.hasTrigger("answer:who", "tr")).toBe(true);
    expect(e.hasTrigger("answer:where", "tr")).toBe(false);
    expect(e.hasTrigger("answer:where", "en")).toBe(true);
    expect(e.hasTrigger("interaction:too_fast", "en")).toBe(false);
  });

  it("real pool: every question type has its own lines in both languages", async () => {
    const { QTYPES } = await import("../talk/classify");
    const { default: tr } = await import("../../../content/pool/pool_tr.json");
    const { default: en } = await import("../../../content/pool/pool_en.json");
    const e = new LineEngine({ lines: mergeLines(tr, en) });
    for (const q of QTYPES.filter((t) => t !== "other")) {
      for (const lang of ["tr", "en"] as const) expect(e.hasTrigger(`answer:${q}`, lang), `${q} ${lang}`).toBe(true);
    }
    for (const t of ["interaction:thinking", "interaction:too_fast"]) {
      expect(e.sayExact([t], "tr", "street")).not.toBeNull();
    }
  });
});

describe("street prefers {K:} tails (SPEC 06 Q2d)", () => {
  // a, b kuyruksuz; c kuyruklu. rng dizisi enjekte: [ağırlık zarı, seçim zarı]
  const lines = [L("a", "answer:who", "plain a"), L("b", "answer:who", "plain b"), L("c", "answer:who", "tail c{K:, *** c}")];
  const seq = (...xs: number[]) => {
    let i = 0;
    return () => xs[i++ % xs.length];
  };
  const table: [string, "polite" | "street", number[], string][] = [
    ["street, weight die < 0.7 -> tail", "street", [0.69, 0], "tail c, *** c"],
    ["street, weight die >= 0.7 -> plain, first", "street", [0.7, 0], "plain a"],
    ["street, weight die >= 0.7 -> plain, second", "street", [0.9, 0.99], "plain b"],
    ["polite: one roll, uniform over all (0.69 -> c)", "polite", [0.69], "tail c"],
    ["polite: 0 -> a", "polite", [0], "plain a"],
  ];
  for (const [name, mode, rolls, want] of table) {
    it(name, () => {
      expect(new LineEngine({ lines, rng: seq(...rolls) }).answer("en", mode, "who")).toBe(want);
    });
  }

  it("only tails or only plain lines left: no weighting roll", () => {
    const onlyPlain = new LineEngine({ lines: lines.slice(0, 2), rng: seq(0.99) });
    expect(onlyPlain.answer("en", "street", "who")).toBe("plain b");
    const onlyTail = new LineEngine({ lines: [lines[2]], rng: seq(0.99) });
    expect(onlyTail.answer("en", "street", "who")).toBe("tail c, *** c");
  });

  it("the last-20 rule still holds: a used tail is not picked again while fresh lines remain", () => {
    const e = new LineEngine({ lines, rng: seq(0) });
    expect(e.answer("en", "street", "who")).toBe("tail c, *** c");
    // c artık geçmişte: kuyruklu taze yok, ağırlık zarı atılmaz
    expect(e.answer("en", "street", "who")).toBe("plain a");
    expect(e.recent).toEqual(["c", "a"]);
  });

  it("about 70 percent tails over many street answers (real rng shape)", async () => {
    let s = 7;
    const rng = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
    let tails = 0;
    for (let i = 0; i < 2000; i++) {
      // her seferinde yeni motor: geçmiş etkilemesin
      if (new LineEngine({ lines, rng }).answer("en", "street", "who")!.includes("***")) tails++;
    }
    expect(tails / 2000).toBeGreaterThan(0.65);
    expect(tails / 2000).toBeLessThan(0.75);
    expect(STREET_TAIL_WEIGHT).toBe(0.7);
  });
});

describe("nextDelayMs", () => {
  it("stays inside each frequency range", () => {
    for (const [freq, [min, max]] of Object.entries(FREQUENCY_MINUTES) as [keyof typeof FREQUENCY_MINUTES, readonly [number, number]][]) {
      expect(nextDelayMs(freq, () => 0)).toBe(min * 60_000);
      expect(nextDelayMs(freq, () => 0.999999)).toBeLessThanOrEqual(max * 60_000);
      expect(nextDelayMs(freq, () => 0.999999)).toBeGreaterThan((max - 0.01) * 60_000);
    }
    expect(FREQUENCY_MINUTES).toEqual({ low: [20, 40], normal: [8, 15], high: [3, 6] });
  });
});

describe("QuestionLimiter", () => {
  const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h, 0, 0);

  it("allows 3 a day, the 4th is refused without changing counters", () => {
    const q = new QuestionLimiter({ now: () => at(2026, 10, 2), rng: () => 0.9 });
    expect([q.ask().allowed, q.ask().allowed, q.ask().allowed]).toEqual([true, true, true]);
    const before = q.state;
    expect(q.ask()).toEqual({ allowed: false, useLlm: false, remaining: 0 });
    expect(q.state).toEqual(before);
    expect(q.canAsk()).toBe(false);
  });

  it("resets when the local day changes, including just after midnight", () => {
    let now = at(2026, 10, 2, 23);
    const q = new QuestionLimiter({ now: () => now, rng: () => 0.9 });
    q.ask(); q.ask(); q.ask();
    expect(q.remaining()).toBe(0);
    now = new Date(2026, 9, 3, 0, 0, 1);
    expect(q.remaining()).toBe(3);
    expect(q.ask().allowed).toBe(true);
    expect(q.state.day).toBe("2026-10-03");
  });

  it("sends exactly one of every 3 or 4 questions to the llm, deterministically", () => {
    let day = 1;
    // gap: ilk 0.1 -> 3, sonra 0.9 -> 4, sonra 0.1 -> 3
    const q = new QuestionLimiter({ now: () => at(2026, 10, day), rng: seq(0.1, 0.9, 0.1) });
    const flags: boolean[] = [];
    for (let i = 0; i < 10; i++) {
      if (!q.canAsk()) day++;
      flags.push(q.ask().useLlm);
    }
    expect(flags).toEqual([false, false, true, false, false, false, true, false, false, true]);
  });

  it("persists and restores state, and survives garbage state", () => {
    const now = () => at(2026, 10, 2);
    const a = new QuestionLimiter({ now, rng: () => 0.1 });
    a.ask(); a.ask();
    const b = new QuestionLimiter({ now, rng: () => 0.1, state: a.state });
    expect(b.remaining()).toBe(1);
    expect(b.ask().useLlm).toBe(true);

    const c = new QuestionLimiter({ now, rng: () => 0.1, state: { day: "x", used: -1, sinceLlm: 0, gap: 3 } });
    expect(c.remaining()).toBe(3);
    const d = new QuestionLimiter({ now, state: JSON.parse("null") });
    expect(d.remaining()).toBe(3);
  });

  it("localDay uses the local calendar", () => {
    expect(localDay(new Date(2026, 0, 5, 0, 30))).toBe("2026-01-05");
  });
});

describe("nadir laflar (SPEC 13)", () => {
  const pool = [
    ...Array.from({ length: 8 }, (_, i) => ({ id: `n${i}`, trigger: "app:excel", en: `normal ${i}` })),
    { id: "r1", trigger: "app:excel", en: "rare one", rare: true },
  ];
  it("normalizeLine rare'i korur, sadece true", () => {
    expect(normalizeLine({ id: "a", trigger: "random", en: "x", rare: true })?.rare).toBe(true);
    expect(normalizeLine({ id: "a", trigger: "random", en: "x", rare: "yes" })?.rare).toBeUndefined();
  });
  it("nadir laf RARE_CHANCE altında gelir, üstünde gelmez", () => {
    const low = new LineEngine({ lines: pool, rng: () => RARE_CHANCE / 2 });
    expect(low.pick(["app:excel"], "en", "polite")?.id).toBe("r1");
    const high = new LineEngine({ lines: pool, rng: () => 0.5 });
    expect(high.pick(["app:excel"], "en", "polite")?.rare).toBeUndefined();
  });
  it("uzun vadede nadir oranı ~RARE_CHANCE", () => {
    let seed = 7;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let rare = 0;
    for (let i = 0; i < 3000; i++) {
      const e = new LineEngine({ lines: pool, rng });
      if (e.pick(["app:excel"], "en", "polite")?.rare) rare++;
    }
    expect(rare / 3000).toBeGreaterThan(RARE_CHANCE * 0.6);
    expect(rare / 3000).toBeLessThan(RARE_CHANCE * 1.5);
  });
  it("grupta sadece nadir varsa yine söylenir; pickExact random'a düşmez", () => {
    const e = new LineEngine({ lines: [{ id: "r", trigger: "app:steam", en: "rare", rare: true }, { id: "x", trigger: "random", en: "rnd" }], rng: () => 0.9 });
    expect(e.pickExact(["app:steam"], "en", "polite")?.id).toBe("r");
    expect(e.pickExact(["app:blender"], "en", "polite")).toBeNull();
    e.setSuppressed("mute", true);
    expect(e.pickExact(["app:steam"], "en", "polite")).toBeNull();
  });
});
