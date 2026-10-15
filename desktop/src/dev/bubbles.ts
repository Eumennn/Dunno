// Dev önizleme (SPEC 09 K4): çizgi roman konuşma/düşünce balonu, sahte çalışma alanında pet dört kenarda ve her boyutta.
// Yerleşim uygulamanın gerçek UP1 motoruyla (placePopover): kuyruk yönü ve ofseti pet penceresiyle aynı.
// ?only=edges|sizes, ?lang=tr|en. Headless: ui-shots/bubble-*.png.
import "@ui-kit/fonts.css";
import "@ui-kit/tokens.css";
import "@ui-kit/kit.css";
import "../styles/pet.css";
import sheetJson from "../../assets/dunno_sheet.json";
import sheetUrl from "../../assets/dunno_sheet.png";
import type { Lang } from "../lines/types";
import { facingForEdge } from "../pet/facing";
import { placePopover } from "../place/placement";
import { Player } from "../player/player";
import { parseSheet } from "../player/sheet";
import { SIZE_LABELS, SIZE_LEVELS, sizeScale, windowLayout, type SizeLevel } from "../size/size";
import { speechHtml, thoughtHtml } from "../ui/surfaces";
import { THOUGHT_GAP } from "../ui/popover";
import { speechBubbleHtml } from "@ui-kit/kit";
import { steppedPolygon } from "@ui-kit/bubble";

const params = new URLSearchParams(location.search);
const lang = (params.get("lang") as Lang) ?? "tr";
const only = params.get("only");
const SPEECH = lang === "tr" ? "bu dosyayı ben de anlamadım. sen de anlamadıysan sorun yok" : "i don't get this file either. if you don't, that's fine";
const SHORT = lang === "tr" ? "salı." : "tuesday.";
const THOUGHT = lang === "tr" ? "acaba bugün çarşamba mı" : "is it wednesday today";
const AREA = { w: 340, h: 240 };

let img: HTMLImageElement;
const sheet = parseSheet(sheetJson);

/** Çizilmiş karenin saydam payları (mantıksal px): canvas pikselinden, sprite pikseli = s. */
function insetOf(canvas: HTMLCanvasElement, s: number) {
  const ctx = canvas.getContext("2d")!;
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (data[(y * width + x) * 4 + 3] > 0) ((minX = Math.min(minX, x)), (maxX = Math.max(maxX, x)), (minY = Math.min(minY, y)), (maxY = Math.max(maxY, y)));
  const k = canvas.width / (32 * s); // cihaz pikseli / mantıksal
  return { left: minX / k, top: minY / k, right: (width - 1 - maxX) / k, bottom: (height - 1 - maxY) / k };
}

/** Sahte çalışma alanı: pet kenarda, balon UP1 ile yerleşir. */
function scene(parent: HTMLElement, title: string, level: SizeLevel, where: "bottom" | "left" | "right" | "top", html: string): void {
  // ölçüm için önce belgeye eklenir (dışarıdayken boyut 0)
  const fig = document.createElement("figure");
  parent.append(fig);
  fig.innerHTML = `<figcaption>${title}</figcaption>`;
  const area = document.createElement("div");
  area.className = "area";
  Object.assign(area.style, { width: `${AREA.w}px`, height: `${AREA.h}px` });
  fig.append(area);

  const pet = windowLayout(level, 1).pet;
  const box = {
    bottom: { x: AREA.w / 2 - pet.w / 2, y: AREA.h - pet.h },
    left: { x: 0, y: AREA.h / 2 - pet.h / 2 + 30 },
    right: { x: AREA.w - pet.w, y: AREA.h / 2 - pet.h / 2 + 30 },
    top: { x: AREA.w / 2 - pet.w / 2, y: 0 },
  }[where];
  const petBox = { x: Math.round(box.x), y: Math.round(box.y), w: pet.w, h: pet.h };
  const canvas = document.createElement("canvas");
  let now = 0;
  const player = new Player(canvas, sheet, img, () => now);
  player.resize(sizeScale(level), 1);
  const state = where === "left" || where === "right" ? "peek" : "idle";
  player.setState(state, { loop: true });
  player.setFacing(facingForEdge(state, where, "right"));
  now = 0;
  player.tick();
  Object.assign(canvas.style, { left: `${petBox.x}px`, top: `${petBox.y}px`, width: `${pet.w}px`, height: `${pet.h}px` });
  area.append(canvas);

  const pop = document.createElement("div");
  pop.className = "pet-pop";
  pop.innerHTML = html;
  area.append(pop);
  const size = { w: pop.offsetWidth, h: pop.offsetHeight };
  // uygulamadaki gibi: görünen gövdeye göre (karenin saydam payları) ve düşünce balonunda geniş boşluk
  const p = placePopover(petBox, size, { x: 0, y: 0, w: AREA.w, h: AREA.h }, {
    petInset: insetOf(canvas, pet.w / 32),
    gap: pop.querySelector(".thought-bubble") ? THOUGHT_GAP : undefined,
  });
  Object.assign(pop.style, { left: `${p.x}px`, top: `${p.y}px` });
  if (params.has("debug")) fig.querySelector("figcaption")!.textContent += ` · ${size.w}x${size.h} -> ${p.x},${p.y} ${p.tail?.side}`;
  if (p.tail) {
    pop.dataset.tail = p.tail.side;
    pop.style.setProperty("--tail", `${p.tail.offset}px`);
  }
}

async function main(): Promise<void> {
  img = new Image();
  img.src = sheetUrl;
  await img.decode();
  const root = document.querySelector<HTMLElement>("#bubbles")!;
  if (only === "corners") {
    // köşe karşılaştırması (PM K4 geri bildirimi): basamak 2 px profil [2,1] / [3,2,1], basamak 3 px profil [2,1]
    const row = document.createElement("section");
    row.innerHTML = "<h2>köşe profili</h2>";
    const grid = document.createElement("div");
    grid.className = "grid";
    row.append(grid);
    root.append(row);
    for (const [label, step, corner] of [["2 px x [2,1] (eski)", 2, [2, 1]], ["2 px x [3,2,1]", 2, [3, 2, 1]], ["3 px x [2,1]", 3, [2, 1]]] as const) {
      const fig = document.createElement("figure");
      fig.innerHTML = `<figcaption>${label}</figcaption><div class="pet-pop" data-tail="bottom" style="position:relative;--tail:40px">${speechBubbleHtml(SPEECH, "", steppedPolygon(step, corner))}</div>`;
      grid.append(fig);
    }
    return;
  }
  if (only !== "sizes") {
    const row = document.createElement("section");
    row.innerHTML = `<h2>${lang === "tr" ? "dört kenar (küçük)" : "four edges (small)"}</h2>`;
    const grid = document.createElement("div");
    grid.className = "grid";
    row.append(grid);
    root.append(row);
    for (const where of ["bottom", "left", "right", "top"] as const) {
      scene(grid, `${where} · speech`, 25, where, speechHtml(SPEECH));
      scene(grid, `${where} · thought`, 25, where, thoughtHtml(THOUGHT));
    }
  }
  if (only !== "edges") {
    const row = document.createElement("section");
    row.innerHTML = `<h2>${lang === "tr" ? "her boyut (alt kenar)" : "every size (bottom edge)"}</h2>`;
    const grid = document.createElement("div");
    grid.className = "grid";
    row.append(grid);
    root.append(row);
    for (const level of SIZE_LEVELS) {
      scene(grid, `${SIZE_LABELS[lang][level]} · ${sizeScale(level)}x`, level, "bottom", speechHtml(level === 0 ? SHORT : SPEECH));
    }
  }
}

const style = document.createElement("style");
style.textContent = `
  body { margin: 0; padding: 16px; background: var(--main); color: var(--ink); font-family: var(--font-body); }
  h2 { margin: 0 0 8px; font-size: 14px; }
  section { margin-bottom: 18px; }
  .grid { display: flex; flex-wrap: wrap; gap: 14px; }
  figure { margin: 0; }
  figcaption { font-size: 12px; margin-bottom: 4px; }
  .area { position: relative; background: var(--cream); outline: 2px dashed var(--ink-2); overflow: hidden; }
  .area canvas { position: absolute; image-rendering: pixelated; }
`;
document.head.append(style);
void main();
