// wardrobe:shots betiğinin hücreleri: ayna kaydırmaz, tüy katmanı doğru, gizli pozlar boş.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { placeAccessory } from "../src/wardrobe/accessories";
import { composeFrame, mirrorX } from "../src/wardrobe/compose";
// @ts-expect-error saf .mjs, tip yok
import { decodePng } from "./png.mjs";
// @ts-expect-error saf .mjs, tip yok
import { cellPixels, loadSheet, POSES } from "./wardrobe-shots.mjs";

type Px = { data: Uint8ClampedArray; width: number; height: number };
const content = new URL("../../content/", import.meta.url);
const json = (p: string) => JSON.parse(readFileSync(new URL(p, content), "utf8"));
const sheet = loadSheet(new URL("../assets/dunno_sheet.png", import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const anchors = json("art/dunno_anchors.json");
const accessories = readdirSync(new URL("wardrobe/accessories/", content))
  .filter((f) => f.endsWith(".json"))
  .map((f) => {
    const acc = json(`wardrobe/accessories/${f}`);
    const img = decodePng(readFileSync(new URL(`wardrobe/accessories/${acc.image}`, content)));
    return { acc, pixels: { data: img.data, width: img.width, height: img.height } };
  });
const pose = (label: string) => POSES.find((p: { label: string }) => p.label === label);

describe("wardrobe shots", () => {
  it("peek on the left edge is the exact mirror of the right edge, accessory included", () => {
    for (const a of accessories) {
      const left: Px | null = cellPixels(sheet, anchors, null, pose("peek sol"), a);
      const right: Px | null = cellPixels(sheet, anchors, null, pose("peek sag"), a);
      expect(left === null, a.acc.id).toBe(right === null);
      if (left && right) expect([...left.data], a.acc.id).toEqual([...mirrorX(right.data, right.width, right.height)]);
    }
  });

  it("antenna through: every antenna pixel stays on top; behind: the accessory covers it", () => {
    const idle = sheet.frameOf("idle");
    const headY = anchors.frames[idle].points.head.y;
    const body: Px = sheet.cut(sheet.img.data, idle);
    for (const a of accessories) {
      const out: Px = cellPixels(sheet, anchors, null, pose("idle"), a)!;
      let covered = 0;
      for (let i = 0; i < headY * body.width * 4; i += 4) {
        if (body.data[i + 3] === 0) continue;
        const same = [0, 1, 2, 3].every((k) => out.data[i + k] === body.data[i + k]);
        if (a.acc.antenna === "through") expect(same, a.acc.id).toBe(true);
        else if (!same) covered++;
      }
      if (a.acc.antenna === "behind" && a.acc.anchor === "head") expect(covered, a.acc.id).toBeGreaterThan(0);
    }
  });

  // PM WR2b: göz/kulak aksesuarı gövde kutusunun yatayda 1 px dışına taşmaz; şapka kafa genişliği + 2 px içinde
  // ve 32x32 tuvalden taşmaz. Sheet'in her karesi, gizli olanlar hariç; ekran kenarının arkası (clipRight) çizilmez.
  it("accessories stay within the body / head box on every frame", () => {
    const EFFECT = [0x6e, 0xc5, 0xe9]; // zzz, ter: gövde değil
    const problems: string[] = [];
    for (let i = 0; i < anchors.frames.length; i++) {
      const f = anchors.frames[i];
      const body: Px = sheet.cut(sheet.img.data, i);
      const isBody = (x: number, y: number) => {
        const k = (y * body.width + x) * 4;
        return body.data[k + 3] > 0 && !EFFECT.every((v, j) => body.data[k + j] === v);
      };
      const span = (ys: number[]) => {
        let lo = Infinity;
        let hi = -Infinity;
        for (const y of ys) for (let x = 0; x < body.width; x++) if (isBody(x, y)) [lo, hi] = [Math.min(lo, x), Math.max(hi, x)];
        return [lo, hi];
      };
      const [bodyL, bodyR] = span([...Array(body.height).keys()]);
      const ears = f.points.ears;
      const [headL, headR] = span(["hidden" in ears ? f.points.eyes.y : ears.y]);
      for (const a of accessories) {
        const place = placeAccessory(anchors, i, a.acc);
        if (!place) continue;
        let [l, r, t, b] = [Infinity, -Infinity, Infinity, -Infinity];
        for (let y = 0; y < a.pixels.height; y++)
          for (let x = 0; x < a.pixels.width; x++) {
            if (a.pixels.data[(y * a.pixels.width + x) * 4 + 3] === 0) continue;
            const [X, Y] = [place.x + x, place.y + y];
            if (place.clipRight !== undefined && X >= place.clipRight) continue;
            [l, r, t, b] = [Math.min(l, X), Math.max(r, X), Math.min(t, Y), Math.max(b, Y)];
          }
        const where = `${a.acc.id} ${f.tag}#${f.n}: x ${l}..${r} y ${t}..${b}`;
        if (a.acc.anchor === "head") {
          if (l < headL - 2 || r > headR + 2) problems.push(`${where}, head ${headL}..${headR}`);
          if (l < 0 || t < 0 || r >= body.width || b >= body.height) problems.push(`${where}, off the canvas`);
        } else if (l < bodyL - 1 || r > bodyR + 1) problems.push(`${where}, body ${bodyL}..${bodyR}`);
      }
    }
    expect(problems).toEqual([]);
  });

  // PM WR2c: tüy görünür. Gizli olmayan her kare x her aksesuar: compose sonrası en az 3 tüy pikseli (kafa çizgisinin
  // üstündeki gövde pikseli, efekt hariç) olduğu gibi kalır.
  it("the antenna stays visible (>= 3 pixels) on every frame with every accessory", () => {
    const EFFECT = [0x6e, 0xc5, 0xe9];
    const problems: string[] = [];
    for (let i = 0; i < anchors.frames.length; i++) {
      const f = anchors.frames[i];
      const head = f.points.head;
      if ("hidden" in head) continue;
      const body: Px = sheet.cut(sheet.img.data, i);
      for (const a of accessories) {
        const place = placeAccessory(anchors, i, a.acc);
        if (!place) continue;
        const out = composeFrame(body, a.pixels, place, head.y);
        let visible = 0;
        for (let k = 0; k < head.y * body.width * 4; k += 4) {
          if (body.data[k + 3] === 0 || EFFECT.every((v, j) => body.data[k + j] === v)) continue;
          if ([0, 1, 2, 3].every((j) => out[k + j] === body.data[k + j])) visible++;
        }
        if (visible < 3) problems.push(`${a.acc.id} ${f.tag}#${f.n}: ${visible}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("hidden poses give no cell; visible ones change the frame", () => {
    const headphones = accessories.find((a) => a.acc.id === "headphones")!;
    expect(cellPixels(sheet, anchors, null, pose("walk"), headphones)).not.toBeNull(); // SPEC 09 K1: yürürken görünür
    expect(cellPixels(sheet, anchors, null, pose("sleep"), headphones)).toBeNull();
    const plain: Px = cellPixels(sheet, anchors, null, pose("idle"), null);
    for (const a of accessories) expect([...cellPixels(sheet, anchors, null, pose("idle"), a).data], a.acc.id).not.toEqual([...plain.data]);
  });
});
