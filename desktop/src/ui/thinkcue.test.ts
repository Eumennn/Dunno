import { describe, expect, it } from "vitest";
import { CUE_GAP, cueHtml, cuePosition } from "./thinkcue";

describe("pet üstü düşünme işareti (SPEC 07 FB6)", () => {
  it("türüne göre HTML: noktalar 3 kare, kum saati kit ikonu, kapalı boş", () => {
    expect(cueHtml("dots").match(/<i><\/i>/g)).toHaveLength(3);
    expect(cueHtml("hourglass")).toContain('class="hg-ico"');
    expect(cueHtml("off")).toBe("");
  });

  it("pet kutusunun ortasında, üst kenarın hemen üstünde; pencere dışına taşmaz", () => {
    expect(cuePosition({ x: 16, y: 20, w: 64 }, { w: 18, h: 8 })).toEqual({ x: 39, y: 20 - 8 - CUE_GAP });
    expect(cuePosition({ x: 16, y: 4, w: 64 }, { w: 18, h: 8 }).y).toBe(0);
  });
});
