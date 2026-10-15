// Palet değişimi (SPEC 05 W1, saf): sprite'ın RGBA piksellerinde classic rol renklerini temanın rol renklerine çevirir.
// Kontur, göz (kontur rengi), yanak, mavi efektler (zzz, ter) ve saydam pikseller dokunulmaz; bilinmeyen renk olduğu gibi kalır.
// Tasarımcının gerçek sheet'i aynı rol renkleriyle (aşağıdaki CLASSIC) çizildiği sürece aynı tablo çalışır.
import type { Role } from "./themes";

/** Sheet'in çizildiği rol renkleri (= classic tema, ana palet). */
export const CLASSIC: Readonly<Record<Role, string>> = {
  body: "#F2A65A",
  shade: "#D9774A",
  light: "#FFD29A",
  belly: "#FFF1D6",
};

const rgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
const key = (r: number, g: number, b: number) => (r << 16) | (g << 8) | b;

/** Rol eşleme tablosu: kaynak rgb -> hedef rgb (aynı kalan roller tabloya girmez). */
export function roleTable(theme: Readonly<Record<Role, string>>, base: Readonly<Record<Role, string>> = CLASSIC): Map<number, [number, number, number]> {
  const table = new Map<number, [number, number, number]>();
  for (const role of Object.keys(base) as Role[]) {
    const from = rgb(base[role]);
    const to = rgb(theme[role]);
    if (key(...from) !== key(...to)) table.set(key(...from), to);
  }
  return table;
}

/**
 * RGBA piksel dizisinin (canvas ImageData.data gibi) tema renkli kopyası. Girdi değişmez; alfa korunur.
 * Saydam (alfa 0) pikseller atlanır.
 */
export function recolor(
  pixels: ArrayLike<number>,
  theme: Readonly<Record<Role, string>>,
  base: Readonly<Record<Role, string>> = CLASSIC,
): Uint8ClampedArray {
  const out = Uint8ClampedArray.from(pixels as ArrayLike<number>);
  const table = roleTable(theme, base);
  if (table.size === 0) return out;
  for (let i = 0; i + 3 < out.length; i += 4) {
    if (out[i + 3] === 0) continue;
    const to = table.get(key(out[i], out[i + 1], out[i + 2]));
    if (to) {
      out[i] = to[0];
      out[i + 1] = to[1];
      out[i + 2] = to[2];
    }
  }
  return out;
}
