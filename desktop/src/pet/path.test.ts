import { describe, expect, it } from "vitest";
import { EdgePath } from "./path";

// 1920x1040 çalışma alanı, 144 kutu, dikeyde üstte 96 px balon payı
const path = new EdgePath(1920, 1040, 144, 144, 96);

describe("EdgePath geometrisi", () => {
  it("sınırları çalışma alanından türetir", () => {
    expect(path.xMax).toBe(1776);
    expect(path.yMax).toBe(896);
    expect(path.yMin).toBe(96);
    expect(path.vLen).toBe(800);
    expect(path.length).toBe(800 * 2 + 1776);
  });

  it("U yolunu izler: sol kenar -> alt -> sağ kenar", () => {
    expect(path.pointAt(0)).toEqual({ x: 0, y: 96, edge: "left" });
    expect(path.pointAt(400)).toEqual({ x: 0, y: 496, edge: "left" });
    expect(path.pointAt(800)).toEqual({ x: 0, y: 896, edge: "bottom" }); // sol alt köşe
    expect(path.pointAt(800 + 1776)).toEqual({ x: 1776, y: 896, edge: "bottom" }); // sağ alt köşe
    expect(path.pointAt(800 + 1776 + 300)).toEqual({ x: 1776, y: 596, edge: "right" });
    expect(path.pointAt(path.length)).toEqual({ x: 1776, y: 96, edge: "right" });
  });

  it("yol dışını sınırlar", () => {
    expect(path.pointAt(-50)).toEqual(path.pointAt(0));
    expect(path.pointAt(99999)).toEqual(path.pointAt(path.length));
  });

  it("pointAt ve project birbirinin tersi", () => {
    for (const s of [0, 123, 800, 1500, 2576, 3000, path.length]) {
      const p = path.pointAt(s);
      expect(path.project(p.x, p.y)).toBeCloseTo(s);
    }
  });
});

describe("en yakın kenara snap", () => {
  it("ekranın ortasının altı -> alt kenar", () => {
    expect(path.pointAt(path.project(900, 700))).toEqual({ x: 900, y: 896, edge: "bottom" });
  });

  it("sola yakın -> sol kenar, y korunur", () => {
    expect(path.pointAt(path.project(30, 400))).toEqual({ x: 0, y: 400, edge: "left" });
  });

  it("sağa yakın -> sağ kenar", () => {
    expect(path.pointAt(path.project(1750, 300)).edge).toBe("right");
  });

  it("üst kısımdan bırakılınca dikey kenarda balon payının altında kalır", () => {
    const p = path.pointAt(path.project(10, 0));
    expect(p).toEqual({ x: 0, y: 96, edge: "left" });
  });

  it("ekran dışına sürüklenen konumu içeri alır", () => {
    const p = path.pointAt(path.project(-500, 5000));
    expect(p).toEqual({ x: 0, y: 896, edge: "bottom" });
  });
});

describe("çalışma alanı sınırı", () => {
  it("küçülen çalışma alanında konum yeniden sınırlanır", () => {
    const big = path.pointAt(path.bottomEnd); // sağ alt köşe (1776, 896)
    // görev çubuğu büyüdü / çözünürlük düştü: 1280x680
    const small = new EdgePath(1280, 680, 144, 144, 96);
    const p = small.pointAt(small.project(big.x, big.y));
    expect(p).toEqual({ x: 1136, y: 536, edge: "bottom" });
  });

  it("kutudan küçük alan negatif sınır üretmez", () => {
    const tiny = new EdgePath(100, 100, 144, 144, 96);
    expect([tiny.xMax, tiny.yMax, tiny.yMin, tiny.length]).toEqual([0, 0, 0, 0]);
    expect(tiny.pointAt(10)).toEqual({ x: 0, y: 0, edge: "bottom" });
  });

  it("sürüklenen kutuyu alan içinde tutar", () => {
    expect(path.clampBox(-20, 2000)).toEqual({ x: 0, y: 896 });
    expect(path.clampBox(500, 300)).toEqual({ x: 500, y: 300 });
  });
});
