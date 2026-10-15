import { describe, expect, it } from "vitest";
import anchorsRaw from "../../../content/art/dunno_anchors.json";
import beanie from "../../../content/wardrobe/accessories/beanie.json";
import crown from "../../../content/wardrobe/accessories/crown.json";
import headphones from "../../../content/wardrobe/accessories/headphones.json";
import nightcap from "../../../content/wardrobe/accessories/nightcap.json";
import partyHat from "../../../content/wardrobe/accessories/party_hat.json";
import sunglasses from "../../../content/wardrobe/accessories/sunglasses.json";
import sheet from "../../assets/dunno_sheet.json";
import { PET_STATES } from "../pet/state";
import { ACHIEVEMENTS, STARTER } from "./achievements";
import { checkAccessory, checkAnchors, placeAccessory, type Accessory, type AnchorsFile } from "./accessories";

const anchors = anchorsRaw as unknown as AnchorsFile;
const ALL = [beanie, crown, partyHat, nightcap, sunglasses, headphones] as Accessory[];
const sheetFrames = Object.keys(sheet.frames);
const sheetTags = sheet.meta.frameTags.map((t) => t.name);

describe("content/art/dunno_anchors.json", () => {
  it("covers every sheet frame in order, every point placed or deliberately hidden", () => {
    expect(checkAnchors(anchors, { frames: sheetFrames, tags: sheetTags })).toEqual([]);
    expect(anchors.frames).toHaveLength(sheetFrames.length);
  });

  it("hides the eyes only where the face is not visible (sulk = back view)", () => {
    expect(anchors.hidden).toEqual({
      sulk: { eyes: "back view (frame 0); back view (frame 1)" },
      // FB4-8: uykuda boyun noktası da var (yatık gövdenin alt ortası); aksesuarlar uykuda da çizilir
    });
    for (const f of anchors.frames) {
      if (f.tag !== "sulk") expect("hidden" in f.points.eyes).toBe(false);
    }
  });

  it("points follow the pose transforms (breathe, walk bob, peek shift)", () => {
    const at = (tag: string, n: number) => anchors.frames.find((f) => f.tag === tag && f.n === n)!.points.head;
    expect(at("idle", 0)).toEqual({ x: 16, y: 7 });
    expect(at("idle", 1)).toEqual({ x: 16, y: 8 }); // breathe(20): üst satırlar 1 px aşağı
    expect(at("walk", 1)).toEqual({ x: 16, y: 7 }); // shift(0,-1)
    expect(at("peek", 0)).toEqual({ x: 23, y: 7 }); // shift(7,0)
    expect(at("dragged", 1)).toEqual({ x: 16, y: 8 }); // shift(0,1)
  });
});

describe("accessories", () => {
  it("the 6 spec accessories are valid", () => {
    expect(ALL.map((a) => a.id)).toEqual(["beanie", "crown", "party_hat", "nightcap", "sunglasses", "headphones"]);
    for (const a of ALL) expect(checkAccessory(a, PET_STATES)).toEqual([]);
  });

  it("match the starter set and achievement unlocks", () => {
    const ids = new Set(ALL.map((a) => a.id));
    // SPEC 05 seti; K9 yeni aksesuarlarının görselleri desktop K6 ile gelir
    for (const u of [...STARTER, ...ACHIEVEMENTS.slice(0, 9).map((x) => x.unlocks)]) {
      if (u.kind === "accessory") expect(ids.has(u.id)).toBe(true);
    }
  });

  it("places on the anchor and hides where it must", () => {
    const idle0 = anchors.frames.findIndex((f) => f.tag === "idle");
    expect(placeAccessory(anchors, idle0, beanie as Accessory)).toEqual({ x: 0, y: -9, antennaInFront: true });
    expect(placeAccessory(anchors, idle0, crown as Accessory)!.antennaInFront).toBe(false);
    const sulk = anchors.frames.findIndex((f) => f.tag === "sulk");
    expect(placeAccessory(anchors, sulk, sunglasses as Accessory)).toBeNull(); // hem hiddenIn hem gizli göz
    const walk = anchors.frames.findIndex((f) => f.tag === "walk");
    expect(placeAccessory(anchors, walk, headphones as Accessory)).not.toBeNull(); // SPEC 09 K1: yürürken kafa ortasında, gizli değil
    expect(placeAccessory(anchors, walk, beanie as Accessory)).not.toBeNull();
    const sleep = anchors.frames.findIndex((f) => f.tag === "sleep");
    // FB4-8 (kullanıcı geri bildirimi): uyurken aksesuarlar kaybolmaz, yatık gövdede yerinde
    // (kulaklık hariç: yatıkken bant havada kalıyor)
    for (const a of ALL) expect(placeAccessory(anchors, sleep, a) === null, a.id).toBe(a.id === "headphones");
    expect(placeAccessory(anchors, 999, beanie as Accessory)).toBeNull();
    const peek = anchors.frames.findIndex((f) => f.tag === "peek");
    expect(placeAccessory(anchors, peek, beanie as Accessory)!.clipRight).toBe(26); // ekran kenarı
    expect(placeAccessory(anchors, idle0, beanie as Accessory)).not.toHaveProperty("clipRight");
  });

  it("every accessory is drawn in some frame of every state it is not hidden in", () => {
    for (const a of ALL) {
      for (const tag of sheetTags) {
        if (a.hiddenIn.includes(tag)) continue;
        const idx = anchors.frames.filter((f) => f.tag === tag).map((f) => f.index);
        expect(idx.some((i) => placeAccessory(anchors, i, a) !== null), `${a.id} in ${tag}`).toBe(true);
      }
    }
  });
});

describe("validators catch mistakes", () => {
  it("anchors", () => {
    const broken = structuredClone(anchors);
    delete (broken.frames[0].points as Record<string, unknown>).head;
    broken.frames[1].points.eyes = { hidden: " " };
    broken.frames[2].points.ears = { x: 40, y: 3 };
    broken.frames[3].clipRight = 99;
    const errs = checkAnchors(broken, { frames: sheetFrames, tags: sheetTags });
    expect(errs).toContain("frame 0: head missing (mark it or hide it with a reason)");
    expect(errs).toContain("frame 1: eyes hidden without a reason");
    expect(errs).toContain("frame 2: ears outside the 32x32 frame");
    expect(errs).toContain("frame 3: clipRight must be 0..32");
    expect(checkAnchors({ ...anchors, frames: anchors.frames.slice(1) }, { frames: sheetFrames, tags: sheetTags })[0]).toMatch(/index must be 0/);
    expect(checkAnchors(null)).toEqual(["anchors: size and frames required"]);
  });

  it("accessory", () => {
    const bad = { ...beanie, anchor: "tail", antenna: "maybe", hiddenIn: ["moonwalk"], pivot: { x: 40, y: 1 }, name: { tr: "Bere", en: "beanie" } };
    const errs = checkAccessory(bad, PET_STATES).join(" | ");
    expect(errs).toContain("anchor must be head, eyes, ears or neck");
    expect(errs).toContain("antenna must be through or behind");
    expect(errs).toContain("unknown state moonwalk");
    expect(errs).toContain("pivot outside the image");
    expect(errs).toContain("names are lowercase");
  });
});
