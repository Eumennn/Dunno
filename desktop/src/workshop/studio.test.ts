import { describe, expect, it } from "vitest";
import { validateMods } from "../mods/mods";
import { builtinIds } from "../mods/load";
import { loadThemeList } from "../wardrobe/assets";
import { linesPack, packId, previewLines, STUDIO_PALETTES, themePack } from "./studio";

const tags = ["idle", "walk", "run_away", "sleep", "peek", "talk", "shrug", "sulk", "shh", "dragged", "fart"];
const validate = (d: Parameters<typeof validateMods>[0][number]) => validateMods([d], tags, builtinIds(loadThemeList()))[0];

describe("creator studio", () => {
  it("tema paketi gerçek mod doğrulamasından geçer, renk onaylı paletten", () => {
    const d = themePack({ tr: "Gece Kahvesi", en: "Night Coffee" }, "coffee", "mert", () => 0.5)!;
    expect(d.dir).toBe("my_night_coffee_7fff");
    expect(validate(d).errors).toEqual([]);
    expect(themePack({ tr: "x", en: "y" }, "neon", "m")).toBeNull();
    expect(STUDIO_PALETTES.length).toBeGreaterThanOrEqual(10);
  });

  it("laf paketi: geçerli laflar geçer; kural dışı laf mod doğrulamasında yakalanır", () => {
    const good = linesPack({ tr: "benim laflarım", en: "my lines" }, [{ trigger: "time:night", tr: "uyu artık", en: "go to sleep" }, { trigger: "interaction:click", tr: "dürtme", en: "no poking" }], "mert")!;
    expect(validate(good).errors).toEqual([]);
    expect(previewLines(good, "tr")).toEqual(["uyu artık", "dürtme"]);
    const bad = linesPack({ tr: "kötü", en: "bad" }, [{ trigger: "random", tr: "BAĞIRIYORUM!", en: "SHOUTING!" }], "m")!;
    expect(validate(bad).errors.length).toBeGreaterThan(0);
    expect(packId("Şeker Çilek", () => 0)).toBe("my_seker_cilek_0000");
  });
});
