import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS } from "./achievements";
import { ACCESSORIES, ACCESSORY_SLOTS, applyEvent, cleanWardrobe, COSTUMES, initialWardrobe, isUnlocked, select, takePending, unlockOf, wardrobeView, wear, type AccessoryId } from "./wardrobe";

const day = (d: number, h = 12) => new Date(2026, 9, d, h, 0);

describe("wardrobe", () => {
  it("başlangıç: klasik tema + bere açık, diğerleri kilitli", () => {
    const s = initialWardrobe();
    expect(isUnlocked(s, { kind: "theme", id: "classic" })).toBe(true);
    expect(isUnlocked(s, { kind: "accessory", id: "beanie" })).toBe(true);
    expect(isUnlocked(s, { kind: "accessory", id: "crown" })).toBe(false);
    expect(s.theme).toBe("classic");
    expect(s.accessories).toEqual([]);
    expect(s.costume).toBeNull();
  });

  it("100 dürtme parti şapkasını açar ve bildirim kuyruğuna girer", () => {
    let s = initialWardrobe();
    let opened: string[] = [];
    for (let i = 0; i < 100; i++) {
      const r = applyEvent(s, { type: "click" }, day(3));
      s = r.state;
      opened = opened.concat(r.unlocked);
    }
    expect(opened).toEqual(["poke_100"]);
    expect(s.pending).toEqual(["poke_100"]);
    expect(isUnlocked(s, { kind: "accessory", id: "party_hat" })).toBe(true);
    expect(unlockOf("poke_100")).toEqual({ kind: "accessory", id: "party_hat" });
  });

  it("gece sorusu gece başlığını açar (saat enjekte)", () => {
    expect(applyEvent(initialWardrobe(), { type: "question" }, day(3, 13)).unlocked).toEqual([]);
    expect(applyEvent(initialWardrobe(), { type: "question" }, day(3, 2)).unlocked).toEqual(["night_owl"]);
  });

  it("7 farklı gün açık olmak taçı açar", () => {
    let s = initialWardrobe();
    for (let d = 1; d <= 6; d++) s = applyEvent(s, { type: "open" }, day(d)).state;
    expect(applyEvent(s, { type: "open" }, day(6, 20)).unlocked).toEqual([]); // aynı gün sayılmaz
    // 7 gün üst üste: K9 seri başarımı (streak_7) da aynı anda açılır
    expect(applyEvent(s, { type: "open" }, day(7)).unlocked).toEqual(["learned_nothing_7", "streak_7"]);
  });

  it("seçim sadece açık parçalara; null aksesuarı çıkarır", () => {
    const s = initialWardrobe();
    expect(select(s, { theme: "night" })).toBe(s); // kilitli: değişmez
    expect(select(s, { accessory: "crown" })).toBe(s);
    const b = select(s, { accessory: "beanie" });
    expect(b.accessories).toEqual(["beanie"]);
    expect(select(b, { accessory: null }).accessories).toEqual([]);
    expect(select(b, { accessory: "beanie" }).accessories).toEqual([]); // tekrar tık = çıkar
    expect(select(s, { accessory: "rm -rf" })).toBe(s);
  });

  it("bildirim kuyruğu sırayla boşalır", () => {
    const s = { ...initialWardrobe(), pending: ["poke_100", "drag_50"] as const };
    const a = takePending({ ...s, pending: [...s.pending] });
    expect(a.next).toBe("poke_100");
    const b = takePending(a.state);
    expect(b.next).toBe("drag_50");
    expect(takePending(b.state).next).toBeNull();
  });

  it("bozuk kaydı onarır: kilitli seçim varsayılana döner, kuyrukta sadece açılmış olanlar", () => {
    const s = cleanWardrobe({ theme: "night", accessory: "crown", pending: ["poke_100", "nope"], progress: { clicks: 3 } });
    expect(s.theme).toBe("classic");
    expect(s.accessories).toEqual([]);
    expect(s.pending).toEqual([]);
    expect(s.progress.clicks).toBe(3);
    const ok = cleanWardrobe({ theme: "classic", accessory: "beanie", progress: { unlocked: { poke_100: "2026-10-03T10:00:00.000Z" } }, pending: ["poke_100"] });
    expect(ok.accessories).toEqual(["beanie"]); // eski tek "accessory" biçimi taşınır
    expect(ok.pending).toEqual(["poke_100"]);
    expect(cleanWardrobe(null)).toEqual(initialWardrobe());
  });

  it("wardrobe.exe özeti: ilerleme (37 / 100), açılma tarihi", () => {
    let s = initialWardrobe();
    for (let i = 0; i < 37; i++) s = applyEvent(s, { type: "click" }, day(3)).state;
    const v = wardrobeView(s, day(3));
    const poke = v.achievements.find((a) => a.id === "poke_100")!;
    expect([poke.value, poke.target, poke.done, poke.at]).toEqual([37, 100, false, null]);
    expect(poke.unlocks).toEqual({ kind: "accessory", id: "party_hat" });
    const night = applyEvent(s, { type: "question" }, day(4, 1)).state;
    const n = wardrobeView(night, day(4, 1)).achievements.find((a) => a.id === "night_owl")!;
    expect(n.done).toBe(true);
    expect(n.at).toBe(day(4, 1).toISOString());
    expect(v.unlocked).toEqual([{ kind: "theme", id: "classic" }, { kind: "accessory", id: "beanie" }]);
  });

  it("her aksesuar ve kostüm bir başarımla açılır; 20 aksesuar, 20 kostüm", () => {
    expect(ACCESSORIES.length).toBe(20);
    expect(COSTUMES.length).toBe(20);
    const unlocks = new Set(ACHIEVEMENTS.map((a) => `${a.unlocks.kind}:${a.unlocks.id}`));
    for (const id of ACCESSORIES) if (id !== "beanie") expect(unlocks.has(`accessory:${id}`), id).toBe(true);
    for (const id of COSTUMES) expect(unlocks.has(`costume:${id}`), id).toBe(true);
  });

  it("K6 slotları: aynı slotta tek parça, farklı slotlar birlikte, en fazla 3 (en eski çıkar)", () => {
    expect(wear(["beanie"], "crown")).toEqual(["crown"]);
    expect(wear(["beanie"], "sunglasses")).toEqual(["beanie", "sunglasses"]);
    expect(wear(["beanie", "sunglasses", "scarf"], "flower")).toEqual(["sunglasses", "scarf", "flower"]);
    expect(wear(["beanie", "sunglasses"], "beanie")).toEqual(["sunglasses"]);
    const all = ACCESSORIES.map((id) => ({ kind: "accessory" as const, id }));
    let s = initialWardrobe();
    for (const id of ["cowboy_hat", "monocle", "bow_tie", "cape"] as AccessoryId[]) s = select(s, { accessory: id }, all);
    expect(s.accessories).toEqual(["monocle", "bow_tie", "cape"]);
    expect(new Set(s.accessories.map((id) => ACCESSORY_SLOTS[id])).size).toBe(3);
  });

  it("K2 kostüm: sadece açıksa giyilir, aynıya tık çıkarır, kayıttan geri gelir", () => {
    const s = initialWardrobe();
    expect(select(s, { costume: "bug" })).toBe(s);
    const open = [{ kind: "costume" as const, id: "bug" }];
    const b = select(s, { costume: "bug" }, open);
    expect(b.costume).toBe("bug");
    expect(select(b, { costume: "bug" }, open).costume).toBeNull();
    expect(select(b, { costume: null }).costume).toBeNull();
    const saved = cleanWardrobe({ costume: "bee", progress: { unlocked: { honest_15: "2026-10-03T10:00:00.000Z" } } });
    expect(saved.costume).toBe("bee");
    expect(cleanWardrobe({ costume: "bee" }).costume).toBeNull();
  });

});
