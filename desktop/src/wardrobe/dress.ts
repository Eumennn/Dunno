// Kıyafetli sheet (SPEC 05 W4, saf): sheet'in her karesini tema rengiyle boyar ve aksesuarı o karenin noktasına koyar.
// Çıktı aynı düzende yeni bir sheet; Player'a resim olarak verilir, ayna ve animasyon değişmeden çalışır.
// SPEC 09: kostüm (K2: rol renkleri + şeritler + parçalar, tüy gizleme) ve birden çok aksesuar (K6: slot başına bir parça).
// Sıra: tema/kostüm rengi -> şeritler -> tüy gizleme -> kostüm parçaları -> aksesuarlar (SLOT_ORDER; kostümün kapattığı slotlar atlanır).
import { placeAccessory, slotOf, type Accessory, type AnchorsFile, type Slot } from "./accessories";
import { composeFrame, type Pixels } from "./compose";
import { placePart, type Costume } from "./costumes";
import { CLASSIC, recolor } from "./recolor";
import type { Role } from "./themes";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Worn {
  acc: Accessory;
  pixels: Pixels;
}

export interface WornCostume {
  costume: Costume;
  /** parça id -> pikseller */
  parts: ReadonlyMap<string, Pixels>;
}

/** Aksesuar çizim sırası: alttan üste (pelerin atkının, şapka gözlüğün altında kalmaz). */
export const SLOT_ORDER: readonly Slot[] = ["body", "neck", "eyes", "head", "side"];

const rgb = (hex: string) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)] as const;
const INK = rgb("#2B1E2F");

/** Tema + kostüm rol renkleri (kostüm verdiği rolleri ezer). */
export function bodyColors(theme: Readonly<Record<Role, string>> | null, costume: Pick<Costume, "palette"> | null): Record<Role, string> {
  return { ...(theme ?? CLASSIC), ...(costume?.palette ?? {}) };
}

/** Kostümle birlikte çizilecek aksesuarlar, çizim sırasıyla. */
export function wornInOrder(list: readonly Worn[], costume: Pick<Costume, "blocks"> | null): Worn[] {
  return list
    .filter((w) => !costume?.blocks.includes(slotOf(w.acc)))
    .sort((a, b) => SLOT_ORDER.indexOf(slotOf(a.acc)) - SLOT_ORDER.indexOf(slotOf(b.acc)));
}

/**
 * sheet: tüm sheet RGBA. rects: kare sırasıyla sheet içindeki dikdörtgenler (anchors.frames ile aynı sıra).
 * theme null ise renk değişmez; accessory null/[] ise sadece renk. costume: SPEC 09 K2 kostümü (yoksa null).
 */
export function dressSheet(
  sheet: Pixels,
  rects: readonly Rect[],
  anchors: AnchorsFile,
  theme: Readonly<Record<Role, string>> | null,
  accessory: Worn | readonly Worn[] | null,
  costume: WornCostume | null = null,
): Uint8ClampedArray {
  const colors = costume ? bodyColors(theme, costume.costume) : theme;
  const colored = colors ? recolor(sheet.data, colors) : Uint8ClampedArray.from(sheet.data);
  const worn = wornInOrder(accessory === null ? [] : "acc" in accessory ? [accessory] : accessory, costume?.costume ?? null);
  if (!worn.length && !costume) return colored;
  const out = Uint8ClampedArray.from(colored);
  const roleRgb = colors ? [colors.body, colors.shade, colors.light].map(rgb) : [CLASSIC.body, CLASSIC.shade, CLASSIC.light].map(rgb);
  rects.forEach((r, i) => {
    const f = anchors.frames[i];
    if (!f) return;
    let body: { data: Uint8ClampedArray; width: number; height: number } = { data: new Uint8ClampedArray(r.w * r.h * 4), width: r.w, height: r.h };
    for (let y = 0; y < r.h; y++) {
      const s = ((r.y + y) * sheet.width + r.x) * 4;
      body.data.set(colored.subarray(s, s + r.w * 4), y * r.w * 4);
    }
    const head = f.points.head;
    const headY = "hidden" in head ? 0 : head.y;
    if (costume) {
      applyBands(body.data, r.w, r.h, f.points, costume.costume, roleRgb);
      if (costume.costume.hidesTuft) clearTuft(body.data, r.w, headY, roleRgb);
    }
    // tüy kaynağı: giyinmemiş kare (kostüm rengi/şeridi uygulanmış)
    const bare = { data: Uint8ClampedArray.from(body.data), width: r.w, height: r.h };
    if (costume) {
      for (const part of costume.costume.parts) {
        const px = costume.parts.get(part.id);
        const place = px ? placePart(anchors, i, costume.costume, part) : null;
        if (px && place) body = { ...body, data: composeFrame(body, px, place, headY, bare) };
      }
    }
    for (const w of worn) {
      const place = placeAccessory(anchors, i, w.acc);
      // kostüm tüyü gizliyse önde çizilecek tüy yok
      if (place) body = { ...body, data: composeFrame(body, w.pixels, costume?.costume.hidesTuft ? { ...place, antennaInFront: false } : place, headY, bare) };
    }
    for (let y = 0; y < r.h; y++) out.set(body.data.subarray(y * r.w * 4, (y + 1) * r.w * 4), ((r.y + y) * sheet.width + r.x) * 4);
  });
  return out;
}

const same = (d: Uint8ClampedArray, i: number, c: readonly number[]) => d[i + 3] > 0 && d[i] === c[0] && d[i + 1] === c[1] && d[i + 2] === c[2];

/** Şeritler: noktaya göre satırlarda gövde/gölge/ışık pikselleri tek renk (kontur, yüz, yanak dokunulmaz). */
function applyBands(d: Uint8ClampedArray, w: number, h: number, points: AnchorsFile["frames"][number]["points"], c: Costume, roles: readonly (readonly number[])[]) {
  for (const b of c.bands ?? []) {
    const p = points[b.anchor];
    if (!p || "hidden" in p) continue;
    const to = rgb(b.color);
    for (const dy of b.rows) {
      const y = p.y + dy;
      if (y < 0 || y >= h) continue;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (roles.some((c) => same(d, i, c))) d.set(to, i);
      }
    }
  }
}

/** Tüy gizleme: kafa çizgisinin üstündeki kontur ve gövde rengi pikselleri silinir (zzz, ter gibi mavi efektler kalır). */
function clearTuft(d: Uint8ClampedArray, w: number, headY: number, roles: readonly (readonly number[])[]) {
  for (let y = 0; y < headY; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (same(d, i, INK) || roles.some((c) => same(d, i, c))) d.fill(0, i, i + 4);
    }
  }
}
