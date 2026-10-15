import { describe, expect, it } from "vitest";
import { composeFrame, mirrorX, type Pixels } from "./compose";

const W = 4;
const H = 4;
// tek kanal yeterli: r = renk kodu, a = 0/255
function img(rows: string[]): Pixels {
  const data = new Uint8ClampedArray(rows.length * rows[0].length * 4);
  rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c === ".") return;
      data.set([c.charCodeAt(0), 0, 0, 255], (y * row.length + x) * 4);
    }),
  );
  return { data, width: rows[0].length, height: rows.length };
}
function rows(data: ArrayLike<number>, w = W, h = H): string[] {
  return Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => (data[(y * w + x) * 4 + 3] ? String.fromCharCode(data[(y * w + x) * 4]) : ".")).join(""),
  );
}

// tüy (a) satır 0, kafa çizgisi satır 1
const body = img([".a..", "bbbb", "bccb", "bbbb"]);
const hat = img(["hhh", "hhh"]);

describe("composeFrame", () => {
  it("antenna through: hat over the head, antenna drawn on top", () => {
    const out = composeFrame(body, hat, { x: 0, y: 0, antennaInFront: true }, 1);
    expect(rows(out)).toEqual(["hah.", "hhhb", "bccb", "bbbb"]);
  });

  it("antenna behind: hat covers the antenna", () => {
    const out = composeFrame(body, hat, { x: 0, y: 0, antennaInFront: false }, 1);
    expect(rows(out)).toEqual(["hhh.", "hhhb", "bccb", "bbbb"]);
  });

  it("clips outside the frame and leaves the input alone", () => {
    const copy = Uint8ClampedArray.from(body.data);
    const out = composeFrame(body, hat, { x: 2, y: -1, antennaInFront: false }, 1);
    expect(rows(out)).toEqual([".ahh", "bbbb", "bccb", "bbbb"]);
    expect(body.data).toEqual(copy);
  });

  it("screen edge (peek): accessory pixels behind clipRight are not drawn", () => {
    const out = composeFrame(body, hat, { x: 1, y: 0, antennaInFront: false, clipRight: 3 }, 1);
    expect(rows(out)).toEqual([".hh.", "bhhb", "bccb", "bbbb"]);
  });

  it("no accessory or hidden placement: body copy", () => {
    expect(rows(composeFrame(body, hat, null, 1))).toEqual(rows(body.data));
    expect(rows(composeFrame(body, null, { x: 0, y: 0, antennaInFront: true }, 1))).toEqual(rows(body.data));
  });
});

describe("mirrorX", () => {
  it("mirrors the composed frame so the accessory turns with the body", () => {
    const out = composeFrame(body, hat, { x: 0, y: 0, antennaInFront: true }, 1);
    expect(rows(mirrorX(out, W, H))).toEqual([".hah", "bhhh", "bccb", "bbbb"]);
    expect(rows(mirrorX(mirrorX(out, W, H), W, H))).toEqual(rows(out));
  });
});
