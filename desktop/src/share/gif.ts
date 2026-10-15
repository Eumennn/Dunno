// Küçük GIF89a kodlayıcı (saf, bağımlılık yok): piksel art kareleri (az renk) döngülü GIF'e çevirir. Paylaşım için (pet.txt "gif kaydet").
// Palet karelerdeki renklerden kurulur (en fazla 256; piksel art'ta hiç aşılmaz, aşılırsa en yakın renge eşlenir). Saydamlık yok:
// kareler önceden düz zemine çizilir.

export interface GifFrame {
  /** RGBA (canvas getImageData) */
  data: Uint8ClampedArray;
  delayMs: number;
}

const key = (d: Uint8ClampedArray, i: number) => (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];

function buildPalette(frames: readonly GifFrame[]): number[] {
  const seen = new Map<number, number>();
  for (const f of frames) for (let i = 0; i < f.data.length; i += 4) seen.set(key(f.data, i), (seen.get(key(f.data, i)) ?? 0) + 1);
  return [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 256).map(([c]) => c);
}

function nearest(pal: readonly number[], c: number): number {
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < pal.length; i++) {
    const p = pal[i];
    const d = (((p >> 16) & 255) - ((c >> 16) & 255)) ** 2 + (((p >> 8) & 255) - ((c >> 8) & 255)) ** 2 + ((p & 255) - (c & 255)) ** 2;
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return best;
}

/** LZW (GIF varyantı): değişken kod boyu, 4096'da sözlük temizlenir */
function lzw(indices: Uint8Array, minCode: number): number[] {
  const out: number[] = [];
  let cur = 0;
  let bits = 0;
  const clear = 1 << minCode;
  const eoi = clear + 1;
  let size = minCode + 1;
  let next = eoi + 1;
  let dict = new Map<number, number>();
  const emit = (code: number) => {
    cur |= code << bits;
    bits += size;
    while (bits >= 8) {
      out.push(cur & 255);
      cur >>>= 8;
      bits -= 8;
    }
  };
  emit(clear);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const pk = prefix * 4096 + k;
    const hit = dict.get(pk);
    if (hit !== undefined) {
      prefix = hit;
      continue;
    }
    emit(prefix);
    if (next < 4096) {
      dict.set(pk, next++);
      if (next > 1 << size && size < 12) size++;
    } else {
      emit(clear);
      dict = new Map();
      size = minCode + 1;
      next = eoi + 1;
    }
    prefix = k;
  }
  emit(prefix);
  emit(eoi);
  if (bits > 0) out.push(cur & 255);
  return out;
}

export function encodeGif(frames: readonly GifFrame[], w: number, h: number): Uint8Array {
  if (!frames.length) throw new Error("gif: no frames");
  const pal = buildPalette(frames);
  let depth = 1;
  while (1 << depth < Math.max(2, pal.length)) depth++;
  const index = new Map(pal.map((c, i) => [c, i]));
  const bytes: number[] = [];
  const u16 = (n: number) => bytes.push(n & 255, (n >> 8) & 255);
  const text = (s: string) => bytes.push(...[...s].map((c) => c.charCodeAt(0)));
  text("GIF89a");
  u16(w);
  u16(h);
  bytes.push(0x80 | ((depth - 1) << 4) | (depth - 1), 0, 0); // genel renk tablosu
  for (let i = 0; i < 1 << depth; i++) {
    const c = pal[i] ?? 0;
    bytes.push((c >> 16) & 255, (c >> 8) & 255, c & 255);
  }
  bytes.push(0x21, 0xff, 11);
  text("NETSCAPE2.0");
  bytes.push(3, 1, 0, 0, 0); // sonsuz döngü
  const minCode = Math.max(2, depth);
  for (const f of frames) {
    bytes.push(0x21, 0xf9, 4, 0x04); // grafik kontrol: kare yerinde kalır
    u16(Math.max(2, Math.round(f.delayMs / 10)));
    bytes.push(0, 0);
    bytes.push(0x2c);
    u16(0);
    u16(0);
    u16(w);
    u16(h);
    bytes.push(0);
    const idx = new Uint8Array(w * h);
    for (let p = 0, i = 0; p < idx.length; p++, i += 4) {
      const c = key(f.data, i);
      idx[p] = index.get(c) ?? nearest(pal, c);
    }
    bytes.push(minCode);
    const data = lzw(idx, minCode);
    for (let i = 0; i < data.length; i += 255) {
      const chunk = data.slice(i, i + 255);
      bytes.push(chunk.length, ...chunk);
    }
    bytes.push(0);
  }
  bytes.push(0x3b);
  return Uint8Array.from(bytes);
}

/** Ardışık aynı kareleri birleştirir (süreleri toplanır): dosya küçülür */
export function dedupeFrames(frames: readonly GifFrame[]): GifFrame[] {
  const out: GifFrame[] = [];
  for (const f of frames) {
    const last = out[out.length - 1];
    if (last && last.data.length === f.data.length && last.data.every((v, i) => v === f.data[i])) last.delayMs += f.delayMs;
    else out.push({ data: f.data, delayMs: f.delayMs });
  }
  return out;
}
