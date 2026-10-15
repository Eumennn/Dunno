import { describe, expect, it } from "vitest";
import { anchorOf, placePopover, type Box, type Placement, type TailSide } from "./placement";

const WA: Box = { x: 0, y: 0, w: 1920, h: 1040 }; // 1080p, görev çubuğu altta 40px
const PET = 96;
const POP = { w: 280, h: 160 };
const EPS = 1e-6;

/** Çalışma alanına `margin` boşlukla tamamen sığıyor mu. */
function expectInside(p: Placement, wa: Box, margin = 8): void {
  expect(p.x).toBeGreaterThanOrEqual(wa.x + margin - EPS);
  expect(p.y).toBeGreaterThanOrEqual(wa.y + margin - EPS);
  expect(p.x + p.w).toBeLessThanOrEqual(wa.x + wa.w - margin + EPS);
  expect(p.y + p.h).toBeLessThanOrEqual(wa.y + wa.h - margin + EPS);
}

/** Değer cihaz pikseli ızgarasında mı (ölçekle çarpınca tam sayı). */
function expectOnGrid(v: number, s: number): void {
  expect(Math.abs(v * s - Math.round(v * s))).toBeLessThan(1e-6);
}

/** Kuyruk kenara 8px'ten yakın değil; mümkünse pet merkezini gösteriyor. */
function expectTail(p: Placement, pet: Box, s = 1): void {
  expect(p.tail).not.toBeNull();
  const { side, offset } = p.tail!;
  const length = side === "top" || side === "bottom" ? p.w : p.h;
  expect(offset).toBeGreaterThanOrEqual(8 - EPS);
  expect(offset).toBeLessThanOrEqual(length - 8 + EPS);
  const tip = side === "top" || side === "bottom" ? p.x + offset : p.y + offset;
  const center = side === "top" || side === "bottom" ? pet.x + pet.w / 2 : pet.y + pet.h / 2;
  const reachable = side === "top" || side === "bottom" ? center >= p.x + 8 && center <= p.x + p.w - 8 : center >= p.y + 8 && center <= p.y + p.h - 8;
  if (reachable) expect(Math.abs(tip - center)).toBeLessThanOrEqual(1 / s + EPS);
}

/** Yüzey kuyruğun gösterdiği tarafta, pet'e binmeden. */
function expectFacing(p: Placement, pet: Box): void {
  const side = p.tail!.side;
  if (side === "bottom") expect(p.y + p.h).toBeLessThanOrEqual(pet.y + EPS);
  if (side === "top") expect(p.y).toBeGreaterThanOrEqual(pet.y + pet.h - EPS);
  if (side === "right") expect(p.x + p.w).toBeLessThanOrEqual(pet.x + EPS);
  if (side === "left") expect(p.x).toBeGreaterThanOrEqual(pet.x + pet.w - EPS);
  expect(p.overlapsPet).toBe(false);
}

/** Pencere kutusu pet'i ve yüzeyi içerir; yerel konumlar tutarlı (pet ekranda yerinde kalır). */
function expectWindow(p: Placement, pet: Box): void {
  const win = p.window;
  expect(win.x).toBeLessThanOrEqual(Math.min(p.x, pet.x) + EPS);
  expect(win.y).toBeLessThanOrEqual(Math.min(p.y, pet.y) + EPS);
  expect(win.x + win.w).toBeGreaterThanOrEqual(Math.max(p.x + p.w, pet.x + pet.w) - EPS);
  expect(win.y + win.h).toBeGreaterThanOrEqual(Math.max(p.y + p.h, pet.y + pet.h) - EPS);
  expect(win.x + p.local.pet!.x).toBeCloseTo(pet.x, 6);
  expect(win.y + p.local.pet!.y).toBeCloseTo(pet.y, 6);
  expect(win.x + p.local.popover.x).toBeCloseTo(p.x, 6);
  expect(win.y + p.local.popover.y).toBeCloseTo(p.y, 6);
}

const pos = (name: string, wa: Box, pet = PET): Box => {
  const L = wa.x;
  const R = wa.x + wa.w - pet;
  const T = wa.y;
  const B = wa.y + wa.h - pet;
  const MX = wa.x + (wa.w - pet) / 2;
  const MY = wa.y + (wa.h - pet) / 2;
  const at: Record<string, [number, number]> = {
    bottom: [MX, B],
    top: [MX, T],
    left: [L, MY],
    right: [R, MY],
    "bottom-left": [L, B],
    "bottom-right": [R, B],
    "top-left": [L, T],
    "top-right": [R, T],
    middle: [MX, MY],
  };
  return { x: at[name][0], y: at[name][1], w: pet, h: pet };
};

/** pet yeri -> yüzeyin pet'e bakan kenarı (içeri açılma) */
const EXPECTED: Record<string, TailSide> = {
  bottom: "bottom", // alt kenar: yukarı açılır
  top: "top", // üst kenar: aşağı
  left: "left", // sol kenar: sağa
  right: "right", // sağ kenar: sola
  "bottom-left": "bottom",
  "bottom-right": "bottom",
  "top-left": "top",
  "top-right": "top",
  middle: "bottom",
};

describe("placePopover: 4 kenar, 4 köşe, orta x 3 ölçek", () => {
  for (const scale of [1, 1.25, 1.5]) {
    for (const [where, side] of Object.entries(EXPECTED)) {
      it(`${where} @ ${scale * 100}%`, () => {
        const pet = pos(where, WA);
        const p = placePopover(pet, POP, WA, { scaleFactor: scale });
        expect(p.anchor).toBe(where);
        expect(p.tail!.side).toBe(side);
        expect(p.shrunk).toBe(false);
        expect([p.w, p.h]).toEqual([POP.w, POP.h]);
        expectInside(p, WA);
        expectFacing(p, pet);
        expectTail(p, pet, scale);
        expectWindow(p, pet);
        for (const v of [p.x, p.y, p.w, p.h, p.tail!.offset, p.window.x, p.window.y, p.window.w, p.window.h]) expectOnGrid(v, scale);
        expect(p.physical).toEqual({
          x: Math.round(p.window.x * scale),
          y: Math.round(p.window.y * scale),
          w: Math.round(p.window.w * scale),
          h: Math.round(p.window.h * scale),
        });
      });
    }
  }

  it("corners open diagonally inward", () => {
    const br = placePopover(pos("bottom-right", WA), POP, WA);
    const brPet = pos("bottom-right", WA);
    expect(br.x + br.w).toBeLessThanOrEqual(brPet.x + brPet.w + EPS); // sola uzanır
    const tl = placePopover(pos("top-left", WA), POP, WA);
    expect(tl.x).toBeGreaterThanOrEqual(pos("top-left", WA).x - EPS); // sağa uzanır
  });

  it("a pet on the bottom edge gets a popover centered over it", () => {
    const pet = pos("bottom", WA);
    const p = placePopover(pet, POP, WA);
    expect(p.x + p.w / 2).toBeCloseTo(pet.x + pet.w / 2, 6);
    expect(p.tail!.offset).toBeCloseTo(POP.w / 2, 6);
    expect(p.y).toBe(pet.y - 12 - POP.h);
  });
});

describe("multi monitor offsets", () => {
  const LEFT_SCREEN: Box = { x: -1920, y: 0, w: 1920, h: 1040 };
  const TALL_SCREEN: Box = { x: 1920, y: -300, w: 2560, h: 1400 };

  for (const [name, wa] of [
    ["left monitor (negative x)", LEFT_SCREEN],
    ["shifted monitor (negative y)", TALL_SCREEN],
  ] as const) {
    for (const where of Object.keys(EXPECTED)) {
      it(`${name}: ${where}`, () => {
        const pet = pos(where, wa);
        const p = placePopover(pet, POP, wa, { scaleFactor: 1.25 });
        expect(p.tail!.side).toBe(EXPECTED[where]);
        expectInside(p, wa);
        expectFacing(p, pet);
        expectTail(p, pet, 1.25);
        expectWindow(p, pet);
      });
    }
  }
});

describe("oversized content", () => {
  it("a very long text popover is shrunk to fit and still stays inside", () => {
    for (const where of Object.keys(EXPECTED)) {
      const pet = pos(where, WA);
      const p = placePopover(pet, { w: 4000, h: 5000 }, WA, { scaleFactor: 1.5 });
      expect(p.shrunk).toBe(true);
      expect(p.w).toBeLessThanOrEqual(WA.w - 16);
      expect(p.h).toBeLessThanOrEqual(WA.h - 16);
      expectInside(p, WA);
      expectTail(p, pet, 1.5);
    }
  });

  it("a tall popover that does not fit above/below goes beside the pet", () => {
    const pet = pos("middle", WA);
    const p = placePopover(pet, { w: 280, h: 900 }, WA);
    expect(["left", "right"]).toContain(p.tail!.side);
    expectFacing(p, pet);
    expectInside(p, WA);
  });

  it("a popover that fits nowhere next to the pet overlaps it but never leaves the screen", () => {
    const pet = pos("middle", WA);
    const p = placePopover(pet, { w: 1700, h: 900 }, WA);
    expect(p.shrunk).toBe(false);
    expect(p.overlapsPet).toBe(true);
    expectInside(p, WA);
    expectTail(p, pet);
  });

  it("falls back to above/below when the side has no room", () => {
    const narrow: Box = { x: 0, y: 0, w: 320, h: 1040 };
    const pet = pos("right", narrow);
    const p = placePopover(pet, POP, narrow);
    expect(["top", "bottom"]).toContain(p.tail!.side);
    expectInside(p, narrow);
    expectFacing(p, pet);
  });

  it("ignores a pet box bigger than the work area and centers the popover", () => {
    const p = placePopover({ x: -10, y: -10, w: 3000, h: 200 }, POP, WA);
    expect(p.tail).toBeNull();
    expect(p.anchor).toBeNull();
    expect(p.local.pet).toBeNull();
    expect(p.x).toBe(WA.x + (WA.w - POP.w) / 2);
    expect(p.y).toBe(WA.y + (WA.h - POP.h) / 2);
    expectInside(p, WA);
    expect(placePopover({ x: 0, y: 0, w: 0, h: 0 }, POP, WA).tail).toBeNull();
  });
});

describe("anchorOf", () => {
  it("classifies edges and corners by distance", () => {
    expect(anchorOf({ x: 0, y: 500, w: 96, h: 96 }, WA)).toBe("left");
    expect(anchorOf({ x: 1820, y: 940, w: 96, h: 96 }, WA)).toBe("bottom-right");
    expect(anchorOf({ x: 900, y: 450, w: 96, h: 96 }, WA)).toBe("middle");
    expect(anchorOf({ x: 900, y: 50, w: 96, h: 96 }, WA)).toBe("top");
  });
});

describe("petInset (SPEC 09 K4: görünen gövdeye yaklaşma)", () => {
  const AREA = { x: 0, y: 0, w: 1000, h: 800 };
  const POPS = { w: 160, h: 90 };
  it("sol kenarda peek: saydam sağ pay kadar balon pet'e yaklaşır, pencere yine tam kutuyu kapsar", () => {
    const pet = { x: 0, y: 300, w: 64, h: 64 };
    const plain = placePopover(pet, POPS, AREA);
    const near = placePopover(pet, POPS, AREA, { petInset: { left: 0, right: 30, top: 0, bottom: 0 } });
    expect(plain.tail!.side).toBe("left");
    expect(near.tail!.side).toBe("left");
    expect(plain.x - near.x).toBe(30);
    expect(near.x).toBe(64 - 30 + 12); // görünen kenar + gap
    expect(near.window.x).toBe(0);
    expect(near.window.x + near.window.w).toBeGreaterThanOrEqual(pet.x + pet.w);
  });

  it("payı yok sayılacak kadar büyükse tam kutu kullanılır", () => {
    const pet = { x: 400, y: 700, w: 64, h: 64 };
    const a = placePopover(pet, POPS, AREA);
    const b = placePopover(pet, POPS, AREA, { petInset: { left: 40, right: 40, top: 0, bottom: 0 } });
    expect(b).toEqual(a);
  });
});

describe("FB4-5: köşe ve kenarlarda hiçbir yüzey ekran dışına taşmaz", () => {
  it("pet her köşe/kenar/ortada, her boyutta, her yüzey ölçüsünde: pencere kutusu çalışma alanının içinde", () => {
    const wa = { x: 0, y: 0, w: 1920, h: 1040 };
    const pets = [16, 32, 64, 96, 160].flatMap((p) =>
      [
        [0, 0],
        [wa.w - p, 0],
        [0, wa.h - p],
        [wa.w - p, wa.h - p],
        [wa.w / 2, wa.h - p],
        [0, wa.h / 2],
        [wa.w - p, wa.h / 2],
        [wa.w - p + 20, wa.h - p], // peek: kısmen kenar dışı
        [-20, wa.h / 2],
      ].map(([x, y]) => ({ x, y, w: p, h: p })),
    );
    const sizes = [
      { w: 120, h: 40 },
      { w: 256, h: 200 },
      { w: 256, h: 520 },
      { w: 520, h: 300 },
      { w: 2400, h: 1400 },
    ];
    for (const scale of [1, 1.25, 1.5]) {
      for (const pet of pets) {
        for (const size of sizes) {
          const p = placePopover(pet, size, wa, { scaleFactor: scale });
          const b = p.window;
          const tag = `${JSON.stringify(pet)} ${JSON.stringify(size)} @${scale}`;
          // yüzey (balon) tamamen alanın içinde
          expect(p.x >= wa.x - 1e-6 && p.y >= wa.y - 1e-6, tag).toBe(true);
          expect(p.x + p.w <= wa.x + wa.w + 1e-6 && p.y + p.h <= wa.y + wa.h + 1e-6, tag).toBe(true);
          expect(b.w > 0 && b.h > 0, tag).toBe(true);
        }
      }
    }
  });
});
