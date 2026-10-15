// Saf zamanlama: bir tag'in kare sırası ve geçen süreye göre hangi karede olunduğu.
import type { Frame, Tag } from "./sheet";

/** Tag yönüne göre oynatılacak kare indeksleri (sheet'teki mutlak indeks). */
export function tagSequence(tag: Tag): number[] {
  const fwd: number[] = [];
  for (let i = tag.from; i <= tag.to; i++) fwd.push(i);
  const rev = [...fwd].reverse();
  switch (tag.direction) {
    case "forward":
      return fwd;
    case "reverse":
      return rev;
    case "pingpong":
      return [...fwd, ...rev.slice(1, -1)];
    case "pingpong_reverse":
      return [...rev, ...fwd.slice(1, -1)];
  }
}

export interface FramePosition {
  /** sheet'teki mutlak kare indeksi */
  frame: number;
  /** tek seferlik oynatma bitti mi (son karede durur) */
  done: boolean;
}

export function frameAt(seq: number[], frames: Frame[], elapsedMs: number, loop: boolean): FramePosition {
  if (seq.length === 0) throw new Error("animation: empty sequence");
  const total = seq.reduce((sum, i) => sum + frames[i].duration, 0);
  if (total <= 0) return { frame: seq[0], done: !loop };
  if (!loop && elapsedMs >= total) return { frame: seq[seq.length - 1], done: true };

  let t = loop ? elapsedMs % total : Math.max(0, elapsedMs);
  for (const i of seq) {
    t -= frames[i].duration;
    if (t < 0) return { frame: i, done: false };
  }
  return { frame: seq[seq.length - 1], done: !loop };
}
