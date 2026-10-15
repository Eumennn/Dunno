// SPEC 09 K1: aksesuar uyumu. Gerçek sheet + anchors + aksesuar PNG'leri, uygulamanın yerleştirme kuralı (placeAccessory,
// dress.ts/composeFrame ile aynı: kare içi, duvar kırpması clipRight, tüy önde).
// 1) anchors.json dik pozlarda pikselden ölçülenle aynı (measure.ts): yürürken/koşarken kafa ile kulak/göz birlikte.
// 2) her aksesuar x her durum x her kare x {sağ, sol} x her boyut: görünen aksesuarın bağlandığı noktaya göre konumu
//    bir durumun bütün karelerinde aynı (±0): kare kare titreme/kayma yok.
// 3) görünen aksesuar pikselleri gövde konturunun dışına taşmaz; izin aksesuar JSON'undaki overflow (top/side/bottom) kadar.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import sheetJson from "../assets/dunno_sheet.json";
import { parseSheet } from "../src/player/sheet";
import { SIZE_LEVELS, sizeScale } from "../src/size/size";
import { overflowOf, placeAccessory, type Accessory, type AnchorsFile } from "../src/wardrobe/accessories";
import { measureFrame } from "../src/wardrobe/measure";
import { frameRects } from "../src/wardrobe/render";
// @ts-expect-error saf .mjs, tip yok
import { decodePng } from "./png.mjs";

type Px = { data: Uint8ClampedArray; width: number; height: number };
const content = new URL("../../content/", import.meta.url);
const json = (p: string) => JSON.parse(readFileSync(new URL(p, content), "utf8"));
const png = (u: URL): Px => decodePng(readFileSync(u));

const sheet = parseSheet(sheetJson);
const rects = frameRects(sheet);
const raw = png(new URL("../assets/dunno_sheet.png", import.meta.url));
const anchors = json("art/dunno_anchors.json") as AnchorsFile;
const accessories = readdirSync(new URL("wardrobe/accessories/", content))
  .filter((f) => f.endsWith(".json"))
  .map((f) => {
    const acc = json(`wardrobe/accessories/${f}`) as Accessory;
    return { acc, pixels: png(new URL(`wardrobe/accessories/${acc.image}`, content)) };
  });

const INK = [43, 30, 47] as const;
const FACE = [255, 241, 214] as const;
/** dik pozlar: ölçüm tanımı bunlar için (sleep yatık, peek duvarda: elle ayarlı) */
const UPRIGHT = ["idle", "shrug", "walk", "talk", "run_away", "sulk", "shh", "dragged"];
const W = 32;

const point = (i: number, k: string) => {
  const p = (anchors.frames[i].points as Record<string, { x: number; y: number } | { hidden: string }>)[k];
  return p && !("hidden" in p) ? p : null;
};

/** sheet'ten tek kare (W x W RGBA) */
function frameOf(p: Px, i: number): Uint8ClampedArray {
  const r = rects[i];
  const d = new Uint8ClampedArray(W * W * 4);
  for (let y = 0; y < W; y++) d.set(p.data.subarray(((r.y + y) * p.width + r.x) * 4, ((r.y + y) * p.width + r.x + W) * 4), y * W * 4);
  return d;
}

/** Karede görünen aksesuar pikselleri (sağa bakış, kare koordinatı): kare içi, duvarın önü, tüy önde ise tüyün altında kalmayanlar. */
function visiblePixels(i: number, acc: Accessory, pixels: Px, body: Uint8ClampedArray, occlude = true): { x: number; y: number }[] | null {
  const place = placeAccessory(anchors, i, acc);
  if (!place) return null;
  const head = point(i, "head");
  const right = Math.min(W, place.clipRight ?? W);
  const out: { x: number; y: number }[] = [];
  for (let y = 0; y < pixels.height; y++) {
    for (let x = 0; x < pixels.width; x++) {
      if (pixels.data[(y * pixels.width + x) * 4 + 3] === 0) continue;
      const fx = place.x + x;
      const fy = place.y + y;
      if (fx < 0 || fy < 0 || fx >= right || fy >= W) continue;
      if (occlude && place.antennaInFront && head && fy < head.y && body[(fy * W + fx) * 4 + 3] > 0) continue;
      out.push({ x: fx, y: fy });
    }
  }
  return out;
}

/** satırdaki gövde aralığı [ilk, son] (opak piksel), yoksa null */
function span(body: Uint8ClampedArray, y: number): [number, number] | null {
  let lo = W;
  let hi = -1;
  for (let x = 0; x < W; x++) {
    if (body[(y * W + x) * 4 + 3] > 0) {
      lo = Math.min(lo, x);
      hi = Math.max(hi, x);
    }
  }
  return hi < 0 ? null : [lo, hi];
}

describe("anchor ölçümü (K1)", () => {
  it("dik pozlarda kafa, kulak (x) ve göz (x) pikselden ölçülenle aynı", () => {
    anchors.frames.forEach((f, i) => {
      if (!UPRIGHT.includes(f.tag)) return;
      const m = measureFrame(frameOf(raw, i), W, W, INK, FACE)!;
      expect(point(i, "head"), `kare ${i} ${f.tag} head`).toEqual(m.head);
      expect(point(i, "ears")?.x, `kare ${i} ${f.tag} ears.x`).toBe(m.ears.x);
      const eyes = point(i, "eyes");
      if (eyes && m.eyes) expect(eyes.x, `kare ${i} ${f.tag} eyes.x`).toBe(m.eyes.x);
    });
  });

  it("göz ve kulak her durumda kafayla birlikte iner/kalkar (kafaya göre fark sabit; göz kırpmada da aynı yer)", () => {
    for (const tag of new Set(anchors.frames.map((f) => f.tag))) {
      if (tag === "sleep") continue; // yatık poz: kafa nefesle iner, göz yerinde; kafa/göz aksesuarları uykuda gizli
      const idx = anchors.frames.map((f, i) => (f.tag === tag ? i : -1)).filter((i) => i >= 0);
      for (const k of ["eyes", "ears"]) {
        const d = idx.map((i) => {
          const p = point(i, k);
          const h = point(i, "head")!;
          return p ? `${p.x - h.x},${p.y - h.y}` : "-";
        });
        expect(new Set(d).size, `${tag} ${k}: ${d.join(" ")}`).toBe(1);
      }
    }
  });
});

describe("aksesuar uyumu (K1): her aksesuar x durum x kare x yön x boyut", () => {
  for (const { acc, pixels } of accessories) {
    const ov = overflowOf(acc);
    it(`${acc.id}: bağlandığı noktaya göre sabit, kontur dışına taşmıyor (overflow ${JSON.stringify(ov)})`, () => {
      /** durum | yön | boyut -> ilk karedeki konum (bağlantı noktasına göre) */
      const first = new Map<string, string>();
      rects.forEach((_, i) => {
        const tag = anchors.frames[i].tag;
        const body = frameOf(raw, i);
        const vis = visiblePixels(i, acc, pixels, body);
        if (!vis || vis.length === 0) return;
        const anchor = point(i, acc.anchor)!;
        const headY = point(i, "head")?.y ?? 0;
        let bottom = W - 1;
        while (bottom > 0 && !span(body, bottom)) bottom--;
        // kontur (sağa bakış; ayna simetrik olduğu için sol bakışta da aynı sonuç)
        for (const { x, y } of vis) {
          // kafa çizgisi satırı ve üstü: kafanın ilk tam satırının genişliği
          const s = y <= headY ? span(body, headY + 1) : span(body, Math.min(y, bottom));
          const where = `${tag} kare ${i} (${x},${y})`;
          expect(s, `${acc.id} ${where}: gövde satırı yok`).not.toBeNull();
          expect(x >= s![0] - ov.side && x <= s![1] + ov.side, `${acc.id} ${where}: yanda kontur dışı ${s}`).toBe(true);
          if (y < headY) expect(headY - y <= ov.top, `${acc.id} ${where}: kafa çizgisinin ${headY - y} px üstü`).toBe(true);
          if (y > bottom) expect(y - bottom <= ov.bottom, `${acc.id} ${where}: gövdenin ${y - bottom} px altı`).toBe(true);
        }
        // kayma: duvarda kırpılan kareler hariç (kırpma kendisi değişken). Konum tüyün örtmesinden önceki piksellerle:
        // tüy kıpırdayınca üstünü farklı örter (tüy önde katmanı), aksesuar yerinden oynamaz.
        if (placeAccessory(anchors, i, acc)!.clipRight !== undefined) return;
        const placed = visiblePixels(i, acc, pixels, body, false)!;
        for (const facing of ["right", "left"] as const) {
          // sola bakış: Player birleşmiş kareyi aynalar; nokta da aynalanır (x -> W-1-x)
          const xs = placed.map((p) => (facing === "left" ? W - 1 - p.x : p.x));
          const ax = facing === "left" ? W - 1 - anchor.x : anchor.x;
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...placed.map((p) => p.y));
          const maxY = Math.max(...placed.map((p) => p.y));
          for (const level of SIZE_LEVELS) {
            const k = sizeScale(level);
            const off = [(minX - ax) * k, (minY - anchor.y) * k, (maxX - minX + 1) * k, (maxY - minY + 1) * k, placed.length].join(",");
            const key = `${tag}|${facing}|${level}`;
            const was = first.get(key);
            if (was === undefined) first.set(key, off);
            else expect(off, `${acc.id} ${tag} kare ${i} ${facing} ${level}: kayma`).toBe(was);
          }
        }
      });
      expect(first.size).toBeGreaterThan(0);
    });
  }
});
