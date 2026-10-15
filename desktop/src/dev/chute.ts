// Dev önizleme: paraşütlü iniş pozu (dragged + ParachuteView) küçük/normal/büyük boyutta. ui-shots/chute.png.
import "@ui-kit/fonts.css";
import "@ui-kit/tokens.css";
import sheetJson from "../../assets/dunno_sheet.json";
import sheetUrl from "../../assets/dunno_sheet.png";
import { Player } from "../player/player";
import { parseSheet } from "../player/sheet";
import { ParachuteView } from "../ui/parachute";

async function main(): Promise<void> {
  const img = new Image();
  img.src = sheetUrl;
  await img.decode();
  const sheet = parseSheet(sheetJson);
  document.body.style.cssText = "margin:0;background:var(--paper)";
  [2, 3, 4].forEach((k, i) => {
    const canvas = document.createElement("canvas");
    Object.assign(canvas.style, { position: "absolute", left: `${40 + i * 180}px`, top: "80px", imageRendering: "pixelated" });
    document.body.append(canvas);
    const player = new Player(canvas, sheet, img, () => 0);
    player.resize(k, 1);
    player.setState("dragged", { loop: true });
    player.tick();
    const chute = new ParachuteView(canvas);
    chute.setScale(k);
    chute.set(true);
  });
}
void main();
