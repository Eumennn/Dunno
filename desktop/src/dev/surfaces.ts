// Dev önizleme: pet penceresindeki yüzeyler, uygulamanın kendi üreticileri ve CSS'iyle.
import "@ui-kit/fonts.css";
import "@ui-kit/tokens.css";
import "@ui-kit/kit.css";
import "../styles/pet.css";
import { STRINGS } from "../i18n";
import type { Lang } from "../settings";
import { askHtml, askWaitHtml, errorHtml, petToastHtml, setupHtml, speechHtml } from "../ui/surfaces";

const lang = (new URLSearchParams(location.search).get("lang") as Lang) ?? "en";
const t = STRINGS[lang];
document.documentElement.lang = lang;

const q = lang === "tr" ? "dünya düz mü" : "is the earth flat";
// SPEC 06 Q3 üst sınırı ~120 karakter (örnek, uydurma değil: placeholder)
const honest =
  lang === "tr"
    ? "paris. hep paristi, sen sorana kadar da öyle kalacaktı. bunu bilmeyen ben miyim sen mi, emin değilim artık açıkçası"
    : "paris. it has been paris for a while and will stay paris after you close this. who taught you geography, honestly";
const cells: [string, string][] = [
  ["setup.exe", setupHtml(t, lang, "polite")],
  ["ask.exe (input)", askHtml(t, "street", 3, 3, [], true)],
  ["ask.exe (thinking)", askHtml(t, "polite", 2, 3, [{ who: "you", text: lang === "tr" ? "dünya düz mü" : "is the earth flat" }, { who: "think" }], false)],
  ["ask.exe (answer)", askHtml(t, "polite", 2, 3, [{ who: "you", text: lang === "tr" ? "dünya düz mü" : "is the earth flat" }, { who: "dunno", text: lang === "tr" ? "salı." : "tuesday." }], false)],
  ["ask.exe (thinking, verb)", askHtml(t, "polite", 2, 3, [{ who: "you", text: q }, { who: "think", verb: t.thinkingVerbs[2] }], false)],
  ["ask.exe (doze)", askHtml(t, "polite", 2, 3, [{ who: "you", text: q }, { who: "dunno", text: t.dozeAsleep }, { who: "think", verb: t.thinkingVerbs[3] }], false)],
  ["ask.exe (doze answer)", askHtml(t, "polite", 2, 3, [{ who: "you", text: q }, { who: "dunno", text: t.dozeAsleep }, { who: "dunno", text: t.dozeWake + (lang === "tr" ? "salı." : "tuesday.") }], false)],
  ["ask.exe (cooldown)", askWaitHtml(t, 1, 3, 14)],
  ["ask.exe (too fast)", askHtml(t, "polite", 0, 3, [{ who: "you", text: q }, { who: "dunno", text: t.tooFastFallback }], false)],
  ["ask.exe (honest, wide)", askHtml(t, "polite", 1, 3, [{ who: "you", text: lang === "tr" ? "fransanın başkenti neresi" : "capital of france" }, { who: "dunno", text: honest }], false, true)],
  ["ask.exe (brain off)", askHtml(t, "polite", 3, 3, [{ who: "you", text: q }, { who: "dunno", text: lang === "tr" ? "salı." : "tuesday." }, { who: "dunno", text: t.brainOffFallback }], false)],
  ["error.exe (limit)", errorHtml(t.limitTitle, t.limitFallback, t.ok)],
  ["error.exe (bugün sus)", errorHtml(t.mutedTitle, t.mutedBody, t.ok)],
  ["speech", speechHtml(lang === "tr" ? "bu dosyayı ben de anlamadım" : "i don't get this file either")],
  ["toast", petToastHtml(t.setupDunnoToast)],
];

const root = document.querySelector<HTMLElement>("#surfaces")!;
// ?only=<ad> tek yüzey (ui-shots/ask-*.png tek tek)
const only = new URLSearchParams(location.search).get("only");
root.innerHTML = cells
  .filter(([name]) => only === null || name === only)
  .map(([name, html]) => `<figure${html.includes("pet-ask--wide") ? ' class="wide"' : ""}><figcaption>${name}</figcaption><div class="pet-pop" style="position:relative;--tail-x:40px">${html}</div></figure>`)
  .join("");

const style = document.createElement("style");
style.textContent = `
  body { margin: 0; background: var(--main); font-family: var(--font-body); }
  #surfaces { display: grid; grid-template-columns: repeat(4, 260px); gap: 24px 20px; padding: 20px; align-items: start; }
  figure { margin: 0; }
  figure.wide { grid-column: span 2; }
  figcaption { font-size: 12px; margin-bottom: 6px; color: var(--ink); }
`;
document.head.append(style);
