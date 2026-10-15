// WR4s: kıyafet seçeneklerinin içerikten doğru okunması (gerçek content/ dosyalarıyla).
import { describe, expect, it } from "vitest";
import sheetJson from "@desktop-assets/dunno_sheet.json";
import { parseSheet } from "@desktop/player/sheet";
import anchors from "../../content/art/dunno_anchors.json";
import themes from "../../content/wardrobe/themes.json";
import { loadWardrobe, themeLabel, wardrobeOptions } from "./outfit";
import { ACCESSORIES } from "@desktop/wardrobe/wardrobe";

const sheet = parseSheet(sheetJson);
const frames = Object.keys(sheetJson.frames);
const tags = [...sheet.tags.keys()];

describe("wardrobe options", () => {
  it("real content: all themes (>= 14, classic first), 20 accessories in wardrobe order, no errors", () => {
    const o = loadWardrobe(sheetJson, sheet);
    expect(o.errors).toEqual([]);
    expect(o.themes.map((t) => t.id)[0]).toBe("classic");
    expect(o.themes.length).toBeGreaterThanOrEqual(14);
    expect(o.accessories.map((a) => a.acc.id)).toEqual([...ACCESSORIES]);
    expect(o.anchors?.frames).toHaveLength(frames.length);
    expect(themeLabel(o.themes[0])).toBe("klasik");
    expect(themeLabel(o.themes[1])).toMatch(/\(aday\)$/);
  });

  it("a broken accessory is left out and reported; missing png too", () => {
    const good = { id: "cap", name: { tr: "kep", en: "cap" }, anchor: "head", pivot: { x: 16, y: 16 }, antenna: "behind", hiddenIn: [], image: "cap.png", size: 32 };
    const o = wardrobeOptions(
      themes,
      anchors,
      { "a/cap.json": good, "a/bad.json": { ...good, id: "bad", image: "bad.png", anchor: "tail" }, "a/nopng.json": { ...good, id: "nopng", image: "nopng.png" } },
      { "a/cap.png": "/cap.png" },
      frames,
      tags,
    );
    expect(o.accessories.map((a) => a.acc.id)).toEqual(["cap"]);
    expect(o.errors).toEqual(["bad: anchor must be head, eyes, ears or neck", "nopng: nopng.png yok"]);
  });

  it("anchors that do not match the sheet disable accessories (colours still work)", () => {
    const o = wardrobeOptions(themes, { ...anchors, frames: anchors.frames.slice(1) }, {}, {}, frames, tags);
    expect(o.anchors).toBeNull();
    expect(o.errors.length).toBeGreaterThan(0);
    expect(o.themes.length).toBeGreaterThanOrEqual(14);
  });
});
