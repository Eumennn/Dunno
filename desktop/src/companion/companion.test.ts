import { describe, expect, it } from "vitest";
import { applyEvent, cleanCompanion, initialCompanion, type CompanionState, type Effect } from "./companion";
import type { CompanionEvent } from "./events";
import { choices, choosePath, cleanEvolution, evolve, initialEvolution, pickChild, treeView } from "./evolution";
import { incidentTick, initialIncidents } from "./incidents";
import { cleanMemory, DAY_MARKS, initialMemory, memoryOnEvent, traitsOf } from "./memory";
import { grant, initialProgress, levelOf, levelProgress, progressOnEvent, xpFor } from "./progression";
import { bondOf, initialRelationship, relationshipOnEvent, relBehavior } from "./relationship";

const at = (d: number, h = 12, m = 0) => new Date(2026, 9, d, h, m);

function run(evs: CompanionEvent[], now: Date, s = initialCompanion(), world = "normal") {
  const effects: Effect[] = [];
  for (const ev of evs) {
    const r = applyEvent(s, ev, now, { world });
    s = r.state;
    effects.push(...r.effects);
  }
  return { s, effects };
}

describe("memory (R2)", () => {
  it("17. sürüklemede anı kartı, günde bir kez; ilk sürükleme bir kez", () => {
    let m = initialMemory();
    const ids: string[] = [];
    for (let i = 0; i < 40; i++) {
      const r = memoryOnEvent(m, { type: "drag" }, at(9));
      m = r.state;
      ids.push(...r.added.map((c) => c.id));
    }
    expect(ids).toEqual(["first_drag", "drag_day"]);
    expect(m.memories.find((c) => c.id === "drag_day")?.n).toBe(DAY_MARKS.drag_day);
  });

  it("trait'ler 7 günlük pencereden; eski günler düşer (etiket kalıcı değil)", () => {
    let m = initialMemory();
    for (let i = 0; i < 40; i++) m = memoryOnEvent(m, { type: "drag" }, at(1)).state;
    expect(traitsOf(m).traits).toContain("serial_dragger");
    m = memoryOnEvent(m, { type: "heartbeat" }, at(20)).state;
    expect(traitsOf(m).traits).not.toContain("serial_dragger");
  });

  it("gece etkileşimi night_owl, uygulama etiketi favori", () => {
    let m = initialMemory();
    for (let i = 0; i < 20; i++) m = memoryOnEvent(m, { type: "click" }, at(9, 2)).state;
    for (let i = 0; i < 12; i++) m = memoryOnEvent(m, { type: "line", app: "excel" }, at(9)).state;
    const t = traitsOf(m);
    expect(t.traits).toContain("night_owl");
    expect(t.favoriteApp).toBe("excel");
  });

  it("güvensiz etiket (pencere başlığı gibi) hafızaya girmez", () => {
    let m = initialMemory();
    m = memoryOnEvent(m, { type: "line", app: "Gizli Proje - Belge.docx" }, at(9)).state;
    expect(m.apps).toEqual({});
    const c = cleanMemory({ memories: [{ id: "favorite_app", at: at(9).toISOString(), tag: "şifrem 1234" }, { id: "hack", at: "x" }] });
    expect(c.memories).toEqual([{ id: "favorite_app", at: at(9).toISOString() }]);
  });
});

describe("relationship (R3)", () => {
  it("3+ gün aradan sonra dönüş (suçluluk yok: değerler sıfırlanmaz)", () => {
    let s = relationshipOnEvent(initialRelationship(), { type: "session_start" }, at(1)).state;
    for (let i = 0; i < 30; i++) s = relationshipOnEvent(s, { type: "question", qtype: "thanks" }, at(1)).state;
    const trust = s.trust;
    const r = relationshipOnEvent(s, { type: "session_start" }, at(6));
    expect(r.returned).toBe(5);
    expect(r.state.trust).toBeGreaterThan(30);
    expect(r.state.trust).toBeLessThanOrEqual(trust);
    expect(r.state.daysTogether).toBe(2);
  });

  it("hakaret güveni düşürür ama sınırlı; iltifat yükseltir", () => {
    const base = initialRelationship();
    const bad = relationshipOnEvent(base, { type: "question", qtype: "insult_strong", tone: "angry" }, at(1)).state;
    const good = relationshipOnEvent(base, { type: "question", qtype: "compliment", tone: "kind" }, at(1)).state;
    expect(bad.trust).toBeLessThan(base.trust);
    expect(good.trust).toBeGreaterThan(base.trust);
  });

  it("davranış çarpanları sınırda: sıkkın -> daha çok laf, kaotik -> az dinlenme", () => {
    const bored = relBehavior({ ...initialRelationship(), boredom: 100 });
    const calm = relBehavior({ ...initialRelationship(), boredom: 0 });
    expect(bored.chattiness).toBeGreaterThan(calm.chattiness);
    const wild = relBehavior({ ...initialRelationship(), chaos: 100, energy: 100 });
    expect(wild.restScale).toBeLessThan(1);
    for (const v of [bored, calm, wild]) {
      expect(v.chattiness).toBeGreaterThanOrEqual(0.75);
      expect(v.restScale).toBeLessThanOrEqual(1.35);
    }
    expect(bondOf({ ...initialRelationship(), familiarity: 90, trust: 80 })).toBe("best");
  });
});

describe("progression (R4)", () => {
  it("eğri: L10 840 XP civarı, monoton", () => {
    expect(xpFor(1)).toBe(0);
    expect(xpFor(10)).toBeGreaterThan(700);
    expect(xpFor(10)).toBeLessThan(1000);
    for (let l = 2; l < 50; l++) expect(xpFor(l + 1)).toBeGreaterThan(xpFor(l));
    expect(levelOf(xpFor(7))).toBe(7);
    expect(levelProgress(xpFor(7) + 1).level).toBe(7);
  });

  it("dürtme XP'si günlük tavanlı: spam ile level kasılmaz", () => {
    let p = initialProgress();
    for (let i = 0; i < 1000; i++) p = progressOnEvent(p, { type: "click" }, at(1)).state;
    expect(p.xp).toBe(60);
    p = progressOnEvent(p, { type: "click" }, at(2)).state;
    expect(p.xp).toBe(61);
  });

  it("level atlayınca levelUps", () => {
    const r = grant(initialProgress(), "achievement", at(1), 1);
    expect(r.levelUps.length).toBeGreaterThan(0);
  });
});

describe("evolution (R5)", () => {
  const rel = { chaos: 30, curiosity: 40, energy: 70, trust: 30, boredom: 20 };
  it("L10'da davranışa göre chaos/chill; L25'te alt dal; erken evrim yok", () => {
    expect(evolve(initialEvolution(), 9, { rel, traits: [], world: "normal" })).toBeNull();
    const c = evolve(initialEvolution(), 10, { rel: { ...rel, chaos: 90 }, traits: ["spam_clicker"], world: "normal" })!;
    expect(c.path).toEqual(["dunno", "chaos"]);
    const calm = evolve(initialEvolution(), 10, { rel: { ...rel, chaos: 5, energy: 20, trust: 80 }, traits: ["quiet_user"], world: "normal" })!;
    expect(calm.path).toEqual(["dunno", "chill"]);
    expect(evolve(c, 24, { rel, traits: [], world: "normal" })).toBeNull();
    expect(evolve(c, 25, { rel: { ...rel, chaos: 90, curiosity: 10 }, traits: [], world: "normal" })!.path.at(-1)).toBe("demon");
    expect(pickChild("chill", { rel: { ...rel, energy: 20 }, traits: [], world: "normal" })).toBe("sloth");
  });

  it("gizli glitchling: ikinci evrimde glitch dünyası açıksa", () => {
    expect(pickChild("chaos", { rel, traits: [], world: "glitch" })).toBe("glitchling");
    expect(cleanEvolution({ path: ["dunno", "chill", "glitchling"] }).path).toEqual(["dunno", "chill", "glitchling"]);
  });

  it("Pro yol seçimi sadece kardeş dallar; glitchling seçilemez; bozuk yol temizlenir", () => {
    const e = { path: ["dunno", "chaos", "demon"] as const, chosen: false };
    const ev = { path: [...e.path], chosen: false };
    expect(choices(ev)).toEqual(["gremlin", "demon"]);
    expect(choosePath(ev, "gremlin")?.path).toEqual(["dunno", "chaos", "gremlin"]);
    expect(choosePath(ev, "sloth")).toBeNull();
    expect(choosePath(ev, "glitchling")).toBeNull();
    expect(choosePath(initialEvolution(), "chaos")).toBeNull();
    expect(cleanEvolution({ path: ["dunno", "demon"] }).path).toEqual(["dunno"]);
  });

  it("ağaç: açılmamış formlar bilinmez (???)", () => {
    const v = treeView({ path: ["dunno", "chill"], chosen: false });
    expect(v.find((x) => x.form === "chill")).toMatchObject({ known: true, current: true });
    expect(v.find((x) => x.form === "demon")?.known).toBe(false);
    expect(v.some((x) => x.form === "glitchling")).toBe(false);
  });
});

describe("incidents (R7)", () => {
  it("aktif güne göre: ilk gün yok, sonra günde bir adım, boş günler ceza değil", () => {
    let s = initialIncidents();
    const steps: (string | null)[] = [];
    for (const d of [1, 1, 2, 2, 10, 11, 30, 31, 32]) {
      const r = incidentTick(s, at(d));
      s = r.state;
      steps.push(r.step);
    }
    expect(steps).toEqual([null, null, "found", null, "dont_ask", "maybe_ask", "bad", "shift", null]);
  });
});

describe("companion cephesi", () => {
  it("level, evrim, gizli eşik ve zincir etkileri; dünya hediyesi", () => {
    let s: CompanionState = initialCompanion();
    const effects: Effect[] = [];
    for (let d = 1; d <= 6; d++) {
      const r = run([{ type: "session_start" }, ...Array.from({ length: 30 }, () => ({ type: "question" as const }))], at(d), s);
      s = r.s;
      effects.push(...r.effects);
    }
    expect(effects.some((e) => e.kind === "level")).toBe(true);
    expect(effects.filter((e) => e.kind === "incident").map((e) => (e as { step: string }).step)).toEqual(["found", "dont_ask", "maybe_ask", "bad", "shift"]);
    expect(effects.some((e) => e.kind === "world_gift")).toBe(true);
    const sec = run([{ type: "click", total: 10_000 }, { type: "click", total: 10_001 }], at(7), s);
    expect(sec.effects.filter((e) => e.kind === "secret")).toHaveLength(1);
    // evrim: XP'yi doğrudan L10'a taşı
    const big = { ...s, progress: { ...s.progress, xp: xpFor(10) - 1 } };
    const ev = run([{ type: "question" }], at(8), big);
    expect(ev.effects.some((e) => e.kind === "evolved")).toBe(true);
    expect(ev.s.evo.path).toHaveLength(2);
  });

  it("gizlilik: store'a giden durumda serbest metin yok, temizlenmiş durum aynı", () => {
    const { s } = run(
      [
        { type: "session_start" },
        { type: "question", qtype: "compliment", tone: "kind" },
        { type: "line", app: "excel" },
        { type: "line", app: "Banka Hesabım - Chrome" },
        { type: "drag" },
        { type: "heartbeat" },
      ],
      at(3),
    );
    const json = JSON.stringify(s);
    expect(json).not.toMatch(/Banka|Chrome|compliment|kind/);
    const strings = [...json.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
    for (const x of strings) expect(x).toMatch(/^[a-z0-9_@:.TZ+-]*$/i);
    expect(cleanCompanion(JSON.parse(json))).toEqual(s);
  });
});
