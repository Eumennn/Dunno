import { describe, expect, it } from "vitest";
import rustContext from "../../src-tauri/src/context/mod.rs?raw";
import { activeTriggers, ClickTracker, hourSlot, timeTrigger } from "./triggers";

const at = (h: number, m = 0) => new Date(2026, 9, 2, h, m);

/** Rust context::time_trigger kaynağından saat -> dilim tablosu (match kollarını okur). */
function rustSlots(): string[] {
  const fn = /pub fn time_trigger[\s\S]*?\n\}/.exec(rustContext)?.[0] ?? "";
  const ranges = [...fn.matchAll(/(\d+)\.\.=(\d+)\s*=>\s*"(time:[a-z_]+)"/g)].map((m) => ({
    from: Number(m[1]),
    to: Number(m[2]),
    slot: m[3],
  }));
  const fallback = /_\s*=>\s*"(time:[a-z_]+)"/.exec(fn)?.[1];
  return Array.from({ length: 24 }, (_, h) => ranges.find((r) => h >= r.from && h <= r.to)?.slot ?? fallback ?? "?");
}

describe("timeTrigger", () => {
  it("saat dilimlerini eşler (Rust tablosu: late_night 0-4, morning 5-10, noon 11-15, evening 16-20, night 21-23)", () => {
    expect(timeTrigger(at(0, 30))).toBe("time:late_night");
    expect(timeTrigger(at(4, 59))).toBe("time:late_night");
    expect(timeTrigger(at(5))).toBe("time:morning");
    expect(timeTrigger(at(7))).toBe("time:morning");
    expect(timeTrigger(at(12))).toBe("time:noon");
    expect(timeTrigger(at(15))).toBe("time:noon");
    expect(timeTrigger(at(16))).toBe("time:evening");
    expect(timeTrigger(at(20, 59))).toBe("time:evening");
    expect(timeTrigger(at(21))).toBe("time:night");
    expect(timeTrigger(at(23))).toBe("time:night");
    expect(hourSlot(24)).toBe("time:late_night");
    expect(hourSlot(-1)).toBe("time:night");
  });

  it("Rust context::time_trigger ile kaymıyor (tek kaynak Rust)", () => {
    const rust = rustSlots();
    expect(rust).not.toContain("?");
    expect(Array.from({ length: 24 }, (_, h) => hourSlot(h))).toEqual(rust);
  });

  it("bağlam trigger'larını ekler", () => {
    expect(activeTriggers(at(3), ["app:excel"])).toEqual(["app:excel", "time:late_night"]);
    expect(activeTriggers(at(15))).toEqual(["time:noon"]);
    // bağlam (Rust) saat dilimi verdiyse yerel hesap eklenmez
    expect(activeTriggers(at(3), ["app:excel", "time:night"])).toEqual(["app:excel", "time:night"]);
  });
});

describe("ClickTracker", () => {
  it("2 sn içinde 4 tıklama spam", () => {
    const c = new ClickTracker();
    expect([0, 300, 600].map((t) => c.click(t))).toEqual([false, false, false]);
    expect(c.click(900)).toBe(true);
    expect(c.click(1000)).toBe(false); // sayaç sıfırlandı
  });

  it("yavaş tıklamalar spam değil", () => {
    const c = new ClickTracker();
    expect([0, 1000, 2100, 3200, 4300].some((t) => c.click(t))).toBe(false);
  });
});

