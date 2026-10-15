import { describe, expect, it } from "vitest";
import { CHUTE_MAP, chutePosition, chuteSvg, HEAD_ROW } from "./parachute";

describe("mini paraşüt", () => {
  it("harita düzgün ve sadece palet harfleri; SVG'de hex yok", () => {
    expect(new Set(CHUTE_MAP.map((r) => r.length)).size).toBe(1);
    expect(CHUTE_MAP.join("").replace(/[.KPC]/g, "")).toBe("");
    expect(chuteSvg()).not.toMatch(/#[0-9a-f]{3,6}/i);
    expect(chuteSvg()).toContain('fill="var(--ink)"');
  });

  it("pet'e ortalı, ip uçları kafa tepesinde; pencere üst boşluğuna (10 sprite px) sığar", () => {
    const px = 3;
    const p = chutePosition({ x: 24, y: 30, w: 96 }, px);
    expect(p.x + (CHUTE_MAP[0].length * px) / 2).toBe(24 + 48);
    expect(p.y + CHUTE_MAP.length * px).toBe(30 + HEAD_ROW * px);
    expect(CHUTE_MAP.length - HEAD_ROW).toBeLessThanOrEqual(10);
  });
});
