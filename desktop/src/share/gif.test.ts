import { describe, expect, it } from "vitest";
import { dedupeFrames, encodeGif, type GifFrame } from "./gif";

/** test için küçük GIF çözücü: ilk renk tablosu + her karenin indeksleri */
function decode(b: Uint8Array): { w: number; h: number; pal: number[][]; frames: { delay: number; idx: number[] }[]; loop: boolean } {
  const u16 = (i: number) => b[i] | (b[i + 1] << 8);
  expect(String.fromCharCode(...b.slice(0, 6))).toBe("GIF89a");
  const w = u16(6);
  const h = u16(8);
  const depth = (b[10] & 7) + 1;
  let p = 13;
  const pal: number[][] = [];
  for (let i = 0; i < 1 << depth; i++, p += 3) pal.push([b[p], b[p + 1], b[p + 2]]);
  const frames: { delay: number; idx: number[] }[] = [];
  let delay = 0;
  let loop = false;
  while (b[p] !== 0x3b) {
    if (b[p] === 0x21) {
      if (b[p + 1] === 0xf9) delay = u16(p + 4) * 10;
      if (b[p + 1] === 0xff) loop = true;
      p += 2;
      while (b[p]) p += b[p] + 1;
      p++;
      continue;
    }
    expect(b[p]).toBe(0x2c);
    p += 10;
    const min = b[p++];
    const data: number[] = [];
    while (b[p]) {
      data.push(...b.slice(p + 1, p + 1 + b[p]));
      p += b[p] + 1;
    }
    p++;
    // LZW çöz
    const clear = 1 << min;
    let size = min + 1;
    let dict: number[][] = [];
    const reset = () => {
      dict = Array.from({ length: clear + 2 }, (_, i) => [i]);
      size = min + 1;
    };
    reset();
    let pos = 0;
    const read = () => {
      let v = 0;
      for (let i = 0; i < size; i++, pos++) v |= ((data[pos >> 3] >> (pos & 7)) & 1) << i;
      return v;
    };
    const idx: number[] = [];
    let prev: number[] | null = null;
    for (;;) {
      const code = read();
      if (code === clear) {
        reset();
        prev = null;
        continue;
      }
      if (code === clear + 1) break;
      const entry: number[] = code < dict.length ? dict[code] : [...prev!, prev![0]];
      idx.push(...entry);
      if (prev) dict.push([...prev, entry[0]]);
      prev = entry;
      if (dict.length === 1 << size && size < 12) size++;
    }
    frames.push({ delay, idx });
  }
  return { w, h, pal, frames, loop };
}

const frame = (w: number, h: number, f: (x: number, y: number) => [number, number, number], delayMs = 100): GifFrame => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set([...f(x, y), 255], (y * w + x) * 4);
  return { data, delayMs };
};

describe("GIF kodlayıcı (paylaşım)", () => {
  it("piksel piksel geri çözülür, döngülü, süreler korunur", () => {
    const cols: [number, number, number][] = [[0xff, 0xf1, 0xd6], [0xf2, 0xa6, 0x5a], [0x2b, 0x1e, 0x2f], [0xd9, 0x77, 0x4a], [0xff, 0xd2, 0x9a]];
    const a = frame(37, 23, (x, y) => cols[(x * 7 + y * 3) % 5], 120);
    const b = frame(37, 23, (x, y) => cols[(x + y) % 3], 80);
    const gif = encodeGif([a, b], 37, 23);
    const d = decode(gif);
    expect([d.w, d.h, d.loop]).toEqual([37, 23, true]);
    expect(d.frames.map((f) => f.delay)).toEqual([120, 80]);
    for (const [k, f] of [a, b].entries()) {
      const px = d.frames[k].idx.map((i) => d.pal[i]);
      for (let p = 0; p < 37 * 23; p++) expect(px[p]).toEqual([f.data[p * 4], f.data[p * 4 + 1], f.data[p * 4 + 2]]);
    }
  });

  it("büyük düz alan (sözlük 4096'yı aşar) da doğru", () => {
    const big = frame(200, 120, (x, y) => (((x >> 3) + (y >> 3)) % 2 ? [0, 0, 0] : [255, 255, 255]));
    const d = decode(encodeGif([big], 200, 120));
    expect(d.frames[0].idx.length).toBe(200 * 120);
    expect(d.pal[d.frames[0].idx[8]]).toEqual([0, 0, 0]);
  });

  it("aynı ardışık kareler birleşir", () => {
    const a = frame(4, 4, () => [1, 2, 3], 50);
    expect(dedupeFrames([a, { ...a, data: a.data.slice() }, frame(4, 4, () => [9, 9, 9], 50)]).map((f) => f.delayMs)).toEqual([100, 50]);
  });
});
