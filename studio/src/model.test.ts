import { describe, expect, it } from "vitest";
import { checkPool, coverage, parseBanned } from "@desktop/lines/pool-check";
import {
  blankEntry,
  buildTree,
  duplicateEntry,
  filterEntries,
  idPrefix,
  insertEntry,
  issuesByIndex,
  nextId,
  removeEntry,
  replaceEntry,
  type Entry,
} from "./model";

const pool: Entry[] = [
  { id: "en_excel_01", trigger: "app:excel", intent: "mocks the sheet", en: "is this a spreadsheet" },
  { id: "en_excel_02", trigger: "app:excel", intent: "judges cells", en: "merged cells{K:, ***}" },
  { id: "en_random_01", trigger: "random", intent: "retired", en: "i used to know things" },
];

describe("tree", () => {
  it("groups triggers by category in engine order with per-language counts", () => {
    const tree = buildTree(coverage([], pool), "en");
    expect(tree.map((n) => n.category)).toEqual(["app", "time", "idle", "battery", "interaction", "random", "answer"]);
    const app = tree[0];
    expect(app.triggers.find((t) => t.trigger === "app:excel")).toEqual({ trigger: "app:excel", count: 2, target: 20 });
    expect(tree.find((n) => n.category === "random")!.count).toBe(1);
  });
});

describe("filterEntries", () => {
  it("filters by trigger and searches id, intent and text, keeping file indexes", () => {
    expect(filterEntries(pool, "en", { trigger: "app:excel" }).map((i) => i.index)).toEqual([0, 1]);
    expect(filterEntries(pool, "en", { search: "MERGED" }).map((i) => i.index)).toEqual([1]);
    expect(filterEntries(pool, "en", { search: "retired" }).map((i) => i.index)).toEqual([2]);
    expect(filterEntries(pool, "en", { search: "random_01" }).map((i) => i.index)).toEqual([2]);
    expect(filterEntries(pool, "en", {})).toHaveLength(3);
  });

  it("searches turkish with the turkish locale", () => {
    const tr: Entry[] = [{ id: "tr_x_01", trigger: "random", intent: "x", tr: "ılık bir gün" }];
    expect(filterEntries(tr, "tr", { search: "ILIK" })).toHaveLength(1);
  });
});

describe("ids", () => {
  it("prefixes follow the pool naming", () => {
    expect(idPrefix("app:file_explorer")).toBe("file_explorer");
    expect(idPrefix("time:late_night")).toBe("late_night");
    expect(idPrefix("idle:30")).toBe("idle30");
    expect(idPrefix("battery:low")).toBe("battery");
    expect(idPrefix("interaction:spam_click")).toBe("spam");
    expect(idPrefix("interaction:limit_reached")).toBe("limit");
    expect(idPrefix("interaction:drag")).toBe("drag");
    expect(idPrefix("answer:generic")).toBe("answer");
    expect(idPrefix("random")).toBe("random");
  });

  it("next id is one past the highest number for that prefix", () => {
    expect(nextId(pool, "en", "app:excel")).toBe("en_excel_03");
    expect(nextId(pool, "en", "app:word")).toBe("en_word_01");
    expect(nextId(pool, "tr", "app:excel")).toBe("tr_excel_01");
  });
});

describe("edits", () => {
  it("blank and duplicate get fresh ids", () => {
    expect(blankEntry(pool, "en", "random")).toEqual({ id: "en_random_02", trigger: "random", intent: "", en: "" });
    expect(duplicateEntry(pool, "en", 0)).toEqual({ ...pool[0], id: "en_excel_03" });
  });

  it("inserts after the last line of the same trigger, or at the end", () => {
    const a = insertEntry(pool, { id: "n", trigger: "app:excel" });
    expect(a.index).toBe(2);
    expect(a.entries.map((e) => e.id)).toEqual(["en_excel_01", "en_excel_02", "n", "en_random_01"]);
    const b = insertEntry(pool, { id: "m", trigger: "app:word" });
    expect(b.index).toBe(3);
  });

  it("replace and remove do not mutate", () => {
    const r = replaceEntry(pool, 1, { id: "z" });
    expect(r[1]).toEqual({ id: "z" });
    expect(pool[1].id).toBe("en_excel_02");
    expect(removeEntry(pool, 0).map((e) => e.id)).toEqual(["en_excel_02", "en_random_01"]);
  });
});

describe("issuesByIndex", () => {
  it("maps validation messages to their rows and skips coverage gaps", () => {
    const banned = { tr: parseBanned(""), en: parseBanned("die") };
    const bad = replaceEntry(pool, 2, { ...pool[2], en: "I Could Die!" });
    const map = issuesByIndex([
      ...checkPool("en", bad, banned),
      { severity: "gap", lang: "en", index: -1, message: "random: 1/40" },
    ]);
    expect([...map.keys()]).toEqual([2]);
    expect(map.get(2)).toEqual(expect.arrayContaining(["text must be lowercase", "no exclamation marks"]));
  });
});
