import { describe, expect, it } from "vitest";
import { BASE_WINDOW, SPRITE_SCALE } from "../layout";
import { RUN_SPEED, WALK_SPEED } from "../pet/movement";
import type { ScreenEdge } from "../pet/facing";
import { placePopover } from "../place/placement";
import { pixelScale } from "../player/player";
// @ts-expect-error saf .mjs, tip yok (sheet bu ızgaralardan üretilir: aynı pikseller, dosya okumadan)
import { STATES } from "../../scripts/sprites/states.mjs";
import {
  cleanSize,
  DEFAULT_SIZE,
  devScale,
  hitRects,
  maskFromRgba,
  maskRects,
  mirrorMask,
  petScreenBox,
  reseat,
  scaleAnchor,
  scaleMotion,
  SIZE_LABELS,
  SIZE_LEVELS,
  sizeScale,
  windowLayout,
  type SizeLevel,
} from "./size";

const DPRS = [1, 1.25, 1.5] as const;

describe("levels", () => {
  it("PM labels: minik 1x .. dev 5x, default küçük = today's 2x", () => {
    expect(SIZE_LEVELS.map((l) => sizeScale(l))).toEqual([1, 2, 3, 4, 5]);
    expect(DEFAULT_SIZE).toBe(25);
    expect(sizeScale(DEFAULT_SIZE)).toBe(SPRITE_SCALE);
    expect(SIZE_LEVELS.map((l) => SIZE_LABELS.tr[l])).toEqual(["minik", "küçük", "normal", "büyük", "dev"]);
    for (const lang of ["tr", "en"] as const) for (const l of SIZE_LEVELS) expect(SIZE_LABELS[lang][l]).toBe(SIZE_LABELS[lang][l].toLocaleLowerCase(lang));
  });

  it("store value", () => {
    // FB4-2: 0..100; eski adlar taşınır, geçersiz -> küçük (25)
    expect([cleanSize(100), cleanSize(0), cleanSize("küçük"), cleanSize(37.6), cleanSize(250), cleanSize(null)]).toEqual([100, 0, 25, 38, 100, 25]);
  });
});

describe("window and pet box per level x DPI", () => {
  // seviye -> [dpr 1, 1.25, 1.5] cihaz px / sprite px (yarım piksele yuvarlanır, player.pixelScale ile aynı; FB4-2)
  const dev: Record<SizeLevel, [number, number, number]> = {
    0: [1, 1.5, 1.5],
    25: [2, 2.5, 3],
    50: [3, 4, 4.5],
    75: [4, 5, 6],
    100: [5, 6.5, 7.5],
  };
  for (const level of SIZE_LEVELS) {
    DPRS.forEach((dpr, i) => {
      it(`${level} @ ${dpr * 100}%`, () => {
        const d = dev[level][i];
        expect(devScale(level, dpr)).toBe(d);
        expect(devScale(level, dpr)).toBe(pixelScale(sizeScale(level), dpr));
        const L = windowLayout(level, dpr);
        // fiziksel her şey tam sayı: keskin
        expect(L.physical).toEqual({ w: 48 * d, h: 42 * d });
        expect(L.petPhysical).toEqual({ w: 32 * d, h: 32 * d });
        expect(L.logical.w * dpr).toBeCloseTo(L.physical.w, 9);
        // pet pencerede yatayda ortalı, altta
        expect(L.pet.x * 2 + L.pet.w).toBeCloseTo(L.logical.w, 9);
        expect(L.pet.y + L.pet.h).toBeCloseTo(L.logical.h, 9);
        expect(Number.isInteger(Math.round(L.pet.x * dpr * 1e9) / 1e9)).toBe(true);
      });
    });
  }

  it("2x at 100% is today's window (BASE_WINDOW) and pet box", () => {
    const L = windowLayout(25, 1);
    expect(L.logical).toEqual(BASE_WINDOW);
    expect(L.pet).toEqual({ x: 16, y: 20, w: 64, h: 64 });
  });
});

describe("hit rects from the filled-pixel mask", () => {
  // sheet kare sırası: STATES sırası (gen-sheet.mjs)
  const grids: { rows(): string[] }[] = Object.values(STATES as Record<string, [number, { rows(): string[] }[]]>).flatMap(([, g]) => g);
  const frames = grids.map((g) => g.rows());
  const frameMask = (i: number) => frames[i].map((row) => [...row].map((c) => c !== "."));
  const raster = (rects: { x: number; y: number; w: number; h: number }[]) => {
    const m = Array.from({ length: 32 }, () => Array<boolean>(32).fill(false));
    for (const r of rects) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
      expect(m[y][x], `overlap at ${x},${y}`).toBe(false);
      m[y][x] = true;
    }
    return m;
  };

  it("mask from RGBA: alpha > 0 is filled", () => {
    const rgba = [0, 0, 0, 0, 9, 9, 9, 255, 1, 1, 1, 1, 0, 0, 0, 0];
    expect(maskFromRgba(rgba, 2, 2)).toEqual([
      [false, true],
      [true, false],
    ]);
    expect(maskRects(maskFromRgba(rgba, 2, 2))).toEqual([
      { x: 1, y: 0, w: 1, h: 1 },
      { x: 0, y: 1, w: 1, h: 1 },
    ]);
  });

  it("every sheet frame: rects cover exactly the filled pixels, no overlap, few rects", () => {
    expect(frames).toHaveLength(69); // SPEC 09 K3: + fart (6 kare); SPEC 17: + wave 4, jump 4, dance 8, yawn 5, sneeze 6
    for (let i = 0; i < frames.length; i++) {
      const mask = frameMask(i);
      const rects = maskRects(mask);
      expect(raster(rects), `frame ${i}`).toEqual(mask);
      expect(rects.length).toBeLessThanOrEqual(64);
    }
  });

  it("mirrored mask for facing left", () => {
    const mask = frameMask(0);
    expect(raster(maskRects(mirrorMask(mask)))).toEqual(mirrorMask(mask));
  });

  for (const level of SIZE_LEVELS) {
    for (const dpr of DPRS) {
      it(`scaled into the pet box: ${level} @ ${dpr * 100}%`, () => {
        const rects = hitRects(frameMask(0), level, dpr);
        const pet = windowLayout(level, dpr).pet;
        expect(rects[0]).toEqual(pet); // ilk: pet sınır kutusu
        const d = devScale(level, dpr);
        for (const r of rects.slice(1)) {
          // pet kutusunun içinde, kenarlar cihaz pikseline oturur
          expect(r.x).toBeGreaterThanOrEqual(pet.x - 1e-9);
          expect(r.x + r.w).toBeLessThanOrEqual(pet.x + pet.w + 1e-9);
          // tam sayı ölçekte kenarlar cihaz pikseline oturur (FB4-2: yarım piksel ölçekte yarım piksele)
          const step = Number.isInteger(d) ? 1 : 0.5;
          for (const v of [r.x, r.y, r.w, r.h]) expect(Math.abs(v * dpr / step - Math.round(v * dpr / step))).toBeLessThan(1e-9);
          expect(Math.round((r.w * dpr) / d * 1e9) / 1e9 % 1).toBe(0);
        }
      });
    }
  }
});

describe("anchors", () => {
  const table: [SizeLevel, number, "left" | "right", { x: number; y: number }][] = [
    [25, 1, "right", { x: 48, y: 34 }], // 16 + 16*2, 20 + 7*2
    [25, 1, "left", { x: 46, y: 34 }], // ayna: x 15
    [0, 1, "right", { x: 24, y: 17 }], // 8 + 16, 10 + 7
    [100, 1, "right", { x: 120, y: 85 }], // 40 + 80, 50 + 35
    [25, 1.5, "right", { x: 48, y: 34 }], // 3 cihaz px / 1.5 = 2 mantıksal
    [25, 1.25, "right", { x: 48, y: 34 }], // 2.5 cihaz px / 1.25 = 2 mantıksal
  ];
  for (const [level, dpr, facing, want] of table) {
    it(`${level} @ ${dpr} ${facing}`, () => {
      const p = scaleAnchor({ x: 16, y: 7 }, level, dpr, facing);
      expect(p.x).toBeCloseTo(want.x, 9);
      expect(p.y).toBeCloseTo(want.y, 9);
    });
  }
});

describe("motion scales with size (same visual speed)", () => {
  it("walk/run px/s and distances", () => {
    expect(SIZE_LEVELS.map((l) => scaleMotion(WALK_SPEED, l))).toEqual([9, 18, 27, 36, 45]);
    expect(scaleMotion(RUN_SPEED, 25)).toBe(RUN_SPEED);
    // sprite px/s sabit: hız / ölçek
    for (const l of SIZE_LEVELS) expect(scaleMotion(WALK_SPEED, l) / sizeScale(l)).toBe(WALK_SPEED / 2);
  });
});

describe("reseat on the same edge after a size change", () => {
  const area = { width: 1920, height: 1040 };
  const box = (level: SizeLevel, dpr: number) => windowLayout(level, dpr).pet;

  const table: [string, { x: number; y: number; w: number; h: number }, ScreenEdge, SizeLevel, { x: number; y: number }][] = [
    ["right, grow to dev: stays on the edge, center kept", { x: 1856, y: 500, w: 64, h: 64 }, "right", 100, { x: 1760, y: 452 }],
    ["left, shrink to minik", { x: 0, y: 500, w: 64, h: 64 }, "left", 0, { x: 0, y: 516 }],
    ["bottom, grow", { x: 900, y: 976, w: 64, h: 64 }, "bottom", 75, { x: 868, y: 912 }],
    ["bottom-right corner growing stays on screen", { x: 1856, y: 976, w: 64, h: 64 }, "bottom", 100, { x: 1760, y: 880 }],
    ["top", { x: 100, y: 0, w: 64, h: 64 }, "top", 50, { x: 84, y: 0 }],
    ["right, top corner growing respects the top reserve", { x: 1856, y: 40, w: 64, h: 64 }, "right", 100, { x: 1760, y: 40 }],
  ];
  for (const [name, old, edge, level, want] of table) {
    it(name, () => expect(reseat(old, edge, box(level, 1), area, 40)).toEqual(want));
  }

  it("every edge x level x DPI: touches the edge, stays inside the work area", () => {
    const edges: ScreenEdge[] = ["left", "right", "top", "bottom"];
    for (const edge of edges)
      for (const from of SIZE_LEVELS)
        for (const to of SIZE_LEVELS)
          for (const dpr of DPRS) {
            const o = box(from, dpr);
            const old = {
              ...o,
              x: edge === "left" ? 0 : edge === "right" ? area.width - o.w : 700,
              y: edge === "top" ? 0 : edge === "bottom" ? area.height - o.h : 300,
            };
            const n = box(to, dpr);
            const p = reseat(old, edge, n, area, 40);
            const where = `${edge} ${from}->${to} @${dpr}`;
            expect(p.x, where).toBeGreaterThanOrEqual(0);
            expect(p.y, where).toBeGreaterThanOrEqual(0);
            expect(p.x + n.w, where).toBeLessThanOrEqual(area.width + 1e-9);
            expect(p.y + n.h, where).toBeLessThanOrEqual(area.height + 1e-9);
            if (edge === "left") expect(p.x).toBe(0);
            if (edge === "right") expect(p.x + n.w).toBeCloseTo(area.width, 9);
            if (edge === "top") expect(p.y).toBe(0);
            if (edge === "bottom") expect(p.y + n.h).toBeCloseTo(area.height, 9);
          }
  });

  it("work area smaller than the pet: pinned to 0, never negative", () => {
    expect(reseat({ x: 0, y: 0, w: 64, h: 64 }, "right", { w: 160, h: 160 }, { width: 100, height: 100 })).toEqual({ x: 0, y: 0 });
  });
});

describe("UP1 popover input", () => {
  it("pet screen box follows the size; popover never overlaps the pet", () => {
    const area = { x: 0, y: 0, w: 1920, h: 1040 };
    for (const level of SIZE_LEVELS) {
      for (const dpr of DPRS) {
        const L = windowLayout(level, dpr);
        const pos = { x: 900, y: 1040 - L.logical.h };
        const pet = petScreenBox(pos, level, dpr);
        expect(pet).toEqual({ x: 900 + L.pet.x, y: pos.y + L.pet.y, w: L.pet.w, h: L.pet.h });
        const p = placePopover(pet, { w: 220, h: 60 }, area, { scaleFactor: dpr });
        const overlap = p.x < pet.x + pet.w && p.x + p.w > pet.x && p.y < pet.y + pet.h && p.y + p.h > pet.y;
        expect(overlap, `${level} @${dpr}`).toBe(false);
      }
    }
  });
});
