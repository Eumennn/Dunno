// Dev önizleme (SPEC 09 K1): aksesuar uyumu, yürüme (6 kare) ve kaçma (4 kare), sağa ve sola bakış, uygulamanın gerçek yolu
// (Player + WardrobeRenderer = dress.ts). ?acc=<id> tek aksesuar (ui-shots/fit-<id>.png), yoksa hepsi. 4x, kareler yan yana.
import { eggExtras } from "../eggs/assets";
import "@ui-kit/fonts.css";
import "@ui-kit/tokens.css";
import sheetJson from "../../assets/dunno_sheet.json";
import sheetUrl from "../../assets/dunno_sheet.png";
import { tagSequence } from "../player/animation";
import { Player } from "../player/player";
import { parseSheet } from "../player/sheet";
import { loadWardrobeRenderer } from "../wardrobe/assets";
import { ACCESSORIES } from "../wardrobe/wardrobe";

const SCALE = 4;
const params = new URLSearchParams(location.search);
const only = params.get("acc");
// ?acc=none: aksesuarsız; ?state=fart: sadece o durum (SPEC 09 K3 fart-*.png)
// ?costume=<id> (SPEC 09 K2 costume-*.png): kostüm idle/walk/sleep/peek, sağ ve sol; ?wear=a,b ile aksesuarlar da giyilir
const costume = params.get("costume");
const wearList = (params.get("wear") ?? "").split(",").filter(Boolean);
const list: (string | null)[] = costume ? [costume] : only === "none" ? [null] : ACCESSORIES.filter((a) => !only || a === only);
const one = params.get("state");
const ROWS: { state: string; facing: "left" | "right" }[] = costume
  ? (["idle", "walk", "run_away", "sleep", "peek"] as const).flatMap((state) => [
      { state, facing: "right" as const },
      { state, facing: "left" as const },
    ])
  : one
  ? [{ state: one, facing: "right" }, { state: one, facing: "left" }]
  : [
      { state: "walk", facing: "right" },
      { state: "walk", facing: "left" },
      { state: "run_away", facing: "right" },
      { state: "run_away", facing: "left" },
    ];

async function main(): Promise<void> {
  const img = new Image();
  img.src = sheetUrl;
  await img.decode();
  const sheet = parseSheet(sheetJson);
  // gizli yaratık / evrim formları (SPEC 14, SPEC 17) da önizlenebilsin
  const renderer = await loadWardrobeRenderer(sheet, img, eggExtras([...sheet.tags.keys()]));
  const root = document.querySelector<HTMLElement>("#fit")!;
  for (const acc of list) {
    const block = document.createElement("section");
    block.innerHTML = `<h2>${acc ?? "aksesuarsız"}</h2>`;
    for (const r of ROWS) {
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `<span class="label">${r.state} ${r.facing === "right" ? "sağ" : "sol"}</span>`;
      const seq = tagSequence(sheet.tags.get(r.state)!);
      let t = 0;
      for (const index of seq) {
        const canvas = document.createElement("canvas");
        let now = 0;
        const player = new Player(canvas, sheet, img, () => now);
        player.resize(SCALE, 1);
        renderer.apply(player, costume ? { theme: "classic", accessories: wearList, costume } : { theme: "classic", accessories: acc ? [acc] : [], costume: null });
        player.setState(r.state, { loop: false });
        player.setFacing(r.facing);
        now = t;
        player.tick();
        row.append(canvas);
        t += sheet.frames[index].duration;
      }
      block.append(row);
    }
    root.append(block);
  }
}

const style = document.createElement("style");
style.textContent = `
  body { margin: 0; padding: 16px; background: var(--paper); color: var(--ink); font-family: var(--font-body); }
  h2 { margin: 0 0 6px; font-size: 15px; }
  section { margin-bottom: 14px; }
  .row { display: flex; align-items: center; gap: 4px; margin-bottom: 4px; }
  .label { width: 96px; font-size: 12px; }
  canvas { background: var(--cream); image-rendering: pixelated; }
`;
document.head.append(style);
void main();
