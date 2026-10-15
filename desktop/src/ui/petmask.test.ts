import { describe, expect, it } from "vitest";
import { frameMaskRects } from "./petmask";

/** 64x32 sheet, iki kare; ilk karede sol üst 2x2 dolu, ikinci karede tek piksel (31, 0). */
function sheet() {
  const width = 64;
  const data = new Uint8ClampedArray(width * 32 * 4);
  const fill = (x: number, y: number) => data.set([1, 2, 3, 255], (y * width + x) * 4);
  fill(0, 0);
  fill(1, 0);
  fill(0, 1);
  fill(1, 1);
  fill(32 + 31, 0);
  return { data, width };
}

describe("pet tıklama maskesi (SPEC 08 SZ1c)", () => {
  it("karenin dolu pikselleri, karenin sol üstü origin", () => {
    expect(frameMaskRects(sheet(), { x: 0, y: 0, w: 32, h: 32 }, "right")).toEqual([{ x: 0, y: 0, w: 2, h: 2 }]);
    expect(frameMaskRects(sheet(), { x: 32, y: 0, w: 32, h: 32 }, "right")).toEqual([{ x: 31, y: 0, w: 1, h: 1 }]);
  });

  it("sola bakışta aynalı (Player aynasıyla aynı)", () => {
    expect(frameMaskRects(sheet(), { x: 0, y: 0, w: 32, h: 32 }, "left")).toEqual([{ x: 30, y: 0, w: 2, h: 2 }]);
    expect(frameMaskRects(sheet(), { x: 32, y: 0, w: 32, h: 32 }, "left")).toEqual([{ x: 0, y: 0, w: 1, h: 1 }]);
  });

  it("boş kare: rect yok (Rust maske yoksa kutuya düşer; boş liste = maske yok)", () => {
    expect(frameMaskRects({ data: new Uint8ClampedArray(32 * 32 * 4), width: 32 }, { x: 0, y: 0, w: 32, h: 32 }, "right")).toEqual([]);
  });
});
