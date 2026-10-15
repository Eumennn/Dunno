import { describe, expect, it, vi } from "vitest";
import { WorkshopController } from "../app/workshop-controller";
import { builtinIds } from "../mods/load";
import { validateMods } from "../mods/mods";
import { loadThemeList } from "../wardrobe/assets";
import { demoApi, DEMO_ITEMS } from "./demo";
import { initialWs, workshopHtml } from "./view";

const tags = ["idle", "walk", "run_away", "sleep", "peek", "talk", "shrug", "sulk", "shh", "dragged", "fart"];

function controller(tier: "free" | "pro" = "free") {
  const setMod = vi.fn();
  const c = new WorkshopController({
    render: () => undefined,
    setMod,
    lang: () => "tr",
    tier: () => tier,
    owned: () => ["halloween"],
    deviceId: () => "device-12345678",
    modsEnabled: () => ({}),
    readMine: async () => [],
    validate: (dirs) => validateMods(dirs, tags, builtinIds(loadThemeList())),
    inTauri: false,
    api: demoApi(),
  });
  return { c, setMod };
}

describe("workshop.exe", () => {
  it("keşfet: liste, beğeni, premium paket Free'de kurulamaz", async () => {
    const { c } = controller();
    await c.open();
    expect(c.s.items?.map((i) => i.id)).toEqual(DEMO_ITEMS.map((i) => i.id));
    const html = c.html();
    expect(html).toContain("uykulu kediler");
    expect(html).toMatch(/data-id="space_gossip" disabled/);
    const el = { dataset: { id: "sleepy_cats" } } as unknown as HTMLElement;
    await c.action("ws_like", el);
    expect(c.s.liked).toContain("sleepy_cats");
  });

  it("paketler: sahip olunan kozmetik açılır/kapanır; Pro dünyası Free'de kilitli", () => {
    const html = workshopHtml("tr", { ...initialWs(), view: "packs" }, "free", ["halloween"]);
    expect(html).toContain('data-switch="pack_halloween"');
    expect(html).not.toContain('data-switch="pack_space"');
    expect(html).toContain("pro ile gelir");
  });

  it("yarat: tema yapınca doğrulanır ve mod açılır; geçersiz laf paketi kurulmaz", async () => {
    const { c, setMod } = controller();
    c.input("theme_tr", "gece kahvesi");
    c.input("theme_en", "night coffee");
    await c.action("ws_palette", { dataset: { id: "coffee" } } as unknown as HTMLElement);
    await c.action("ws_make_theme", { dataset: {} } as unknown as HTMLElement);
    expect(setMod).toHaveBeenCalledWith(expect.stringMatching(/^my_night_coffee_/), true);
    setMod.mockClear();
    c.input("lines_tr", "kötü");
    c.input("lines_en", "bad");
    c.input("line_tr_0", "BAĞIRIYORUM!");
    c.input("line_en_0", "SHOUTING!");
    await c.action("ws_make_lines", { dataset: {} } as unknown as HTMLElement);
    expect(setMod).not.toHaveBeenCalled();
    expect(c.s.msg).toBeTruthy();
  });

  it("AI dünya Free'de kapalı (pro yazısı), takma ad süzülür", () => {
    const { c } = controller("free");
    expect(workshopHtml("tr", { ...initialWs(), view: "create" }, "free", [])).toContain("ai dünya üretici pro ile gelir");
    c.input("handle", "Mert Dev!!");
    expect(c.s.handle).toBe("mertdev");
  });
});
