// Dev önizleme (UP6): bir yüzeyin 4 kenar + 4 köşe konumunda yerleşimi. Uygulamanın kendi placePopover'ı, yüzey HTML'i,
// pet.css kuyrukları ve Player sprite'ı. Kesik çerçeve = çalışma alanı (görev çubuğu hariç); yüzey asla dışına taşmamalı.
import "@ui-kit/fonts.css";
import "@ui-kit/tokens.css";
import "@ui-kit/kit.css";
import "../styles/pet.css";
import sheetJson from "../../assets/dunno_sheet.json";
import sheetUrl from "../../assets/dunno_sheet.png";
import { STRINGS } from "../i18n";
import { facingForEdge, restStateFor } from "../pet/facing";
import { placePopover, type Box } from "../place/placement";
import { Player } from "../player/player";
import { parseSheet } from "../player/sheet";
import type { Lang } from "../settings";
import { askHtml, errorHtml, petToastHtml, setupHtml, speechHtml } from "../ui/surfaces";

const params = new URLSearchParams(location.search);
const lang = (params.get("lang") as Lang) ?? "en";
const surface = params.get("surface") ?? "ask";
const t = STRINGS[lang];
document.documentElement.lang = lang;

const W = 520;
const H = 340;
const PET = 64;

const html: Record<string, string> = {
  ask: askHtml(t, "polite", 2, 3, [{ who: "you", text: lang === "tr" ? "dünya düz mü" : "is the earth flat" }, { who: "dunno", text: lang === "tr" ? "salı." : "tuesday." }], true),
  error: errorHtml(t.limitTitle, t.limitFallback, t.ok),
  speech: speechHtml(lang === "tr" ? "bu dosyayı ben de anlamadım, merak etme" : "i don't get this file either, don't worry"),
  toast: petToastHtml(t.setupDunnoToast),
  setup: setupHtml(t, lang, "polite"),
};

const POSITIONS: [string, number, number][] = [
  ["top-left", 0, 0],
  ["top", (W - PET) / 2, 0],
  ["top-right", W - PET, 0],
  ["left", 0, (H - PET) / 2],
  ["right", W - PET, (H - PET) / 2],
  ["bottom-left", 0, H - PET],
  ["bottom", (W - PET) / 2, H - PET],
  ["bottom-right", W - PET, H - PET],
];

async function main(): Promise<void> {
  const sheet = parseSheet(sheetJson);
  const img = new Image();
  img.src = sheetUrl;
  await img.decode();
  const root = document.querySelector<HTMLElement>("#placement")!;
  root.innerHTML = `<h1>${surface} · ${lang} · work area ${W}x${H}</h1><div class="grid"></div>`;
  const grid = root.querySelector<HTMLElement>(".grid")!;
  for (const [name, px, py] of POSITIONS) {
    const fig = document.createElement("figure");
    fig.innerHTML = `<figcaption>${name}</figcaption><div class="wa"></div>`;
    grid.append(fig);
    const wa = fig.querySelector<HTMLElement>(".wa")!;

    const edge = name.includes("left") ? "left" : name.includes("right") ? "right" : name.startsWith("top") ? "top" : "bottom";
    const canvas = document.createElement("canvas");
    canvas.className = "pet";
    const player = new Player(canvas, sheet, img, () => 0);
    player.resize(2, 1);
    const state = restStateFor(edge);
    player.setState(state, { loop: true });
    player.setFacing(facingForEdge(state, edge, "right"));
    player.tick();
    canvas.style.left = `${px}px`;
    canvas.style.top = `${py}px`;
    wa.append(canvas);

    const pop = document.createElement("div");
    pop.className = "pet-pop";
    pop.innerHTML = html[surface];
    pop.style.left = "0px";
    pop.style.top = "0px";
    wa.append(pop);
    const pet: Box = { x: px, y: py, w: PET, h: PET };
    const p = placePopover(pet, { w: pop.offsetWidth, h: pop.offsetHeight }, { x: 0, y: 0, w: W, h: H });
    pop.style.left = `${p.x}px`;
    pop.style.top = `${p.y}px`;
    if (p.shrunk) {
      pop.style.width = `${p.w}px`;
      pop.style.height = `${p.h}px`;
      pop.classList.add("pet-pop--scroll");
    }
    if (p.tail) {
      pop.dataset.tail = p.tail.side;
      pop.style.setProperty("--tail", `${p.tail.offset}px`);
    }
    const inside = p.x >= 8 && p.y >= 8 && p.x + p.w <= W - 8 && p.y + p.h <= H - 8;
    fig.querySelector("figcaption")!.textContent = `${name} · tail ${p.tail?.side ?? "-"} · ${inside ? "fits" : "OVERFLOW"}${p.shrunk ? " · scroll" : ""}`;
  }
}

const style = document.createElement("style");
style.textContent = `
  body { margin: 0; background: var(--main); color: var(--ink); font-family: var(--font-body); }
  #placement { padding: 14px 18px; }
  h1 { margin: 0 0 10px; font: 600 15px var(--font-body); }
  .grid { display: grid; grid-template-columns: repeat(4, ${W}px); gap: 16px 18px; }
  figure { margin: 0; }
  figcaption { font-size: 12px; margin-bottom: 4px; }
  .wa { position: relative; width: ${W}px; height: ${H}px; background: var(--cream); outline: 2px dashed var(--ink-2); overflow: hidden; }
  .pet { position: absolute; image-rendering: pixelated; }
`;
document.head.append(style);
void main();
