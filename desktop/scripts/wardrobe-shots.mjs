// Kıyafet önizleme şeritleri (SPEC 05 W5a), headless: gerçek sheet + recolor.ts + placeAccessory + compose.ts + facingForEdge.
// Çıktı: ../orchestrator/notes/ui-shots/wardrobe-themes.png (tema x poz), wardrobe-accessories.png (aksesuar x poz), 2x.
// Gizli olduğu pozda aksesuar hücresi boş ve "gizli" etiketli. Ekrana dokunmaz, sadece dosya yazar.
// Kullanım: npm run wardrobe:shots [-- --sheet <png> (json yanında) --out <klasör>]
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { facingForEdge } from "../src/pet/facing.ts";
import { checkAccessory, checkAnchors, placeAccessory } from "../src/wardrobe/accessories.ts";
import { composeFrame, mirrorX } from "../src/wardrobe/compose.ts";
import { recolor } from "../src/wardrobe/recolor.ts";
import { loadThemes } from "../src/wardrobe/themes.ts";
import { drawText, textWidth } from "./font.mjs";
import { createImage, decodePng, encodePng, hex } from "./png.mjs";
import { ACCESSORIES } from "./sprites/accessories.mjs";

const SCALE = 2;
const INK = hex("#2B1E2F");
const PAGE = hex("#FFD29A");
const CELL_BG = hex("#FFFFFF");
const MUTED = hex("#D9774A");
const PAD = 8;
const LABEL_PX = 2;

/** Sütunlar: durum + ekran kenarı; yön uygulamadaki gibi facingForEdge'den (son yön "right"). */
export const POSES = [
  { label: "idle", tag: "idle", edge: "bottom" },
  { label: "walk", tag: "walk", edge: "bottom" },
  { label: "sleep", tag: "sleep", edge: "bottom" },
  { label: "peek sol", tag: "peek", edge: "left" },
  { label: "peek sag", tag: "peek", edge: "right" },
];

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

export function loadSheet(pngPath) {
  const json = readJson(pngPath.replace(/\.png$/, ".json"));
  const img = decodePng(readFileSync(pngPath));
  const names = Object.keys(json.frames);
  const frameOf = (tag, n = 0) => {
    const t = json.meta.frameTags.find((x) => x.name === tag);
    if (!t) throw new Error(`sheet'te ${tag} yok`);
    return t.from + n;
  };
  /** kare piksellerini sheet'in (renklenmiş) verisinden kes */
  const cut = (data, index) => {
    const { x, y, w, h } = json.frames[names[index]].frame;
    const out = new Uint8ClampedArray(w * h * 4);
    for (let j = 0; j < h; j++) out.set(data.subarray(((y + j) * img.width + x) * 4, ((y + j) * img.width + x + w) * 4), j * w * 4);
    return { data: out, width: w, height: h };
  };
  return { json, img, names, tags: json.meta.frameTags.map((t) => t.name), frameOf, cut };
}

function loadAccessories(dir, tags) {
  const order = ACCESSORIES.map((a) => a.id);
  const ids = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -5))
    .sort((a, b) => (order.indexOf(a) + 1 || 999) - (order.indexOf(b) + 1 || 999) || a.localeCompare(b));
  return ids.map((id) => {
    const acc = readJson(join(dir, `${id}.json`));
    const errs = checkAccessory(acc, tags);
    if (errs.length) throw new Error(errs.join("\n"));
    const img = decodePng(readFileSync(join(dir, acc.image)));
    return { acc, pixels: { data: img.data, width: img.width, height: img.height } };
  });
}

/** Bir hücrenin (kare) RGBA'sı: tema rengi + aksesuar + yön. null = aksesuar bu pozda gizli. */
export function cellPixels(sheet, anchors, themeColors, pose, accessory) {
  const index = sheet.frameOf(pose.tag);
  const data = themeColors ? recolor(sheet.img.data, themeColors) : sheet.img.data;
  const body = sheet.cut(data, index);
  const head = anchors.frames[index].points.head;
  const headY = "hidden" in head ? 0 : head.y;
  let place = null;
  if (accessory) {
    place = placeAccessory(anchors, index, accessory.acc);
    if (!place) return null;
  }
  let out = composeFrame(body, accessory?.pixels ?? null, place, headY);
  if (facingForEdge(pose.tag, pose.edge, "right") === "left") out = mirrorX(out, body.width, body.height);
  return { data: out, width: body.width, height: body.height };
}

/** Gizli pozun gerekçesi: hiddenIn ya da noktanın kendi gerekçesi. */
function hiddenReason(sheet, anchors, pose, acc) {
  if (acc.hiddenIn.includes(pose.tag)) return "hiddenIn";
  const p = anchors.frames[sheet.frameOf(pose.tag)].points[acc.anchor];
  return "hidden" in p ? p.hidden : "";
}

function blit(img, px, x0, y0) {
  for (let y = 0; y < px.height; y++)
    for (let x = 0; x < px.width; x++) {
      const i = (y * px.width + x) * 4;
      if (px.data[i + 3] === 0) continue;
      img.fillRect(x0 + x * SCALE, y0 + y * SCALE, SCALE, SCALE, [px.data[i], px.data[i + 1], px.data[i + 2], 255]);
    }
}

/** rows: [{label, cells: [{pixels} | {hidden: reason}]}] -> tablo png */
function table(title, rows, frame) {
  const fw = frame * SCALE;
  const cellW = fw + PAD * 2;
  const cellH = fw + PAD * 2 + 14;
  const labelW = Math.max(...rows.map((r) => textWidth(r.label, LABEL_PX))) + PAD * 2;
  const top = 16 + 10 * 2 + 4;
  const img = createImage(labelW + cellW * POSES.length + PAD, top + cellH * rows.length + PAD);
  img.fillRect(0, 0, img.width, img.height, PAGE);
  drawText(img, title, PAD, PAD, LABEL_PX, INK);
  POSES.forEach((p, c) => drawText(img, p.label, labelW + c * cellW + PAD, top - 12, LABEL_PX, INK));
  rows.forEach((r, i) => {
    const y = top + i * cellH;
    drawText(img, r.label, PAD, y + PAD + fw / 2 - 5, LABEL_PX, INK);
    r.cells.forEach((cell, c) => {
      const x = labelW + c * cellW;
      img.fillRect(x + PAD - 2, y + PAD - 2, fw + 4, fw + 4, CELL_BG);
      if (cell.pixels) blit(img, cell.pixels, x + PAD, y + PAD);
      else {
        drawText(img, "gizli", x + PAD + (fw - textWidth("gizli", LABEL_PX)) / 2, y + PAD + fw / 2 - 5, LABEL_PX, INK);
        const reason = cell.hidden.slice(0, Math.floor((cellW - 4) / 4));
        drawText(img, reason, x + PAD, y + PAD + fw + 6, 1, MUTED);
      }
    });
  });
  return img;
}

function main() {
  const sheetPath = arg("--sheet", "assets/dunno_sheet.png");
  const outDir = arg("--out", "../orchestrator/notes/ui-shots");
  const sheet = loadSheet(sheetPath);
  const anchors = readJson("../content/art/dunno_anchors.json");
  const errs = checkAnchors(anchors, { frames: sheet.names, tags: sheet.tags });
  if (errs.length) throw new Error(`bağlantı noktaları sheet'le uyuşmuyor:\n${errs.join("\n")}`);
  const loaded = loadThemes(readJson("../content/wardrobe/themes.json"));
  if (!loaded.file) throw new Error(JSON.stringify(loaded));
  const frame = sheet.json.frames[sheet.names[0]].frame.w;

  const themeRows = loaded.file.themes.map((t) => ({
    label: t.id,
    cells: POSES.map((p) => ({ pixels: cellPixels(sheet, anchors, t.colors, p, null) })),
  }));
  const accessories = loadAccessories("../content/wardrobe/accessories", sheet.tags);
  const accRows = accessories.map((a) => ({
    label: a.acc.id,
    cells: POSES.map((p) => {
      const px = cellPixels(sheet, anchors, null, p, a);
      return px ? { pixels: px } : { hidden: hiddenReason(sheet, anchors, p, a.acc) };
    }),
  }));

  mkdirSync(outDir, { recursive: true });
  for (const [name, title, rows] of [
    ["wardrobe-themes.png", "temalar", themeRows],
    ["wardrobe-accessories.png", "aksesuarlar (klasik)", accRows],
  ]) {
    const path = join(outDir, name);
    writeFileSync(path, encodePng(table(title, rows, frame)));
    console.log(`wrote ${path}`);
  }
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("scripts/wardrobe-shots.mjs")) main();
