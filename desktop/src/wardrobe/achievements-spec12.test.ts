import { describe, expect, it } from "vitest";
import { STRINGS } from "../i18n";
import { ACHIEVEMENTS } from "./achievements";
import { SPEC12_ACHIEVEMENT_TEXT } from "./achievements-spec12.strings";

const S12 = ACHIEVEMENTS.slice(9 + 33);

describe("SPEC 12 yaratık başarımları", () => {
  it("12 yaratık, her biri bir kostüm açar; metinler iki dilde, marka sesi", () => {
    expect(S12.map((a) => a.unlocks.kind)).toEqual(Array(12).fill("costume"));
    for (const lang of ["tr", "en"] as const) {
      expect(Object.keys(SPEC12_ACHIEVEMENT_TEXT[lang]).sort()).toEqual(S12.map((a) => a.id).sort());
      for (const a of S12) {
        const t = SPEC12_ACHIEVEMENT_TEXT[lang][a.id as keyof (typeof SPEC12_ACHIEVEMENT_TEXT)["tr"]];
        for (const s of [t.title, t.goal(a.target)]) {
          expect(s, s).toBe(s.toLocaleLowerCase(lang));
          expect(s, s).not.toMatch(/[!¡！]|\p{Extended_Pictographic}/u);
          expect(s.length, s).toBeLessThanOrEqual(48);
        }
        expect(t.goal(a.target)).toContain(String(a.target));
      }
    }
  });

  it("dolapta her başarımın adı var (K9 metinleri de bağlı; eskiden id görünüyordu)", () => {
    for (const lang of ["tr", "en"] as const) for (const a of ACHIEVEMENTS) expect(STRINGS[lang].achievements[a.id]?.title, `${lang} ${a.id}`).toBeTruthy();
  });
});
