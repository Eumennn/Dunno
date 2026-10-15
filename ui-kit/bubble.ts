// Çizgi roman balonu geometrisi (SPEC 09 K4, saf): basamaklı piksel köşe (border-radius YOK), metne göre genişlik.
// ui.md istisnası: piksel "yuvarlak" köşe sadece konuşma/düşünce balonlarında, basamaklı (clip-path çokgeni, düz kenarlar).

/** Basamak (px): bir piksel sanatı "pikseli". */
export const STEP = 2;
/**
 * Köşe profili: kenardan itibaren her sütunun (STEP genişlik) üstten kaç basamak içeride başladığı.
 * [3, 2, 1] -> 6 px'lik yuvarlak piksel köşe (PM K4: [2, 1] 2 px'te zor seçiliyordu; bubble-corners.png)
 */
export const CORNER = [3, 2, 1] as const;
/** Kontur kalınlığı (px): iç dolgu bu kadar içeride. */
export const EDGE = 2;

type Pt = [number, number];

/** Sol üst köşe: sol kenardan üst kenara basamaklı yol (kenardan px, inset dahil). */
export function cornerPath(step = STEP, corner: readonly number[] = CORNER, inset = 0): Pt[] {
  const p: Pt[] = [];
  corner.forEach((off, k) => {
    p.push([inset + k * step, inset + off * step], [inset + (k + 1) * step, inset + off * step]);
  });
  p.push([inset + corner.length * step, inset]);
  return p;
}

/**
 * clip-path çokgeni: dört köşesi aynı basamaklı profil (ayna), saat yönünde. inset: iç katman (dolgu) için.
 * Uzak kenarlar calc(100% - n px): boyuttan bağımsız, sadece düz kenarlar uzar (uzun metinde köşe aynı kalır).
 */
export function steppedPolygon(step = STEP, corner: readonly number[] = CORNER, inset = 0): string {
  const near = (n: number) => `${n}px`;
  const far = (n: number) => (n === 0 ? "100%" : `calc(100% - ${n}px)`);
  const P = cornerPath(step, corner, inset);
  const tl = P.map(([x, y]) => `${near(x)} ${near(y)}`);
  const tr = [...P].reverse().map(([x, y]) => `${far(x)} ${near(y)}`);
  const br = P.map(([x, y]) => `${far(x)} ${far(y)}`);
  const bl = [...P].reverse().map(([x, y]) => `${near(x)} ${far(y)}`);
  return `polygon(${[...tl, ...tr, ...br, ...bl].join(", ")})`;
}

/**
 * Balon genişliği (px): metin uzadıkça genişler ama oranı korur (genişlik/yükseklik ≈ ratio). charW/lineH yaklaşık yazı ölçüsü,
 * pad iç boşluk (yatay ve dikey toplam). Kısa metin tek satır; sonuç [min, max].
 */
export function bubbleWidth(
  chars: number,
  { charW = 7.6, lineH = 20, pad = 24, ratio = 3, min = 64, max = 300 }: Partial<Record<"charW" | "lineH" | "pad" | "ratio" | "min" | "max", number>> = {},
): number {
  const text = Math.max(1, chars) * charW;
  const clamp = (w: number) => Math.round(Math.max(min, Math.min(max, w)));
  if (text + pad <= ratio * (lineH + pad)) return clamp(text + pad); // tek satır, oran içinde
  // satır sayısı n: genişlik w = text/n + pad, yükseklik n*lineH + pad; w/h en çok ratio olan en küçük n
  for (let n = 2; n < 40; n++) {
    const w = text / n + pad;
    if (w <= ratio * (n * lineH + pad)) return clamp(w);
  }
  return clamp(max);
}

/** Düşünce balonu kuyruğu: balondan pet'e doğru küçülen 3 piksel daire (çap px). */
export const THOUGHT_DOTS = [8, 6, 4] as const;
