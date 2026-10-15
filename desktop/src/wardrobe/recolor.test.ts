import { describe, expect, it } from "vitest";
import raw from "../../../content/wardrobe/themes.json";
import { CLASSIC, recolor, roleTable } from "./recolor";
import { loadThemes } from "./themes";

const px = (hex: string, a = 255) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), a];
const toHex = (p: ArrayLike<number>, i: number) =>
  `#${[p[i], p[i + 1], p[i + 2]].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase()}`;

const themes = loadThemes(raw).file!.themes;
const mint = themes.find((t) => t.id === "mint")!.colors;
const night = themes.find((t) => t.id === "night")!.colors;

const OUTLINE = "#2B1E2F";
const CHEEK = "#E86A7A";
const ICE = "#6EC5E9";

describe("recolor", () => {
  it("classic table matches the classic theme in themes.json", () => {
    expect(themes[0].colors).toEqual(CLASSIC);
    expect(roleTable(CLASSIC).size).toBe(0);
  });

  it("maps every role to the theme colour", () => {
    const input = [...px(CLASSIC.body), ...px(CLASSIC.shade), ...px(CLASSIC.light), ...px(CLASSIC.belly)];
    const out = recolor(input, night);
    expect([0, 4, 8, 12].map((i) => toHex(out, i))).toEqual([night.body, night.shade, night.light, night.belly]);
  });

  it("keeps outline/eyes, cheek, effects and transparent pixels as they are", () => {
    const input = [...px(OUTLINE), ...px(CHEEK), ...px(ICE), ...px(CLASSIC.body, 0)];
    const out = recolor(input, night);
    expect([...out]).toEqual(input);
  });

  it("leaves unknown colours alone and keeps alpha", () => {
    const input = [...px("#123456"), ...px(CLASSIC.body, 128)];
    const out = recolor(input, mint);
    expect(toHex(out, 0)).toBe("#123456");
    expect(toHex(out, 4)).toBe(mint.body);
    expect(out[7]).toBe(128);
  });

  it("an unchanged role (cream belly in mint) stays; input is not mutated", () => {
    const input = [...px(CLASSIC.belly)];
    const copy = [...input];
    expect(toHex(recolor(input, mint), 0)).toBe(CLASSIC.belly);
    expect(input).toEqual(copy);
  });

  it("works with a custom base table (a designer sheet drawn in other role colours)", () => {
    const base = { body: "#010203", shade: "#040506", light: "#070809", belly: "#0A0B0C" };
    const out = recolor([...px("#010203"), ...px(CLASSIC.body)], mint, base);
    expect(toHex(out, 0)).toBe(mint.body);
    expect(toHex(out, 4)).toBe(CLASSIC.body);
  });

  it("classic theme returns an identical copy", () => {
    const input = Uint8ClampedArray.from([...px(CLASSIC.body), ...px(OUTLINE)]);
    const out = recolor(input, CLASSIC);
    expect([...out]).toEqual([...input]);
    expect(out).not.toBe(input);
  });
});
