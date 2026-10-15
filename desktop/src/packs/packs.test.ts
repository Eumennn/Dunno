import { describe, expect, it } from "vitest";
import { validateMods } from "../mods/mods";
import { builtinIds, loadMods } from "../mods/load";
import { loadThemeList } from "../wardrobe/assets";
import { activePackDirs, entitled, packDir, PACKS } from "./packs";

const tags = ["idle", "walk", "run_away", "sleep", "peek", "talk", "shrug", "sulk", "shh", "dragged", "fart"];

describe("uygulama paketleri (SPEC 18 Faz 4)", () => {
  it("4 paket: 2 kozmetik, 2 Pro dünya; hepsi gerçek mod doğrulamasından geçer", () => {
    expect(PACKS.map((p) => `${p.id}:${p.requires}`).sort()).toEqual(["cyberpunk:pack", "halloween:pack", "office:pro", "space:pro"]);
    const results = validateMods(PACKS.map((p) => packDir(p.id)), tags, builtinIds(loadThemeList()));
    for (const r of results) expect(r.errors.join(" | "), r.dir).toBe("");
  });

  it("hak: kozmetik lisans listesiyle, dünya Pro ile; kullanıcı kapatabilir", () => {
    expect(entitled({ id: "halloween", requires: "pack" }, "free", ["halloween"])).toBe(true);
    expect(entitled({ id: "halloween", requires: "pack" }, "pro", [])).toBe(false);
    expect(entitled({ id: "space", requires: "pro" }, "pro", [])).toBe(true);
    expect(activePackDirs("free", [], {}).map((d) => d.dir)).toEqual([]);
    expect(activePackDirs("pro", ["cyberpunk"], { office: false }).map((d) => d.dir).sort()).toEqual(["cyberpunk", "space"]);
  });

  it("Free'de bile paket yüklenir (sınır dışı) ve temaları/lafları birleşir", () => {
    const r = loadMods([], tags, loadThemeList(), {}, "free", activePackDirs("free", ["halloween"], {}));
    expect(r.merged.themes.map((t) => t.id)).toContain("halloween_pumpkin");
    expect(r.merged.lines.length).toBeGreaterThanOrEqual(30);
  });
});
