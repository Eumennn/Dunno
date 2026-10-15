import { describe, expect, it } from "vitest";
import { runTypewriter, type TypeTarget } from "./typewriter";

function harness(text: string) {
  let t = 0;
  let tick: (() => void) | null = null;
  const seen: number[] = [];
  let alive = true;
  const target: TypeTarget = { show: (n) => seen.push(n), alive: () => alive };
  const typing = runTypewriter(text, target, {
    rng: () => 0,
    now: () => t,
    every: (fn) => (tick = fn),
    stop: () => (tick = null),
  });
  const advance = (ms: number) => {
    for (let i = 0; i < ms; i += 16) {
      t += 16;
      tick?.();
    }
  };
  return { typing, seen, advance, kill: () => (alive = false), running: () => tick !== null };
}

describe("runTypewriter (SPEC 10 CL3)", () => {
  it("harf harf açar ve tam metinde biter", async () => {
    const h = harness("bilmem");
    expect(h.seen).toEqual([1]);
    h.advance(1_000);
    expect(h.seen.at(-1)).toBe(6);
    expect(h.running()).toBe(false);
    await h.typing.done;
  });

  it("tıklama (finish) metni anında tamamlar", async () => {
    const h = harness("uzun bir laf, gerçekten uzun");
    h.advance(50);
    h.typing.finish();
    expect(h.seen.at(-1)).toBe([..."uzun bir laf, gerçekten uzun"].length);
    expect(h.running()).toBe(false);
    await h.typing.done;
  });

  it("balon kapanırsa (toplantı koruması) akış durur, bekleyen biter", async () => {
    const h = harness("kapanacak balon");
    h.kill();
    h.advance(32);
    expect(h.running()).toBe(false);
    await h.typing.done;
  });

  it("boş metin hemen biter", async () => {
    const h = harness("");
    expect(h.seen).toEqual([0]);
    await h.typing.done;
  });
});
