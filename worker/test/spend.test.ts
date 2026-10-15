import { describe, expect, it, vi } from "vitest";
import {
  alertKey,
  alertThreshold,
  DEFAULT_SPEND_CAP,
  readSpend,
  recordSpend,
  SPEND_TTL_SECONDS,
  spendCap,
  spendKey,
  underCap,
} from "../src/lib/spend";
import { memoryKV } from "./helpers";

const DAY1 = Date.UTC(2026, 9, 2, 10, 0, 0);
const DAY2 = Date.UTC(2026, 9, 3, 0, 0, 1);
const HOOK = "https://hooks.example/dunno";

const okFetch = () => vi.fn(async (_url: string, _init?: RequestInit) => new Response("ok"));

describe("spend cap", () => {
  it("parses the cap from env with a low safe default", () => {
    expect(spendCap(undefined)).toBe(DEFAULT_SPEND_CAP);
    expect(spendCap("")).toBe(DEFAULT_SPEND_CAP);
    expect(spendCap("lots")).toBe(DEFAULT_SPEND_CAP);
    expect(spendCap("-5")).toBe(DEFAULT_SPEND_CAP);
    expect(spendCap("1000")).toBe(1000);
    expect(spendCap("0")).toBe(0);
  });

  it("alerts at 80 percent, never when the cap is 0", () => {
    expect(alertThreshold(1000)).toBe(800);
    expect(alertThreshold(5)).toBe(4);
    expect(alertThreshold(1)).toBe(1);
    expect(alertThreshold(0)).toBe(Infinity);
  });

  it("counts requests and tokens per utc day with 48h ttl", async () => {
    const kv = memoryKV();
    await recordSpend({ kv, tokens: 40, cap: 10, now: DAY1 });
    await recordSpend({ kv, tokens: 0, cap: 10, now: DAY1 });
    await recordSpend({ kv, tokens: 25, cap: 10, now: DAY1 });
    expect(await readSpend(kv, "2026-10-02")).toEqual({ requests: 3, tokens: 65 });
    expect(kv.ttls.get(spendKey("2026-10-02"))).toBe(SPEND_TTL_SECONDS);
    expect(await readSpend(kv, "2026-10-03")).toEqual({ requests: 0, tokens: 0 });
  });

  it("is under the cap until the cap is reached, and resets the next day", async () => {
    const kv = memoryKV();
    for (let i = 0; i < 2; i++) {
      expect(await underCap(kv, 2, DAY1)).toBe(true);
      await recordSpend({ kv, tokens: 0, cap: 2, now: DAY1 });
    }
    expect(await underCap(kv, 2, DAY1)).toBe(false);
    expect(await underCap(kv, 2, DAY2)).toBe(true);
    expect(await underCap(kv, 0, DAY2)).toBe(false);
  });

  it("treats a corrupt counter as zero", async () => {
    const kv = memoryKV();
    await kv.put(spendKey("2026-10-02"), "not json");
    expect(await readSpend(kv, "2026-10-02")).toEqual({ requests: 0, tokens: 0 });
    await kv.put(spendKey("2026-10-02"), JSON.stringify({ requests: "9", tokens: -3 }));
    expect(await readSpend(kv, "2026-10-02")).toEqual({ requests: 0, tokens: 0 });
  });

  it("sends exactly one alert per day when crossing 80 percent", async () => {
    const kv = memoryKV();
    const hook = okFetch();
    const opts = { kv, cap: 5, webhook: HOOK, fetchImpl: hook as unknown as typeof fetch };
    for (let i = 0; i < 3; i++) await recordSpend({ ...opts, tokens: 10, now: DAY1 });
    expect(hook).not.toHaveBeenCalled();

    await recordSpend({ ...opts, tokens: 10, now: DAY1 }); // 4/5 = %80
    expect(hook).toHaveBeenCalledTimes(1);
    const [url, init] = hook.mock.calls[0];
    expect(url).toBe(HOOK);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      event: "spend_80",
      date: "2026-10-02",
      requests: 4,
      tokens: 40,
      cap: 5,
    });
    expect(kv.store.get(alertKey("2026-10-02"))).toBe("1");

    await recordSpend({ ...opts, tokens: 10, now: DAY1 });
    await recordSpend({ ...opts, tokens: 10, now: DAY1 });
    expect(hook).toHaveBeenCalledTimes(1);

    // ertesi gün sayaç ve bayrak sıfır
    for (let i = 0; i < 4; i++) await recordSpend({ ...opts, tokens: 0, now: DAY2 });
    expect(hook).toHaveBeenCalledTimes(2);
  });

  it("skips the alert without a webhook but still counts", async () => {
    const kv = memoryKV();
    const hook = okFetch();
    for (let i = 0; i < 5; i++) {
      await recordSpend({ kv, tokens: 1, cap: 5, fetchImpl: hook as unknown as typeof fetch, now: DAY1 });
    }
    expect(hook).not.toHaveBeenCalled();
    expect(kv.store.has(alertKey("2026-10-02"))).toBe(false);
    expect(await readSpend(kv, "2026-10-02")).toEqual({ requests: 5, tokens: 5 });
  });

  it("swallows webhook errors and does not retry the same day", async () => {
    const kv = memoryKV();
    const broken = vi.fn(async () => {
      throw new TypeError("network");
    });
    const opts = { kv, cap: 1, webhook: HOOK, fetchImpl: broken as unknown as typeof fetch, now: DAY1 };
    await expect(recordSpend({ ...opts, tokens: 0 })).resolves.toEqual({ requests: 1, tokens: 0 });
    await recordSpend({ ...opts, tokens: 0 });
    expect(broken).toHaveBeenCalledTimes(1);
  });
});
