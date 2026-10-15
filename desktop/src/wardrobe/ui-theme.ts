// Uygulama geneli tema (SPEC 09 K5): seçili tema dunno.exe ve pet penceresindeki tüm yüzeylerin ui-kit token'larını boyar.
// Renk kararları themes.ts'te (uiForTheme: kontrastı geçmeyen tema UI'a uygulanmaz, sprite yine boyanır); burası sadece uygular.
// Sabitler dokunulmaz: --ink (kontur, gölge), --paper (balon, input), --pink (error.exe). Klasik = token varsayılanları.
import { uiForTheme, uiTokens, type Theme } from "./themes";

/** Temanın CSS değişkenleri; klasik, bilinmeyen ya da kontrastı geçmeyen temada boş (tokens.css varsayılanları). */
export function uiVars(theme: Theme | undefined): Record<string, string> {
  if (!theme || theme.id === "classic") return {};
  const u = uiForTheme(theme);
  if (!u) return {};
  const vars = uiTokens(u);
  // koyu temada ikincil metin de açık olmalı (--ink-2 koyu zeminde okunmaz); içerik zemini de beyaz kalmaz
  if (u.dark) {
    vars["--text-2"] = u.text;
    vars["--surface"] = u.bg;
  }
  return vars;
}

/**
 * SPEC 17 karanlık mod: tokens.css [data-dark] koyu zemin/metin/kontur token'ları. Tema rengi başlık çubuğu, buton ve vurguda kalır;
 * zemin ve metin (tema varsa bile) koyu moda bırakılır (applyUiTheme koyu modda o değişkenleri yazmaz).
 */
export function applyDarkMode(root: HTMLElement, on: boolean): void {
  if (on) root.dataset.dark = "1";
  else delete root.dataset.dark;
  // tema değişkenlerini koyu moda göre yeniden yaz
  const t = (root as HTMLElement & { __dunnoTheme?: Theme }).__dunnoTheme;
  applyUiTheme(root, t);
}

/** Root elemana uygular; önceki temanın değişkenleri temizlenir. */
export function applyUiTheme(root: HTMLElement, theme: Theme | undefined): void {
  const prev = (root.dataset.uiVars ?? "").split(",").filter(Boolean);
  for (const k of prev) root.style.removeProperty(k);
  (root as HTMLElement & { __dunnoTheme?: Theme }).__dunnoTheme = theme;
  const vars = uiVars(theme);
  // karanlık mod: zemin, metin ve renk şeması koyu moddan (tokens.css [data-dark]); tema sadece çubuk/buton/vurgu
  if (root.dataset.dark) for (const k of ["--cream", "--surface", "--text", "--text-2", "color-scheme"]) delete vars[k];
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.dataset.uiVars = Object.keys(vars).join(",");
  root.dataset.uiTheme = Object.keys(vars).length ? theme!.id : "classic";
  // koyu UI (UX-01): --ink kenarlar koyu zeminde kaybolur; app.css [data-ui-dark] kenarları --text'e çeker. Klasik etkilenmez.
  if (vars["color-scheme"] === "dark") root.dataset.uiDark = "1";
  else delete root.dataset.uiDark;
}
