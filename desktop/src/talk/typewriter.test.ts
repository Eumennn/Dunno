import { describe, expect, it } from "vitest";
import { CHAR_MAX_MS, CHAR_MIN_MS, COMMA_PAUSE_MS, shownAt, STOP_PAUSE_MS, typeMs, typeSchedule } from "./typewriter";

const fixed = (v: number) => () => v;

describe("typeSchedule (SPEC 10 CL3)", () => {
  it("ilk karakter hemen, sonrakiler 25-40 ms arayla", () => {
    for (const r of [0, 0.5, 0.999]) {
      const at = typeSchedule("merhaba", fixed(r));
      expect(at[0]).toBe(0);
      for (let i = 1; i < at.length; i++) {
        const d = at[i] - at[i - 1];
        expect(d).toBeGreaterThanOrEqual(CHAR_MIN_MS);
        expect(d).toBeLessThanOrEqual(CHAR_MAX_MS);
      }
    }
  });

  it("noktalama sonrası duraklama; sondaki noktalama beklemez", () => {
    const at = typeSchedule("bilmem. belki, yarın.", fixed(0));
    const gap = (i: number) => at[i] - at[i - 1];
    const afterStop = "bilmem.".length; // boşluk
    expect(gap(afterStop)).toBe(CHAR_MIN_MS + STOP_PAUSE_MS);
    const afterComma = "bilmem. belki,".length;
    expect(gap(afterComma)).toBe(CHAR_MIN_MS + COMMA_PAUSE_MS);
    expect(gap(at.length - 1)).toBe(CHAR_MIN_MS);
  });

  it("emoji/çok baytlı harfler tek karakter; boş metin 0", () => {
    expect(typeSchedule("şçğ", fixed(0))).toHaveLength(3);
    expect(typeMs(typeSchedule("", fixed(0)))).toBe(0);
  });

  it("60 karakterlik laf ~1.5-2.5 sn, 120 karakterlik honest ~3-5 sn", () => {
    const short = typeMs(typeSchedule("a".repeat(60), fixed(0.5)));
    expect(short).toBeGreaterThan(1_400);
    expect(short).toBeLessThan(2_500);
    const long = typeMs(typeSchedule("kısa ve doğru. ama sorma. ".repeat(4).slice(0, 120), fixed(0.5)));
    expect(long).toBeGreaterThan(3_000);
    expect(long).toBeLessThan(5_500);
  });

  it("shownAt: zamana göre görünen karakter sayısı", () => {
    const at = typeSchedule("abc", fixed(0));
    expect(shownAt(at, -1)).toBe(0);
    expect(shownAt(at, 0)).toBe(1);
    expect(shownAt(at, CHAR_MIN_MS)).toBe(2);
    expect(shownAt(at, 10_000)).toBe(3);
  });
});
