// Dev önizleme: her durumun kareleri uygulamanın kendi Player'ıyla 4x çizilir, referans pozlar yanında.
import "@ui-kit/fonts.css";
import "@ui-kit/tokens.css";
import sheetJson from "../../assets/dunno_sheet.json";
import sheetUrl from "../../assets/dunno_sheet.png";
import logoUrl from "../../assets/logo_icon_32.png";
import refUrl from "../../../content/art/dunno_reference_poses.webp";
import { PET_STATES } from "../pet/state";
import { Player } from "../player/player";
import { parseSheet } from "../player/sheet";
import { tagSequence } from "../player/animation";

const SCALE = 4;

async function load(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

async function main(): Promise<void> {
  const sheet = parseSheet(sheetJson);
  const image = await load(sheetUrl);
  const root = document.querySelector<HTMLElement>("#sprites")!;
  const strips = document.createElement("section");
  strips.className = "strips";

  for (const state of PET_STATES) {
    const row = document.createElement("div");
    row.className = "row";
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = state;
    row.append(label);
    const seq = tagSequence(sheet.tags.get(state)!);
    let t = 0;
    for (const index of seq) {
      const canvas = document.createElement("canvas");
      // enjekte saat: durum t=0'da başlar, kare kendi başlangıç anında çizilir
      let now = 0;
      const player = new Player(canvas, sheet, image, () => now);
      player.resize(SCALE, 1);
      player.setState(state, { loop: true });
      now = t;
      player.tick();
      row.append(canvas);
      t += sheet.frames[index].duration;
    }
    strips.append(row);
  }

  const logoRow = document.createElement("div");
  logoRow.className = "row";
  logoRow.innerHTML = `<span class="label">icon</span>`;
  const logo = await load(logoUrl);
  logo.className = "px";
  logo.width = 32 * SCALE;
  logoRow.append(logo);
  strips.append(logoRow);

  const ref = document.createElement("figure");
  ref.innerHTML = `<figcaption>content/art/dunno_reference_poses.webp</figcaption>`;
  const refImg = await load(refUrl);
  ref.append(refImg);
  root.append(strips, ref);
}

const style = document.createElement("style");
style.textContent = `
  body { margin: 0; background: var(--cream); color: var(--ink); font-family: var(--font-body); }
  #sprites { display: flex; gap: 32px; padding: 24px; align-items: flex-start; }
  .strips { display: flex; flex-direction: column; gap: 8px; }
  .row { display: flex; align-items: center; gap: 4px; }
  .label { width: 80px; font-size: 14px; font-weight: 600; }
  canvas, .px { image-rendering: pixelated; background: var(--paper); border: 1px solid var(--light); }
  figure { margin: 0; }
  figure img { width: 760px; display: block; border: 2px solid var(--ink); }
  figcaption { font-size: 14px; margin-bottom: 6px; }
`;
document.head.append(style);
void main();
