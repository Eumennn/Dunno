// Gömülü havuzlar (assets/, kaynağı content/pool) motorla çalışıyor mu. Kural kontrolü: pool-check.ts + scripts/pool-content.test.ts.
import { describe, expect, it } from "vitest";
import poolEn from "../../assets/pool_en.json";
import poolTr from "../../assets/pool_tr.json";
import { LineEngine, mergeLines, normalizeLine, renderText } from "./engine";
import type { Lang } from "./types";

const files: [Lang, unknown[]][] = [
  ["tr", poolTr],
  ["en", poolEn],
];

describe("bundled pools", () => {
  for (const [lang, pool] of files) {
    it(`pool_${lang}.json: every entry normalizes and has ${lang} text`, () => {
      for (const raw of pool) {
        const line = normalizeLine(raw);
        expect(line, JSON.stringify(raw)).not.toBeNull();
        expect(line![lang]).toBeTruthy();
      }
    });

    it(`pool_${lang}.json: the engine finds a line for the basics in both modes`, () => {
      const engine = new LineEngine({ lines: mergeLines(pool), rng: () => 0 });
      for (const mode of ["polite", "street"] as const) {
        expect(engine.say(["app:excel"], lang, mode)).toBeTruthy();
        expect(engine.say(["interaction:limit_reached"], lang, mode)).toBeTruthy();
        expect(engine.answer(lang, mode)).toBeTruthy();
      }
    });

    it(`pool_${lang}.json: nothing renders braces or [K]`, () => {
      for (const raw of pool) {
        const text = (raw as Record<string, string>)[lang];
        for (const mode of ["polite", "street"] as const) {
          expect(renderText(text, mode)).not.toMatch(/[{}]|\[k\]/i);
        }
      }
    });
  }

  it("both files merge without losing lines", () => {
    const merged = mergeLines(poolTr, poolEn);
    const ids = new Set([...poolTr, ...poolEn].map((l) => (l as { id: string }).id));
    expect(merged.length).toBe(ids.size);
  });
});
