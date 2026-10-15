// FB4-5: açıkken büyüyen yüzey (ask.exe cevabı, uzun balon) yeniden yerleşir; köşede / kenarda ekran dışına taşmaz.
import { afterEach, describe, expect, it, vi } from "vitest";
import { PopoverHost } from "./popover";

class FakeRO {
  static last: FakeRO | null = null;
  constructor(readonly cb: () => void) {
    FakeRO.last = this;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

function fakeEl(w: number, h: number) {
  const el = {
    offsetWidth: w,
    offsetHeight: h,
    scrollWidth: w,
    scrollHeight: h,
    style: {} as Record<string, string> & { setProperty?: (k: string, v: string) => void },
    dataset: {} as Record<string, string>,
    classList: { toggle: () => undefined },
    querySelector: () => null,
  };
  el.style.setProperty = () => undefined;
  return el;
}

afterEach(() => vi.unstubAllGlobals());

describe("yüzey büyüyünce yeniden yerleşim (FB4-5)", () => {
  it("sağ alt köşede: büyüyen ask.exe yukarı taşınır, pencere kutusu ekran içinde kalır", async () => {
    vi.stubGlobal("ResizeObserver", FakeRO);
    vi.stubGlobal("requestAnimationFrame", (f: () => void) => setTimeout(f, 0));
    const boxes: { x: number; y: number; w: number; h: number }[] = [];
    const host = new PopoverHost({
      pet: { style: {} } as unknown as HTMLElement,
      petBox: () => ({ x: 1856, y: 976, w: 64, h: 64 }),
      workArea: () => ({ width: 1920, height: 1040, scale: 1 }),
      setWindowBox: async (b) => void boxes.push(b),
      restore: () => undefined,
      refreshHit: () => undefined,
    });
    const el = fakeEl(256, 120);
    host.place(el as unknown as HTMLElement);
    await new Promise((r) => setTimeout(r, 0));
    el.offsetHeight = el.scrollHeight = 420; // cevap eklendi
    FakeRO.last!.cb();
    await new Promise((r) => setTimeout(r, 5));
    expect(boxes.length).toBe(2);
    for (const b of boxes) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.x + b.w).toBeLessThanOrEqual(1920);
      expect(b.y + b.h).toBeLessThanOrEqual(1040);
    }
    expect(boxes[1].h).toBeGreaterThan(boxes[0].h);
    // küçük değişim (≤ 2 px) yeniden yerleşmez
    el.offsetHeight = el.scrollHeight = 421;
    FakeRO.last!.cb();
    await new Promise((r) => setTimeout(r, 5));
    expect(boxes.length).toBe(2);
  });
});

describe("FB5: balon açıkken pet hareket eder", () => {
  it("windowAt pencereyi balonlu yerleşime göre verir, pet inince replaceAll yeni yere yerleşir, kapanınca null", async () => {
    vi.stubGlobal("ResizeObserver", FakeRO);
    let pet = { x: 900, y: 400, w: 64, h: 64 };
    const boxes: { x: number; y: number; w: number; h: number }[] = [];
    const host = new PopoverHost({
      pet: { style: {} } as unknown as HTMLElement,
      petBox: () => pet,
      workArea: () => ({ width: 1920, height: 1040, scale: 1 }),
      setWindowBox: async (b) => void boxes.push(b),
      restore: () => undefined,
      refreshHit: () => undefined,
    });
    expect(host.windowAt(pet)).toBeNull();
    const el = fakeEl(256, 120);
    host.place(el as unknown as HTMLElement);
    const win = boxes[0];
    // pet pencere içinde aynı yerde kalacak şekilde
    expect(host.windowAt(pet)).toEqual({ x: win.x, y: win.y });
    expect(host.windowAt({ x: pet.x + 50, y: pet.y + 10 })).toEqual({ x: win.x + 50, y: win.y + 10 });
    // sağ alt köşeye indi: balon yeniden yerleşir, ekran içinde
    pet = { x: 1856, y: 976, w: 64, h: 64 };
    host.replaceAll();
    const last = boxes.at(-1)!;
    expect(last.x + last.w).toBeLessThanOrEqual(1920);
    expect(last.y + last.h).toBeLessThanOrEqual(1040);
    host.release(el as unknown as HTMLElement);
    expect(host.windowAt(pet)).toBeNull();
  });
});
