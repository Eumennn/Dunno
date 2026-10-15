// Anchor ölçümü (SPEC 09 K1, saf): bağlantı noktaları elle girilmez, karenin kendi pikselinden ölçülür; dunno_anchors.json
// bu ölçümle aynı olmalı (test). Böylece yürürken/koşarken aksesuar kafayla birlikte kalır, kare kare kaymaz.
// Tanımlar dik duran pozlar içindir (sleep ve peek elle ayarlı: yatık gövde, duvar). Import yok: node betikleri de yükler.

export interface Pt {
  x: number;
  y: number;
}

export interface Measured {
  head: Pt;
  eyes: Pt | null;
  ears: Pt;
}

/** Kafa çizgisi: antenden sonra en az bu kadar bitişik kontur pikseli olan ilk satır. */
export const HEAD_RUN = 5;
/** Arkası dönük (göz yok) karelerde kulak yüksekliği: kafa çizgisinin bu kadar altı (öndeki pozla aynı). */
export const EAR_DROP = 8;

/** Yarım piksel yukarı yuvarlanan orta nokta (16.5 -> 17 değil, 15.5 -> 16): tek/çift genişlikte tutarlı. */
const mid = (a: number, b: number) => Math.floor((a + b + 1) / 2);

/**
 * rgba: tek kare (w x h), ink: kontur rengi [r, g, b], face: yüz (göz çevresi) rengi.
 * head: kafa çizgisinin ortası ve satırı · eyes: göz piksellerinin yatay ortası ve üst satırı (yoksa null) ·
 * ears: kafanın yatay ortası, göz satırında (göz yoksa kafa + EAR_DROP).
 */
export function measureFrame(
  rgba: ArrayLike<number>,
  w: number,
  h: number,
  ink: readonly [number, number, number],
  face: readonly [number, number, number],
): Measured | null {
  const at = (x: number, y: number) => (y * w + x) * 4;
  const is = (x: number, y: number, c: readonly number[]) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    const i = at(x, y);
    return rgba[i + 3] > 0 && rgba[i] === c[0] && rgba[i + 1] === c[1] && rgba[i + 2] === c[2];
  };
  const clear = (x: number, y: number) => x < 0 || y < 0 || x >= w || y >= h || rgba[at(x, y) + 3] === 0;

  let head: Pt | null = null;
  for (let y = 0; y < h && !head; y++) {
    for (let x = 0; x < w; x++) {
      if (!is(x, y, ink)) continue;
      let end = x;
      while (end + 1 < w && is(end + 1, y, ink)) end++;
      if (end - x + 1 >= HEAD_RUN) {
        head = { x: mid(x, end), y };
        break;
      }
      x = end;
    }
  }
  if (!head) return null;

  // göz: yüz rengine bitişik, şeffafa bitişik olmayan kontur pikseli (dış çizgi değil)
  let minX = Infinity;
  let maxX = -Infinity;
  let top = Infinity;
  for (let y = head.y + 1; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!is(x, y, ink)) continue;
      const nearFace = is(x - 1, y, face) || is(x + 1, y, face);
      const nearClear = clear(x - 1, y) || clear(x + 1, y) || clear(x, y - 1) || clear(x, y + 1);
      if (!nearFace || nearClear) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      top = Math.min(top, y);
    }
  }
  const eyes = Number.isFinite(top) ? { x: mid(minX, maxX), y: top } : null;
  // kulak: kafanın yatay ortası (kulaklık bandı kafa tepesine oturur; koşarken eğik kafada da tepeyle aynı x)
  return { head, eyes, ears: { x: head.x, y: eyes ? eyes.y : head.y + EAR_DROP } };
}
