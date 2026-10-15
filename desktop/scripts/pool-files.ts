// content/pool dosyalarını okur (Node). Doğrulama mantığı src/lines/pool-check.ts'te (saf).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseBanned, type BannedLists } from "../src/lines/pool-check";

export const CONTENT_DIR = resolve(__dirname, "..", "..", "content", "pool");
export const ASSETS_DIR = resolve(__dirname, "..", "assets");
export const COVERAGE_FILE = resolve(CONTENT_DIR, "COVERAGE.md");

const read = (name: string) => readFileSync(resolve(CONTENT_DIR, name), "utf8");

export interface PoolFiles {
  tr: unknown;
  en: unknown;
  banned: BannedLists;
}

export function readPoolFiles(): PoolFiles {
  return {
    tr: JSON.parse(read("pool_tr.json")),
    en: JSON.parse(read("pool_en.json")),
    banned: { tr: parseBanned(read("banned_tr.txt")), en: parseBanned(read("banned_en.txt")) },
  };
}

/** assets kopyaları (pool_<lang>.json, banned_<lang>.txt, sites.json) kaynağın birebir kopyası mı (build kopyalar). */
export function assetsInSync(): { lang: string; ok: boolean; name: string }[] {
  const same = (assetName: string, source: string) => {
    try {
      return readFileSync(resolve(ASSETS_DIR, assetName), "utf8") === readFileSync(source, "utf8");
    } catch {
      return false;
    }
  };
  return [
    ...["tr", "en"].flatMap((lang) =>
      [`pool_${lang}.json`, `banned_${lang}.txt`].map((name) => ({ lang, ok: same(name, resolve(CONTENT_DIR, name)), name })),
    ),
    // SPEC 09 K7: content/context/sites.json
    { lang: "-", ok: same("sites.json", resolve(CONTENT_DIR, "..", "context", "sites.json")), name: "sites.json" },
  ];
}
