import { describe, expect, it } from "vitest";
import { QTYPES } from "../talk/classify";
import {
  ANSWER_TYPES,
  APP_TAGS,
  DEEP_TARGET,
  DEEP_TRIGGERS,
  rareIssues,
  freeIssues,
  checkPool,
  coverage,
  coverageGaps,
  coverageMarkdown,
  findBanned,
  MEETING_APPS,
  parseBanned,
  POOL_TARGETS,
  STREET_TAIL_MIN,
  streetTailIssues,
  type BannedLists,
} from "./pool-check";

const banned: BannedLists = {
  tr: parseBanned("# yorum\nnamaz*\nöl\n\nkendini öldür*"),
  en: parseBanned("die\npray*\nself harm*"),
};

const ok = (over: Record<string, unknown> = {}) => ({
  id: "excel_001",
  trigger: "app:excel",
  intent: "mocks the spreadsheet",
  en: "is this a spreadsheet or a cry for help",
  ...over,
});

const okTr = (tr: string) => ({ id: "t_1", trigger: "app:excel", intent: "mocks the spreadsheet", tr });

const messages = (entries: unknown[], lang: "tr" | "en" = "en") =>
  checkPool(lang, entries, banned).map((i) => `${i.severity}: ${i.message}`);

describe("checkPool rules", () => {
  it("accepts a valid line", () => {
    expect(messages([ok()])).toEqual([]);
    expect(messages([ok({ en: "fine{K:, whatever ***}" })])).toEqual([]);
    expect(messages([okTr("ılık bir excel günü")], "tr")).toEqual([]);
  });

  it("schema: object, snake_case unique id, known trigger, only allowed fields", () => {
    expect(messages(["nope"])).toEqual(["error: entry must be an object"]);
    expect(messages([ok({ id: "Excel-1" })])).toContain("error: id must be lowercase snake_case (a-z, 0-9, _)");
    expect(messages([ok(), ok({ en: "another line" })])).toContain('error: duplicate id "excel_001"');
    expect(messages([ok({ trigger: "app:zoom" })])).toContain('error: unknown trigger "app:zoom"');
    expect(messages([ok({ trigger: "app:teams" })])[0]).toMatch(/unknown trigger/);
    expect(messages([ok({ tr: "türkçe" })])).toContain('error: unexpected field "tr" (only id, trigger, intent, rare, pro, en)');
    expect(checkPool("en", { not: "an array" }, banned)[0].message).toBe("file must be a json array");
  });

  it("intent is required, placeholder is a gap", () => {
    expect(messages([ok({ intent: "" })])).toEqual(["error: intent is required"]);
    expect(messages([ok({ intent: "placeholder" })])).toEqual(["gap: intent is still placeholder"]);
    expect(messages([ok({ intent: "x".repeat(121) })])).toEqual(["error: intent longer than 120 chars"]);
  });

  it("brand rules: lowercase, no bang, no emoji, single line, no [K], no bare ***", () => {
    expect(messages([ok({ en: "Fish" })])).toEqual(["error: text must be lowercase"]);
    expect(messages([ok({ en: "fish!" })])).toEqual(["error: no exclamation marks"]);
    expect(messages([ok({ en: "fish 🐟" })])).toEqual(["error: no emoji"]);
    expect(messages([ok({ en: "fish\nfish" })])).toEqual(["error: text must be a single line"]);
    expect(messages([ok({ en: "who the [K] asks" })])).toContain("error: use {K:...} in pool lines, not [K]");
    expect(messages([ok({ en: "who the *** asks" })])).toEqual(["error: *** only inside {K:...} (polite must stay clean)"]);
    expect(messages([ok({ en: " fish" })])).toEqual(["error: text has leading/trailing spaces"]);
  });

  it("swearing: only *** or aq, only inside {K:...} (SPEC 06)", () => {
    expect(messages([okTr("o kim{K: aq}")], "tr")).toEqual([]);
    expect(messages([okTr("o kim{K:, *** kim}")], "tr")).toEqual([]);
    expect(messages([okTr("o kim aq")], "tr")).toEqual(["error: aq only inside {K:...} (polite must stay clean)"]);
    expect(messages([okTr("o kim{K: amk}")], "tr")).toEqual(['error: explicit swear "amk": only *** or aq, inside {K:...}']);
    expect(messages([okTr("siktirgit bakalım")], "tr")).toEqual(['error: explicit swear "siktir*": only *** or aq, inside {K:...}']);
    expect(messages([ok({ en: "who{K: the fucking} asks" })])).toEqual(['error: explicit swear "fuck*": only *** or aq, inside {K:...}']);
    // kelime sınırı: "götür", "sıkıldım", "aqua" küfür değil
    expect(messages([okTr("götür bunu, sıkıldım")], "tr")).toEqual([]);
    expect(messages([ok({ en: "aqua is a colour" })])).toEqual([]);
  });

  it("answer targets cover every classifier type (SPEC 09 K8)", () => {
    expect([...ANSWER_TYPES, "other"]).toEqual([...QTYPES]);
    for (const t of ANSWER_TYPES) expect(POOL_TARGETS[`answer:${t}`], t).toBe(25);
  });

  it("street tail minimum per answer type is an error (SPEC 06 Q2c)", () => {
    expect(STREET_TAIL_MIN["answer:who"]).toBe(9); // 25'in üçte biri
    const few = (lang: "tr" | "en", withK: number) =>
      Array.from({ length: 25 }, (_, i) => ({ trigger: "answer:who", [lang]: i < withK ? `x${i}{K: ***}` : `x${i}` }));
    expect(streetTailIssues(few("tr", 8), few("en", 9)).filter((i) => i.message.startsWith("answer:who:"))).toEqual([
      { severity: "error", lang: "tr", index: -1, message: "answer:who: 8/9 lines have a street {K:...} tail" },
    ]);
    expect(STREET_TAIL_MIN["answer:generic"]).toBeUndefined();
  });

  it("{K:...} syntax", () => {
    for (const en of ["fish{K:, ***", "fish{K:}", "fish{K:a}{K:b}", "fish{X:a}", "fish}"]) {
      expect(messages([ok({ en })])).toContain(
        "error: {K:...} must appear at most once, be closed and not empty; no other braces",
      );
    }
  });

  it("length is checked after rendering, separately for polite and street", () => {
    expect(messages([ok({ en: "a".repeat(60) })])).toEqual([]);
    expect(messages([ok({ en: "a".repeat(61) })])).toContain("error: polite render is 61 chars (max 60)");
    const street = messages([ok({ en: `${"a".repeat(55)}{K:, bbbbb ***}` })]);
    expect(street).toEqual(["error: street render is 66 chars (max 60)"]);
    expect(messages([ok({ en: "{K:only street}" })])).toEqual(["error: renders empty in polite"]);
  });

  it("banned words in text (including the {K:} tail) and intent, both languages", () => {
    expect(messages([ok({ en: "i could die for a nap" })])).toEqual(['error: banned word "die"']);
    expect(messages([ok({ en: "fine{K:, i'm praying ***}" })])).toEqual(['error: banned word "pray*"']);
    expect(messages([ok({ intent: "jokes about self harm" })])).toEqual(['error: intent uses a banned word "self harm*"']);
    expect(messages([okTr("namaz vakti mi")], "tr")).toEqual(['error: banned word "namaz*"']);
    expect(findBanned("ölçü birimi", "tr", banned)).toBeNull();
    expect(findBanned("diet coke", "en", banned)).toBeNull();
  });

  it("duplicate visible text", () => {
    const m = messages([ok(), ok({ id: "excel_002", en: "is this a spreadsheet, or a cry for help{K:, ***}" })]);
    expect(m).toEqual(['error: same text as "excel_001"']);
  });

  it("same id in both languages must use the same trigger", () => {
    const tr = [{ id: "excel_001", trigger: "app:word", intent: "x", tr: "word" }];
    expect(checkPool("en", [ok()], banned, tr).map((i) => i.message)).toEqual([
      'id "excel_001" has trigger app:excel here but app:word in pool_tr',
    ]);
  });
});

describe("coverage", () => {
  it("targets follow SPEC 03 and never include meeting apps", () => {
    expect(POOL_TARGETS["random"]).toBe(40);
    expect(POOL_TARGETS["answer:generic"]).toBe(60);
    expect(POOL_TARGETS["battery:low"]).toBe(8);
    for (const a of APP_TAGS) expect(POOL_TARGETS[`app:${a}`]).toBe((DEEP_TRIGGERS as readonly string[]).includes(`app:${a}`) ? DEEP_TARGET : 10);
    for (const t of DEEP_TRIGGERS) expect(POOL_TARGETS[t]).toBe(20);
    for (const m of MEETING_APPS) expect(POOL_TARGETS[`app:${m}`]).toBeUndefined();
    expect(Object.keys(POOL_TARGETS).filter((t) => t.startsWith("time:"))).toHaveLength(5);
  });

  it("counts per trigger per language, ignoring placeholders, and reports gaps", () => {
    const tr = [
      { id: "a", trigger: "random", intent: "x", tr: "a" },
      { id: "b", trigger: "random", intent: "placeholder", tr: "b" },
    ];
    const rows = coverage(tr, []);
    expect(rows.find((r) => r.trigger === "random")).toEqual({ trigger: "random", target: 40, tr: 1, en: 0 });
    const gaps = coverageGaps(rows).map((g) => `${g.lang} ${g.message}`);
    expect(gaps).toContain("tr random: 1/40");
    expect(gaps).toContain("en random: 0/40");
    expect(coverageMarkdown(rows)).toContain("| `random` | 40 | **1** | **0** |");
  });
});

describe("SPEC 13 nadir laflar", () => {
  it("rare sadece true olabilir; derin trigger'da dil başına en az 2 nadir", () => {
    const bad = checkPool("en", [{ id: "a", trigger: "app:excel", intent: "x", en: "a", rare: "yes" }], banned);
    expect(bad.map((i) => i.message)).toContain("rare must be true when present (SPEC 13)");
    const ok = checkPool("en", [{ id: "a", trigger: "app:excel", intent: "x", en: "a", rare: true }], banned);
    expect(ok.filter((i) => i.severity === "error")).toEqual([]);
    const issues = rareIssues([{ id: "a", trigger: "app:excel", intent: "x", tr: "a", rare: true }], []);
    expect(issues.some((i) => i.lang === "tr" && i.message === "app:excel: 1/2 rare lines")).toBe(true);
    expect(issues.some((i) => i.lang === "en" && i.message === "app:excel: 0/2 rare lines")).toBe(true);
  });
});

describe("SPEC 15 Free havuzu", () => {
  it("derin trigger'da dil başına en az 10 Pro olmayan laf; pro sadece derin trigger'larda", () => {
    const ten = Array.from({ length: 10 }, (_, i) => ({ id: `e${i}`, trigger: "app:excel", intent: "x", en: `a${i}`, pro: i >= 5 }));
    expect(freeIssues([], ten).some((i) => i.message === "app:excel: 5/10 free lines")).toBe(true);
    const bad = freeIssues([], [{ id: "r", trigger: "random", intent: "x", en: "a", pro: true }]);
    expect(bad.some((i) => i.message.startsWith("pro only on deep"))).toBe(true);
    expect(checkPool("en", [{ id: "a", trigger: "app:excel", intent: "x", en: "a", pro: 1 }], banned).map((i) => i.message)).toContain("pro must be true when present (SPEC 15)");
  });
});

