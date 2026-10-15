import { describe, expect, it } from "vitest";
import { blocks, lineAt, petState, progressAt } from "./flow";
import { SETUP_STRINGS, setupLang } from "./strings";
import { mainHtml, shellHtml, type SetupView } from "./view";
import sheetJson from "../../assets/dunno_sheet.json";

const base: SetupView = { step: "welcome", existing: false, ready: true, version: "0.1.0", pct: 0, line: "", launch: true, error: null };

describe("kurulum programı (FB9)", () => {
  it("ilerleme: süreyle artar, %95'i geçmez, bitince 100; bloklar", () => {
    expect(progressAt(0, false)).toBe(0);
    expect(progressAt(2500, false)).toBeGreaterThan(50);
    expect(progressAt(10 ** 7, false)).toBe(95);
    expect(progressAt(100, true)).toBe(100);
    let prev = 0;
    for (let ms = 0; ms < 20000; ms += 250) {
      const p = progressAt(ms, false);
      expect(p).toBeGreaterThanOrEqual(prev);
      prev = p;
    }
    expect(blocks(0)).toBe(0);
    expect(blocks(50)).toBe(10);
    expect(blocks(100)).toBe(20);
  });

  it("satırlar: [ dunno ] cevabı önce, sonuncuda kalır", () => {
    const t = SETUP_STRINGS.tr;
    expect(lineAt(0, t.lines, t.dunnoPicked)).toBe(t.dunnoPicked);
    expect(lineAt(2300, t.lines, t.dunnoPicked)).toBe(t.lines[0]);
    expect(lineAt(0, t.lines, null)).toBe(t.lines[0]);
    expect(lineAt(10 ** 6, t.lines, null)).toBe(t.lines.at(-1));
  });

  it("Dunno'nun halleri sheet'te var", () => {
    const tags = new Set(sheetJson.meta.frameTags.map((x: { name: string }) => x.name));
    for (const s of ["welcome", "installing", "done", "failed"] as const) {
      expect(tags.has(petState(s))).toBe(true);
      expect(tags.has(petState(s, "uninstall"))).toBe(true);
    }
  });

  it("metinler: marka kuralı (küçük harf, ünlem yok), iki dil aynı anahtarlar", () => {
    expect(Object.keys(SETUP_STRINGS.tr).sort()).toEqual(Object.keys(SETUP_STRINGS.en).sort());
    for (const t of Object.values(SETUP_STRINGS)) {
      const all = Object.values(t).flat() as string[];
      for (const s of all) {
        expect(s, s).not.toMatch(/!/);
        expect(s, s).toBe(s.toLocaleLowerCase("tr"));
      }
    }
    expect(setupLang("tr-TR")).toBe("tr");
    expect(setupLang("en-US")).toBe("en");
    expect(setupLang(undefined)).toBe("en");
  });

  it("kaldırıcı ekranları (FB11)", () => {
    const t = SETUP_STRINGS.tr;
    const u = { ...base, mode: "uninstall" as const };
    const ask = mainHtml(t, u);
    expect(ask).toContain(t.uTitle);
    expect(ask).toContain('data-action="uninstall"');
    expect(ask).toContain('data-action="data"'); // ayarlar da silinsin mi: varsayılan kapalı
    expect(ask).not.toContain("checked");
    expect(mainHtml(t, { ...u, deleteData: true })).toContain('data-action="data" checked');
    expect(mainHtml(t, { ...u, step: "installing", pct: 40, line: "x" })).toContain(t.uRemoving);
    expect(mainHtml(t, { ...u, step: "done" })).toContain(t.uDoneTitle);
    expect(petState("welcome", "uninstall")).toBe("sulk");
    expect(petState("done", "uninstall")).toBe("wave");
  });

  it("ekranlar", () => {
    const t = SETUP_STRINGS.tr;
    expect(shellHtml(t)).toContain("data-tauri-drag-region");
    expect(mainHtml(t, base)).toContain('data-action="yes"');
    expect(mainHtml(t, base)).toContain("sürüm 0.1.0");
    expect(mainHtml(t, { ...base, existing: true })).toContain(t.updateTitle);
    // içi boş (geliştirme) derlemesi: kur düğmeleri kapalı, uyarı var
    const empty = mainHtml(t, { ...base, ready: false });
    expect(empty).toContain(t.empty);
    expect(empty).toContain('data-action="yes" disabled');
    const inst = mainHtml(t, { ...base, step: "installing", pct: 50, line: "x" });
    expect((inst.match(/su-cell on/g) ?? []).length).toBe(10);
    expect(inst).toContain('aria-valuenow="50"');
    expect(mainHtml(t, { ...base, step: "done" })).toContain('data-action="launch" checked');
    expect(mainHtml(t, { ...base, step: "done", launch: false })).not.toContain("checked");
    expect(mainHtml(t, { ...base, step: "done" })).not.toContain(t.launchFail.replace("'", "&#39;"));
    expect(mainHtml(t, { ...base, step: "done", error: "x" })).toContain(t.launchFail.replace("'", "&#39;"));
    expect(mainHtml(t, { ...base, step: "failed", error: "<x>" })).toContain("&#60;x&#62;");
  });
});
