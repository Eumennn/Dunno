import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HOLD_TICK_MS, HoverHold, type HoldEnd } from "./hold";

let t = 0;
const now = () => t;

beforeEach(() => {
  vi.useFakeTimers();
  t = 0;
});
afterEach(() => vi.useRealTimers());

/** saati ve zamanlayıcıları birlikte ilerletir */
async function advance(ms: number) {
  for (let i = 0; i < ms; i += HOLD_TICK_MS) {
    t += HOLD_TICK_MS;
    await vi.advanceTimersByTimeAsync(HOLD_TICK_MS);
  }
}

function track(h: HoverHold) {
  const r: { end: HoldEnd | null } = { end: null };
  void h.done.then((e) => (r.end = e));
  return r;
}

describe("HoverHold (balloon element events)", () => {
  it("closes after the reading time", async () => {
    const h = track(new HoverHold(new EventTarget(), 4_000, { now }));
    await advance(3_800);
    expect(h.end).toBeNull();
    await advance(400);
    expect(h.end).toBe("timeout");
  });

  it("pointer on the balloon keeps it open; leaving closes 2 s later", async () => {
    const el = new EventTarget();
    const h = track(new HoverHold(el, 4_000, { now }));
    await advance(1_000);
    el.dispatchEvent(new Event("pointerenter"));
    await advance(20_000);
    expect(h.end).toBeNull();
    el.dispatchEvent(new Event("pointerleave"));
    await advance(1_800);
    expect(h.end).toBeNull();
    await advance(400);
    expect(h.end).toBe("timeout");
  });

  it("click closes at once", async () => {
    const el = new EventTarget();
    const h = track(new HoverHold(el, 10_000, { now }));
    el.dispatchEvent(new Event("pointerenter"));
    el.dispatchEvent(new Event("click"));
    await vi.advanceTimersByTimeAsync(0);
    expect(h.end).toBe("click");
  });

  it("rust pop flag drives the same enter/leave (no DOM pointerleave when the window lets the cursor go)", async () => {
    const hold = new HoverHold(new EventTarget(), 4_000, { now });
    const h = track(hold);
    hold.enter();
    await advance(10_000);
    expect(h.end).toBeNull();
    hold.leave();
    await advance(2_200);
    expect(h.end).toBe("timeout");
  });

  it("enter twice (dom + rust) is harmless", async () => {
    const el = new EventTarget();
    const hold = new HoverHold(el, 4_000, { now });
    el.dispatchEvent(new Event("pointerenter"));
    hold.enter();
    expect(hold.phase).toBe("hover");
    hold.leave();
    el.dispatchEvent(new Event("pointerleave"));
    expect(hold.phase).toBe("open");
  });

  it("ends as closed when the balloon is closed from outside (meeting guard)", async () => {
    let alive = true;
    const h = track(new HoverHold(new EventTarget(), 10_000, { now, alive: () => alive }));
    await advance(1_000);
    alive = false;
    await advance(HOLD_TICK_MS);
    expect(h.end).toBe("closed");
  });

  it("removes its listeners when done", async () => {
    const el = new EventTarget();
    const add = vi.spyOn(el, "addEventListener");
    const remove = vi.spyOn(el, "removeEventListener");
    const hold = new HoverHold(el, 4_000, { now });
    el.dispatchEvent(new Event("click"));
    await hold.done;
    expect(remove.mock.calls.map((c) => c[0]).sort()).toEqual(add.mock.calls.map((c) => c[0]).sort());
    // kapandıktan sonra olay yok sayılır
    el.dispatchEvent(new Event("pointerenter"));
    expect(hold.phase).toBe("closed");
  });
});
