// SPEC 07 FB1: uygulamanın çizim yolu (render.ts -> dress.ts) ile giydirilmiş sheet; gerçek sheet, anchors ve aksesuar PNG'leri.
// Her kare x her aksesuar: aksesuar pikseli karenin dışına ve kenar (clipRight, peek duvarı) arkasına çıkmaz;
// "through" aksesuarlarda tüy (kafa çizgisinin üstündeki gövde) önde kalır; gizli pozlarda kare değişmez.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import sheetJson from "../assets/dunno_sheet.json";
import { parseSheet } from "../src/player/sheet";
import { placeAccessory, type Accessory, type AnchorsFile } from "../src/wardrobe/accessories";
import { mirrorX } from "../src/wardrobe/compose";
import { dressSheet } from "../src/wardrobe/dress";
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
const themes = (json("wardrobe/themes.json") as { themes: { id: string; colors: Record<"body" | "shade" | "light" | "belly", string> }[] }).themes;
const anchors = json("art/dunno_anchors.json") as AnchorsFile;
const accessories = readdirSync(new URL("wardrobe/accessories/", content))
  .filter((f) => f.endsWith(".json"))
  .map((f) => {
    const acc = json(`wardrobe/accessories/${f}`) as Accessory;
    return { acc, pixels: png(new URL(`wardrobe/accessories/${acc.image}`, content)) };
  });

const at = (p: Px, x: number, y: number) => Array.from(p.data.subarray((y * p.width + x) * 4, (y * p.width + x) * 4 + 4));

describe("giydirilmiş sheet sınırları (uygulama render yolu)", () => {
  it("anchors ve sheet aynı kare sırası", () => {
    expect(anchors.frames.length).toBe(rects.length);
    expect(accessories.length).toBe(20); // SPEC 05 altı + SPEC 09 K6 on dört
  });

  // tüm temalar (SPEC 09 K5: 16): karşılaştırma tabanı aynı temanın aksesuarsız hali (tema boyası aksesuar sınırını değiştirmemeli)
  for (const theme of themes) {
    for (const { acc, pixels } of accessories) {
      it(`${theme.id} / ${acc.id}: kare/kenar dışına taşmaz, tüy önde, gizli pozda dokunulmaz`, () => {
        const base: Px = { data: dressSheet(raw, rects, anchors, theme.colors, null), width: raw.width, height: raw.height };
        const dressed = { data: dressSheet(raw, rects, anchors, theme.colors, { acc, pixels }), width: raw.width, height: raw.height };
        let drawnFrames = 0;
        rects.forEach((r, i) => {
          const place = placeAccessory(anchors, i, acc);
          const clip = Math.min(r.w, place?.clipRight ?? r.w);
          let changed = 0;
          // karenin içi: değişen piksel sadece kenarın önünde
          for (let y = 0; y < r.h; y++) {
            for (let x = 0; x < r.w; x++) {
              const a = at(base, r.x + x, r.y + y);
              const b = at(dressed, r.x + x, r.y + y);
              if (a.join() === b.join()) continue;
              changed++;
              expect(x, `${acc.id} kare ${i} (${anchors.frames[i].tag}) x=${x} kenar ${clip}`).toBeLessThan(clip);
            }
          }
          if (!place) {
            expect(changed, `${acc.id} gizli kare ${i}`).toBe(0);
            return;
          }
          if (changed > 0) drawnFrames++;
          // aynalı peek (sol kenar, facingForEdge "left"): Player tüm kareyi aynalar; duvar W-1-clip'e geçer,
          // değişen piksel duvarın sağında kalır, duvar sütunu ve ötesi (ekran dışı) dokunulmaz
          if (place.clipRight !== undefined) {
            const frameOf = (p: Px) => {
              const d = new Uint8ClampedArray(r.w * r.h * 4);
              for (let y = 0; y < r.h; y++) d.set(p.data.subarray(((r.y + y) * p.width + r.x) * 4, ((r.y + y) * p.width + r.x + r.w) * 4), y * r.w * 4);
              return mirrorX(d, r.w, r.h);
            };
            const mb = frameOf(base);
            const md = frameOf(dressed);
            const wall = r.w - 1 - clip;
            for (let y = 0; y < r.h; y++) {
              for (let x = 0; x <= wall; x++) {
                const k = (y * r.w + x) * 4;
                const same = [0, 1, 2, 3].every((j) => mb[k + j] === md[k + j]);
                expect(same, `${theme.id}/${acc.id} kare ${i} aynalı peek x=${x} duvar ${wall}`).toBe(true);
              }
            }
          }
          // tüy önde: kafa çizgisinin üstündeki opak gövde pikselleri değişmez
          const head = anchors.frames[i].points.head;
          if (place.antennaInFront && !("hidden" in head)) {
            for (let y = 0; y < head.y; y++) {
              for (let x = 0; x < r.w; x++) {
                const a = at(base, r.x + x, r.y + y);
                if (a[3] !== 0) expect(at(dressed, r.x + x, r.y + y)).toEqual(a);
              }
            }
          }
        });
        // aksesuar en az bir karede görünür
        expect(drawnFrames).toBeGreaterThan(0);
      });
    }
  }

  it("tüm temalar (>= 14, klasik ilk)", () => {
    expect(themes.length).toBeGreaterThanOrEqual(14);
    expect(themes[0].id).toBe("classic");
  });
});
