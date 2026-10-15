import { describe, expect, it } from "vitest";
import { loadThemeList } from "./assets";
import { checkThemeUi } from "./themes";
import { applyUiTheme, uiVars } from "./ui-theme";

const themes = loadThemeList();
const byId = (id: string) => themes.find((t) => t.id === id);

describe("uygulama geneli tema (SPEC 09 K5)", () => {
  it("klasik ve bilinmeyen tema: değişken yok (tokens.css birebir)", () => {
    expect(uiVars(byId("classic"))).toEqual({});
    expect(uiVars(undefined)).toEqual({});
  });

  it("kontrastı geçen her tema: bar/buton/gölge/vurgu/zemin/metin; sabitler (--ink, --paper, --pink) hiç yazılmaz", () => {
    const applied = themes.filter((t) => t.id !== "classic" && checkThemeUi(t).length === 0);
    expect(applied.length).toBeGreaterThan(5);
    for (const t of applied) {
      const v = uiVars(t);
      expect(Object.keys(v), t.id).toEqual(expect.arrayContaining(["--main", "--light", "--shade", "--ice", "--cream", "--text"]));
      for (const fixed of ["--ink", "--paper", "--pink"]) expect(v[fixed], `${t.id} ${fixed}`).toBeUndefined();
    }
  });

  it("kontrastı geçmeyen tema UI'a uygulanmaz", () => {
    for (const t of themes.filter((x) => checkThemeUi(x).length > 0)) expect(uiVars(t), t.id).toEqual({});
  });

  it("koyu tema: ikincil metin de açık", () => {
    const dark = themes.filter((t) => uiVars(t)["color-scheme"] === "dark");
    expect(dark.length).toBeGreaterThan(0);
    for (const t of dark) {
      expect(uiVars(t)["--text-2"], t.id).toBe(uiVars(t)["--text"]);
      expect(uiVars(t)["--surface"], t.id).toBe(uiVars(t)["--cream"]);
    }
  });

  it("koyu UI işareti (UX-01): koyu temada data-ui-dark, klasikte yok", () => {
    const style = new Map<string, string>();
    const root = { dataset: {} as Record<string, string>, style: { setProperty: (k: string, v: string) => style.set(k, v), removeProperty: (k: string) => style.delete(k) } };
    applyUiTheme(root as unknown as HTMLElement, byId("midnight"));
    expect(root.dataset.uiDark).toBe("1");
    applyUiTheme(root as unknown as HTMLElement, byId("classic"));
    expect(root.dataset.uiDark).toBeUndefined();
  });
});

