import { describe, expect, it } from "vitest";
import { frameAt, tagSequence } from "./animation";
import type { Frame, Tag } from "./sheet";

const frames: Frame[] = [100, 200, 300, 400].map((duration, i) => ({
  x: i * 48,
  y: 0,
  w: 48,
  h: 48,
  ox: 0,
  oy: 0,
  duration,
}));
const tag = (direction: Tag["direction"]): Tag => ({ name: "t", from: 0, to: 3, direction });

describe("tagSequence", () => {
  it("yönleri uygular", () => {
    expect(tagSequence(tag("forward"))).toEqual([0, 1, 2, 3]);
    expect(tagSequence(tag("reverse"))).toEqual([3, 2, 1, 0]);
    expect(tagSequence(tag("pingpong"))).toEqual([0, 1, 2, 3, 2, 1]);
    expect(tagSequence(tag("pingpong_reverse"))).toEqual([3, 2, 1, 0, 1, 2]);
  });

  it("tek karelik tag", () => {
    expect(tagSequence({ name: "t", from: 2, to: 2, direction: "pingpong" })).toEqual([2]);
  });
});

describe("frameAt", () => {
  const seq = [0, 1, 2, 3]; // toplam 1000 ms

  it("kare sürelerine göre ilerler", () => {
    expect(frameAt(seq, frames, 0, true).frame).toBe(0);
    expect(frameAt(seq, frames, 99, true).frame).toBe(0);
    expect(frameAt(seq, frames, 100, true).frame).toBe(1);
    expect(frameAt(seq, frames, 299, true).frame).toBe(1);
    expect(frameAt(seq, frames, 300, true).frame).toBe(2);
    expect(frameAt(seq, frames, 999, true).frame).toBe(3);
  });

  it("döngüde başa sarar", () => {
    expect(frameAt(seq, frames, 1000, true)).toEqual({ frame: 0, done: false });
    expect(frameAt(seq, frames, 2150, true).frame).toBe(1);
  });

  it("tek seferlikte son karede durur ve done olur", () => {
    expect(frameAt(seq, frames, 999, false)).toEqual({ frame: 3, done: false });
    expect(frameAt(seq, frames, 1000, false)).toEqual({ frame: 3, done: true });
    expect(frameAt(seq, frames, 5000, false)).toEqual({ frame: 3, done: true });
  });
});
