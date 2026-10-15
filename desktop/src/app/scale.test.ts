import { describe, expect, it } from "vitest";
import { petScaleFor } from "./scale";

describe("dunno.exe Dunno ölçeği (SPEC 07 FB3/FB3b)", () => {
  it("genişlik ve yükseklikten küçük olanı: tam sayı ölçek", () => {
    expect(petScaleFor(900, 620)).toBe(5);
    expect(petScaleFor(1600, 900)).toBe(7); // geniş ama yükseklik 9x'e yetmez
    expect(petScaleFor(1920, 1040)).toBe(9);
    expect(petScaleFor(2560, 700)).toBe(5); // alçak pencere
    expect(petScaleFor(1000, 1400)).toBe(5); // dar pencere
  });
});
