// SPEC 13: talker uygulama tepkisi: dwell sonrası uygulamaya özel laf (random'a düşmez), bastırmada/toplantıda susar, konuşunca bekler.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DWELL_MS, GLOBAL_COOLDOWN_MS } from "./app-react";

const said: string[] = [];
vi.mock("../ui/bubble", () => ({
  Bubble: class {
    el = Object.assign(new EventTarget(), { querySelector: () => null });
    setHtml(html: string) {
      said.push(html);
    }
    close() {}
  },
}));

const { Talker } = await import("./talker");
type Deps = ConstructorParameters<typeof Talker>[0];

const pool = [
  { id: "tr_excel_pro", trigger: "app:excel", intent: "t", tr: "derin excel lafı", pro: true },
  { id: "tr_egg_monster_x", trigger: "egg:monster", intent: "t", tr: "grr lafı" },
  { id: "tr_excel_x", trigger: "app:excel", intent: "t", tr: "excel lafı" },
  { id: "tr_random_x", trigger: "random", intent: "t", tr: "rastgele laf" },
];

function setup(extra: Record<string, unknown> = {}) {
  const stats: string[] = [];
  const d = {
    settings: {
      get: () => ({ lang: "tr", mode: "polite", frequency: "normal", deviceId: "dev-abcdefgh", muteUntil: null, bubbleSpeed: "short" }),
      onChange: () => () => undefined,
      update: async () => undefined,
    },
    memory: { initial: { recent: [], honest: null, sulkDay: null }, save: vi.fn(async () => undefined) },
    api: {},
    pet: { hold: vi.fn(), pose: vi.fn(), react: vi.fn() },
    host: {},
    setInteractive: async () => undefined,
    setVisible: async () => undefined,
    pools: [pool],
    rng: () => 0.2,
    onStat: (e: { kind: string; trigger?: string }) => e.kind === "line" && stats.push(e.trigger!),
    ...extra,
  } as unknown as Deps;
  const t = new Talker(d);
  t.setMeeting(false);
  return { t, stats };
}

beforeEach(() => {
  vi.useFakeTimers({ now: 0 });
  said.length = 0;
});
afterEach(() => vi.useRealTimers());

describe("talker uygulama tepkisi (SPEC 13)", () => {
  it("excel'de kalınca excel lafı; hemen değil", async () => {
    const { t, stats } = setup();
    t.setContext(["app:excel", "time:noon"]);
    t.checkAppReact();
    expect(stats).toEqual([]);
    await vi.advanceTimersByTimeAsync(DWELL_MS);
    t.checkAppReact();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(stats).toEqual(["app:excel"]);
    // bekleme süresinde bir daha yok
    t.setContext(["app:word"]);
    await vi.advanceTimersByTimeAsync(DWELL_MS);
    t.checkAppReact();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(stats).toEqual(["app:excel"]);
  });

  it("uygulamaya özel laf yoksa random'a düşmez", async () => {
    const { t, stats } = setup();
    t.setContext(["app:steam"]);
    await vi.advanceTimersByTimeAsync(DWELL_MS);
    t.checkAppReact();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(stats).toEqual([]);
  });

  it("sessiz site / toplantıda zar bile atılmaz; kalkınca konuşabilir", async () => {
    const { t, stats } = setup();
    t.setContext(["app:excel"]);
    t.setSiteSilent(true);
    await vi.advanceTimersByTimeAsync(DWELL_MS);
    t.checkAppReact();
    t.setSiteSilent(false);
    t.setMeeting(true);
    t.checkAppReact();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(stats).toEqual([]);
    t.setMeeting(false);
    t.checkAppReact();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(stats).toEqual(["app:excel"]);
    expect(GLOBAL_COOLDOWN_MS).toBeGreaterThan(DWELL_MS);
  });
});

describe("gizli havuz (SPEC 14)", () => {
  it("canavar/dünya açıkken kendiliğinden lafın payı gizli havuzdan; kapalıyken hiç", async () => {
    const on = setup({ egg: () => ({ trigger: "egg:monster", share: 0.6 }) });
    void on.t.chatter();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(on.stats).toEqual(["egg:monster"]); // rng 0.2 < 0.6
    const low = setup({ egg: () => ({ trigger: "egg:monster", share: 0.1 }) });
    void low.t.chatter();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(low.stats).toEqual(["random"]);
    const off = setup({ egg: () => null });
    void off.t.chatter();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(off.stats).toEqual(["random"]);
    // gizli havuz kendiliğinden laf dışında (normal pick) hiç gelmez
    const plain = setup();
    for (let i = 0; i < 3; i++) {
      void plain.t.chatter();
      await vi.advanceTimersByTimeAsync(20_000);
    }
    expect(plain.stats.includes("egg:monster")).toBe(false);
  });
});

describe("Free / Pro havuzu (SPEC 15)", () => {
  it("Free'de pro laf söylenmez; Pro'ya geçince havuza girer", async () => {
    let tier: "free" | "pro" = "free";
    const { t, stats } = setup({ tier: () => tier, rng: () => 0 });
    const said = () => (t as unknown as { engine: { pickExact: (a: string[], l: string, m: string) => { id: string } | null } }).engine;
    // free: excel'de sadece normal laf
    expect(said().pickExact(["app:excel"], "tr", "polite")?.id).toBe("tr_excel_x");
    expect(said().pickExact(["app:excel"], "tr", "polite")?.id).toBe("tr_excel_x");
    tier = "pro";
    t.refreshTier();
    const ids = new Set([0, 1, 2].map(() => said().pickExact(["app:excel"], "tr", "polite")?.id));
    expect(ids.has("tr_excel_pro")).toBe(true);
    expect(stats).toEqual([]);
  });
});

describe("Kişisel Dunno katmanı (SPEC 16)", () => {
  it("açıksa kendiliğinden lafın payı kişisel; kapalıyken (null) ya da sessiz sitede hiç", async () => {
    const line = () => ({ id: "p", text: "nabıyon mert, yine excel mi" });
    const on = setup({ personal: () => ({ share: 0.25, line }) }); // rng 0.2 < 0.25
    void on.t.chatter();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(said.some((h) => h.includes("nabıyon mert"))).toBe(true);
    said.length = 0;
    const off = setup({ personal: () => null });
    void off.t.chatter();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(said.some((h) => h.includes("nabıyon mert"))).toBe(false);
    said.length = 0;
    const silent = setup({ personal: () => ({ share: 0.25, line }) });
    silent.t.setSiteSilent(true);
    void silent.t.chatter();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(said).toEqual([]);
  });
});


describe("karşılama sessizliği (FB4-4)", () => {
  it("karşılama + uyku boyunca kendiliğinden laf, uygulama tepkisi ve toast yok; bitince normal", async () => {
    const { t, stats } = setup();
    t.setWelcoming(true);
    void t.chatter();
    t.setContext(["app:excel"]);
    await vi.advanceTimersByTimeAsync(DWELL_MS);
    t.checkAppReact();
    expect(await t.announce("açıldı: taç")).toBe(false);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(stats).toEqual([]);
    t.setWelcoming(false);
    void t.chatter();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(stats.length).toBe(1);
  });
});
