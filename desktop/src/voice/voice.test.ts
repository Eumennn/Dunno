import { describe, expect, it } from "vitest";
import {
  babbleMs,
  categoryForAnswer,
  categoryForTrigger,
  planBabble,
  PROFILES,
  shouldSpeak,
  VARIANTS,
  VOICE_CATEGORIES,
  VOLUME_GAIN,
} from "./voice";

describe("Dunno sesi (SPEC 11)", () => {
  it("her kategori x varyasyon: kısa (<= 1 sn), hece sayısı/süresi profil içinde, sıralı", () => {
    for (const c of VOICE_CATEGORIES) {
      const p = PROFILES[c];
      for (let v = 0; v < VARIANTS; v++) {
        const s = planBabble(c, v);
        expect(s.length, c).toBeGreaterThanOrEqual(p.syllables[0]);
        expect(s.length, c).toBeLessThanOrEqual(p.syllables[1]);
        expect(babbleMs(s), `${c}/${v}`).toBeLessThanOrEqual(1_000);
        for (let i = 1; i < s.length; i++) expect(s[i].at).toBeGreaterThan(s[i - 1].at + s[i - 1].dur - 1);
        for (const x of s) {
          expect(x.freq).toBeGreaterThan(80);
          expect(x.freq).toBeLessThan(2_000);
          expect(x.vol).toBeGreaterThan(0);
          expect(x.vol).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("deterministik ve küçük havuz: aynı kategori+varyasyon aynı ses, varyasyonlar farklı, havuz VARIANTS'ta döner", () => {
    expect(planBabble("greet", 2)).toEqual(planBabble("greet", 2));
    expect(planBabble("greet", 2)).toEqual(planBabble("greet", 2 + VARIANTS));
    const set = new Set(Array.from({ length: VARIANTS }, (_, v) => JSON.stringify(planBabble("answer", v))));
    expect(set.size).toBe(VARIANTS);
  });

  it("kategoriler farklı karakter: surat asma alçak, çok hızlı tiz ve kısa heceli, başarım yükselir", () => {
    const avg = (c: (typeof VOICE_CATEGORIES)[number]) => {
      const all = Array.from({ length: VARIANTS }, (_, v) => planBabble(c, v)).flat();
      return all.reduce((t, s) => t + s.freq, 0) / all.length;
    };
    expect(avg("sulk")).toBeLessThan(avg("answer"));
    expect(avg("too_fast")).toBeGreaterThan(avg("answer"));
    const a = planBabble("achievement", 0);
    expect(a[a.length - 1].freq).toBeGreaterThan(a[0].freq);
  });

  it("ses metni okumaz: planın imzasında metin yok (kategori + varyasyon)", () => {
    expect(planBabble.length).toBe(2);
  });

  it("trigger -> kategori; fart sessiz", () => {
    expect(categoryForTrigger("interaction:fart")).toBeNull();
    expect(categoryForTrigger("interaction:click")).toBe("greet");
    expect(categoryForTrigger("interaction:unlock")).toBe("achievement");
    expect(categoryForTrigger("app:excel")).toBe("context");
    expect(categoryForTrigger("site:video")).toBe("context");
    expect(categoryForAnswer({ honest: true })).toBe("honest");
    expect(categoryForAnswer({ honest: false })).toBe("answer");
  });

  it("toplantı, bugün sus, sessiz site ya da kapalıyken ses yok; düzeyler artan", () => {
    const on = { enabled: true, meeting: false, muted: false, siteSilent: false };
    expect(shouldSpeak(on)).toBe(true);
    for (const k of ["meeting", "muted", "siteSilent"] as const) expect(shouldSpeak({ ...on, [k]: true }), k).toBe(false);
    expect(shouldSpeak({ ...on, enabled: false })).toBe(false);
    expect(VOLUME_GAIN.low).toBeLessThan(VOLUME_GAIN.medium);
    expect(VOLUME_GAIN.medium).toBeLessThan(VOLUME_GAIN.high);
  });
});
