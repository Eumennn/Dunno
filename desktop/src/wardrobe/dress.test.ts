import { describe, expect, it } from "vitest";
import type { Accessory, AnchorsFile } from "./accessories";
import { dressSheet } from "./dress";
import { CLASSIC } from "./recolor";

// 2 kare yan yana (4x2 sheet, kare 2x2). Kare 0 idle, kare 1 sleep.
const rgba = (hex: string) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255];
const O = rgba(CLASSIC.body);
const K = rgba("#2B1E2F");
const sheet = { data: Uint8ClampedArray.from([...O, ...K, ...O, ...K, ...O, ...O, ...O, ...O]), width: 4, height: 2 };
const rects = [
  { x: 0, y: 0, w: 2, h: 2 },
  { x: 2, y: 0, w: 2, h: 2 },
];
const pt = { x: 0, y: 1 };
const anchors: AnchorsFile = {
  size: 2,
  points: ["head", "antenna", "eyes", "ears", "neck"],
  frames: [
    { frame: "dunno 0.aseprite", index: 0, tag: "idle", n: 0, points: { head: pt, antenna: pt, eyes: pt, ears: pt, neck: pt } },
    { frame: "dunno 1.aseprite", index: 1, tag: "sleep", n: 0, points: { head: pt, antenna: pt, eyes: pt, ears: pt, neck: pt } },
  ],
  hidden: {},
};
const W = rgba("#FFFFFF");
const acc: Accessory = {
  id: "dot",
  name: { tr: "nokta", en: "dot" },
  anchor: "head",
  pivot: { x: 0, y: 0 },
  antenna: "behind",
  hiddenIn: ["sleep"],
  image: "dot.png",
  size: 1,
};
const dot = { acc, pixels: { data: Uint8ClampedArray.from(W), width: 1, height: 1 } };
const night = { body: "#6475B0", shade: "#4E5D94", light: "#94A4D8", belly: "#D9E0F6" };
const px = (d: ArrayLike<number>, x: number, y: number) => Array.from({ length: 4 }, (_, k) => d[(y * 4 + x) * 4 + k]);

describe("dressSheet", () => {
  it("no theme, no accessory: identical copy", () => {
    const out = dressSheet(sheet, rects, anchors, null, null);
    expect([...out]).toEqual([...sheet.data]);
    expect(out).not.toBe(sheet.data);
  });

  it("recolours every frame, outline stays", () => {
    const out = dressSheet(sheet, rects, anchors, night, null);
    expect(px(out, 0, 0)).toEqual(rgba(night.body));
    expect(px(out, 3, 1)).toEqual(rgba(night.body));
    expect(px(out, 1, 0)).toEqual(K);
  });

  it("puts the accessory on each frame's anchor, not in hidden states", () => {
    const out = dressSheet(sheet, rects, anchors, night, dot);
    expect(px(out, 0, 1)).toEqual(W); // kare 0, nokta (0,1)
    expect(px(out, 2, 1)).toEqual(rgba(night.body)); // kare 1 sleep: hiddenIn
    expect([...sheet.data.slice(0, 4)]).toEqual(O); // girdi değişmez
  });
});
