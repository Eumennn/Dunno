import { describe, expect, it } from "vitest";
import { placePopover } from "../place/placement";
import { popStyles } from "./popover";

const WA = { x: 0, y: 0, w: 1920, h: 1040 };
const PET = 64;

describe("popStyles (UP1 sonucunu pencere içine uygular)", () => {
  it("alt kenar ortası: yüzey pet'in üstünde, kuyruk aşağıda pet'i gösterir", () => {
    const pet = { x: 928, y: WA.h - PET, w: PET, h: PET };
    const p = placePopover(pet, { w: 256, h: 180 }, WA);
    const s = popStyles(p);
    expect(s.tail?.side).toBe("bottom");
    // pet pencere içinde, yüzey altında; pencere = birleşim
    expect(s.pet!.top).toBeGreaterThan(s.pop.top + 180 - 1);
    expect(s.pet!.left + PET / 2).toBeCloseTo(s.pop.left + s.tail!.offset, 0);
    expect(s.scroll).toBe(false);
    expect(s.pop.width).toBeUndefined();
  });

  it("sağ kenar: yüzey sola açılır, çalışma alanından taşmaz", () => {
    const pet = { x: WA.w - PET, y: 500, w: PET, h: PET };
    const p = placePopover(pet, { w: 256, h: 180 }, WA);
    expect(p.tail?.side).toBe("right");
    expect(p.x + p.w).toBeLessThanOrEqual(WA.w - 8);
    expect(popStyles(p).pop.left).toBe(p.x - p.window.x);
  });

  it("sol üst köşe: içeri (sağa/aşağı) açılır, pencere kutusu pet + yüzey", () => {
    const pet = { x: 0, y: 0, w: PET, h: PET };
    const p = placePopover(pet, { w: 256, h: 180 }, WA);
    expect(p.x).toBeGreaterThanOrEqual(8);
    expect(p.y).toBeGreaterThanOrEqual(8);
    expect(p.window.x).toBe(0);
    expect(p.window.y).toBe(0);
    expect(popStyles(p).pet).toEqual({ left: 0, top: 0 });
  });

  it("çalışma alanından büyük yüzey: küçültülür, içerik kayar", () => {
    const pet = { x: 900, y: 600, w: PET, h: PET };
    const p = placePopover(pet, { w: 256, h: 5_000 }, { x: 0, y: 0, w: 1280, h: 680 });
    const s = popStyles(p);
    expect(s.scroll).toBe(true);
    expect(s.pop.height).toBe(p.h);
    expect(p.h).toBeLessThanOrEqual(680 - 16);
  });
});
