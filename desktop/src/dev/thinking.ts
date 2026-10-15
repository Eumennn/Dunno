// Dev önizleme (SPEC 07 FB6): pet penceresi soru düşünürken. Üstte ask.exe (kesik çizgili düşünme balonu), altta pet (idle),
// başının üstünde GERÇEK ThinkCueView. ?cue=dots|hourglass, ?lang=tr|en. Headless: ui-shots/fb6-thinking-*.png.
import "@ui-kit/fonts.css";
import "@ui-kit/tokens.css";
import "@ui-kit/kit.css";
import "../styles/app.css";
import "../styles/pet.css";
import sheetJson from "../../assets/dunno_sheet.json";
import sheetUrl from "../../assets/dunno_sheet.png";
import { STRINGS } from "../i18n";
import { DEFAULT_SIZE, sizeScale } from "../size/size";
import type { Lang } from "../lines/types";
import { Player } from "../player/player";
import { parseSheet } from "../player/sheet";
import type { Cue } from "../talk/thinkcue";
import { askHtml } from "../ui/surfaces";
import { ThinkCueView } from "../ui/thinkcue";

const params = new URLSearchParams(location.search);
const lang = (params.get("lang") as Lang) ?? "tr";
const cue = (params.get("cue") as Cue) ?? "dots";
const t = STRINGS[lang];

async function main(): Promise<void> {
  const root = document.querySelector<HTMLElement>("#scene")!;
  const q = lang === "tr" ? "dünya düz mü" : "is the earth flat";
  const verb = cue === "hourglass" ? t.thinkingVerbs[1] : t.thinkingVerbs[0];
  root.innerHTML = `<div class="pet-pop" style="position:relative">${askHtml(t, "polite", 3, 3, [{ who: "you", text: q }, { who: "think", verb }], false)}</div>`;
  const canvas = document.createElement("canvas");
  canvas.className = "dev-pet";
  root.append(canvas);
  const img = new Image();
  img.src = sheetUrl;
  await img.decode();
  const player = new Player(canvas, parseSheet(sheetJson), img, () => 0);
  const size = player.resize(sizeScale(DEFAULT_SIZE), 1);
  canvas.style.width = `${size.w}px`;
  canvas.style.height = `${size.h}px`;
  player.setState("idle", { loop: true });
  player.tick();
  new ThinkCueView(canvas).set(cue);
}

const style = document.createElement("style");
style.textContent = `
  body { margin: 0; padding: 16px; background: var(--main); }
  #scene { display: flex; flex-direction: column; align-items: center; gap: 22px; width: 280px; }
  .dev-pet { image-rendering: pixelated; }
`;
document.head.append(style);
void main();
