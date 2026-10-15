import { describe, expect, it } from "vitest";
import { STRINGS } from "../i18n";
import { loadThemeList } from "../wardrobe/assets";
import { applyEvent, initialWardrobe, select, wardrobeView } from "../wardrobe/wardrobe";
import { ACHIEVEMENTS } from "../wardrobe/achievements";
import { cleanWardrobe } from "../wardrobe/wardrobe";
import { achievementsHtml, gridMove, toggleView, wardrobeHtml, wardrobeParts } from "./wardrobe-view";

const day = (d: number, h = 12) => new Date(2026, 9, d, h);
const themes = loadThemeList();

function view() {
  let s = initialWardrobe();
  for (let i = 0; i < 37; i++) s = applyEvent(s, { type: "click" }, day(3)).state;
  s = applyEvent(s, { type: "question" }, day(4, 1)).state; // gece başlığı açılır
  s = select(s, { accessory: "nightcap" });
  return wardrobeView(s, day(4, 1));
}

describe("wardrobe.exe", () => {
  it("kilitli aksesuar: kilit + koşul + ilerleme (37 / 100 dürtme)", () => {
    const html = wardrobeHtml(STRINGS.tr, "tr", view(), themes, () => undefined, () => undefined, "idle", undefined, { cat: "accessories", onlyOpen: false });
    expect(html).toMatch(/data-accessory="party_hat" data-slot="head" aria-pressed="false" aria-disabled="true"[^]*?100 kez dürt[^]*?37 \/ 100/);
    expect(html).toContain('class="lock-ico"');
  });

  it("açık ve seçili aksesuar işaretli, bere açık ama seçili değil", () => {
    const html = wardrobeHtml(STRINGS.en, "en", view(), themes, () => undefined, () => undefined, "idle", undefined, { cat: "accessories", onlyOpen: false });
    expect(html).toContain('class="wr-tile wr-tile-on" data-accessory="nightcap" data-slot="head" aria-pressed="true" aria-disabled="false"');
    expect(html).toContain('class="wr-tile" data-accessory="beanie" data-slot="head" aria-pressed="false" aria-disabled="false"');
    expect(html).toContain('data-accessory="" aria-pressed="false"'); // "none"
  });

  it("temalar: klasik açık ve seçili, diğerleri kilitli; renkler themes.json'dan", () => {
    const html = wardrobeHtml(STRINGS.tr, "tr", view(), themes, () => undefined, () => undefined, "sleep", undefined, { cat: "themes", onlyOpen: false });
    expect(html).toContain('data-theme="classic" aria-pressed="true" aria-disabled="false"');
    expect(html).toMatch(/wr-locked" data-theme="night"/);
    const classic = themes.find((x) => x.id === "classic")!;
    expect(html).toContain(`background:${classic.colors.body}`);
    // önizleme durum seçici
    expect(html).toContain('class="seg seg-on" aria-pressed="true" data-value="sleep"');
  });

  it("achievements.txt: açılan tarihli, kilitli ilerlemeli", () => {
    const html = achievementsHtml(STRINGS.tr, view());
    expect(html).toContain("açıldı · 2026-10-04"); // yerel gün (UTC değil)
    expect(html).toContain("gece kuşu");
    expect(html).toContain("37 / 100");
  });

  it("FB6: preview.txt ve wearing kayan alanın dışında (sabit sol panel); ızgara ve achievements ana alanda", () => {
    const p = wardrobeParts(STRINGS.tr, "tr", view(), themes, () => undefined, () => undefined, "idle", undefined, { cat: "costumes", onlyOpen: false });
    expect(p.aside).toContain("preview.txt");
    expect(p.aside).toContain('id="wr-pet"');
    expect(p.aside).not.toContain("achievements.txt");
    expect(p.main).toContain("achievements.txt");
    expect(p.main).toContain("wr-toolbar");
    expect(p.main).not.toContain("preview.txt");
  });

  it("FB5: achievements.txt varsayılan kapalı: başlık + özet + düğme, tam liste düğmeyle", () => {
    const closed = wardrobeHtml(STRINGS.tr, "tr", view(), themes, () => undefined, () => undefined, "idle", undefined, { cat: "start", onlyOpen: false });
    expect(closed).toContain("achievements.txt");
    expect(closed).toContain('data-action="ach_toggle" aria-expanded="false"');
    expect(closed).toContain("hepsini göster");
    expect(closed).not.toContain(`id="wr-ach-list"`);
    const open = wardrobeHtml(STRINGS.tr, "tr", view(), themes, () => undefined, () => undefined, "idle", undefined, { cat: "start", onlyOpen: false, achOpen: true });
    expect(open).toContain('aria-expanded="true"');
    expect(open).toContain(`id="wr-ach-list"`);
  });

  it("K2/K6: kostüm ızgarası, çoklu aksesuar, kostümün kapattığı slot işaretli", () => {
    const at = day(5).toISOString();
    const unlocked = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, at]));
    const v = wardrobeView(cleanWardrobe({ progress: { unlocked }, accessories: ["crown", "sunglasses", "scarf"], costume: "astronaut" }), day(5));
    const html = wardrobeHtml(STRINGS.tr, "tr", v, themes, () => undefined, () => undefined, "idle", undefined, { cat: "costumes", onlyOpen: false });
    expect(html).toContain("<span>costumes</span>");
    expect(html).toContain('data-costume="astronaut" aria-pressed="true"');
    expect(html).toContain('data-costume="" aria-pressed="false"');
    const acc = wardrobeHtml(STRINGS.tr, "tr", v, themes, () => undefined, () => undefined, "idle", undefined, { cat: "accessories", onlyOpen: false });
    for (const id of ["crown", "sunglasses", "scarf"]) expect(acc).toMatch(new RegExp(`data-accessory="${id}" data-slot="\\w+" aria-pressed="true"`));
    expect(acc.match(/kostüm kapatıyor/g)?.length).toBe(2); // astronot: kafa + göz
    expect(acc).toContain("en fazla 3 parça");
  });

  it("toggleView: select ile aynı kural (slot başına bir, aynı kostüme tık çıkarır)", () => {
    const v = view();
    expect(toggleView(v, { accessory: "crown" }).accessories).toEqual(["crown"]);
    expect(toggleView(v, { accessory: "sunglasses" }).accessories).toEqual(["nightcap", "sunglasses"]);
    expect(toggleView(v, { accessory: null }).accessories).toEqual([]);
    const c = toggleView(v, { costume: "bug" });
    expect(c.costume).toBe("bug");
    expect(toggleView(c, { costume: "bug" }).costume).toBeNull();
  });

  it("UX-01: tek kategori, sayaçlar, sadece açıklar filtresi, üzerindekiler çipleri", () => {
    const v = view(); // gece başlığı giyili, 37 dürtme
    const all = wardrobeHtml(STRINGS.tr, "tr", v, themes, () => undefined, () => undefined, "idle", undefined, { cat: "accessories", onlyOpen: false });
    expect(all).toContain('data-value="accessories"');
    expect(all).toMatch(/aksesuarlar 2\/20/); // bere + gece başlığı açık
    expect(all).toContain('data-accessory="crown"');
    expect(all).not.toContain('data-theme="classic"'); // başka kategori çizilmez
    const onlyOpen = wardrobeHtml(STRINGS.tr, "tr", v, themes, () => undefined, () => undefined, "idle", undefined, { cat: "accessories", onlyOpen: true });
    expect(onlyOpen).not.toContain('data-accessory="crown"');
    expect(onlyOpen).toContain('data-accessory="nightcap"');
    expect(onlyOpen).toContain("kilitliler gizli");
    // üzerindekiler: gece başlığı çipi, tıklayınca çıkar (aynı data-accessory yolu)
    expect(all).toContain('class="wr-chip" data-accessory="nightcap" aria-label="çıkar: gece başlığı"');
  });

  it("UX-01: ızgarada ok tuşları (satır/sütun), Home/End", () => {
    // 3 sütun x 2 satır + 1
    const pos = [0, 1, 2, 3, 4, 5, 6].map((i) => ({ x: (i % 3) * 100, y: Math.floor(i / 3) * 100 }));
    expect(gridMove(pos, 0, "ArrowRight")).toBe(1);
    expect(gridMove(pos, 0, "ArrowLeft")).toBeNull();
    expect(gridMove(pos, 1, "ArrowDown")).toBe(4);
    expect(gridMove(pos, 5, "ArrowDown")).toBe(6); // alt satırda en yakın sütun
    expect(gridMove(pos, 4, "ArrowUp")).toBe(1);
    expect(gridMove(pos, 1, "ArrowUp")).toBeNull();
    expect(gridMove(pos, 3, "End")).toBe(6);
    expect(gridMove(pos, 3, "Home")).toBe(0);
    expect(gridMove(pos, 3, "a")).toBeNull();
  });
});

