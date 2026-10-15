// Dev önizleme (SPEC 08 SZ2): her pet boyutu (1x-5x) için taban pet penceresi kadar sahne: idle + balon, peek sol/sağ,
// aksesuar (bere) ve düşünme işareti. Uygulamanın gerçek yolu: Player + WardrobeRenderer, size.windowLayout, ThinkCueView.
// ?size=<minik|kucuk|normal|buyuk|dev> tek boyut (ui-shots/size-<seviye>.png), ?lang=tr|en.
import "@ui-kit/fonts.css";
import "@ui-kit/tokens.css";
import "@ui-kit/kit.css";
import "../styles/app.css";
import "../styles/pet.css";
import sheetJson from "../../assets/dunno_sheet.json";
import sheetUrl from "../../assets/dunno_sheet.png";
import { SIZE_LABELS, SIZE_LEVELS, sizeScale, windowLayout, type SizeLevel } from "../size/size";
import type { Lang } from "../lines/types";
import { facingForEdge } from "../pet/facing";
import { tagSequence } from "../player/animation";
import { Player } from "../player/player";
import { parseSheet } from "../player/sheet";
import { speechHtml } from "../ui/surfaces";
import { ThinkCueView } from "../ui/thinkcue";
import { loadWardrobeRenderer } from "../wardrobe/assets";

const params = new URLSearchParams(location.search);
const lang = (params.get("lang") as Lang) ?? "tr";
const only = params.get("size");
const levels: readonly SizeLevel[] = only !== null && SIZE_LEVELS.includes(Number(only)) ? [Number(only)] : SIZE_LEVELS;

async function main(): Promise<void> {
  const img = new Image();
  img.src = sheetUrl;
  await img.decode();
  const sheet = parseSheet(sheetJson);
  const renderer = await loadWardrobeRenderer(sheet, img);
  const root = document.querySelector<HTMLElement>("#sizes")!;

  /** taban pet penceresi kadar sahne; pet petRect ile alt-ortada (pet penceresiyle aynı yerleşim) */
  const scene = (level: SizeLevel, state: "idle" | "peek", edge: "bottom" | "left" | "right", label: string) => {
    const lay = windowLayout(level, 1);
    const win = lay.logical;
    const fig = document.createElement("figure");
    fig.innerHTML = `<figcaption>${label}</figcaption>`;
    const box = document.createElement("div");
    box.className = "win-box";
    box.style.width = `${win.w}px`;
    box.style.height = `${win.h}px`;
    const canvas = document.createElement("canvas");
    // peek: dört karenin en açık olanı (son kare); idle: ilk kare. Enjekte saat: kare kendi başlangıç anında
    const seq = tagSequence(sheet.tags.get(state)!);
    const at = state === "peek" ? seq.slice(0, -1).reduce((s, i) => s + sheet.frames[i].duration, 0) : 0;
    let now = 0;
    const player = new Player(canvas, sheet, img, () => now);
    const size = player.resize(sizeScale(level), 1);
    const r = lay.pet;
    Object.assign(canvas.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${size.w}px`, height: `${size.h}px` });
    renderer.apply(player, { theme: "classic", accessories: ["beanie"], costume: null });
    player.setState(state, { loop: true });
    player.setFacing(facingForEdge(state, edge, "right"));
    now = at;
    player.tick();
    box.append(canvas);
    fig.append(box);
    return { fig, canvas };
  };

  for (const level of levels) {
    const scale = sizeScale(level);
    const win = windowLayout(level, 1).logical;
    const row = document.createElement("section");
    row.className = "row";
    row.innerHTML = `<h2>${SIZE_LABELS[lang][level]} · ${scale}x · ${win.w}x${win.h}</h2>`;
    const strip = document.createElement("div");
    strip.className = "strip";
    // idle + balon + düşünme işareti
    const talk = document.createElement("div");
    talk.className = "talk";
    talk.innerHTML = speechHtml(lang === "tr" ? "bu dosyayı ben de anlamadım" : "i don't get this file either");
    const idle = scene(level, "idle", "bottom", "idle + bere");
    talk.append(idle.fig);
    strip.append(talk);
    const cue = new ThinkCueView(idle.canvas);
    cue.setScale(scale);
    cue.set("dots");
    strip.append(scene(level, "peek", "left", "peek sol").fig, scene(level, "peek", "right", "peek sağ").fig);
    row.append(strip);
    root.append(row);
  }
}

const style = document.createElement("style");
style.textContent = `
  body { margin: 0; padding: 16px; background: var(--main); color: var(--ink); font-family: var(--font-body); }
  .row { margin-bottom: 18px; }
  .row h2 { margin: 0 0 8px; font-size: 14px; }
  .strip { display: flex; align-items: flex-end; gap: 24px; }
  .talk { display: flex; flex-direction: column; align-items: center; gap: 10px; }
  figure { margin: 0; }
  figcaption { font-size: 12px; margin-bottom: 4px; }
  .win-box { position: relative; background: var(--cream); outline: 1px dashed var(--ink-2); }
  .win-box canvas { position: absolute; image-rendering: pixelated; }
  .pet-bub { position: static; max-width: 220px; }
`;
document.head.append(style);
void main();
