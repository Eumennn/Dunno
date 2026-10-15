// Dev önizleme (SPEC 07 FB1): her aksesuar x kenar/poz, uygulamanın GERÇEK çizim yolu (Player + WardrobeRenderer = dress.ts).
// Yön facingForEdge'den (pet ile aynı). ?theme=<id> ile tema (varsayılan klasik). Headless: ui-shots/wardrobe-edge-*.png.
import "@ui-kit/fonts.css";
import "@ui-kit/tokens.css";
import sheetJson from "../../assets/dunno_sheet.json";
import sheetUrl from "../../assets/dunno_sheet.png";
import { facingForEdge, type ScreenEdge } from "../pet/facing";
import type { PetState } from "../pet/state";
import { tagSequence } from "../player/animation";
import { Player } from "../player/player";
import { parseSheet } from "../player/sheet";
import { loadWardrobeRenderer } from "../wardrobe/assets";
import { ACCESSORIES } from "../wardrobe/wardrobe";

const SCALE = 3;
const params = new URLSearchParams(location.search);
const theme = params.get("theme") ?? "classic";

/** sütunlar: durum, kenar, son yön (walk/run_away için), etiket; all = tag'in tüm kareleri */
const POSES: { state: PetState; edge: ScreenEdge; last: "left" | "right"; label: string; all?: boolean }[] = [
  { state: "peek", edge: "left", last: "left", label: "peek sol", all: true },
  { state: "peek", edge: "right", last: "right", label: "peek sağ", all: true },
  { state: "sleep", edge: "bottom", last: "right", label: "sleep" },
  { state: "sulk", edge: "bottom", last: "right", label: "sulk" },
  { state: "run_away", edge: "bottom", last: "right", label: "run_away" },
  { state: "dragged", edge: "bottom", last: "right", label: "dragged" },
  { state: "walk", edge: "bottom", last: "left", label: "walk sol" },
  { state: "walk", edge: "bottom", last: "right", label: "walk sağ" },
];

async function load(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

async function main(): Promise<void> {
  const sheet = parseSheet(sheetJson);
  const image = await load(sheetUrl);
  const renderer = await loadWardrobeRenderer(sheet, image);
  const root = document.querySelector<HTMLElement>("#edges")!;

  const head = document.createElement("div");
  head.className = "row head";
  head.innerHTML = `<span class="label">${theme}</span>` + POSES.map((p) => `<span class="col${p.all ? " wide" : ""}">${p.label}</span>`).join("");
  root.append(head);

  for (const acc of [null, ...ACCESSORIES]) {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `<span class="label">${acc ?? "yok"}</span>`;
    for (const pose of POSES) {
      const cell = document.createElement("div");
      cell.className = `cell${pose.all ? " wide" : ""}`;
      const seq = tagSequence(sheet.tags.get(pose.state)!);
      // tüm kareler (peek) ya da ortadaki kare; enjekte saat: kare kendi başlangıç anında çizilir
      const picks = pose.all ? seq.map((_, i) => i) : [Math.floor(seq.length / 2)];
      for (const k of picks) {
        const canvas = document.createElement("canvas");
        let now = 0;
        const player = new Player(canvas, sheet, image, () => now);
        player.resize(SCALE, 1);
        renderer.apply(player, { theme, accessories: acc ? [acc] : [], costume: null });
        player.setState(pose.state, { loop: true });
        player.setFacing(facingForEdge(pose.state, pose.edge, pose.last));
        now = seq.slice(0, k).reduce((t, i) => t + sheet.frames[i].duration, 0);
        player.tick();
        cell.append(canvas);
      }
      row.append(cell);
    }
    root.append(row);
  }
}

const style = document.createElement("style");
style.textContent = `
  body { margin: 0; padding: 16px; background: var(--paper); color: var(--ink); font-family: var(--font-body); }
  .row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .label { width: 84px; font-size: 13px; font-weight: 700; }
  .col { width: 96px; font-size: 12px; text-align: center; }
  .col.wide { width: ${4 * 96 + 3 * 2}px; }
  .cell { display: flex; gap: 2px; }
  .cell canvas { background: var(--cream); image-rendering: pixelated; }
`;
document.head.append(style);
void main();
