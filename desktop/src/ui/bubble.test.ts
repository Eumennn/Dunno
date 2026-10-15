import { describe, expect, it } from "vitest";
import { bubbleLeft } from "./bubble";

describe("bubbleLeft", () => {
  it("pet'e ortalar", () => {
    expect(bubbleLeft(130, 200, 0, 260)).toBe(30);
  });
  it("pencereden taşmaz", () => {
    expect(bubbleLeft(20, 200, 0, 260)).toBe(4);
    expect(bubbleLeft(250, 200, 0, 260)).toBe(56);
  });
  it("pencereden geniş balonu sola yaslar", () => {
    expect(bubbleLeft(130, 300, 0, 260)).toBe(4);
  });
  it("pencere sağda ekran dışına taşıyorsa görünen kısma sığar", () => {
    // pencerenin sağdaki 58 px'i ekran dışında: görünen [0, 202)
    expect(bubbleLeft(130, 160, 0, 202)).toBe(38);
  });
  it("pencere solda ekran dışına taşıyorsa görünen kısma sığar", () => {
    expect(bubbleLeft(130, 160, 58, 260)).toBe(62);
  });
});
