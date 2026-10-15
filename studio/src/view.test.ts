// Görünüm testleri: doğrulama hatalarının ilgili satıra/editöre gelmesi, kaçışlama, hedef altı vurgusu.
import { describe, expect, it } from "vitest";
import { checkPool, coverage, parseBanned } from "@desktop/lines/pool-check";
import { buildTree, issuesByIndex, type Entry } from "./model";
import { editorHtml, lineRowHtml, listHtml, treeHtml } from "./view";

const banned = { tr: parseBanned(""), en: parseBanned("die") };
const pool: Entry[] = [
  { id: "en_excel_01", trigger: "app:excel", intent: "mocks the sheet", en: "is this a spreadsheet" },
  { id: "en_excel_02", trigger: "app:excel", intent: "judges cells", en: "Merged cells!{K:, ***}" },
];

describe("validation errors reach the UI", () => {
  it("the broken row shows its messages and the error class; the good row does not", () => {
    const issues = issuesByIndex(checkPool("en", pool, banned));
    const html = listHtml(
      pool.map((entry, index) => ({ entry, index })),
      "en",
      issues,
    );
    const rows = html.split('<li class="row').slice(1);
    expect(rows[0]).not.toContain("row-issues");
    expect(rows[1]).toContain(' row-err"');
    expect(rows[1]).toContain("<li>text must be lowercase</li>");
    expect(rows[1]).toContain("<li>no exclamation marks</li>");
  });

  it("the editor lists the draft's issues, or says it is fine", () => {
    const bad = editorHtml({ draft: pool[1], index: 1, issues: ["no exclamation marks"] }, "en");
    expect(bad).toContain('role="alert"');
    expect(bad).toContain("<li>no exclamation marks</li>");
    const good = editorHtml({ draft: pool[0], index: 0, issues: [] }, "en");
    expect(good).toContain("kurallara uyuyor");
    expect(good).toContain('<option value="app:excel" selected>');
  });
});

describe("rows", () => {
  it("previews polite and street separately, street only when different", () => {
    const k = lineRowHtml({ entry: pool[1], index: 1 }, "en");
    expect(k).toContain('<span class="kick" lang="en">polite</span> Merged cells!');
    expect(k).toContain('<span class="kick" lang="en">street</span> Merged cells!, ***');
    const plain = lineRowHtml({ entry: pool[0], index: 0 }, "en");
    expect(plain).not.toContain(">street<");
    expect(plain).toContain('data-action="edit" data-index="0"');
  });

  it("escapes everything that comes from the file", () => {
    const html = lineRowHtml({ entry: { id: "<b>x", trigger: "random", intent: "<img src=x>", en: "<script>" }, index: 0 }, "en");
    expect(html).not.toMatch(/<script>|<img|<b>x/);
    expect(html).toContain("&#60;script&#62;");
  });
});

describe("tree", () => {
  it("marks triggers under target as under (pink)", () => {
    const tree = buildTree(coverage([], pool), "en");
    const html = treeHtml(tree, "app:excel");
    expect(html).toMatch(/class="tree-item under tree-on"[^>]*data-trigger="app:excel"/);
    expect(html).toContain("2/20");
  });
});
