import { describe, expect, it } from "vitest";
import raw from "../../../content/wardrobe/themes.json";
import { contrast, loadThemes, luminance, THRESHOLDS, type Theme } from "./themes";

const OUTLINE = "#2B1E2F";
const CHEEK = "#E86A7A";

describe("wcag helpers", () => {
  it("luminance and contrast match the WCAG reference values", () => {
    expect(luminance("#000000")).toBe(0);
    expect(luminance("#FFFFFF")).toBeCloseTo(1, 10);
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21, 10);
    expect(contrast("#FFFFFF", "#FFFFFF")).toBe(1);
    expect(contrast("#777777", "#FFFFFF")).toBeCloseTo(4.48, 2);
  });
});

describe("content/wardrobe/themes.json", () => {
  const { file, errors } = loadThemes(raw);

  it("has the 5 SPEC 05 themes + 11 SPEC 09 K5 themes (>= 14), all valid", () => {
    expect(errors).toEqual([]);
    expect(file!.themes.map((t) => t.id)).toEqual([
      "classic",
      "mint",
      "lavender",
      "night",
      "burnt_toast",
      "strawberry",
      "lemon",
      "ocean",
      "forest",
      "peach",
      "gray_cat",
      "coffee",
      "midnight",
      "retro_green",
      "cotton_candy",
      "watermelon",
    ]);
  });

  it("keeps outline and cheek fixed", () => {
    expect(file!.fixed).toEqual({ outline: OUTLINE, cheek: CHEEK });
  });

  it("classic is the approved landing palette, the rest are candidates", () => {
    const classic = file!.themes[0];
    expect(classic.status).toBe("approved");
    expect(classic.colors).toEqual({ body: "#F2A65A", shade: "#D9774A", light: "#FFD29A", belly: "#FFF1D6" });
    expect(file!.themes.slice(1).every((t) => t.status === "candidate")).toBe(true);
  });

  it("SPEC 05 themes keep the cream belly except night (spec table)", () => {
    for (const t of file!.themes.slice(0, 5)) {
      if (t.id === "night") expect(t.colors.belly).not.toBe("#FFF1D6");
      else expect(t.colors.belly).toBe("#FFF1D6");
    }
  });

  it("names are lowercase in both languages", () => {
    for (const t of file!.themes) {
      expect(t.name.tr).toBe(t.name.tr.toLocaleLowerCase("tr"));
      expect(t.name.en).toBe(t.name.en.toLowerCase());
    }
  });

  it("every theme keeps shade < body < light and clears every contrast threshold", () => {
    for (const t of file!.themes) {
      const c = t.colors;
      expect(luminance(c.shade)).toBeLessThan(luminance(c.body));
      expect(luminance(c.body)).toBeLessThan(luminance(c.light));
      expect(contrast(c.body, OUTLINE)).toBeGreaterThanOrEqual(THRESHOLDS.bodyOutline);
      expect(contrast(c.shade, OUTLINE)).toBeGreaterThanOrEqual(THRESHOLDS.shadeOutline);
      expect(contrast(c.light, OUTLINE)).toBeGreaterThanOrEqual(THRESHOLDS.lightOutline);
      expect(contrast(c.belly, OUTLINE)).toBeGreaterThanOrEqual(THRESHOLDS.bellyOutline);
      expect(contrast(CHEEK, c.body)).toBeGreaterThanOrEqual(THRESHOLDS.cheekBody);
    }
  });
});

describe("validator rejects bad themes", () => {
  const ok: Theme = {
    id: "test",
    name: { tr: "deneme", en: "test" },
    status: "candidate",
    colors: { body: "#F2A65A", shade: "#D9774A", light: "#FFD29A", belly: "#FFF1D6" },
  };
  const file = (themes: unknown[]) => ({ fixed: { outline: OUTLINE, cheek: CHEEK }, themes });
  const errs = (t: Omit<Partial<Theme>, "colors"> & { colors?: Partial<Theme["colors"]> }) =>
    loadThemes(file([{ ...ok, ...t, colors: { ...ok.colors, ...t.colors } }])).errors.join(" | ");

  it("wrong lightness order", () => {
    expect(errs({ colors: { shade: "#FFD29A", light: "#D9774A" } })).toContain("shade < body < light");
  });

  it("too dark against the outline", () => {
    expect(errs({ colors: { body: "#3A2E40", shade: "#30243A", light: "#FFD29A" } })).toContain("body/outline");
  });

  it("cheek lost on the body", () => {
    expect(errs({ colors: { body: "#E86A7A", shade: "#B04A5A", light: "#FFC0C8" } })).toContain("cheek/body");
  });

  it("not hex, bad id, duplicate id, missing name/status", () => {
    expect(errs({ colors: { body: "orange" } })).toContain("body is not #rrggbb");
    expect(loadThemes(file([{ ...ok, id: "Bad Id" }])).errors[0]).toContain("snake_case");
    expect(loadThemes(file([ok, ok])).errors).toEqual(["test: duplicate id"]);
    expect(loadThemes(file([{ ...ok, name: { tr: "x" } }])).errors[0]).toContain("name.tr and name.en");
    expect(loadThemes(file([{ ...ok, status: "maybe" }])).errors[0]).toContain("status");
  });

  it("broken file", () => {
    expect(loadThemes(null)).toEqual({ file: null, errors: ["fixed.outline and fixed.cheek must be #rrggbb"], uiErrors: [] });
    expect(loadThemes({ fixed: { outline: OUTLINE, cheek: CHEEK } }).errors).toEqual(["themes must be an array"]);
  });

  it("a bad theme is dropped, good ones stay", () => {
    const r = loadThemes(file([ok, { ...ok, id: "dark", colors: { ...ok.colors, body: "#30243A" } }]));
    expect(r.file!.themes.map((t) => t.id)).toEqual(["test"]);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});
