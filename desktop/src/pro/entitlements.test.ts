// SPEC 15: Free / başarım / Pro kuralları (saf).
import { describe, expect, it } from "vitest";
import { contrast, checkProfile } from "../mods/mods";
import { PROFILES, VOICE_CATEGORIES } from "../voice/voice";
import { allUnlocks } from "../devmode/testmode";
import { loadThemeList } from "../wardrobe/assets";
import { ACCESSORY_SLOTS, allCostumes, COSTUMES, initialWardrobe, setWornLimit, wear, type AccessoryId } from "../wardrobe/wardrobe";
import { MAX_WORN } from "../wardrobe/accessories";
import {
  BUBBLE_COLORS,
  BUBBLE_STYLES,
  bubbleOpen,
  FREE_MAX_WORN,
  lineAllowed,
  maxMods,
  maxWorn,
  modAllowed,
  monsterByProgress,
  PERSONALITY,
  personalityFor,
  progression,
  PROGRESSION,
  PRO_MAX_WORN,
  VOICE_STYLES,
  voiceOpen,
} from "./entitlements";
import { styleProfiles } from "./voice-styles";
import { applyPreset, PACKS, packOf, PRESETS, presetOpen, recommend } from "./presets";

describe("Free / Pro (SPEC 15)", () => {
  it("Pro karakteri kilitlemez: Free'de 3 yer, Pro'da 5 (tüm slotlar); mod sınırı ve türler", () => {
    expect([maxWorn("free"), maxWorn("pro")]).toEqual([FREE_MAX_WORN, PRO_MAX_WORN]);
    expect(FREE_MAX_WORN).toBe(MAX_WORN);
    expect(PRO_MAX_WORN).toBe(new Set(Object.values(ACCESSORY_SLOTS)).size);
    expect(maxMods("free")).toBeLessThan(maxMods("pro"));
    expect(modAllowed("free", ["themes", "reactions", "bubbles", "accessories"])).toEqual({ ok: true });
    expect(modAllowed("free", ["themes", "sounds", "behavior", "costumes"])).toEqual({ ok: false, kinds: ["sounds", "behavior", "costumes"] });
    expect(modAllowed("pro", ["costumes", "sounds"])).toEqual({ ok: true });
  });

  it("pro lafları sadece Pro'da", () => {
    expect(lineAllowed("free", { id: "a", pro: true })).toBe(false);
    expect(lineAllowed("free", { id: "a" })).toBe(true);
    expect(lineAllowed("pro", { id: "a", pro: true })).toBe(true);
  });

  it("kişilik: Free'de hep dengeli; çarpanlar mod davranış sınırında (0.5..2)", () => {
    expect(personalityFor("free", "chaotic")).toEqual(PERSONALITY.balanced);
    expect(personalityFor("pro", "calm")).toEqual(PERSONALITY.calm);
    for (const p of Object.values(PERSONALITY)) for (const v of [p.chattiness, p.restScale]) expect(v >= 0.5 && v <= 2).toBe(true);
  });

  it("yer sınırı wear'e uygulanır: Free 3, Pro 5", () => {
    const five = ["beanie", "sunglasses", "scarf", "cape", "ribbon"] as AccessoryId[];
    const put = () => five.reduce<AccessoryId[]>((l, a) => wear(l, a), []);
    try {
      expect(put()).toHaveLength(3);
      setWornLimit(5);
      expect(put()).toEqual(five);
    } finally {
      setWornLimit(MAX_WORN);
    }
  });
});

describe("başarım ilerlemesi (SPEC 15)", () => {
  it("eşikler artan, her balon/ses stili ve canavar bir kez", () => {
    const ats = PROGRESSION.map((p) => p.at);
    expect([...ats].sort((a, b) => a - b)).toEqual(ats);
    const ids = PROGRESSION.map((p) => (p.reward.kind === "monster" ? "monster" : `${p.reward.kind}:${p.reward.id}`));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((x) => x.startsWith("bubble:")).length).toBe(BUBBLE_STYLES.length - 1);
    expect(ids.filter((x) => x.startsWith("voice:")).length).toBe(VOICE_STYLES.length - 1);
    // toplam başarım sayısına ulaşılabilir
    expect(Math.max(...ats)).toBeLessThanOrEqual(54);
  });

  it("açılma: klasik hep açık, sayıya göre gerisi; sıradaki ödül", () => {
    expect(bubbleOpen(0, "classic") && voiceOpen(0, "classic")).toBe(true);
    expect(bubbleOpen(2, "mint")).toBe(false);
    expect(bubbleOpen(3, "mint")).toBe(true);
    expect(monsterByProgress(19)).toBe(false);
    expect(monsterByProgress(20)).toBe(true);
    expect(progression(0).next).toEqual(PROGRESSION[0]);
    expect(progression(100).next).toBeNull();
  });

  it("balon stilleri okunur (>= 4.5); ses stilleri mod ses sınırlarında", () => {
    for (const c of Object.values(BUBBLE_COLORS)) expect(contrast(c.fill, c.ink)).toBeGreaterThanOrEqual(4.5);
    for (const st of VOICE_STYLES) {
      const prof = styleProfiles(st, PROFILES);
      for (const c of VOICE_CATEGORIES) expect(checkProfile(prof[c]), `${st} ${c}`).toEqual([]);
    }
    expect(styleProfiles("classic", PROFILES)).toBe(PROFILES);
    expect(styleProfiles("robot", PROFILES).greet.wave).toBe("square");
  });
});

describe("seçim yorgunluğu: hazır görünümler, paketler, öneri (SPEC 15)", () => {
  const all = allUnlocks(loadThemeList().map((t) => t.id));
  it("hazır görünümler var olan parçalardan, slot çakışmasız", () => {
    const themes = new Set(loadThemeList().map((t) => t.id));
    for (const p of PRESETS) {
      expect(themes.has(p.theme), p.id).toBe(true);
      if (p.costume) expect(COSTUMES as readonly string[]).toContain(p.costume);
      const slots = p.accessories.map((a) => ACCESSORY_SLOTS[a as AccessoryId]);
      expect(slots.every(Boolean), p.id).toBe(true);
      expect(new Set(slots).size, p.id).toBe(slots.length);
      expect(p.accessories.length).toBeLessThanOrEqual(FREE_MAX_WORN);
    }
  });

  it("uygulama: hepsi açıksa tam uygulanır, kilitli parça varsa hiç değişmez", () => {
    const s = initialWardrobe();
    const buzz = PRESETS.find((p) => p.id === "buzz")!;
    const r = applyPreset(s, buzz, all);
    expect([r.theme, r.costume, r.accessories]).toEqual(["lemon", "bee", ["sunglasses"]]);
    expect(applyPreset(s, buzz)).toBe(s);
    // ilk gün: başlangıçta açık parçalarla
    const starter = PRESETS.find((p) => p.id === "starter")!;
    expect(presetOpen({ unlocked: [{ kind: "theme", id: "classic" }, { kind: "accessory", id: "beanie" }] }, starter)).toEqual({ open: 2, total: 2 });
    expect(applyPreset({ ...s, accessories: [] }, starter).accessories).toEqual(["beanie"]);
  });

  it("paketler tüm yerleşik kostümleri bir kez kapsar; bilinmeyen 'other'", () => {
    const flat = Object.values(PACKS).flat();
    expect([...flat].sort()).toEqual([...COSTUMES].sort());
    expect(new Set(flat).size).toBe(flat.length);
    expect(packOf("egg_glitch")).toBe("other");
    expect(allCostumes().every((c) => packOf(c) !== undefined)).toBe(true);
  });

  it("öneri: bitmeye en yakın, bitmişler hariç", () => {
    const a = (id: string, value: number, target: number, done = false) => ({ id, value, target, done, at: null, unlocks: { kind: "theme", id: "x" } });
    const r = recommend({ achievements: [a("x", 1, 10), a("y", 9, 10), a("z", 10, 10, true), a("w", 5, 10)] as never });
    expect(r.map((x) => x.id)).toEqual(["y", "w"]);
  });
});
