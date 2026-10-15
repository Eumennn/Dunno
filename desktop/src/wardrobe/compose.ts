// Kıyafet katmanlama (SPEC 05 W2/W5, saf): kare + aksesuar -> tek RGBA kare. Render ve önizleme betiği aynı sırayı kullanır.
// Sıra: gövde, aksesuar, sonra antenna "through" ise tüy (kafa çizgisinin üstündeki gövde pikselleri) yeniden en üste.
// Ayna (sola bakış) birleşmiş karenin tamamına uygulanır; aksesuar gövdeyle birlikte döner, kaymaz.
// Import yok: node scripts/wardrobe-shots.mjs doğrudan yükler.

export interface Placed {
  /** aksesuar görüntüsünün sol üstü, kare koordinatında */
  x: number;
  y: number;
  antennaInFront: boolean;
  /** ekran kenarı (peek): x >= clipRight olan aksesuar pikselleri kenarın arkasında, çizilmez */
  clipRight?: number;
}

export interface Pixels {
  data: ArrayLike<number>;
  width: number;
  height: number;
}

/**
 * Gövde karesi (width x height RGBA) üstüne aksesuarı çizer; kare dışına ve ekran kenarının (clipRight) arkasına taşan kısım kırpılır.
 * headY: karenin kafa noktası y'si; bunun üstündeki satırlar tüydür (through ise aksesuarın önünde kalır).
 * Aksesuar pikselleri tam opak ya da tam saydamdır (piksel art); alfa > 0 olan çizilir.
 * tuft: önde kalacak tüyün kaynağı (varsayılan body). Birden çok parça üst üste çizilirken (SPEC 09 K6) giyinmemiş kare verilir,
 * yoksa önceki şapka "tüy" sanılıp sonraki parçanın üstüne geri yazılır.
 */
export function composeFrame(body: Pixels, acc: Pixels | null, place: Placed | null, headY: number, tuft: Pixels = body): Uint8ClampedArray {
  const { width: w, height: h } = body;
  const right = Math.min(w, place?.clipRight ?? w);
  const out = Uint8ClampedArray.from(body.data);
  if (!acc || !place) return out;
  for (let y = 0; y < acc.height; y++) {
    const fy = place.y + y;
    if (fy < 0 || fy >= h) continue;
    for (let x = 0; x < acc.width; x++) {
      const fx = place.x + x;
      if (fx < 0 || fx >= right) continue;
      const s = (y * acc.width + x) * 4;
      if (acc.data[s + 3] === 0) continue;
      const d = (fy * w + fx) * 4;
      for (let k = 0; k < 4; k++) out[d + k] = acc.data[s + k];
    }
  }
  if (place.antennaInFront) {
    for (let y = 0; y < Math.min(headY, h); y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (tuft.data[i + 3] === 0) continue;
        for (let k = 0; k < 4; k++) out[i + k] = tuft.data[i + k];
      }
    }
  }
  return out;
}

/** Yatay ayna (Player'ın "left" yönü). */
export function mirrorX(data: ArrayLike<number>, width: number, height: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const s = (y * width + x) * 4;
      const d = (y * width + (width - 1 - x)) * 4;
      for (let k = 0; k < 4; k++) out[d + k] = data[s + k];
    }
  }
  return out;
}
