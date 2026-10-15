// Dev önizleme (UP7): her durum, seçilen ekran kenarında, uygulamanın kendi Player'ı ve facingForEdge ile 4x.
// Kalın çizgi ekran kenarını gösterir (peek'te duvar o tarafta olmalı, sleep'te sırt o tarafa).
import "@ui-kit/fonts.css";
import "@ui-kit/tokens.css";
import sheetJson from "../../assets/dunno_sheet.json";
import sheetUrl from "../../assets/dunno_sheet.png";
import { facingForEdge, type ScreenEdge } from "../pet/facing";
import { PET_STATES } from "../pet/state";
import { Player } from "../player/player";
import { parseSheet } from "../player/sheet";

const edge = (new URLSearchParams(location.search).get("edge") as ScreenEdge) ?? "left";
const SCALE = 4;

async function main(): Promise<void> {
  const sheet = parseSheet(sheetJson);
  const img = new Image();
  img.src = sheetUrl;
  await img.decode();
  const root = document.querySelector<HTMLElement>("#edges")!;
  root.innerHTML = `<h1>${edge} edge</h1><div class="grid"></div>`;
  const grid = root.querySelector<HTMLElement>(".grid")!;
  for (const state of PET_STATES) {
    const cell = document.createElement("figure");
    cell.className = `cell cell-${edge}`;
    const canvas = document.createElement("canvas");
    const player = new Player(canvas, sheet, img, () => 0);
    player.resize(SCALE, 1);
    player.setState(state, { loop: true });
    // walk/run_away: kenar boyunca hareket yönü; sol kenarda aşağı (s artar) -> sağ, sağ kenarda yukarı -> sağ
    const facing = facingForEdge(state, edge, "right");
    player.setFacing(facing);
    player.tick();
    const cap = document.createElement("figcaption");
    cap.textContent = `${state} (${facing === "left" ? "mirrored" : "as drawn"})`;
    cell.append(canvas, cap);
    grid.append(cell);
  }
}

const style = document.createElement("style");
style.textContent = `
  body { margin: 0; background: var(--cream); color: var(--ink); font-family: var(--font-body); }
  #edges { padding: 16px 20px; }
  h1 { margin: 0 0 12px; font: 600 16px var(--font-body); }
  .grid { display: grid; grid-template-columns: repeat(5, 150px); gap: 14px; }
  .cell { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 6px; background: var(--paper); }
  .cell-left { border-left: 6px solid var(--ink); }
  .cell-right { border-right: 6px solid var(--ink); }
  canvas { image-rendering: pixelated; }
  figcaption { font-size: 12px; }
`;
document.head.append(style);
void main();
