import { readFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
// @ts-expect-error saf .mjs, tip yok
import { createImage, decodePng, encodePng } from "./png.mjs";

function chunk(type: string, data: Buffer): Buffer {
  // decodePng CRC okumaz; sıfır yeterli
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  return Buffer.concat([len, Buffer.from(type, "ascii"), data, Buffer.alloc(4)]);
}

/** Her satırı farklı filtreyle (0..4) kodlanmış RGB png, el ile. */
function filteredRgb(pixels: number[][][]): Buffer {
  const h = pixels.length;
  const w = pixels[0].length;
  const stride = w * 3;
  const lines: Buffer[] = [];
  let prev = Buffer.alloc(stride);
  pixels.forEach((row, y) => {
    const cur = Buffer.from(row.flat());
    const f = y % 5;
    const out = Buffer.alloc(stride + 1);
    out[0] = f;
    for (let i = 0; i < stride; i++) {
      const a = i >= 3 ? cur[i - 3] : 0;
      const b = prev[i];
      const c = i >= 3 ? prev[i - 3] : 0;
      const pa = Math.abs(b - c);
      const pb = Math.abs(a - c);
      const pc = Math.abs(a + b - 2 * c);
      const p = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f];
      out[i + 1] = (cur[i] - p) & 0xff;
    }
    lines.push(out);
    prev = cur;
  });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.concat(lines))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

describe("decodePng", () => {
  it("round-trips the sheet", () => {
    const buf = readFileSync(new URL("../assets/dunno_sheet.png", import.meta.url));
    const img = decodePng(buf);
    expect([img.width, img.height]).toEqual([256, 512]); // SPEC 09 K3: + fart satırı; SPEC 17: + 5 eğlenceli animasyon (dans 8 kare)
    expect(Buffer.compare(Buffer.from(encodePng(img)), buf)).toBe(0);
  });

  it("undoes every row filter (rgb, as Aseprite/other tools may write)", () => {
    const px = Array.from({ length: 10 }, (_, y) => Array.from({ length: 4 }, (_, x) => [(x * 70 + y * 13) % 256, (y * 37) % 256, (x * y * 29 + 200) % 256]));
    const img = decodePng(filteredRgb(px));
    const want = createImage(4, 10);
    px.forEach((row, y) => row.forEach((p, x) => want.set(x, y, [...p, 255])));
    expect([...img.data]).toEqual([...want.data]);
  });
});
