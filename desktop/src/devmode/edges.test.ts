import { describe, expect, it } from "vitest";
import { EdgePath } from "../pet/path";
import { EDGE_TARGETS, edgePlacement, type EdgeTarget } from "./edges";
import { TESTMODE_STRINGS } from "./strings";

// 1000x600 çalışma alanı, 64x64 kutu, üstte 40 px balon payı -> xMax 936, yMin 40, yMax 536, vLen 496
const path = new EdgePath(1000, 600, 64, 64, 40);

describe("send to edge targets", () => {
  const table: [EdgeTarget, { x: number; y: number; s: number | null; edge: string; state: string; facing: string }][] = [
    ["left", { x: 0, y: 288, s: 248, edge: "left", state: "peek", facing: "left" }],
    ["right", { x: 936, y: 288, s: 1680, edge: "right", state: "peek", facing: "right" }],
    ["bottom", { x: 468, y: 536, s: 964, edge: "bottom", state: "idle", facing: "right" }],
    ["top", { x: 468, y: 0, s: null, edge: "top", state: "idle", facing: "right" }],
    ["top_left", { x: 0, y: 40, s: 0, edge: "left", state: "peek", facing: "left" }],
    ["top_right", { x: 936, y: 40, s: 1928, edge: "right", state: "peek", facing: "right" }],
    ["bottom_left", { x: 0, y: 536, s: 496, edge: "left", state: "peek", facing: "left" }],
    ["bottom_right", { x: 936, y: 536, s: 1432, edge: "right", state: "peek", facing: "right" }],
  ];
  for (const [target, want] of table) {
    it(target, () => expect(edgePlacement(target, path)).toEqual(want));
  }

  it("covers every target, stays inside the work area, path points match the path", () => {
    expect(table.map(([t]) => t).sort()).toEqual([...EDGE_TARGETS].sort());
    for (const t of EDGE_TARGETS) {
      const p = edgePlacement(t, path);
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(path.xMax);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(path.yMax);
      if (p.s !== null) expect([path.pointAt(p.s).x, path.pointAt(p.s).y]).toEqual([p.x, p.y]);
    }
  });

  it("tiny work area does not go negative", () => {
    const small = new EdgePath(50, 50, 64, 64, 40);
    for (const t of EDGE_TARGETS) {
      const p = edgePlacement(t, small);
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("test mode strings", () => {
  it("brand voice: lowercase, no exclamation, no emoji, both languages, every edge named", () => {
    for (const lang of ["tr", "en"] as const) {
      const s = TESTMODE_STRINGS[lang];
      const all = [...Object.values(s).filter((v): v is string => typeof v === "string"), ...Object.values(s.edges)];
      for (const t of all) {
        expect(t, t).toBe(t.toLocaleLowerCase(lang));
        expect(t, t).not.toMatch(/[!¡！]|\p{Extended_Pictographic}/u);
        expect(t.length, t).toBeLessThanOrEqual(60);
      }
      expect(Object.keys(s.edges).sort()).toEqual([...EDGE_TARGETS].sort());
    }
    expect(TESTMODE_STRINGS.tr.toastOn).toBe("test modu. kimseye söyleme");
  });
});
