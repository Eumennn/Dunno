import { describe, expect, it } from "vitest";
import { zoomFor } from "./zoom";

describe("dunno.exe yakınlaştırma (FB10-2)", () => {
  it("varsayılan ve küçük pencerede 1", () => {
    expect(zoomFor(900, 620)).toBe(1);
    expect(zoomFor(720, 580)).toBe(1);
    expect(zoomFor(1280, 672)).toBe(1); // 1920 ekran %150 ölçek, ekranı kaplayınca
  });
  it("ekranı kaplayınca küçük kenara göre büyür, 2'yi geçmez", () => {
    expect(zoomFor(1920, 1009)).toBe(1.4);
    expect(zoomFor(1920, 1080)).toBe(1.5); // tam ekran
    expect(zoomFor(2560, 1369)).toBe(1.9);
    expect(zoomFor(3840, 2160)).toBe(2);
    expect(zoomFor(3000, 700)).toBe(1); // geniş ama alçak: büyümez
  });
  it("bozuk girdi", () => {
    expect(zoomFor(0, 0)).toBe(1);
    expect(zoomFor(Number.NaN, 800)).toBe(1);
  });
});
