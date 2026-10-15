// İlk açılış: setup.exe penceresi (landing indirme penceresi). Dil seçilince metinler o dile geçer.
import { STRINGS } from "../i18n";
import type { Lang, Mode } from "../settings";
import { Bubble, type BubbleHost } from "./bubble";
import { petToastHtml, setupHtml, speechHtml } from "./surfaces";
import { typeInto } from "./typewriter";

export interface FirstRunChoice {
  lang: Lang;
  mode: Mode;
  /** [ bilmiyorum ] seçildi (yine de kurulur) */
  dunno: boolean;
}

export function runFirstRun(host: BubbleHost, initial: { lang: Lang; mode: Mode }): Promise<FirstRunChoice> {
  const bubble = new Bubble(host);
  let { lang, mode } = initial;
  return new Promise((resolve) => {
    const render = () => {
      document.documentElement.lang = lang; // Silkscreen Türkçe yedeği (tokens.css)
      bubble.setHtml(setupHtml(STRINGS[lang], lang, mode));
      bubble.el.querySelector<HTMLButtonElement>("[data-choice=yes]")?.focus();
    };
    bubble.el.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const seg = target.closest<HTMLButtonElement>(".seg");
      if (seg) {
        const group = seg.closest("[role=group]")?.getAttribute("aria-label");
        if (group === "lang") lang = seg.dataset.value as Lang;
        if (group === "mode") mode = seg.dataset.value as Mode;
        render();
        return;
      }
      // başlık çubuğu küçült/kapat da "bilmiyorum" sayılır (landing: yine de kurulur)
      const choice = target.closest("[data-ctl]") ? "dunno" : target.closest<HTMLButtonElement>("[data-choice]")?.dataset.choice;
      if (choice) {
        bubble.close();
        resolve({ lang, mode, dunno: choice === "dunno" });
      }
    });
    render();
  });
}

/** Kısa süreli tek satır: konuşma balonu (daktiloyla, SPEC 10 CL3; ms akış bitince başlar) ya da toast. */
export async function say(host: BubbleHost, text: string, ms = 3_000, kind: "speech" | "toast" = "speech"): Promise<void> {
  const bubble = new Bubble(host);
  bubble.setHtml(kind === "toast" ? petToastHtml(text) : speechHtml(text));
  if (kind === "speech") await typeInto(bubble.el, bubble.el.querySelector(".bubble-fill"), text).done;
  return new Promise((resolve) =>
    setTimeout(() => {
      bubble.close();
      resolve();
    }, ms),
  );
}
