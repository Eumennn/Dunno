import { describe, expect, it } from "vitest";
import { IDLE_FRAME_MS, startFrameLoop } from "./frame-rate";

function fakeEnv() {
  const q: { kind: "raf" | "timeout"; ms: number; f: () => void; id: number }[] = [];
  let id = 0;
  return {
    q,
    env: {
      raf: (f: () => void) => (q.push({ kind: "raf", ms: 16, f, id: ++id }), id),
      caf: (x: number) => q.splice(q.findIndex((e) => e.id === x), 1),
      setTimeout: (f: () => void, ms: number) => (q.push({ kind: "timeout", ms, f, id: ++id }), id),
      clearTimeout: (x: number) => {
        const i = q.findIndex((e) => e.id === x);
        if (i >= 0) q.splice(i, 1);
      },
    },
    run() {
      const e = q.shift()!;
      e.f();
      return e;
    },
  };
}

describe("pet kare döngüsü (FB6 performans)", () => {
  it("boşta yavaş zamanlayıcı, hareket varken rAF; uyandırınca hemen hızlı", () => {
    const f = fakeEnv();
    let busy = false;
    let ticks = 0;
    const loop = startFrameLoop(() => ticks++, () => busy, f.env);
    expect(f.q[0]).toMatchObject({ kind: "timeout", ms: IDLE_FRAME_MS });
    f.run();
    expect(ticks).toBe(1);
    expect(f.q[0].kind).toBe("timeout");
    busy = true;
    f.run();
    expect(f.q[0].kind).toBe("raf");
    busy = false;
    f.run();
    expect(f.q[0].kind).toBe("timeout");
    loop.wake();
    expect(f.q).toHaveLength(1);
    expect(f.q[0].kind).toBe("raf");
    loop.stop();
    expect(f.q).toHaveLength(0);
  });
});
