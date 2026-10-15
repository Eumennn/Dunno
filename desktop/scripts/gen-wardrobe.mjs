// Wardrobe varlıkları (SPEC 05 W2): sprite bağlantı noktaları + aksesuar PNG/JSON.
// Çıktı: ../content/art/dunno_anchors.json (sheet karesi başına head/antenna/eyes/ears noktası ya da bilinçli gizli + poz tablosu),
//        ../content/wardrobe/accessories/<id>.png (32x32, bağlantı pikseli (16,16)) + <id>.json.
//        ../content/wardrobe/costumes/<id>.json + <id>.<part>.png + <id>.png (dolap simgesi) (SPEC 09 K2).
// Sheet'e dokunmaz (pikseller gen-sheet.mjs'de). Kullanım: node scripts/gen-wardrobe.mjs [--preview <png yolu>]
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createImage, encodePng, hex } from "./png.mjs";
import { ACCESSORIES, ACCESSORY_PALETTE } from "./sprites/accessories.mjs";
import { COSTUMES, EVOLUTION_COSTUMES, HIDDEN_COSTUMES } from "./sprites/costumes.mjs";
import { PALETTE, SIZE } from "./sprites/grid.mjs";
import { STATES } from "./sprites/states.mjs";

export const POINTS = ["head", "antenna", "eyes", "ears", "neck"];
const PIVOT = 16;

/** Sheet kare sırasıyla (gen-sheet.mjs ile aynı sıra) her karenin noktaları. */
export function anchorFrames() {
  const frames = [];
  for (const [tag, [, grids]] of Object.entries(STATES)) {
    grids.forEach((grid, n) => {
      const index = frames.length;
      const points = {};
      for (const name of POINTS) points[name] = grid.points[name] ?? { hidden: "not marked" };
      const f = { frame: `dunno ${index}.aseprite`, index, tag, n, points };
      if (grid.edge !== null) f.clipRight = grid.edge;
      frames.push(f);
    });
  }
  return frames;
}

/** Durum -> gizli noktalar ve gerekçeleri (tasarımcı için özet). */
export function poseTable(frames) {
  const table = {};
  for (const f of frames) {
    for (const [name, p] of Object.entries(f.points)) {
      if (!p.hidden) continue;
      table[f.tag] ??= {};
      const reasons = new Set((table[f.tag][name] ?? "").split("; ").filter(Boolean));
      reasons.add(`${p.hidden} (frame ${f.n})`);
      table[f.tag][name] = [...reasons].join("; ");
    }
  }
  return table;
}

export function anchorsJson() {
  const frames = anchorFrames();
  return {
    size: SIZE,
    points: POINTS,
    note: "üretilir: node scripts/gen-wardrobe.mjs; kare sırası/adı assets/dunno_sheet.json ile aynı",
    frames,
    hidden: poseTable(frames),
  };
}

/** Aksesuar haritası 32x32 harf ızgarasına (origin -> PIVOT). */
export function accessoryGrid(acc) {
  const rows = Array.from({ length: SIZE }, () => Array(SIZE).fill("."));
  const [ox, oy] = acc.origin;
  acc.map.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c === ".") return;
      const X = PIVOT - ox + x;
      const Y = PIVOT - oy + y;
      if (X >= 0 && Y >= 0 && X < SIZE && Y < SIZE) rows[Y][X] = c;
    }),
  );
  return rows.map((r) => r.join(""));
}

export function accessoryJson(acc) {
  return {
    id: acc.id,
    name: acc.name,
    anchor: acc.anchor,
    slot: acc.slot,
    pivot: { x: PIVOT, y: PIVOT },
    antenna: acc.antenna,
    hiddenIn: acc.hiddenIn,
    image: `${acc.id}.png`,
    size: SIZE,
    ...(acc.overflow ? { overflow: acc.overflow } : {}),
  };
}

/**
 * Dolap simgesi (UX-01): idle ilk karede Dunno aksesuarı giymiş (32x32); tüy "through" ise önde. Kutucukta aksesuar tek başına
 * küçük ve bağlamsızdı. Dosya: <id>.icon.png (yükleyici sadece <id>.png'yi aksesuar görüntüsü olarak kullanır).
 */
export function accessoryIconRows(acc) {
  const g = STATES.idle[1][0];
  const body = g.rows();
  const rows = body.map((r) => [...r]);
  const at = g.points[acc.anchor];
  accessoryGrid(acc).forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const X = x + at.x - PIVOT;
      const Y = y + at.y - PIVOT;
      if (ch !== "." && rows[Y] && X >= 0 && X < SIZE) rows[Y][X] = ch.toLowerCase();
    }),
  );
  if (acc.antenna === "through") {
    for (let y = 0; y < g.points.head.y; y++) [...body[y]].forEach((ch, x) => ch !== "." && (rows[y][x] = ch));
  }
  return rows.map((r) => r.join(""));
}

export function accessoryIconPng(acc) {
  // küçük harf = aksesuar paleti, büyük harf = gövde paleti (aynı harfler farklı renk olabilir: aksesuar tema boyanmaz)
  const palette = { ...PALETTE };
  for (const [k, v] of Object.entries(ACCESSORY_PALETTE)) palette[k.toLowerCase()] = v;
  const img = createImage(SIZE, SIZE);
  draw(img, accessoryIconRows(acc), 0, 0, palette);
  return encodePng(img);
}

/** Aksesuarın 32x32 PNG baytları. */
export function accessoryPng(acc) {
  const img = createImage(SIZE, SIZE);
  draw(img, accessoryGrid(acc), 0, 0, ACCESSORY_PALETTE);
  return encodePng(img);
}

function draw(img, rows, ox, oy, palette, scale = 1) {
  rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c !== ".") img.fillRect(ox + x * scale, oy + y * scale, scale, scale, hex(palette[c]));
    }),
  );
}

// ------------------------------------------------------------------ kostümler (SPEC 09 K2)

const CLASSIC_ROLES = { body: "#F2A65A", shade: "#D9774A", light: "#FFD29A", belly: "#FFF1D6" };
const ROLE_LETTER = { O: "body", S: "shade", L: "light", C: "belly" };

/** Kostüm parçalarının harf paleti: K P B W sabit, O S L C kostümün rol renkleri (yoksa classic). */
export function costumePalette(c) {
  const roles = { ...CLASSIC_ROLES, ...(c.palette ?? {}) };
  // A / D: ana paletin turuncuları (#F2A65A / #D9774A), kostüm rengi ne olursa olsun (ördek gagası gibi)
  const out = { ...ACCESSORY_PALETTE, A: "#F2A65A", D: "#D9774A" };
  for (const [letter, role] of Object.entries(ROLE_LETTER)) out[letter] = roles[role];
  return out;
}

/** `only` -> hiddenIn (diğer tüm durumlar) ile birleşik gizli liste. */
function partHidden(part) {
  const tags = Object.keys(STATES);
  const hidden = new Set(part.hiddenIn ?? []);
  if (part.only) for (const t of tags) if (!part.only.includes(t)) hidden.add(t);
  return tags.filter((t) => hidden.has(t));
}

export function costumeJson(c) {
  return {
    id: c.id,
    name: c.name,
    ...(c.palette ? { palette: c.palette } : {}),
    ...(c.bands ? { bands: c.bands } : {}),
    hidesTuft: c.hidesTuft,
    blocks: c.blocks,
    parts: c.parts.map((p) => ({
      id: p.id,
      anchor: p.anchor,
      pivot: { x: PIVOT, y: PIVOT },
      hiddenIn: partHidden(p),
      ...(p.frames ? { frames: p.frames } : {}),
      image: `${c.id}.${p.id}.png`,
      size: SIZE,
    })),
    icon: `${c.id}.png`,
  };
}

export function costumePartPng(c, part) {
  const img = createImage(SIZE, SIZE);
  draw(img, accessoryGrid(part), 0, 0, costumePalette(c));
  return encodePng(img);
}

/** Dolap simgesi: idle ilk kare, kostüm renkleri + şeritler + (çift karede görünen) parçalar, tüy gizliyse tüysüz. */
export function costumeIconRows(c) {
  const g = STATES.idle[1][0];
  const rows = g.rows().map((r) => [...r]);
  const headY = g.points.head.y;
  if (c.hidesTuft) for (let y = 0; y < headY; y++) rows[y] = rows[y].map((ch) => (ch === "K" || ch === "O" ? "." : ch));
  (c.bands ?? []).forEach((b, i) => {
    const at = g.points[b.anchor];
    for (const dy of b.rows) {
      const y = at.y + dy;
      if (rows[y]) rows[y] = rows[y].map((ch) => (ch === "O" || ch === "S" || ch === "L" ? String(i + 1) : ch));
    }
  });
  for (const p of c.parts) {
    if (partHidden(p).includes("idle") || p.frames === "odd") continue;
    const at = g.points[p.anchor];
    accessoryGrid(p).forEach((row, y) =>
      [...row].forEach((ch, x) => {
        const X = x + at.x - PIVOT;
        const Y = y + at.y - PIVOT;
        if (ch !== "." && rows[Y] && X >= 0 && X < SIZE) rows[Y][X] = ch;
      }),
    );
  }
  return rows.map((r) => r.join(""));
}

export function costumeIconPng(c) {
  const palette = { ...PALETTE, ...costumePalette(c) };
  (c.bands ?? []).forEach((b, i) => (palette[String(i + 1)] = b.color));
  const img = createImage(SIZE, SIZE);
  draw(img, costumeIconRows(c), 0, 0, palette);
  return encodePng(img);
}

/** Önizleme: her aksesuar idle ilk karesi üstünde, 4x (tasarımcı/PM için). */
function preview(path) {
  const scale = 4;
  const cell = SIZE * scale + 16;
  const top = 16 + 10 * scale; // uzun şapkalar (aşçı, sihirbaz) kafa çizgisinin ~9 px üstüne çıkar
  const img = createImage(cell * ACCESSORIES.length + 16, cell + top);
  img.fillRect(0, 0, img.width, img.height, hex("#FFD29A"));
  const idle = STATES.idle[1][0];
  const anchors = idle.points;
  ACCESSORIES.forEach((acc, i) => {
    const x0 = 16 + i * cell;
    img.fillRect(x0 - 4, top - 4 - 10 * scale, SIZE * scale + 8, SIZE * scale + 8 + 10 * scale, hex("#FFF1D6"));
    const at = anchors[acc.anchor];
    const body = idle.rows();
    const accRows = accessoryGrid(acc);
    const dx = at.x - PIVOT;
    const dy = at.y - PIVOT;
    const drawAcc = () => draw(img, accRows, x0 + dx * scale, top + dy * scale, ACCESSORY_PALETTE, scale);
    draw(img, body, x0, top, PALETTE, scale);
    drawAcc();
    // through: tüy (kafa çizgisinin üstü) aksesuarın önünde, compose.ts ile aynı sıra
    if (acc.antenna === "through") draw(img, body.slice(0, anchors.head.y), x0, top, PALETTE, scale);
  });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, encodePng(img));
  console.log(`wrote ${path}`);
}

function main() {
  mkdirSync("../content/art", { recursive: true });
  mkdirSync("../content/wardrobe/accessories", { recursive: true });
  writeFileSync("../content/art/dunno_anchors.json", JSON.stringify(anchorsJson(), null, 2) + "\n");
  for (const acc of ACCESSORIES) {
    writeFileSync(`../content/wardrobe/accessories/${acc.id}.png`, accessoryPng(acc));
    writeFileSync(`../content/wardrobe/accessories/${acc.id}.json`, JSON.stringify(accessoryJson(acc), null, 2) + "\n");
    writeFileSync(`../content/wardrobe/accessories/${acc.id}.icon.png`, accessoryIconPng(acc));
  }
  mkdirSync("../content/wardrobe/costumes", { recursive: true });
  for (const c of COSTUMES) {
    writeFileSync(`../content/wardrobe/costumes/${c.id}.json`, JSON.stringify(costumeJson(c), null, 2) + "\n");
    writeFileSync(`../content/wardrobe/costumes/${c.id}.png`, costumeIconPng(c));
    for (const p of c.parts) writeFileSync(`../content/wardrobe/costumes/${c.id}.${p.id}.png`, costumePartPng(c, p));
  }
  // SPEC 14 gizli yaratıklar: dolap klasörü dışında (dolap listesinde görünmez)
  mkdirSync("../content/eggs/costumes", { recursive: true });
  // SPEC 17 evrim formları da gizli (dolapta yok; evrimle gelir)
  for (const c of [...HIDDEN_COSTUMES, ...EVOLUTION_COSTUMES]) {
    writeFileSync(`../content/eggs/costumes/${c.id}.json`, JSON.stringify(costumeJson(c), null, 2) + "\n");
    writeFileSync(`../content/eggs/costumes/${c.id}.png`, costumeIconPng(c));
    for (const p of c.parts) writeFileSync(`../content/eggs/costumes/${c.id}.${p.id}.png`, costumePartPng(c, p));
  }
  console.log(`anchors: ${anchorFrames().length} frames; accessories: ${ACCESSORIES.map((a) => a.id).join(", ")}; costumes: ${COSTUMES.map((c) => c.id).join(", ")}`);
  const i = process.argv.indexOf("--preview");
  if (i > 0 && process.argv[i + 1]) preview(process.argv[i + 1]);
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("scripts/gen-wardrobe.mjs")) main();
