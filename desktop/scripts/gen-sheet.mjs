// Gerçek Dunno sprite sheet'i: scripts/sprites/ haritalarından 32x32 kareler.
// Çıktı: assets/dunno_sheet.png + .json (Aseprite hash, frameTags = durumlar; Aseprite "Import Sprite Sheet" ile açılır),
//        ../content/art/dunno_sheet_32.png (tasarımcı için büyütülmemiş kopya),
//        assets/logo_icon_{16,22,32,256,1024}.png (logo pozu, en yakın komşu),
//        src-tauri/icons/{32x32,64x64,128x128,128x128@2x,icon}.png + icon.ico (uygulama + tray; keskin piksel).
// Kullanım: npm run gen:sheet
import { mkdirSync, writeFileSync } from "node:fs";
import { SIZE, PALETTE } from "./sprites/grid.mjs";
import { logo } from "./sprites/poses.mjs";
import { STATES } from "./sprites/states.mjs";

import { createImage, encodePng, hex } from "./png.mjs";

export { STATES };

const COLORS = Object.fromEntries(Object.entries(PALETTE).map(([k, v]) => [k, hex(v)]));

function drawGrid(img, grid, ox, oy, scale = 1) {
  grid.rows().forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c !== ".") img.fillRect(ox + x * scale, oy + y * scale, scale, scale, COLORS[c]);
    }),
  );
}

/** PNG gömülü .ico (Vista+): başlık + dizin + PNG verileri. */
function ico(entries) {
  const head = Buffer.alloc(6);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(entries.length, 4);
  let offset = 6 + 16 * entries.length;
  const dirs = entries.map(([size, png]) => {
    const d = Buffer.alloc(16);
    d[0] = size >= 256 ? 0 : size;
    d[1] = size >= 256 ? 0 : size;
    d.writeUInt16LE(1, 4); // renk düzlemi
    d.writeUInt16LE(32, 6); // bit/piksel
    d.writeUInt32LE(png.length, 8);
    d.writeUInt32LE(offset, 12);
    offset += png.length;
    return d;
  });
  return Buffer.concat([head, ...dirs, ...entries.map(([, png]) => png)]);
}

function main() {
  const names = Object.keys(STATES);
  const cols = Math.max(...names.map((n) => STATES[n][1].length));
  const img = createImage(cols * SIZE, names.length * SIZE);
  const frames = {};
  const frameTags = [];
  let index = 0;
  names.forEach((name, row) => {
    const [ms, grids] = STATES[name];
    frameTags.push({ name, from: index, to: index + grids.length - 1, direction: "forward" });
    grids.forEach((grid, n) => {
      const x = n * SIZE;
      const y = row * SIZE;
      drawGrid(img, grid, x, y);
      frames[`dunno ${index}.aseprite`] = {
        frame: { x, y, w: SIZE, h: SIZE },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: SIZE, h: SIZE },
        sourceSize: { w: SIZE, h: SIZE },
        duration: ms,
      };
      index++;
    });
  });

  const json = {
    frames,
    meta: {
      app: "dunno scripts/gen-sheet.mjs",
      version: "1",
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
  mkdirSync("../content/art", { recursive: true });
  const png = encodePng(img);
  writeFileSync("assets/dunno_sheet.png", png);
  writeFileSync("assets/dunno_sheet.json", JSON.stringify(json, null, 2) + "\n");
  writeFileSync("../content/art/dunno_sheet_32.png", png);

  // ikonlar: logo pozu, en yakın komşu ölçek
  const mark = logo();
  const icons = {};
  for (const size of [16, 22, 32, 64, 128, 256, 1024]) {
    const icon = createImage(size, size);
    if (size >= SIZE) {
      drawGrid(icon, mark, 0, 0, size / SIZE);
    } else {
      // küçültme: her hedef pikselde kaynak bloğun en koyu/opak örneği (kontur kaybolmasın)
      const k = SIZE / size;
      const rows = mark.rows();
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          let pick = ".";
          for (let j = 0; j < k && pick !== "K"; j++)
            for (let i = 0; i < k; i++) {
              const c = rows[Math.floor(y * k + j)]?.[Math.floor(x * k + i)] ?? ".";
              if (c === "K") { pick = "K"; break; }
              if (pick === "." && c !== ".") pick = c;
            }
          if (pick !== ".") icon.set(x, y, COLORS[pick]);
        }
    }
    icons[size] = encodePng(icon);
    if ([16, 22, 32, 256, 1024].includes(size)) writeFileSync(`assets/logo_icon_${size}.png`, icons[size]);
  }
  const dir = "src-tauri/icons";
  writeFileSync(`${dir}/32x32.png`, icons[32]);
  writeFileSync(`${dir}/64x64.png`, icons[64]);
  writeFileSync(`${dir}/128x128.png`, icons[128]);
  writeFileSync(`${dir}/128x128@2x.png`, icons[256]);
  writeFileSync(`${dir}/icon.png`, icons[1024]);
  writeFileSync(`${dir}/icon.ico`, ico([16, 32, 64, 256].map((s) => [s, icons[s]])));

  console.log(`assets/dunno_sheet.png ${img.width}x${img.height}, ${index} frames, ${frameTags.length} tags; icons 16/22/32/256/1024`);
}

main();
