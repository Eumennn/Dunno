// SPEC 09 K2: kostümler uygulamanın çizim yolunda (dress.ts). Gerçek sheet, anchors, kostüm json + parça PNG'leri.
// - her parça, çizildiği her karede tamamen karenin içinde (sessizce kesilmiyor; peek duvarı hariç), bağlandığı noktaya göre sabit
// - hidesTuft: kafa çizgisinin üstünde parça dışında tüy pikseli kalmaz
// - blocks: kapatılan slottaki aksesuar çizilmez (giydirilmiş sheet aksesuarsız haliyle aynı); kapatılmayan slot çizilir
// - sinek/arı kanadı yürürken kare kare değişir (çırpma)
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import sheetJson from "../assets/dunno_sheet.json";
import { parseSheet } from "../src/player/sheet";
import { slotOf, type Accessory, type AnchorsFile } from "../src/wardrobe/accessories";
import { placePart, type Costume } from "../src/wardrobe/costumes";
import { dressSheet, type WornCostume } from "../src/wardrobe/dress";
import { frameRects } from "../src/wardrobe/render";
import { COSTUMES as COSTUME_IDS } from "../src/wardrobe/wardrobe";
// @ts-expect-error saf .mjs, tip yok
import { decodePng } from "./png.mjs";
// @ts-expect-error saf .mjs, tip yok
import { ACCESSORY_PALETTE } from "./sprites/accessories.mjs";

type Px = { data: Uint8ClampedArray; width: number; height: number };
const content = new URL("../../content/", import.meta.url);
const json = (p: string) => JSON.parse(readFileSync(new URL(p, content), "utf8"));
const png = (p: string): Px => decodePng(readFileSync(new URL(p, content)));

const sheet = parseSheet(sheetJson);
const rects = frameRects(sheet);
const raw: Px = decodePng(readFileSync(new URL("../assets/dunno_sheet.png", import.meta.url)));
const anchors = json("art/dunno_anchors.json") as AnchorsFile;
const readCostumes = (dir: string): WornCostume[] =>
  readdirSync(new URL(dir, content))
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const costume = json(`${dir}${f}`) as Costume;
      return { costume, parts: new Map(costume.parts.map((p) => [p.id, png(`${dir}${p.image}`)])) };
    });
const wardrobeCostumes = readCostumes("wardrobe/costumes/");
// SPEC 14 gizli yaratıklar (canavar, glitch): aynı kurallar
const hiddenCostumes = readCostumes("eggs/costumes/");
const costumes: WornCostume[] = [...wardrobeCostumes, ...hiddenCostumes];
const accessories = readdirSync(new URL("wardrobe/accessories/", content))
  .filter((f) => f.endsWith(".json"))
  .map((f) => {
    const acc = json(`wardrobe/accessories/${f}`) as Accessory;
    return { acc, pixels: png(`wardrobe/accessories/${acc.image}`) };
  });

const W = 32;
function frame(data: Uint8ClampedArray, i: number): Uint8ClampedArray {
  const r = rects[i];
  const d = new Uint8ClampedArray(W * W * 4);
  for (let y = 0; y < W; y++) d.set(data.subarray(((r.y + y) * raw.width + r.x) * 4, ((r.y + y) * raw.width + r.x + W) * 4), y * W * 4);
  return d;
}
const hex = (d: ArrayLike<number>, i: number) => "#" + [d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, "0").toUpperCase()).join("");

describe("kostümler (K2, uygulama render yolu)", () => {
  it("20 kostüm yüklü (SPEC 09 K2: 8, SPEC 12: 12 yaratık)", () => expect(wardrobeCostumes.map((c) => c.costume.id).sort()).toEqual([...COSTUME_IDS].sort()));
  it("kostüm gövde/şerit renkleri temalardan (palet dışı renk yok)", () => {
    const t = json("wardrobe/themes.json") as { fixed: Record<string, string>; themes: { colors: Record<string, string>; ui?: Record<string, unknown> }[] };
    const allowed = new Set<string>([...Object.values(ACCESSORY_PALETTE as Record<string, string>), ...Object.values(t.fixed), ...t.themes.flatMap((x) => [...Object.values(x.colors), ...Object.values(x.ui ?? {}).filter((v): v is string => typeof v === "string")])]);
    for (const { costume } of costumes) {
      for (const v of [...Object.values(costume.palette ?? {}), ...(costume.bands ?? []).map((b) => b.color)]) {
        expect(allowed.has(v), `${costume.id}: ${v}`).toBe(true);
      }
    }
  });
  it("2 gizli yaratık (SPEC 14) + 7 evrim formu (SPEC 17), dolap listesinde yok", () => {
    expect(hiddenCostumes.map((c) => c.costume.id).sort()).toEqual([
      "egg_glitch",
      "egg_monster",
      "evo_chaos",
      "evo_chill",
      "evo_cloud",
      "evo_demon",
      "evo_glitchling",
      "evo_gremlin",
      "evo_sloth",
    ]);
    for (const c of hiddenCostumes) expect(COSTUME_IDS as readonly string[]).not.toContain(c.costume.id);
  });

  for (const wc of costumes) {
    const c = wc.costume;
    it(`${c.id}: parçalar karenin içinde ve noktaya göre sabit`, () => {
      for (const part of c.parts) {
        const px = wc.parts.get(part.id)!;
        const first = new Map<string, string>();
        let drawn = 0;
        rects.forEach((_, i) => {
          const place = placePart(anchors, i, c, part);
          if (!place) return;
          drawn++;
          const pts: string[] = [];
          for (let y = 0; y < px.height; y++)
            for (let x = 0; x < px.width; x++) {
              if (px.data[(y * px.width + x) * 4 + 3] === 0) continue;
              const fx = place.x + x;
              const fy = place.y + y;
              if (place.clipRight !== undefined && fx >= place.clipRight) continue;
              expect(fx >= 0 && fy >= 0 && fx < W && fy < W, `${c.id}.${part.id} kare ${i} (${fx},${fy}) kare dışı`).toBe(true);
              pts.push(`${fx},${fy}`);
            }
          if (place.clipRight !== undefined) return;
          const f = anchors.frames[i];
          const a = f.points[part.anchor] as { x: number; y: number };
          const rel = `${place.x - a.x},${place.y - a.y}`;
          const was = first.get(f.tag);
          if (was === undefined) first.set(f.tag, rel);
          else expect(rel, `${c.id}.${part.id} ${f.tag} kare ${f.n}: kayma`).toBe(was);
        });
        expect(drawn, `${c.id}.${part.id} hiç çizilmiyor`).toBeGreaterThan(0);
      }
    });

    it(`${c.id}: tüy gizleme, kapatılan slotlar`, () => {
      const dressed = dressSheet(raw, rects, anchors, null, null, wc);
      if (c.hidesTuft) {
        const ink = "#2B1E2F";
        const body = new Set([c.palette?.body, c.palette?.shade, c.palette?.light].filter(Boolean));
        // parçasız kostüm: kafa çizgisinin üstünde kontur/gövde rengi kalmaz
        const bare = dressSheet(raw, rects, anchors, null, null, { costume: { ...c, parts: [] }, parts: new Map() });
        rects.forEach((_, i) => {
          const head = anchors.frames[i].points.head;
          if ("hidden" in head) return;
          const d = frame(bare, i);
          for (let y = 0; y < head.y; y++)
            for (let x = 0; x < W; x++) {
              const k = (y * W + x) * 4;
              if (d[k + 3] === 0) continue;
              const h = hex(d, k);
              expect(h !== ink && !body.has(h), `${c.id} kare ${i} (${x},${y}) tüy kaldı ${h}`).toBe(true);
            }
        });
      }
      for (const a of accessories) {
        const withAcc = dressSheet(raw, rects, anchors, null, [a], wc);
        const blocked = c.blocks.includes(slotOf(a.acc));
        const same = Buffer.compare(Buffer.from(withAcc), Buffer.from(dressed)) === 0;
        expect(same, `${c.id} + ${a.acc.id} (${slotOf(a.acc)}): ${blocked ? "kapalı slot çizildi" : "açık slot çizilmedi"}`).toBe(blocked);
      }
    });
  }

  it("sinek ve arı: yürürken kanat kare kare çırpar", () => {
    for (const id of ["fly", "bee"]) {
      const wc = costumes.find((x) => x.costume.id === id)!;
      const d = dressSheet(raw, rects, anchors, null, null, wc);
      const walk = anchors.frames.map((f, i) => (f.tag === "walk" ? i : -1)).filter((i) => i >= 0);
      const wingRows = (i: number) => {
        // kanat satırları: gövdenin dışı (x < 6), kafa noktası çevresi
        const f = frame(d, i);
        let s = "";
        for (let y = 0; y < 20; y++) for (let x = 0; x < 6; x++) s += f[(y * W + x) * 4 + 3] ? "#" : ".";
        return s;
      };
      expect(wingRows(walk[0]), `${id} kare 0/1`).not.toBe(wingRows(walk[1]));
    }
  });
});
