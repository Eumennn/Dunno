// SPEC 11: talker sırası poz -> kısa düşünme (BRIEF_THOUGHT_MS) -> balon -> ses -> daktilo; fart sessiz; toplantıda hiç ses yok.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BRIEF_THOUGHT_MS } from "../voice/voice";

const log: string[] = [];
vi.mock("../ui/bubble", () => ({
  Bubble: class {
    el = Object.assign(new EventTarget(), { querySelector: () => null });
    setHtml() {
      log.push(`bubble@${Date.now()}`);
    }
    close() {}
  },
}));

const { Talker } = await import("./talker");
type Deps = ConstructorParameters<typeof Talker>[0];

const line = (trigger: string, id: string) => ({ id, trigger, intent: "test", tr: "bir şey dedim" });

function setup(pool: unknown[]) {
  const d = {
    settings: {
      get: () => ({ lang: "tr", mode: "polite", frequency: "normal", deviceId: "dev-abcdefgh", muteUntil: null, bubbleSpeed: "short" }),
      onChange: () => () => undefined,
      update: async () => undefined,
    },
    memory: { initial: { recent: [], honest: null, sulkDay: null }, save: vi.fn(async () => undefined) },
    api: {},
    pet: { hold: vi.fn(), pose: (s: string) => log.push(`pose:${s}@${Date.now()}`), react: vi.fn() },
    host: {},
    setInteractive: async () => undefined,
    setVisible: async () => undefined,
    pools: [pool],
    rng: () => 0.5,
    voice: (c: string) => log.push(`voice:${c}@${Date.now()}`),
    typeInto: () => {
      log.push(`type@${Date.now()}`);
      return { done: Promise.resolve() };
    },
  } as unknown as Deps;
  const t = new Talker(d);
  t.setMeeting(false);
  return t;
}

beforeEach(() => {
  vi.useFakeTimers({ now: 0 });
  log.length = 0;
});
afterEach(() => vi.useRealTimers());

describe("Dunno sesi sırası (SPEC 11)", () => {
  it("poz -> düşünme -> balon -> ses -> daktilo", async () => {
    const t = setup([line("interaction:unlock", "tr_unlock_x")]);
    const done = t.announce("açıldı: taç");
    await vi.advanceTimersByTimeAsync(BRIEF_THOUGHT_MS + 50);
    const first = log.slice(0, 4).map((x) => x.split("@")[0]);
    expect(first).toEqual(["pose:talk", "bubble", "voice:achievement", "type"]);
    const at = (k: string) => Number(log.find((x) => x.startsWith(k))!.split("@")[1]);
    expect(at("bubble") - at("pose:talk")).toBeGreaterThanOrEqual(BRIEF_THOUGHT_MS);
    expect(at("voice:achievement")).toBe(at("bubble"));
    await vi.advanceTimersByTimeAsync(60_000);
    await done;
    // toast da başarım sesiyle
    expect(log.filter((x) => x.startsWith("voice:achievement")).length).toBe(2);
  });

  it("fart lafı sessiz (K3: ses yok)", async () => {
    const t = setup([line("interaction:fart", "tr_fart_x")]);
    void t.fart();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(log.some((x) => x.startsWith("voice:"))).toBe(false);
    expect(log.some((x) => x.startsWith("bubble"))).toBe(true);
  });

  it("toplantıda konuşma da ses de yok", async () => {
    const t = setup([line("interaction:unlock", "tr_unlock_x")]);
    t.setMeeting(true);
    expect(await t.announce("x")).toBe(false);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(log.filter((x) => x.startsWith("voice:") || x.startsWith("bubble"))).toEqual([]);
  });
});
