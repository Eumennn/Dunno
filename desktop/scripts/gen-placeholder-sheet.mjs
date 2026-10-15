// Yer tutucu sprite sheet üretir: assets/dunno_sheet.png + assets/dunno_sheet.json (Aseprite hash formatı).
// Her durum için sözleşmedeki kare sayısı kadar 48x48 kare: palet rengi gövde, iki harfli durum kısaltması,
// kare numarası ve yön göstergesi (sağa bakan göz). Tasarımcının gerçek sheet'i gelince bu dosyalar değişir, kod değişmez.
// Kullanım: npm run gen:sheet
import { mkdirSync, writeFileSync } from "node:fs";
import { createImage, encodePng, hex } from "./png.mjs";

const SIZE = 48;
const INK = hex("#2B1E2F");

// Sözleşme: src/pet/state.ts (STATE_FRAMES). Test, üretilen JSON'u oradan doğrular.
const STATES = [
  { name: "idle", frames: 4, abbr: "ID", color: "#F2A65A", ms: 250 },
  { name: "shrug", frames: 4, abbr: "SR", color: "#FFD29A", ms: 150 },
  { name: "walk", frames: 6, abbr: "WK", color: "#D9774A", ms: 120 },
  { name: "talk", frames: 3, abbr: "TK", color: "#FFFFFF", ms: 150 },
  { name: "sleep", frames: 4, abbr: "SL", color: "#6EC5E9", ms: 400 },
  { name: "run_away", frames: 4, abbr: "RA", color: "#E86A7A", ms: 80 },
  { name: "sulk", frames: 2, abbr: "SU", color: "#FFF1D6", ms: 400 },
  { name: "peek", frames: 4, abbr: "PK", color: "#6EC5E9", ms: 200 },
  { name: "shh", frames: 3, abbr: "SH", color: "#FFFFFF", ms: 250 },
  { name: "dragged", frames: 2, abbr: "DR", color: "#FFD29A", ms: 150 },
];

// 3x5 piksel font, sadece gereken karakterler.
const GLYPHS = {
  A: ["010", "101", "111", "101", "101"],
  D: ["110", "101", "101", "101", "110"],
  H: ["101", "101", "111", "101", "101"],
  I: ["111", "010", "010", "010", "111"],
  K: ["101", "101", "110", "101", "101"],
  L: ["100", "100", "100", "100", "111"],
  P: ["110", "101", "110", "100", "100"],
  R: ["110", "101", "110", "101", "101"],
  S: ["011", "100", "010", "001", "110"],
  T: ["111", "010", "010", "010", "010"],
  U: ["101", "101", "101", "101", "111"],
  W: ["101", "101", "101", "111", "101"],
  1: ["010", "110", "010", "010", "111"],
  2: ["110", "001", "010", "100", "111"],
  3: ["110", "001", "010", "001", "110"],
  4: ["101", "101", "111", "001", "001"],
  5: ["111", "100", "110", "001", "110"],
  6: ["011", "100", "110", "101", "010"],
};

function drawText(img, text, x, y, px, rgba) {
  let cx = x;
  for (const ch of text) {
    const g = GLYPHS[ch];
    if (!g) throw new Error(`glyph yok: ${ch}`);
    g.forEach((row, j) =>
      [...row].forEach((bit, i) => {
        if (bit === "1") img.fillRect(cx + i * px, y + j * px, px, px, rgba);
      }),
    );
    cx += 4 * px;
  }
}

function drawFrame(img, ox, oy, state, n) {
  // gövde: 4px şeffaf kenar payı, 2px kontur
  img.fillRect(ox + 4, oy + 4, 40, 40, INK);
  img.fillRect(ox + 6, oy + 6, 36, 36, hex(state.color));
  drawText(img, state.abbr, ox + 9, oy + 9, 2, INK);
  drawText(img, String(n + 1), ox + 9, oy + 25, 2, INK);
  // sağa bakan göz: aynalanınca sola geçer
  img.fillRect(ox + 34, oy + 26, 4, 4, INK);
}

const cols = Math.max(...STATES.map((s) => s.frames));
const img = createImage(cols * SIZE, STATES.length * SIZE);
const frames = {};
const frameTags = [];
let index = 0;

STATES.forEach((state, row) => {
  frameTags.push({ name: state.name, from: index, to: index + state.frames - 1, direction: "forward" });
  for (let n = 0; n < state.frames; n++) {
    const x = n * SIZE;
    const y = row * SIZE;
    drawFrame(img, x, y, state, n);
    frames[`dunno_sheet ${index}.aseprite`] = {
      frame: { x, y, w: SIZE, h: SIZE },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: SIZE, h: SIZE },
      sourceSize: { w: SIZE, h: SIZE },
      duration: state.ms,
    };
    index++;
  }
});

const json = {
  frames,
  meta: {
    app: "dunno scripts/gen-placeholder-sheet.mjs",
    version: "placeholder",
    placeholder: true,
    note: "placeholder sheet. tasarımcının dunno_sheet.png/json dosyaları gelince üzerine yazılır.",
    image: "dunno_sheet.png",
    format: "RGBA8888",
    size: { w: img.width, h: img.height },
    scale: "1",
    frameTags,
    layers: [],
    slices: [],
  },
};

mkdirSync("assets", { recursive: true });
writeFileSync("assets/dunno_sheet.png", encodePng(img));
writeFileSync("assets/dunno_sheet.json", JSON.stringify(json, null, 2) + "\n");
console.log(`assets/dunno_sheet.png ${img.width}x${img.height}, ${index} frames, ${frameTags.length} tags`);
