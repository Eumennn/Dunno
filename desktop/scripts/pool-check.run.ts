// `npm run pool:check` (kurallar + kapsam + assets kopyası) ve `npm run pool:coverage` (COVERAGE.md yazar).
// vitest üzerinden koşar (TS + JSON import için); normal `npm test`'e girmez (dosya adı *.test.ts değil).
import { readFileSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { checkPool, coverage, coverageGaps, coverageMarkdown, freeIssues, rareIssues, streetTailIssues, type Issue } from "../src/lines/pool-check";
import { assetsInSync, COVERAGE_FILE, readPoolFiles } from "./pool-files";

const format = (i: Issue) =>
  `${i.severity.toUpperCase().padEnd(5)} ${i.lang} ${i.index >= 0 ? `#${i.index}` : "  "} ${i.id ?? ""} ${i.message}`;

it("pool", () => {
  const files = readPoolFiles();
  const rows = coverage(files.tr, files.en);
  const md = coverageMarkdown(rows);

  if (import.meta.env.MODE === "write-coverage") {
    writeFileSync(COVERAGE_FILE, md);
    console.log(`wrote ${COVERAGE_FILE}`);
    return;
  }

  const issues = [
    ...checkPool("tr", files.tr, files.banned, files.en),
    ...checkPool("en", files.en, files.banned, files.tr),
    ...coverageGaps(rows),
    ...streetTailIssues(files.tr, files.en),
    ...rareIssues(files.tr, files.en),
    ...freeIssues(files.tr, files.en),
  ];
  for (const s of assetsInSync()) {
    if (!s.ok) issues.push({ severity: "error", lang: s.lang as "tr", index: -1, message: `desktop/assets/${s.name} is stale (npm run pool:sync)` });
  }
  let coverageFile = "";
  try {
    coverageFile = readFileSync(COVERAGE_FILE, "utf8");
  } catch {
    // yok
  }
  if (coverageFile !== md) {
    issues.push({ severity: "error", lang: "tr", index: -1, message: "content/pool/COVERAGE.md is stale (npm run pool:coverage)" });
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  const gaps = issues.length - errors;
  console.log(issues.map(format).join("\n") || "no issues");
  console.log(`\npool:check -> ${errors} error(s), ${gaps} gap(s)`);
  expect(issues).toEqual([]);
});
