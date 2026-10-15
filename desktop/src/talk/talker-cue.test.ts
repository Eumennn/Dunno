// SPEC 07 FB6b: talker düşünme akışı -> setCue olayları ve verbSchedule zamanlayıcıları (sahte saat).
// AskWindow / Bubble DOM ister: modül sahtesiyle değiştirilir; geri kalan talker kodu gerçek.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { localDay } from "../lines/engine";
import type { Cue } from "./thinkcue";
import { ANSWER_GAP_MS } from "./thinkcue";

const windows: FakeWindow[] = [];

class FakeWindow {
  readonly bubble = { el: new EventTarget(), close: vi.fn() };
  readonly verbs: number[] = [];
  readonly calls: string[] = [];
  constructor() {
    windows.push(this);
  }
  ask() {
    return Promise.resolve("paris nerede");
  }
  thinking() {
    this.calls.push(`thinking@${Date.now()}`);
  }
  setVerb() {
    this.verbs.push(Date.now());
  }
  doze() {
    this.calls.push(`doze@${Date.now()}`);
  }
  rethink() {
    this.calls.push(`rethink@${Date.now()}`);
  }
  answer() {
    this.calls.push(`answer@${Date.now()}`);
  }
  say() {}
  close() {}
}

vi.mock("../ui/askbox", () => ({ AskWindow: FakeWindow }));
vi.mock("../ui/bubble", () => ({
  Bubble: class {
    el = new EventTarget();
    setHtml() {}
    close() {}
  },
}));

const { Talker } = await import("./talker");
type Deps = ConstructorParameters<typeof Talker>[0];

/** sıralı rng: verilen değerler bitince 0.5 */
function seq(xs: number[]) {
  let i = 0;
  return () => (i < xs.length ? xs[i++] : 0.5);
}

function setup(rolls: number[], answerAfterMs: number, initial: Record<string, unknown> = {}) {
  const cues: { cue: Cue; at: number }[] = [];
  const d = {
    settings: {
      get: () => ({ lang: "tr", mode: "polite", frequency: "normal", deviceId: "dev-abcdefgh", muteUntil: null, bubbleSpeed: "normal" }),
      onChange: () => () => undefined,
      update: async () => undefined,
    },
    memory: { initial: { recent: [], honest: null, sulkDay: null, ...initial }, save: vi.fn(async () => undefined) },
    api: {
      ask: () =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve({ kind: "answer", result: { answer: "paris. bunu bilmeyen ben miyim sen mi", source: "llm", honest: true, charged: true } }),
            answerAfterMs,
          ),
        ),
    },
    pet: { hold: vi.fn(), pose: vi.fn(), react: vi.fn() },
    host: {},
    setInteractive: async () => undefined,
    setVisible: async () => undefined,
    pools: [],
    rng: seq(rolls),
    setCue: (cue: Cue) => cues.push({ cue, at: Date.now() }),
  } as unknown as Deps;
  const t = new Talker(d);
  t.setMeeting(false);
  return { t, cues };
}

beforeEach(() => {
  vi.useFakeTimers({ now: 0 });
  windows.length = 0;
});
afterEach(() => vi.useRealTimers());

// rng sırası: thinkVerb, planThinking (doze, long, süre), verbSchedule (ritim zarları)
describe("talker thinking cue", () => {
  it("honest answer: dots while thinking, verb changes on the schedule, off on answer", async () => {
    // doze yok (0.9), uzun yok (0.9), poolMs 1200+0.5*2300=2350 -> normal: 1 değişim; ritim 1400+0*1000=1400 > 2350-600 -> eşit dağıt (zar 0.5 -> 1075)
    const { t, cues } = setup([0, 0.9, 0.9, 0.5, 0, 0.5], 900);
    t.onClick();
    await vi.advanceTimersByTimeAsync(0);
    expect(cues).toEqual([{ cue: "dots", at: 0 }]);
    // honest 900 ms'de geldi: HONEST_MIN 1500'e kadar bekler -> cevap 1500'de
    await vi.advanceTimersByTimeAsync(1_600);
    const w = windows[0];
    expect(w.calls.find((c) => c.startsWith("answer"))).toBe("answer@1500");
    expect(cues).toEqual([
      { cue: "dots", at: 0 },
      { cue: "off", at: 1_500 },
    ]);
    // planlı değişim 1075'teydi; cevap 1500'de -> 900'den sonrası trimVerbs ile atıldı: hiçbir değişim cevaba 0.6 sn'den yakın değil
    for (const v of w.verbs) expect(v).toBeLessThanOrEqual(1_500 - ANSWER_GAP_MS);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(cues).toHaveLength(2);
  });

  it("long thinking (pool after the quota): hourglass, 2-3 verb changes", async () => {
    // doze yok, uzun (0.1 < 0.2), poolMs 4000+1*3000=7000; ritim 0 -> 1400, 2800, 4200 (en fazla 3)
    // hak bitti, bugünün sulk'u gösterildi -> yerel havuz cevabı, süre plan.poolMs
    const today = localDay(new Date(0));
    const spent = { honest: { day: today, used: 3 }, sulkDay: today };
    const { t, cues } = setup([0, 0.9, 0.1, 1, 0, 0, 0], 100, spent);
    t.onClick();
    await vi.advanceTimersByTimeAsync(7_100);
    expect(cues.map((c) => c.cue)).toEqual(["hourglass", "off"]);
    expect(windows[0].verbs).toEqual([1_400, 2_800, 4_200]);
  });

  it("doze: off at zzz, back on rethink, off on answer; no verb timers after zzz", async () => {
    // doze (0.05), uzun değil; verbSchedule doze: zzz (1800) öncesi 1 değişim [400, 1200], zar 0 -> 400
    const { t, cues } = setup([0, 0.05, 0.9, 0.5, 0, 0], 100);
    t.onClick();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(cues.map((c) => [c.cue, c.at])).toEqual([
      ["dots", 0],
      ["off", 1_800],
      ["dots", 3_400],
      ["off", 4_600],
    ]);
    expect(windows[0].verbs).toEqual([400]);
  });

  it("meeting starts while thinking: cancel turns the cue off and clears verb timers", async () => {
    // uzun: 3 değişim planlı
    const { t, cues } = setup([0, 0.9, 0.1, 1, 0, 0, 0], 5_000);
    t.onClick();
    await vi.advanceTimersByTimeAsync(1_000);
    t.setMeeting(true); // koruma balonları kapatır
    await vi.advanceTimersByTimeAsync(20_000);
    expect(cues.map((c) => c.cue)).toEqual(["hourglass", "off"]);
    expect(windows[0].calls.some((c) => c.startsWith("answer"))).toBe(false);
    // balon kapandıktan sonra metin değişmez (zamanlayıcılar ya temizlendi ya balon yok)
    expect(windows[0].verbs.every((v) => v < 1_000)).toBe(true);
  });

  it("without setCue nothing breaks", async () => {
    const { t } = setup([0, 0.9, 0.9, 0.5, 0, 0.5], 100);
    (t as unknown as { d: { setCue?: unknown } }).d.setCue = undefined;
    t.onClick();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(windows[0].calls.some((c) => c.startsWith("answer"))).toBe(true);
  });
});
