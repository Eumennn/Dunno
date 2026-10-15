import { describe, expect, it } from "vitest";
import { applyEvent, initialCompanion, MEMORY_LINE_MINUTE, type CompanionState, type Effect } from "./companion";
import { demoCompanion } from "./demo";
import { hasPerk, nextPerk, PERKS } from "./perks";
import { xpFor } from "./progression";
import { skillTreeSvg } from "./skill-tree";
import { COMPANION_STRINGS } from "./strings";
import { companionView } from "./view";

const at = (d: number, h = 12) => new Date(2026, 9, d, h);
const withLevel = (l: number, s: CompanionState = initialCompanion()): CompanionState => ({ ...s, progress: { ...s.progress, xp: xpFor(l), level: l } });
const run = (s: CompanionState, evs: Parameters<typeof applyEvent>[1][], now: Date) => {
  const effects: Effect[] = [];
  for (const ev of evs) {
    const r = applyEvent(s, ev, now, { world: "normal" });
    s = r.state;
    effects.push(...r.effects);
  }
  return { s, effects };
};

describe("yetenek ağacı (rpg)", () => {
  it("level ile açılır, sıradaki düğüm doğru", () => {
    expect(hasPerk(1, "greeting")).toBe(false);
    expect(hasPerk(2, "greeting")).toBe(true);
    expect(nextPerk(1)?.id).toBe("greeting");
    expect(nextPerk(99)).toBeNull();
    for (const p of PERKS) if (p.parent !== "root") expect(PERKS.find((x) => x.id === p.parent)!.level).toBeLessThanOrEqual(p.level);
  });

  it("selam günde bir kez, saate göre; level yetmezse yok", () => {
    expect(run(initialCompanion(), [{ type: "session_start" }], at(1, 9)).effects.some((e) => e.kind === "perk_say")).toBe(false);
    const r = run(withLevel(3), [{ type: "session_start" }, { type: "session_start" }], at(1, 9));
    expect(r.effects.filter((e) => e.kind === "perk_say")).toEqual([{ kind: "perk_say", perk: "greeting", hour: 9 }]);
  });

  it("dedikodu: favori uygulamaya günde bir laf; anı hatırlatma günün 30. dakikasında", () => {
    let s = withLevel(12);
    s = run(s, Array.from({ length: 12 }, () => ({ type: "line" as const, app: "excel" })), at(2)).s;
    const g = run(s, [{ type: "line", app: "excel" }, { type: "line", app: "excel" }], at(3));
    expect(g.effects.filter((e) => e.kind === "perk_say" && e.perk === "app_gossip")).toHaveLength(1);
    s = run(g.s, [{ type: "drag" }], at(3)).s;
    const beats = run(s, Array.from({ length: MEMORY_LINE_MINUTE + 3 }, () => ({ type: "heartbeat" as const })), at(3));
    expect(beats.effects.filter((e) => e.kind === "perk_say" && e.perk === "memory_lines")).toHaveLength(1);
  });

  it("level atlayınca açılan düğümler bildirilir; zafer turu koşturur", () => {
    const s = { ...withLevel(5), progress: { ...withLevel(5).progress, xp: xpFor(6) - 1 } };
    const r = run(s, [{ type: "question" }], at(4));
    expect(r.effects).toContainEqual({ kind: "perk_unlocked", perks: ["app_gossip"] });
    const big = { ...withLevel(22), progress: { ...withLevel(22).progress, xp: xpFor(23) - 1 } };
    expect(run(big, [{ type: "question" }], at(4)).effects.some((e) => e.kind === "zoomies")).toBe(true);
  });

  it("svg: tüm düğümler, kilitli olanlar level gösterir, gizli form sadece bulununca", () => {
    const v = companionView(demoCompanion("demon"), "free");
    const svg = skillTreeSvg(COMPANION_STRINGS.tr, v, null);
    for (const p of PERKS) expect(svg).toContain(`data-perk="${p.id}"`);
    expect(svg).toContain('data-perk="form:demon"');
    expect(svg).not.toContain("glitchling");
    expect(svg).not.toMatch(/gradient|filter=|rx=/);
  });
});

describe("FB6 ağaç balonu, os dalı, Türkçe ek", () => {
  it("bulunma eki okunuşa göre", async () => {
    const { trLoc } = await import("./strings");
    expect([2, 3, 6, 8, 10, 12, 15, 22, 25, 30, 40, 99, 100].map(trLoc)).toEqual(["2'de", "3'te", "6'da", "8'de", "10'da", "12'de", "15'te", "22'de", "25'te", "30'da", "40'ta", "99'da", "100'de"]);
  });
  it("balon: ne açar, level, kalan; açık düğüm 'açık'", async () => {
    const { skillTip } = await import("./skill-tree");
    const v = companionView(demoCompanion("dunno"), "free");
    expect(skillTip(COMPANION_STRINGS.tr, v, "workshop_tab")).toContain("level 10&#39;da açılır · 4 level kaldı");
    expect(skillTip(COMPANION_STRINGS.tr, v, "stats_tab")).toContain("açık");
    expect(skillTip(COMPANION_STRINGS.tr, v, "form:chaos")).toContain("???");
    expect(skillTip(COMPANION_STRINGS.tr, v, "nope")).toBeNull();
  });
  it("sekmeler: workshop 10'da, stats 3'te; pro beklemez", async () => {
    const { tabOpen } = await import("../app/unlocks");
    expect(tabOpen("workshop", 9, false)).toBe(false);
    expect(tabOpen("workshop", 10, false)).toBe(true);
    expect(tabOpen("workshop", 1, true)).toBe(true);
    expect(tabOpen("stats", 2, false)).toBe(false);
    expect(tabOpen("settings", 1, false)).toBe(true);
    expect(tabOpen("wardrobe", 1, false)).toBe(true);
  });
});
