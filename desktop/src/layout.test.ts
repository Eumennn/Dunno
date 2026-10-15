import { describe, expect, it } from "vitest";
import { hitRectOf, petRect } from "./layout";

describe("petRect", () => {
  it("pet'i yatayda ortalar ve alta oturtur", () => {
    expect(petRect(240, 240, 144, 144)).toEqual({ x: 48, y: 96, w: 144, h: 144 });
  });

  it("kesirli kutuda x tam sayı kalır", () => {
    expect(Number.isInteger(petRect(240, 240, 153.6, 153.6).x)).toBe(true);
  });
});

describe("hitRectOf", () => {
  it("çizilen kutuyu dışa yuvarlar", () => {
    expect(hitRectOf({ left: 43.2, top: 86.4, right: 196.8, bottom: 240 })).toEqual({
      x: 43,
      y: 86,
      w: 154,
      h: 154,
    });
  });
});

