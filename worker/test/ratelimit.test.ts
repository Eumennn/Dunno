import { describe, expect, it } from "vitest";
import {
  checkRateLimit,
  dailyLimit,
  DEFAULT_DAILY_LIMIT,
  deviceHash,
  LOCAL_SALT,
  rateLimitSalt,
  RL_TTL_SECONDS,
  utcDay,
} from "../src/lib/ratelimit";
import { memoryKV } from "./helpers";

const DAY1 = Date.UTC(2026, 9, 2, 10, 0, 0);
const DAY2 = Date.UTC(2026, 9, 3, 0, 0, 1);
const DEVICE = "3f2b9c1e-7a4d-4e8f-9b21-0c6d5e4f3a2b";

describe("rate limit", () => {
  it("allows 3 per day and rejects the 4th", async () => {
    const kv = memoryKV();
    const opts = { kv, deviceId: DEVICE, ip: "1.2.3.4", salt: "s", now: DAY1 };
    expect(await checkRateLimit(opts)).toEqual({ allowed: true, remaining: 2 });
    expect(await checkRateLimit(opts)).toEqual({ allowed: true, remaining: 1 });
    expect(await checkRateLimit(opts)).toEqual({ allowed: true, remaining: 0 });
    expect(await checkRateLimit(opts)).toEqual({ allowed: false, remaining: 0 });
    // red sayacı büyütmez
    expect([...kv.store.values()]).toEqual(["3"]);
  });

  it("resets on a new utc day", async () => {
    const kv = memoryKV();
    const opts = { kv, deviceId: DEVICE, ip: "1.2.3.4", salt: "s" };
    for (let i = 0; i < 3; i++) await checkRateLimit({ ...opts, now: DAY1 });
    expect((await checkRateLimit({ ...opts, now: DAY1 })).allowed).toBe(false);
    expect(await checkRateLimit({ ...opts, now: DAY2 })).toEqual({ allowed: true, remaining: 2 });
  });

  it("counts a different device id separately", async () => {
    const kv = memoryKV();
    for (let i = 0; i < 3; i++) await checkRateLimit({ kv, deviceId: DEVICE, ip: "1.1.1.1", salt: "s", now: DAY1 });
    expect((await checkRateLimit({ kv, deviceId: DEVICE, ip: "1.1.1.1", salt: "s", now: DAY1 })).allowed).toBe(false);
    expect((await checkRateLimit({ kv, deviceId: "other-device-01", ip: "1.1.1.1", salt: "s", now: DAY1 })).allowed).toBe(true);
  });

  it("counts the same device id on a different ip separately", async () => {
    const kv = memoryKV();
    for (let i = 0; i < 3; i++) await checkRateLimit({ kv, deviceId: DEVICE, ip: "1.1.1.1", salt: "s", now: DAY1 });
    expect((await checkRateLimit({ kv, deviceId: DEVICE, ip: "2.2.2.2", salt: "s", now: DAY1 })).allowed).toBe(true);
  });

  it("honours a custom limit, including 0", async () => {
    const kv = memoryKV();
    const opts = { kv, deviceId: DEVICE, ip: "1.1.1.1", salt: "s", now: DAY1 };
    expect((await checkRateLimit({ ...opts, limit: 1 })).allowed).toBe(true);
    expect((await checkRateLimit({ ...opts, limit: 1 })).allowed).toBe(false);
    expect((await checkRateLimit({ ...opts, deviceId: "zero-limit-01", limit: 0 })).allowed).toBe(false);
  });

  it("stores only a hashed key per utc day with 48h ttl", async () => {
    const kv = memoryKV();
    await checkRateLimit({ kv, deviceId: DEVICE, ip: "1.2.3.4", salt: "s", now: DAY1 });
    const [key] = [...kv.store.keys()];
    expect(key).toMatch(/^rl:[0-9a-f]{64}:2026-10-02$/);
    expect(key).not.toContain("1.2.3.4");
    expect(key).not.toContain(DEVICE);
    expect(kv.ttls.get(key)).toBe(RL_TTL_SECONDS);
    expect(RL_TTL_SECONDS).toBe(172800);
  });

  it("hash depends on salt, device and ip", async () => {
    const a = await deviceHash(DEVICE, "1.2.3.4", "salt-a");
    expect(await deviceHash(DEVICE, "1.2.3.4", "salt-a")).toBe(a);
    expect(await deviceHash(DEVICE, "1.2.3.4", "salt-b")).not.toBe(a);
    expect(await deviceHash("other-device-01", "1.2.3.4", "salt-a")).not.toBe(a);
    expect(await deviceHash(DEVICE, "1.2.3.5", "salt-a")).not.toBe(a);
  });

  it("uses the local salt only in dev, never in production", () => {
    expect(rateLimitSalt({ RL_SALT: "secret" })).toBe("secret");
    expect(rateLimitSalt({ RL_SALT: "secret", ENVIRONMENT: "dev" })).toBe("secret");
    expect(rateLimitSalt({ ENVIRONMENT: "dev" })).toBe(LOCAL_SALT);
    expect(rateLimitSalt({})).toBeNull();
    expect(rateLimitSalt({ ENVIRONMENT: "production" })).toBeNull();
    expect(rateLimitSalt({ RL_SALT: "", ENVIRONMENT: "prod" })).toBeNull();
  });

  it("parses the daily limit from env", () => {
    expect(dailyLimit(undefined)).toBe(DEFAULT_DAILY_LIMIT);
    expect(dailyLimit("")).toBe(DEFAULT_DAILY_LIMIT);
    expect(dailyLimit("abc")).toBe(DEFAULT_DAILY_LIMIT);
    expect(dailyLimit("-1")).toBe(DEFAULT_DAILY_LIMIT);
    expect(dailyLimit("5")).toBe(5);
    expect(dailyLimit("0")).toBe(0);
  });

  it("formats the utc day", () => {
    expect(utcDay(DAY1)).toBe("2026-10-02");
    expect(utcDay(Date.UTC(2026, 9, 2, 23, 59, 59))).toBe("2026-10-02");
  });
});
