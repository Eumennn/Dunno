// Kurulum (NSIS) görselleri (FB5): setup.exe'nin varsayılan gri NSIS görünümü yerine Dunno marka dili.
// Çıktı: src-tauri/installer/sidebar.bmp (164x314, karşılama + bitiş sayfası) ve header.bmp (150x57, iç sayfalar).
// NSIS sadece 24 bit sıkıştırmasız BMP okur. Renkler ana palet (ui.md), piksel keskin (en yakın komşu), gradyan yok.
// Kullanım: npm run gen:installer
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { drawText, textWidth } from "./font.mjs";
import { createImage, decodePng, hex } from "./png.mjs";

const INK = hex("#2B1E2F");
const MAIN = hex("#F2A65A");
const CREAM = hex("#FFF1D6");
const LIGHT = hex("#FFD29A");

/** Logo pozu (32 px), saydam kenarlar kırpılmış. */
function logo() {
  const img = decodePng(readFileSync("assets/logo_icon_32.png"));
  let x0 = img.width, y0 = img.height, x1 = -1, y1 = -1;
  for (let y = 0; y < img.height; y++)
    for (let x = 0; x < img.width; x++)
      if (img.data[(y * img.width + x) * 4 + 3] > 0) {
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
  return { img, x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Logoyu tam sayı ölçekle (en yakın komşu) çizer; yarı saydam piksel zeminle karışır. */
function drawLogo(dst, l, x, y, scale) {
  for (let j = 0; j < l.h; j++)
    for (let i = 0; i < l.w; i++) {
      const o = ((l.y0 + j) * l.img.width + l.x0 + i) * 4;
      const a = l.img.data[o + 3] / 255;
      if (!a) continue;
      for (let v = 0; v < scale; v++)
        for (let u = 0; u < scale; u++) {
          const px = x + i * scale + u, py = y + j * scale + v;
          const d = (py * dst.width + px) * 4;
          const rgb = [0, 1, 2].map((k) => Math.round(l.img.data[o + k] * a + dst.data[d + k] * (1 - a)));
          dst.set(px, py, [...rgb, 255]);
        }
    }
}

const center = (w, text, px) => Math.round((w - textWidth(text, px)) / 2);

export function sidebar() {
  const W = 164, H = 314;
  const img = createImage(W, H);
  img.fillRect(0, 0, W, H, CREAM);
  // başlık çubuğu (dunno.exe pencere dili): turuncu + kontur
  img.fillRect(0, 0, W, 30, MAIN);
  img.fillRect(0, 30, W, 2, INK);
  drawText(img, "dunno.exe", 10, 10, 2, INK);
  // logo, 4x, yer çizgisi
  const l = logo();
  const s = 4;
  const lx = Math.round((W - l.w * s) / 2);
  const ly = 64;
  drawLogo(img, l, lx, ly, s);
  img.fillRect(16, ly + l.h * s + 6, W - 32, 2, INK);
  // tagline (marka: küçük harf, kuru)
  const lines = ["the ai that", "teaches you", "nothing."];
  lines.forEach((t, i) => drawText(img, t, center(W, t, 2), 222 + i * 16, 2, INK));
  // alt şerit
  img.fillRect(0, H - 14, W, 2, INK);
  img.fillRect(0, H - 12, W, 12, LIGHT);
  // sağ kenar konturu (sayfa içeriğinden ayrılsın)
  img.fillRect(W - 2, 0, 2, H, INK);
  return img;
}

export function header() {
  const W = 150, H = 57;
  const img = createImage(W, H);
  img.fillRect(0, 0, W, H, CREAM);
  const l = logo();
  const s = l.h * 2 <= H - 6 ? 2 : 1;
  drawLogo(img, l, 8, Math.round((H - l.h * s) / 2), s);
  drawText(img, "dunno", 8 + l.w * s + 10, Math.round(H / 2) - 7, 3, INK);
  img.fillRect(0, H - 2, W, 2, INK);
  return img;
}

/** 24 bit, aşağıdan yukarı, satır 4 bayta hizalı BMP (BITMAPINFOHEADER). */
export function encodeBmp(img) {
  const row = Math.ceil((img.width * 3) / 4) * 4;
  const size = 54 + row * img.height;
  const b = Buffer.alloc(size);
  b.write("BM", 0, "ascii");
  b.writeUInt32LE(size, 2);
  b.writeUInt32LE(54, 10);
  b.writeUInt32LE(40, 14);
  b.writeInt32LE(img.width, 18);
  b.writeInt32LE(img.height, 22);
  b.writeUInt16LE(1, 26);
  b.writeUInt16LE(24, 28);
  b.writeUInt32LE(row * img.height, 34);
  b.writeInt32LE(2835, 38);
  b.writeInt32LE(2835, 42);
  for (let y = 0; y < img.height; y++) {
    const o = 54 + (img.height - 1 - y) * row;
    for (let x = 0; x < img.width; x++) {
      const s = (y * img.width + x) * 4;
      b[o + x * 3] = img.data[s + 2];
      b[o + x * 3 + 1] = img.data[s + 1];
      b[o + x * 3 + 2] = img.data[s];
    }
  }
  return b;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mkdirSync("src-tauri/installer", { recursive: true });
  writeFileSync("src-tauri/installer/sidebar.bmp", encodeBmp(sidebar()));
  writeFileSync("src-tauri/installer/header.bmp", encodeBmp(header()));
  console.log("src-tauri/installer/{sidebar,header}.bmp");
}
