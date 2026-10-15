// FB5: kurulum görselleri NSIS'in okuyacağı biçimde (24 bit BMP, MUI2 ölçüleri) ve sadece ana paletten.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
// @ts-expect-error mjs üretici, tip bildirimi yok
import { encodeBmp, header, sidebar } from "./gen-installer-art.mjs";

const PALETTE = new Set(["2b1e2f", "f2a65a", "fff1d6", "ffd29a", "d9774a", "e86a7a", "ffffff"]);

describe("kurulum görselleri", () => {
  for (const [name, make, w, h] of [["sidebar", sidebar, 164, 314], ["header", header, 150, 57]] as const) {
    it(`${name}: ${w}x${h}, 24 bit, aşağıdan yukarı, depodaki dosyayla aynı`, () => {
      const bmp: Buffer = encodeBmp(make());
      expect(bmp.toString("ascii", 0, 2)).toBe("BM");
      expect(bmp.readInt32LE(18)).toBe(w);
      expect(bmp.readInt32LE(22)).toBe(h);
      expect(bmp.readUInt16LE(28)).toBe(24);
      expect(bmp.readUInt32LE(30)).toBe(0); // sıkıştırmasız
      expect(readFileSync(`src-tauri/installer/${name}.bmp`).equals(bmp)).toBe(true);
    });
  }
  it("renkler ana paletten (logo kenarında karışım yok)", () => {
    for (const make of [sidebar, header]) {
      const img = make();
      const seen = new Set<string>();
      for (let i = 0; i < img.data.length; i += 4) seen.add([0, 1, 2].map((k) => img.data[i + k].toString(16).padStart(2, "0")).join(""));
      for (const c of seen) expect(PALETTE.has(c), c).toBe(true);
    }
  });
  it("tauri.conf.json kurulum görsellerini ve gerçek yayıncıyı kullanır", () => {
    const conf = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
    const nsis = conf.bundle.windows.nsis;
    expect(nsis.sidebarImage).toBe("installer/sidebar.bmp");
    expect(nsis.headerImage).toBe("installer/header.bmp");
    expect(nsis.installerIcon).toBe("icons/icon.ico");
    expect(conf.bundle.publisher).not.toMatch(/^\[.*\]$/);
    expect(conf.bundle.copyright).not.toMatch(/^\[.*\]$/);
  });

  it("FB6: Dunno NSIS şablonu bağlı; görünüm, metin ve sade akış blokları yerinde; Tauri değişkenleri korunmuş", () => {
    const conf = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
    expect(conf.bundle.windows.nsis.template).toBe("installer/installer.nsi");
    const nsi = readFileSync("src-tauri/installer/installer.nsi", "utf8");
    for (const m of ["MUI_BGCOLOR \"FFF1D6\"", "DunnoGuiInit", "DunnoInner", "PBM_SETBARCOLOR", "dunnoWelcomeTitle", "LANG_TURKISH", "MUI_PAGE_CUSTOMFUNCTION_PRE Skip\n"])
      expect(nsi, m).toContain(m);
    // Tauri'nin doldurduğu değişkenler (şablon kaynağıyla aynı)
    for (const v of ["{{product_name}}", "{{main_binary_path}}", "{{#each languages}}", "{{#each language_files}}", "{{additional_plugins_path}}", "{{install_webview2_mode}}"]) expect(nsi, v).toContain(v);
    // marka dili: Dunno metinlerinde ünlem yok, TR/EN küçük harf (dunno.exe/setup.exe dahil)
    for (const line of nsi.split("\n").filter((l) => l.startsWith("!insertmacro DUNNO_STR"))) {
      const texts = [...line.matchAll(/"([^"]*)"/g)].map((x) => x[1]);
      for (const t of texts) {
        expect(t).not.toContain("!");
        expect(t).toBe(t.toLocaleLowerCase("tr"));
      }
    }
  });
});
