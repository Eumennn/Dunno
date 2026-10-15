// Yer tutucu uygulama ikonu üretir (bağımlılıksız PNG). Tasarımcının logo_icon_1024.png'si gelince silinir.
// Kullanım: npm run gen:icon; npx tauri icon assets/placeholder_icon_1024.png
import { mkdirSync, writeFileSync } from "node:fs";
import { createImage, encodePng, hex } from "./png.mjs";

const SIZE = 1024;
const BORDER = 64;

const img = createImage(SIZE, SIZE);
img.fillRect(0, 0, SIZE, SIZE, hex("#2B1E2F"));
img.fillRect(BORDER, BORDER, SIZE - 2 * BORDER, SIZE - 2 * BORDER, hex("#F2A65A"));

mkdirSync("assets", { recursive: true });
writeFileSync("assets/placeholder_icon_1024.png", encodePng(img));
console.log("assets/placeholder_icon_1024.png");
