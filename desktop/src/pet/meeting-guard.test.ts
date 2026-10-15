import { describe, expect, it } from "vitest";
import { MeetingGuard, SHH_MS, type GuardActions, type GuardContext } from "./meeting-guard";

const ctx = (over: Partial<GuardContext> = {}): GuardContext => ({
  askboxOpen: false,
  bubbleVisible: false,
  mode: "street",
  ...over,
});

const none = (over: Partial<GuardActions> = {}): GuardActions => ({
  closeAskbox: false,
  hideBubble: false,
  playShh: false,
  hide: false,
  restore: false,
  suppress: false,
  effectiveMode: "street",
  ...over,
});

function clock(start = 1_000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe("MeetingGuard", () => {
  it("is silent and polite before the first state arrives", () => {
    const g = new MeetingGuard();
    expect(g.state).toBe("unknown");
    expect(g.tick(ctx())).toEqual(none({ suppress: true, effectiveMode: "polite" }));
  });

  it("first state clear: just lifts the suppression, nothing to restore", () => {
    const g = new MeetingGuard();
    expect(g.update(false, ctx())).toEqual(none());
    expect(g.state).toBe("clear");
  });

  it("first state in meeting: shh then hide", () => {
    const c = clock();
    const g = new MeetingGuard({ now: c.now });
    expect(g.update(true, ctx())).toEqual(none({ playShh: true, suppress: true, effectiveMode: "polite" }));
    c.advance(SHH_MS);
    expect(g.tick(ctx())).toEqual(none({ hide: true, suppress: true, effectiveMode: "polite" }));
    expect(g.state).toBe("hidden");
  });

  it("entering: closes the askbox, hides the bubble, shh once within 1s, then hides", () => {
    const c = clock();
    const g = new MeetingGuard({ now: c.now });
    g.update(false, ctx());
    const enter = g.update(true, ctx({ askboxOpen: true, bubbleVisible: true }));
    expect(enter).toEqual(
      none({ closeAskbox: true, hideBubble: true, playShh: true, suppress: true, effectiveMode: "polite" }),
    );
    expect(g.hideAt).toBe(1_000 + SHH_MS);
    expect(SHH_MS).toBe(1_200); // shh tag: 3 kare x 400 ms, bir kez tam görünür

    c.advance(SHH_MS - 1);
    expect(g.tick(ctx()).hide).toBe(false);
    c.advance(1);
    expect(g.tick(ctx()).hide).toBe(true);
    expect(g.hideAt).toBeNull();
    expect(g.tick(ctx()).hide).toBe(false);
  });

  it("street mode becomes polite during the meeting and comes back after", () => {
    const c = clock();
    const g = new MeetingGuard({ now: c.now });
    g.update(false, ctx({ mode: "street" }));
    expect(g.update(true, ctx({ mode: "street" })).effectiveMode).toBe("polite");
    c.advance(SHH_MS);
    expect(g.tick(ctx({ mode: "street" })).effectiveMode).toBe("polite");
    const leave = g.update(false, ctx({ mode: "street" }));
    expect(leave).toEqual(none({ restore: true, effectiveMode: "street" }));
  });

  it("repeated identical states produce no actions", () => {
    const c = clock();
    const g = new MeetingGuard({ now: c.now });
    g.update(false, ctx());
    expect(g.update(false, ctx())).toEqual(none());
    g.update(true, ctx());
    expect(g.update(true, ctx({ askboxOpen: true, bubbleVisible: true }))).toEqual(
      none({ suppress: true, effectiveMode: "polite" }),
    );
    c.advance(SHH_MS);
    // süre dolduktan sonra gelen aynı durum saklanmayı bir kez tetikler, sonra yine sessiz
    expect(g.update(true, ctx()).hide).toBe(true);
    expect(g.update(true, ctx())).toEqual(none({ suppress: true, effectiveMode: "polite" }));
  });

  it("leaving during shh restores without ever hiding", () => {
    const c = clock();
    const g = new MeetingGuard({ now: c.now });
    g.update(false, ctx());
    g.update(true, ctx());
    c.advance(100);
    expect(g.update(false, ctx())).toEqual(none({ restore: true }));
    c.advance(SHH_MS);
    expect(g.tick(ctx())).toEqual(none());
  });

  it("manual switch takes the same path and a new meeting shh's again", () => {
    const c = clock();
    const g = new MeetingGuard({ now: c.now });
    g.update(false, ctx());
    g.update(true, ctx());
    c.advance(SHH_MS);
    g.tick(ctx());
    expect(g.update(false, ctx()).restore).toBe(true);
    expect(g.update(true, ctx()).playShh).toBe(true);
  });
});
