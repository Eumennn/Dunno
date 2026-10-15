import { describe, expect, it } from "vitest";
import {
  cleanSensitive,
  initialSensitive,
  isSulking,
  pruneSensitive,
  recordStrike,
  SENSITIVE_SULK_DURATION_MS,
  type SensitiveState,
} from "./sensitive";

describe("sensitive questions strike tracker (FB14-1)", () => {
  it("initial and clean handles invalid data gracefully", () => {
    expect(initialSensitive()).toEqual({ strikes: 0, sulkUntil: null });
    expect(cleanSensitive(null)).toEqual({ strikes: 0, sulkUntil: null });
    expect(cleanSensitive({})).toEqual({ strikes: 0, sulkUntil: null });
    expect(cleanSensitive({ strikes: -5, sulkUntil: "bad" })).toEqual({ strikes: 0, sulkUntil: null });
    expect(cleanSensitive({ strikes: 3.8, sulkUntil: 12345.6 })).toEqual({ strikes: 3, sulkUntil: 12345 });
  });

  it("escalation: strike 1 & 2 -> dodge, 3 & 4 -> warn, 5 -> sulk for 24h", () => {
    const t0 = 1_000_000;
    let s: SensitiveState = initialSensitive();

    // Strike 1
    const r1 = recordStrike(s, t0);
    expect(r1.action).toBe("dodge");
    expect(r1.state.strikes).toBe(1);
    expect(r1.state.sulkUntil).toBeNull();
    s = r1.state;

    // Strike 2
    const r2 = recordStrike(s, t0);
    expect(r2.action).toBe("dodge");
    expect(r2.state.strikes).toBe(2);
    expect(r2.state.sulkUntil).toBeNull();
    s = r2.state;

    // Strike 3 -> warn
    const r3 = recordStrike(s, t0);
    expect(r3.action).toBe("warn");
    expect(r3.state.strikes).toBe(3);
    expect(r3.state.sulkUntil).toBeNull();
    s = r3.state;

    // Strike 4 -> warn
    const r4 = recordStrike(s, t0);
    expect(r4.action).toBe("warn");
    expect(r4.state.strikes).toBe(4);
    expect(r4.state.sulkUntil).toBeNull();
    s = r4.state;

    // Strike 5 -> sulk (24h)
    const r5 = recordStrike(s, t0);
    expect(r5.action).toBe("sulk");
    expect(r5.state.strikes).toBe(5);
    expect(r5.state.sulkUntil).toBe(t0 + SENSITIVE_SULK_DURATION_MS);
    s = r5.state;

    // Next strike while sulking keeps sulking
    const r6 = recordStrike(s, t0 + 1000);
    expect(r6.action).toBe("sulk");
    expect(isSulking(s, t0 + 1000)).toBe(true);
  });

  it("sulk expires after 24h and resets tracker", () => {
    const t0 = 1_000_000;
    const s: SensitiveState = {
      strikes: 5,
      sulkUntil: t0 + SENSITIVE_SULK_DURATION_MS,
    };

    expect(isSulking(s, t0 + 10_000)).toBe(true);
    expect(isSulking(s, t0 + SENSITIVE_SULK_DURATION_MS - 1)).toBe(true);
    expect(isSulking(s, t0 + SENSITIVE_SULK_DURATION_MS)).toBe(false);
    expect(isSulking(s, t0 + SENSITIVE_SULK_DURATION_MS + 1000)).toBe(false);

    const pruned = pruneSensitive(s, t0 + SENSITIVE_SULK_DURATION_MS + 1000);
    expect(pruned).toEqual({ strikes: 0, sulkUntil: null });

    // A new strike after expiration starts fresh at strike 1 (dodge)
    const next = recordStrike(s, t0 + SENSITIVE_SULK_DURATION_MS + 1000);
    expect(next.action).toBe("dodge");
    expect(next.state.strikes).toBe(1);
    expect(next.state.sulkUntil).toBeNull();
  });
});
