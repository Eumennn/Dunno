import { describe, expect, it } from "vitest";
import { parseSheet } from "./sheet";

const frame = (x: number, duration?: number) => ({
  frame: { x, y: 0, w: 48, h: 48 },
  rotated: false,
  trimmed: false,
  spriteSourceSize: { x: 0, y: 0, w: 48, h: 48 },
  sourceSize: { w: 48, h: 48 },
  ...(duration === undefined ? {} : { duration }),
});

const meta = {
  frameTags: [
    { name: "idle", from: 0, to: 1, direction: "forward" },
    { name: "shrug", from: 2, to: 2, direction: "pingpong" },
  ],
};

describe("parseSheet", () => {
  it("json-array formatını okur", () => {
    const s = parseSheet({ frames: [frame(0, 100), frame(48, 200), frame(96, 300)], meta });
    expect(s.frames.map((f) => f.x)).toEqual([0, 48, 96]);
    expect(s.frames.map((f) => f.duration)).toEqual([100, 200, 300]);
    expect(s.frameW).toBe(48);
    expect(s.tags.get("idle")).toEqual({ name: "idle", from: 0, to: 1, direction: "forward" });
    expect(s.tags.get("shrug")?.direction).toBe("pingpong");
    expect(s.placeholder).toBe(false);
  });

  it("json-hash formatını anahtar sırasıyla okur", () => {
    const s = parseSheet({
      frames: { "d 0.aseprite": frame(0), "d 1.aseprite": frame(48), "d 2.aseprite": frame(96) },
      meta: { ...meta, placeholder: true },
    });
    expect(s.frames.map((f) => f.x)).toEqual([0, 48, 96]);
    expect(s.tags.size).toBe(2);
    expect(s.placeholder).toBe(true);
  });

  it("süre yoksa 100 ms varsayar", () => {
    expect(parseSheet({ frames: [frame(0)] }).frames[0].duration).toBe(100);
  });

  it("kırpılmış karede ofseti ve tam kare boyutunu korur", () => {
    const trimmed = {
      frame: { x: 10, y: 0, w: 30, h: 40 },
      spriteSourceSize: { x: 9, y: 8, w: 30, h: 40 },
      sourceSize: { w: 48, h: 48 },
      duration: 50,
    };
    const s = parseSheet({ frames: [trimmed] });
    expect(s.frames[0]).toMatchObject({ x: 10, w: 30, h: 40, ox: 9, oy: 8 });
    expect([s.frameW, s.frameH]).toEqual([48, 48]);
  });

  it("bilinmeyen yönü forward sayar", () => {
    const s = parseSheet({ frames: [frame(0)], meta: { frameTags: [{ name: "a", from: 0, to: 0, direction: "x" }] } });
    expect(s.tags.get("a")?.direction).toBe("forward");
  });

  it("bozuk girdiyi reddeder", () => {
    expect(() => parseSheet(null)).toThrow();
    expect(() => parseSheet({ frames: [] })).toThrow(/no frames/);
    expect(() => parseSheet({ frames: [{ x: 1 }] })).toThrow(/rect/);
    expect(() => parseSheet({ frames: [{ ...frame(0), rotated: true }] })).toThrow(/rotated/);
    expect(() =>
      parseSheet({ frames: [frame(0)], meta: { frameTags: [{ name: "a", from: 0, to: 5 }] } }),
    ).toThrow(/outside/);
  });
});
