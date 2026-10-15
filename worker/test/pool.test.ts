import { describe, expect, it } from "vitest";
import { POOLS, poolAnswer } from "../src/lib/pool";
import { LANGS, MODES } from "../src/lib/validate";

const all = LANGS.flatMap((lang) => MODES.map((mode) => ({ lang, mode, lines: POOLS[lang][mode] })));

describe("pool", () => {
  it("has lines for every lang x mode", () => {
    for (const { lines } of all) expect(lines.length).toBeGreaterThan(0);
  });

  it("follows the brand voice: lowercase, no bang, no emoji, max 60 chars", () => {
    for (const { lang, lines } of all) {
      for (const line of lines) {
        expect(line.replace("[K]", "")).toBe(line.replace("[K]", "").toLocaleLowerCase(lang));
        expect(line).not.toMatch(/[!¡]|\p{Extended_Pictographic}/u);
        expect(Array.from(line).length).toBeLessThanOrEqual(60);
      }
    }
  });

  it("uses [K] only in street, never a literal ***", () => {
    for (const { mode, lines } of all) {
      for (const line of lines) {
        expect(line).not.toContain("***");
        if (mode === "polite") expect(line).not.toContain("[K]");
      }
    }
    for (const lang of LANGS) expect(POOLS[lang].street.some((l) => l.includes("[K]"))).toBe(true);
  });

  it("picks from the requested lang and mode", () => {
    expect(poolAnswer("tr", "street", () => 0)).toBe(POOLS.tr.street[0]);
    expect(poolAnswer("en", "polite", () => 0.999)).toBe(POOLS.en.polite.at(-1));
    for (const { lang, mode, lines } of all) {
      for (let i = 0; i < 20; i++) expect(lines).toContain(poolAnswer(lang, mode));
    }
  });
});
