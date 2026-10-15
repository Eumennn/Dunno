// Renk temaları (SPEC 05 W1): content/wardrobe/themes.json yükleyici + doğrulayıcı (saf, DOM/Tauri yok).
// Render'a dokunmaz: sprite palet değişimi desktop tarafında bu doğrulanmış renklerle yapılır.
// Kontur ve yanak sabittir (karakter tanınır kalsın); her tema gölge < gövde < ışık açıklık sırasını korur.

export type Role = "body" | "shade" | "light" | "belly";
export const ROLES: readonly Role[] = ["body", "shade", "light", "belly"];

export interface Theme {
  id: string;
  name: { tr: string; en: string };
  /** approved: tasarımcı onaylı · candidate: ekip önerisi, onay bekliyor */
  status: "approved" | "candidate";
  colors: Record<Role, string>;
  /**
   * SPEC 09 K5 uygulama teması: UI rollerinin bu temaya özel değerleri. Verilmeyen rol sprite renginden türer
   * (bar = gövde, button = ışık, buttonShade = gölge, bg = yüz-karın), accent varsayılan --ice, text --ink. dark: koyu UI.
   */
  ui?: Partial<Record<UiRole, string>> & { dark?: boolean };
}

export interface ThemeFile {
  fixed: { outline: string; cheek: string };
  themes: Theme[];
}

/**
 * Kontrast eşikleri (WCAG 2 kontrast oranı, göreli parlaklıktan). Klasik (onaylı) tema hepsini geçer.
 * - gövde/kontur 3:1: WCAG grafik nesne eşiği, kontur gövdeden ayrılır
 * - gölge/kontur 2.2: gölge konturun hemen yanında; kontur yine okunur
 * - ışık/kontur ve yüz-karın/kontur 4.5: göz ve ağız (kontur rengi) yüzde/açık alanda net
 * - yanak/gövde 1.2, yanak/yüz-karın 2: pembe yanak gövdede kaybolmaz
 * - basamak 1.25: gölge -> gövde -> ışık arası fark seçilir
 */
export const THRESHOLDS = {
  bodyOutline: 3,
  shadeOutline: 2.2,
  lightOutline: 4.5,
  bellyOutline: 4.5,
  cheekBody: 1.2,
  cheekBelly: 2,
  step: 1.25,
} as const;

const HEX = /^#[0-9A-Fa-f]{6}$/;
const ID = /^[a-z][a-z0-9_]*$/;

/** WCAG göreli parlaklık (sRGB). */
export function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG kontrast oranı (1-21), sıra fark etmez. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Bir temanın sorunları (boşsa geçerli). */
export function checkTheme(t: Theme, fixed: ThemeFile["fixed"]): string[] {
  const out: string[] = [];
  for (const r of ROLES) if (!HEX.test(t.colors?.[r] ?? "")) out.push(`${t.id}: ${r} is not #rrggbb`);
  if (out.length) return out;
  const c = t.colors;
  const need = (label: string, value: number, min: number) => {
    if (value < min) out.push(`${t.id}: ${label} contrast ${value.toFixed(2)} < ${min}`);
  };
  if (!(luminance(c.shade) < luminance(c.body) && luminance(c.body) < luminance(c.light))) {
    out.push(`${t.id}: lightness must be shade < body < light`);
  }
  need("shade->body step", contrast(c.shade, c.body), THRESHOLDS.step);
  need("body->light step", contrast(c.body, c.light), THRESHOLDS.step);
  need("body/outline", contrast(c.body, fixed.outline), THRESHOLDS.bodyOutline);
  need("shade/outline", contrast(c.shade, fixed.outline), THRESHOLDS.shadeOutline);
  need("light/outline", contrast(c.light, fixed.outline), THRESHOLDS.lightOutline);
  need("belly/outline", contrast(c.belly, fixed.outline), THRESHOLDS.bellyOutline);
  need("cheek/body", contrast(fixed.cheek, c.body), THRESHOLDS.cheekBody);
  need("cheek/belly", contrast(fixed.cheek, c.belly), THRESHOLDS.cheekBelly);
  return out;
}

/** themes.json'u ayrıştırır ve doğrular; bozuk tema listeye girmez, sorunu `errors`'a yazılır. */
export function loadThemes(raw: unknown): { file: ThemeFile | null; errors: string[]; uiErrors: string[] } {
  const errors: string[] = [];
  const r = raw as Partial<ThemeFile> | null;
  const fixed = r?.fixed;
  if (!fixed || !HEX.test(fixed.outline ?? "") || !HEX.test(fixed.cheek ?? "")) {
    return { file: null, errors: ["fixed.outline and fixed.cheek must be #rrggbb"], uiErrors: [] };
  }
  if (!Array.isArray(r?.themes)) return { file: null, errors: ["themes must be an array"], uiErrors: [] };
  const seen = new Set<string>();
  const themes: Theme[] = [];
  for (const t of r.themes as Theme[]) {
    const id = typeof t?.id === "string" ? t.id : "?";
    const problems: string[] = [];
    if (!ID.test(id)) problems.push(`${id}: id must be snake_case`);
    else if (seen.has(id)) problems.push(`${id}: duplicate id`);
    if (typeof t?.name?.tr !== "string" || typeof t?.name?.en !== "string") problems.push(`${id}: name.tr and name.en required`);
    if (t?.status !== "approved" && t?.status !== "candidate") problems.push(`${id}: status must be approved or candidate`);
    if (!problems.length) problems.push(...checkTheme(t, fixed));
    seen.add(id);
    if (problems.length) errors.push(...problems);
    else themes.push(t);
  }
  // UI sorunu temayı düşürmez (sprite yine boyanır); uiForTheme null döner, UI klasikte kalır
  const uiErrors = themes.flatMap((t) => checkThemeUi(t));
  return { file: { fixed, themes }, errors, uiErrors };
}

// ---------------------------------------------------------------- SPEC 09 K5: uygulama geneli tema (UI rolleri)

/** bar: başlık çubuğu (--main) · button: buton (--light) · buttonShade: buton gölgesi (--shade) · accent: vurgu (--ice) · bg: zemin (--cream) · text: metin */
export type UiRole = "bar" | "button" | "buttonShade" | "accent" | "bg" | "text";
export const UI_ROLES: readonly UiRole[] = ["bar", "button", "buttonShade", "accent", "bg", "text"];

export interface UiColors extends Record<UiRole, string> {
  dark: boolean;
}

/** Bugünkü ui-kit değerleri (tokens.css): klasik tema UI'ı bunlarla birebir aynı (test). */
export const UI_DEFAULT = { accent: "#6EC5E9", text: "#2B1E2F" } as const;
/** metin / zemin, metin / başlık çubuğu, metin / buton, metin / vurgu (WCAG AA normal metin) */
export const UI_MIN_CONTRAST = 4.5;

/** Temanın UI rolleri: verilen override'lar, yoksa sprite renginden türetme. */
export function themeUi(t: Theme): UiColors {
  const o = t.ui ?? {};
  return {
    bar: o.bar ?? t.colors.body,
    button: o.button ?? t.colors.light,
    buttonShade: o.buttonShade ?? t.colors.shade,
    accent: o.accent ?? UI_DEFAULT.accent,
    bg: o.bg ?? t.colors.belly,
    text: o.text ?? UI_DEFAULT.text,
    dark: o.dark === true,
  };
}

/** UI sorunları (boşsa tema uygulama geneline uygulanabilir). Sabitler (kontur, balon beyazı, hata pembesi) dokunulmaz. */
export function checkThemeUi(t: Theme): string[] {
  const out: string[] = [];
  const u = themeUi(t);
  for (const r of UI_ROLES) if (!HEX.test(u[r])) out.push(`${t.id}: ui.${r} is not #rrggbb`);
  if (out.length) return out;
  for (const r of ["bg", "bar", "button", "accent"] as const) {
    const v = contrast(u.text, u[r]);
    if (v < UI_MIN_CONTRAST) out.push(`${t.id}: ui text/${r} contrast ${v.toFixed(2)} < ${UI_MIN_CONTRAST}`);
  }
  // koyu tema: metin zeminden açık olmalı; açık tema: koyu
  if (u.dark !== luminance(u.text) > luminance(u.bg)) out.push(`${t.id}: ui.dark does not match text/bg lightness`);
  return out;
}

/** Kontrastı geçen temanın UI renkleri; geçmezse null (UI klasikte kalır, sprite yine boyanır). */
export function uiForTheme(t: Theme): UiColors | null {
  return checkThemeUi(t).length ? null : themeUi(t);
}

/**
 * ui-kit CSS değişkenleri (desktop: document.documentElement.style üstüne yazar). --ink (kontur), --paper (balon), --pink (hata)
 * sabit kalır; --text metin rengi (ui-kit'te metin --ink yerine --text kullanmalı; açık temalarda ikisi aynı).
 */
export function uiTokens(u: UiColors): Record<string, string> {
  return {
    "--main": u.bar,
    "--light": u.button,
    "--shade": u.buttonShade,
    "--ice": u.accent,
    "--cream": u.bg,
    "--text": u.text,
    "color-scheme": u.dark ? "dark" : "light",
  };
}
