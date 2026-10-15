// CI (npm test): content/pool kural hatası, placeholder ve kapsam açığı içermez; desktop/assets kopyası güncel.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { APP_TAGS, checkPool, coverage, coverageGaps, MEETING_APPS, streetTailIssues } from "../src/lines/pool-check";
import { assetsInSync, readPoolFiles } from "./pool-files";

describe("content/pool", () => {
  const files = readPoolFiles();

  it("has no rule errors, placeholders or coverage gaps", () => {
    const errors = [
      ...checkPool("tr", files.tr, files.banned, files.en),
      ...checkPool("en", files.en, files.banned, files.tr),
    ]
      .concat(coverageGaps(coverage(files.tr, files.en)), streetTailIssues(files.tr, files.en))
      .map((i) => `${i.lang} ${i.id ?? i.index}: ${i.message}`);
    expect(errors).toEqual([]);
  });

  it("banned lists are not empty", () => {
    expect(files.banned.tr.length).toBeGreaterThan(20);
    expect(files.banned.en.length).toBeGreaterThan(20);
  });

  it("app tags match the Rust exe table (context/apps.rs); meeting apps have no lines", () => {
    const all = readFileSync(resolve(__dirname, "..", "src-tauri", "src", "context", "apps.rs"), "utf8");
    // sadece APPS tablosu (MAC_BUNDLES paket kimliği -> exe eşlemesi, etiket değil)
    const rs = all.slice(all.indexOf("const APPS"), all.indexOf("];", all.indexOf("const APPS")));
    const rustTags = new Set([...rs.matchAll(/^\s*\("[^"]+",\s*"([a-z_]+)"\),/gm)].map((m) => m[1]));
    const meeting = new Set<string>(MEETING_APPS);
    const fromRust = [...rustTags].filter((t) => !meeting.has(t)).sort();
    // SPEC 13: game artık başlatıcılarla eşleniyor (epic, battle.net, riot...)
    const fromPool = [...APP_TAGS].sort();
    expect(fromRust).toEqual(fromPool);
  });

  it("desktop/assets copies match the source", () => {
    expect(assetsInSync()).toEqual([
      { lang: "tr", ok: true, name: "pool_tr.json" },
      { lang: "tr", ok: true, name: "banned_tr.txt" },
      { lang: "en", ok: true, name: "pool_en.json" },
      { lang: "en", ok: true, name: "banned_en.txt" },
      { lang: "-", ok: true, name: "sites.json" },
    ]);
  });
});
