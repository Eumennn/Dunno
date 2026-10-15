// Örnek veri modu (SPEC 12 B): content/mods/example_pastel. Modcu için şablon; testler bu klasörü gerçek mod gibi doğrular.
// Aksesuar PNG'si yerleşiklerle aynı üreticiden (32x32, bağlantı pikseli 16,16). Kod yok, sadece json + png + md.
// Kullanım: node scripts/gen-example-mod.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createImage, encodePng, hex } from "./png.mjs";
import { accessoryGrid } from "./gen-wardrobe.mjs";
import { ACCESSORY_PALETTE } from "./sprites/accessories.mjs";

const root = new URL("../../content/mods/example_pastel/", import.meta.url).pathname;
const json = (p, v) => {
  mkdirSync(join(root, p, ".."), { recursive: true });
  writeFileSync(join(root, p), JSON.stringify(v, null, 2) + "\n");
};

export const MANIFEST = {
  schema: 1,
  id: "pastel",
  name: { tr: "pastel örnek", en: "pastel example" },
  version: "1.0.0",
  author: "dunno",
  description: { tr: "örnek mod: tema, kurdele, iki laf, ses, balon, davranış", en: "example mod: theme, bow, two lines, sound, bubble, behavior" },
  permissions: ["themes", "accessories", "reactions", "sounds", "bubbles", "behavior"],
  contents: {
    themes: ["themes/pastel_sky.json"],
    accessories: ["accessories/pastel_bow.json"],
    reactions: { tr: "reactions/tr.json", en: "reactions/en.json" },
    sounds: "sounds.json",
    bubbles: "bubbles.json",
    behavior: "behavior.json",
  },
};

const BOW = {
  id: "pastel_bow",
  anchor: "head",
  origin: [8, 1],
  map: ["KK...KK", "KBK.KBK", "KBBKBBK", "KBK.KBK", "KK...KK"],
};

function main() {
  json("manifest.json", MANIFEST);
  json("themes/pastel_sky.json", {
    id: "pastel_sky",
    name: { tr: "pastel gök", en: "pastel sky" },
    colors: { body: "#7FB2E5", shade: "#5E92C8", light: "#C4DCF5", belly: "#FFF1D6" },
  });
  json("accessories/pastel_bow.json", {
    id: "pastel_bow",
    name: { tr: "pastel kurdele", en: "pastel bow" },
    anchor: "head",
    slot: "side",
    pivot: { x: 16, y: 16 },
    antenna: "through",
    hiddenIn: ["sleep"],
    image: "pastel_bow.png",
    size: 32,
  });
  const img = createImage(32, 32);
  accessoryGrid(BOW).forEach((row, y) => [...row].forEach((c, x) => c !== "." && img.fillRect(x, y, 1, 1, hex(ACCESSORY_PALETTE[c]))));
  writeFileSync(join(root, "accessories/pastel_bow.png"), encodePng(img));
  json("reactions/tr.json", [
    { id: "pastel_excel_01", trigger: "app:excel", intent: "pastel mod sample about spreadsheets", tr: "bu tabloyu pastel boyasan da tablo" },
    { id: "pastel_click_01", trigger: "interaction:click", intent: "pastel mod sample poke reaction", tr: "beni pastele boyadın. yine de dürtme" },
  ]);
  json("reactions/en.json", [
    { id: "pastel_excel_01", trigger: "app:excel", intent: "pastel mod sample about spreadsheets", en: "paint it pastel, still a spreadsheet" },
    { id: "pastel_click_01", trigger: "interaction:click", intent: "pastel mod sample poke reaction", en: "you made me pastel. still no poking" },
  ]);
  json("sounds.json", { greet: { base: [700, 860], syllables: [2, 3], dur: [40, 60], gap: [20, 35], wave: "triangle", glide: [1.05, 1.2], contour: 1.2 } });
  json("bubbles.json", { fill: "#F2F7FD", ink: "#2B1E2F" });
  json("behavior.json", { chattiness: 1.2, restScale: 1 });
  writeFileSync(
    join(root, "README.md"),
    "# pastel örnek mod\n\nŞablon: `docs/MODDING.md`. Kopyala, `id`'yi ve içerik id öneklerini değiştir, `%APPDATA%\\app.dunno.desktop\\mods\\` içine koy.\n",
  );
  console.log(`wrote ${root}`);
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("scripts/gen-example-mod.mjs")) main();
