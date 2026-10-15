// Dev önizleme (SPEC 09 K5): seçili tema uygulama genelinde. Sol: dunno.exe home (gerçek app.html, ?theme=), sağ: pet
// penceresi yüzeyleri (ask.exe soru + cevap, toast, konuşma balonu) aynı token yolu (applyUiTheme) ile. ?theme=<id>, ?lang=tr|en.
import "@ui-kit/fonts.css";
import "@ui-kit/tokens.css";
import "@ui-kit/kit.css";
import "../styles/pet.css";
import { STRINGS } from "../i18n";
import type { Lang } from "../lines/types";
import { askHtml, petToastHtml, speechHtml } from "../ui/surfaces";
import { loadThemeList } from "../wardrobe/assets";
import { checkThemeUi } from "../wardrobe/themes";
import { applyUiTheme } from "../wardrobe/ui-theme";

const params = new URLSearchParams(location.search);
const lang = (params.get("lang") as Lang) ?? "tr";
const id = params.get("theme") ?? "classic";
const t = STRINGS[lang];
const theme = loadThemeList().find((x) => x.id === id);
applyUiTheme(document.documentElement, theme);

const problems = theme ? checkThemeUi(theme) : ["bilinmeyen tema"];
const root = document.querySelector<HTMLElement>("#themeui")!;
const q = lang === "tr" ? "fransanın başkenti neresi" : "capital of france";
const a = lang === "tr" ? "salı." : "tuesday.";
root.innerHTML = `
  <h2>${theme?.name[lang] ?? id} · ${id}${problems.length ? ` · UI uygulanmadı: ${problems.join("; ")}` : ""}</h2>
  <div class="cols">
    <iframe src="app.html?tab=home&lang=${lang}&theme=${id}" width="900" height="620" title="dunno.exe"></iframe>
    <div class="side">
      <div class="pet-pop" style="position:relative">${askHtml(t, "polite", 2, 3, [{ who: "you", text: q }, { who: "dunno", text: a }], false)}</div>
      <div class="pet-pop" style="position:relative">${petToastHtml(t.setupDunnoToast)}</div>
      <div class="pet-pop" data-tail="bottom" style="position:relative;--tail:40px">${speechHtml(lang === "tr" ? "bu dosyayı ben de anlamadım" : "i don't get this file either")}</div>
    </div>
  </div>`;

const style = document.createElement("style");
style.textContent = `
  body { margin: 0; padding: 16px; background: var(--cream); color: var(--text); font-family: var(--font-body); }
  h2 { margin: 0 0 10px; font-size: 14px; }
  .cols { display: flex; gap: 20px; align-items: flex-start; }
  iframe { border: 0; width: 900px; height: 620px; transform: scale(0.6); transform-origin: 0 0; margin: 0 -360px -248px 0; }
  .side { display: flex; flex-direction: column; gap: 22px; }
`;
document.head.append(style);
