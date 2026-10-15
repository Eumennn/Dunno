// SPEC 12 B: veri modları doğrulayıcı. Örnek mod (content/mods/example_pastel) geçer; kod, yol kaçışı, link, küfür, izinsiz içerik,
// yanlış boyut, çakışan id, düşük kontrast, sınır dışı davranış reddedilir (mod hiç yüklenmez, yarım yükleme yok).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import sheetJson from "../assets/dunno_sheet.json";
import { builtinIds, loadMods, modItemsOf, modNames } from "../src/mods/load";
import { loadThemeList } from "../src/wardrobe/assets";
import { allAccessories, cleanWardrobe, isUnlocked, registerModItems, select, slotFor, wardrobeView } from "../src/wardrobe/wardrobe";
import { parseUiAction, type AppStatus } from "../src/ipc-app";
import { modsHtml } from "../src/app/view";
import { STRINGS } from "../src/i18n";
import { mergeMods, pngSize, safePath, validateMod, validateMods, type ModDir } from "../src/mods/mods";

const tags = sheetJson.meta.frameTags.map((t: { name: string }) => t.name);
const root = new URL("../../content/mods/example_pastel/", import.meta.url).pathname;

/** Rust okuyucusunun verdiği biçim: metin dosyaları text, png base64. */
function readDir(dir: string): ModDir {
  const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
  return {
    dir: "example_pastel",
    files: walk(dir).map((p) => {
      const path = relative(dir, p).replaceAll("\\", "/");
      const buf = readFileSync(p);
      return path.endsWith(".png") ? { path, size: buf.length, base64: buf.toString("base64") } : { path, size: buf.length, text: buf.toString("utf8") };
    }),
  };
}

const good = readDir(root);
const edit = (path: string, f: (v: Record<string, unknown>) => unknown): ModDir => ({
  dir: good.dir,
  files: good.files.map((x) => (x.path === path ? { ...x, text: JSON.stringify(f(JSON.parse(x.text!))) } : x)),
});
const errs = (d: ModDir) => validateMod(d, tags).errors.join(" | ");

describe("veri modları (SPEC 12 B)", () => {
  it("örnek mod geçer: tema, aksesuar (32x32), 2+2 laf, ses, balon, davranış", () => {
    const r = validateMod(good, tags);
    expect(r.errors).toEqual([]);
    const m = r.mod!;
    expect(m.themes.map((t) => t.id)).toEqual(["pastel_sky"]);
    expect(m.accessories.map((a) => [a.acc.id, a.slot, a.image.width])).toEqual([["pastel_bow", "side", 32]]);
    expect([m.reactions.tr.length, m.reactions.en.length]).toEqual([2, 2]);
    expect(Object.keys(m.sounds)).toEqual(["greet"]);
    expect(m.bubbles).toEqual({ fill: "#F2F7FD", ink: "#2B1E2F" });
    expect(m.behavior).toEqual({ chattiness: 1.2, restScale: 1 });
    const merged = mergeMods([m]);
    expect(merged.lines).toHaveLength(4);
  });

  it("kod dosyası olan mod reddedilir (js, html, exe, svg, dll)", () => {
    for (const bad of ["evil.js", "index.html", "run.exe", "icon.svg", "x.dll", "a.ps1"]) {
      expect(errs({ ...good, files: [...good.files, { path: bad, size: 10 }] }), bad).toMatch(/only .* files \(no code\)/);
    }
  });

  it("yol kaçışı / mutlak yol / gizli dosya reddedilir", () => {
    for (const p of ["../x.json", "a/../../x.json", "/etc/passwd.json", "C:/x.json", "a\\b.json", ".hidden.json"]) expect(safePath(p), p).toBe(false);
    expect(errs({ ...good, files: [...good.files, { path: "../steal.json", size: 2, text: "{}" }] })).toMatch(/unsafe path/);
  });

  it("manifest: script/hook/url alanı, link, izinsiz içerik, kötü id reddedilir", () => {
    expect(errs(edit("manifest.json", (v) => ({ ...v, script: "main.js" })))).toMatch(/unknown field "script"/);
    expect(errs(edit("manifest.json", (v) => ({ ...v, author: "see https://evil.example" })))).toMatch(/looks like code or a link/);
    expect(errs(edit("manifest.json", (v) => ({ ...v, permissions: ["themes"] })))).toMatch(/"accessories" used without permission/);
    expect(errs(edit("manifest.json", (v) => ({ ...v, id: "Bad Id" })))).toMatch(/id must be snake_case/);
    expect(errs(edit("manifest.json", (v) => ({ ...v, permissions: [...(v.permissions as string[]), "filesystem"] })))).toMatch(/unknown permission "filesystem"/);
  });

  it("laflar marka kurallarından geçer: açık küfür, ünlem, 60+ karakter, bilinmeyen trigger, yasak konu, kod", () => {
    const line = (tr: string, trigger = "app:excel") => edit("reactions/tr.json", () => [{ id: "pastel_x", trigger, intent: "test", tr }]);
    expect(errs(line("bu tablo harika!"))).toMatch(/no exclamation/);
    expect(errs(line("a".repeat(70)))).toMatch(/max 60/);
    expect(errs(line("bilmem", "system:shutdown"))).toMatch(/unknown trigger/);
    expect(errs(line("bilmem javascript:alert(1)"))).toMatch(/looks like code or a link/);
    expect(errs(line("{K:siktir} bilmem"))).toMatch(/explicit swear|banned/);
  });

  it("içerik id'si mod adıyla başlar, yerleşik/başka modla çakışmaz", () => {
    expect(errs(edit("themes/pastel_sky.json", (v) => ({ ...v, id: "ocean" })))).toMatch(/must start with "pastel_"/);
    expect(validateMod(good, tags, new Set(["pastel_bow"])).errors.join()).toMatch(/already exists/);
    const twice = validateMods([good, { ...good, dir: "copy" }], tags, new Set());
    expect(twice[0].mod).not.toBeNull();
    expect(twice[1].mod).toBeNull();
  });

  it("png boyutu, balon kontrastı, ses ve davranış sınırları", () => {
    const pngPath = "accessories/pastel_bow.png";
    const tiny = good.files.map((x) =>
      x.path === pngPath ? { ...x, base64: Buffer.from(readFileSync(new URL("../src-tauri/icons/32x32.png", import.meta.url))).toString("base64") } : x,
    );
    expect(pngSize(good.files.find((x) => x.path === pngPath)!.base64!)).toEqual({ width: 32, height: 32 });
    expect(validateMod({ ...good, files: tiny }, tags).errors).toEqual([]); // 32x32 başka png de geçer
    expect(errs(edit("accessories/pastel_bow.json", (v) => ({ ...v, size: 64 })))).toMatch(/must be 64x64/);
    expect(errs(edit("bubbles.json", () => ({ fill: "#FFFFFF", ink: "#EEEEEE" })))).toMatch(/contrast/);
    expect(errs(edit("sounds.json", () => ({ greet: { base: [20, 30000], syllables: [1, 99], dur: [1, 9999], gap: [1, 2], wave: "noise", glide: [0, 9], contour: 9 } })))).toMatch(/base|wave/);
    expect(errs(edit("behavior.json", () => ({ chattiness: 50 })))).toMatch(/chattiness 0.5..2/);
    expect(errs(edit("behavior.json", () => ({ chattiness: 1, readFiles: true })))).toMatch(/unknown field "readFiles"/);
  });

  it("çok büyük / çok dosyalı mod reddedilir", () => {
    const big = { ...good, files: good.files.map((x, i) => (i === 0 ? { ...x, size: 999_999 } : x)) };
    expect(errs(big)).toMatch(/larger than/);
    const many = { ...good, files: [...good.files, ...Array.from({ length: 70 }, (_, i) => ({ path: `n/${i}.txt`, size: 1, text: "x" }))] };
    expect(errs(many)).toMatch(/too many files/);
  });
});

// SPEC 12 B entegrasyon: ayar (varsayılan kapalı) -> yükleme -> dolap kaydı -> settings.exe -> ipc

describe("mod entegrasyonu (SPEC 12 B)", () => {
  const themes = loadThemeList();
  it("yeni mod kapalı başlar; ayarda açılınca birleşir", () => {
    const off = loadMods([good], tags, themes, {});
    expect(off.results[0].errors).toEqual([]);
    expect(off.active).toEqual([]);
    expect(off.merged.lines).toEqual([]);
    const on = loadMods([good], tags, themes, { pastel: true });
    expect(on.active.map((m) => m.manifest.id)).toEqual(["pastel"]);
    expect(on.merged.lines.length).toBe(4);
    expect(on.merged.bubbles).not.toBeNull();
    expect(modNames(on.merged, "tr").accessories).toEqual({ pastel_bow: "pastel kurdele" });
  });

  it("yerleşik id'lerle çakışan mod parçası reddedilir", () => {
    expect(builtinIds(themes).has("crown")).toBe(true);
    expect(builtinIds(themes).has("bee")).toBe(true);
  });

  it("dolap: kayıtlı mod parçası açık, giyilir, slotu çalışır; kayıt silinince temizlenir", () => {
    const on = loadMods([good], tags, themes, { pastel: true });
    registerModItems(modItemsOf(on.merged));
    try {
      expect(slotFor("pastel_bow")).toBe("side");
      expect(allAccessories()).toContain("pastel_bow");
      const s = select(cleanWardrobe(undefined), { accessory: "pastel_bow", theme: "pastel_sky" });
      expect(s.accessories).toContain("pastel_bow");
      expect(s.theme).toBe("pastel_sky");
      expect(isUnlocked(s, { kind: "accessory", id: "pastel_bow" })).toBe(true);
      expect(wardrobeView(s, new Date()).unlocked).toContainEqual({ kind: "theme", id: "pastel_sky" });
      // kaydedilmiş seçim yeniden açılışta geçerli kalır
      expect(cleanWardrobe(JSON.parse(JSON.stringify(s))).accessories).toContain("pastel_bow");
    } finally {
      registerModItems({});
    }
    expect(slotFor("pastel_bow")).toBeUndefined();
    expect(cleanWardrobe({ progress: { unlocked: {} }, theme: "pastel_sky", accessories: ["pastel_bow"], costume: null }).accessories).toEqual([]);
  });

  it("ipc: mod aç/kapa ve rakamlı mod parça id'si", () => {
    expect(parseUiAction({ action: "mod", id: "pastel", on: true })).toEqual({ action: "mod", id: "pastel", on: true });
    expect(parseUiAction({ action: "mod", id: "../x", on: true })).toBeNull();
    expect(parseUiAction({ action: "mod", id: "pastel", on: "yes" })).toBeNull();
    expect(parseUiAction({ action: "wardrobe", accessory: "retro2_hat" })).toEqual({ action: "wardrobe", accessory: "retro2_hat" });
  });

  it("settings.exe: geçerli mod anahtarı, geçersiz mod sebebi, bekleyen değişiklikte yeniden başlat", () => {
    const t = STRINGS.tr;
    const s = { mods: { pastel: true }, modsActive: [] } as unknown as AppStatus;
    const rows = [
      { dir: "example_pastel", errors: [], mod: { id: "pastel", name: "pastel", version: "1.0.0", author: "dunno", description: "" } },
      { dir: "kotu", errors: ["x.js: only .json .png .md .txt files (no code)"], mod: null },
    ];
    const html = modsHtml(t, s, rows);
    expect(html).toContain('data-switch="mod:pastel"');
    expect(html).toContain(t.modsInvalid);
    expect(html).toContain("no code");
    expect(html).toContain('data-action="restart"');
    const synced = modsHtml(t, { mods: { pastel: true }, modsActive: ["pastel"] } as unknown as AppStatus, rows);
    expect(synced).not.toContain('data-action="restart"');
    expect(modsHtml(t, {} as AppStatus, [])).toContain(t.modsEmpty);
  });
});

describe("Free / Pro mod katmanı (SPEC 15)", () => {
  const themes = loadThemeList();
  it("Free: modun temel türleri yüklenir, ses/davranış atlanır ve not edilir; Pro: hepsi", () => {
    const free = loadMods([good], tags, themes, { pastel: true }, "free");
    expect(free.active).toHaveLength(1);
    expect(free.merged.themes.map((t) => t.id)).toEqual(["pastel_sky"]);
    expect(free.merged.lines.length).toBe(4);
    expect(free.merged.sounds).toEqual({});
    expect(free.merged.behavior).toBeNull();
    expect(free.blocked).toEqual({ pastel: ["sounds", "behavior"] });
    const pro = loadMods([good], tags, themes, { pastel: true }, "pro");
    expect(Object.keys(pro.merged.sounds)).toEqual(["greet"]);
    expect(pro.merged.behavior).not.toBeNull();
    expect(pro.blocked).toEqual({});
  });

  it("Free: en fazla 3 mod; fazlası yüklenmez (limit)", () => {
    // en küçük geçerli mod: sadece balon rengi
    const copy = (id: string): ModDir => {
      const manifest = JSON.stringify({ schema: 1, id, name: { tr: id, en: id }, version: "1.0.0", author: "test", permissions: ["bubbles"], contents: { bubbles: "bubbles.json" } });
      const bubbles = JSON.stringify({ fill: "#F2F7FD", ink: "#2B1E2F" });
      return { dir: id, files: [{ path: "manifest.json", size: manifest.length, text: manifest }, { path: "bubbles.json", size: bubbles.length, text: bubbles }] };
    };
    const dirs = ["pa", "pb", "pc", "pd"].map(copy);
    const enabled = { pa: true, pb: true, pc: true, pd: true };
    const r = loadMods(dirs, tags, themes, enabled, "free");
    expect(r.results.every((x) => x.errors.length === 0)).toBe(true);
    expect(r.active.map((m) => m.manifest.id)).toEqual(["pa", "pb", "pc"]);
    expect(r.blocked.pd).toEqual(["limit"]);
    expect(loadMods(dirs, tags, themes, enabled, "pro").active).toHaveLength(4);
  });
});
