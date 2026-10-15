// SPEC 09 K5: uygulama geneli tema (UI rolleri) + UI kontrastı.
import { describe, expect, it } from "vitest";
import raw from "../../../content/wardrobe/themes.json";
import { checkThemeUi, contrast, loadThemes, themeUi, UI_MIN_CONTRAST, uiForTheme, uiTokens, type Theme } from "./themes";

const { file, errors, uiErrors } = loadThemes(raw);
const themes = file!.themes;

describe("app-wide themes", () => {
  it("at least 14 themes; every one passes the sprite and UI checks", () => {
    expect(errors).toEqual([]);
    expect(uiErrors).toEqual([]);
    expect(themes.length).toBeGreaterThanOrEqual(14);
    for (const t of themes) expect(uiForTheme(t), t.id).not.toBeNull();
  });

  // tema -> metin/zemin, metin/başlık, metin/buton, metin/vurgu hepsi >= 4.5
  for (const t of (raw as { themes: Theme[] }).themes) {
    it(`${t.id}: text contrast on background, title bar, button, accent >= ${UI_MIN_CONTRAST}`, () => {
      const u = themeUi(t);
      for (const r of ["bg", "bar", "button", "accent"] as const) {
        expect(contrast(u.text, u[r]), `${t.id} text/${r}`).toBeGreaterThanOrEqual(UI_MIN_CONTRAST);
      }
    });
  }

  it("midnight is the dark UI: light text on dark surfaces", () => {
    const m = uiForTheme(themes.find((t) => t.id === "midnight")!)!;
    expect(m.dark).toBe(true);
    expect(contrast(m.text, "#FFFFFF")).toBeLessThan(1.2); // açık metin
    expect(uiTokens(m)).toMatchObject({ "--text": m.text, "--cream": m.bg, "color-scheme": "dark" });
    expect(themes.filter((t) => themeUi(t).dark).map((t) => t.id)).toEqual(["midnight"]);
  });

  it("overrides exist only where the derived color fails (night, burnt toast title bars)", () => {
    for (const id of ["night", "burnt_toast"]) {
      const t = themes.find((x) => x.id === id)!;
      const derived = { ...t, ui: { ...t.ui, bar: undefined } } as Theme;
      expect(checkThemeUi(derived).some((p) => p.includes("text/bar")), id).toBe(true);
    }
  });

  it("tokens cover the five UI roles + text; fixed colors are never overridden", () => {
    const tok = uiTokens(themeUi(themes[1]));
    expect(Object.keys(tok).sort()).toEqual(["--cream", "--ice", "--light", "--main", "--shade", "--text", "color-scheme"]);
    for (const fixed of ["--ink", "--paper", "--pink"]) expect(tok).not.toHaveProperty(fixed);
  });

  it("a theme whose UI fails keeps its sprite colors but its UI is not applied", () => {
    const bad = { ...themes[0], id: "bad_ui", ui: { bar: "#3A3A3A" } } as Theme;
    expect(checkThemeUi(bad)).toEqual([expect.stringContaining("bad_ui: ui text/bar contrast")]);
    expect(uiForTheme(bad)).toBeNull();
    const r = loadThemes({ ...raw, themes: [...(raw as { themes: Theme[] }).themes, bad] });
    expect(r.file!.themes.map((t) => t.id)).toContain("bad_ui");
    expect(r.uiErrors).toHaveLength(1);
    expect(checkThemeUi({ ...bad, ui: { accent: "blue" } })).toEqual(["bad_ui: ui.accent is not #rrggbb"]);
    expect(checkThemeUi({ ...themes[0], id: "x", ui: { dark: true } })).toEqual(["x: ui.dark does not match text/bg lightness"]);
  });
});
