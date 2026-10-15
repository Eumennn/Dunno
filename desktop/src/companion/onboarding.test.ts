import { describe, expect, it } from "vitest";
import { applyEvent, cleanCompanion, initialCompanion, type CompanionState, type Effect } from "./companion";
import { FIRST_STEPS, HINT_EVERY_MIN, MAX_HINTS, onboardOnEvent, initialOnboard } from "./onboarding";
import { levelOf } from "./progression";
import { COMPANION_STRINGS } from "./strings";
import { companionView } from "./view";

const at = (min: number) => new Date(2026, 9, 10, 10, min);

describe("ilk 10 dakika (FB6)", () => {
  it("beş adım, her biri bir kez xp; hepsi bitince level 3 ve 'first_done'", () => {
    let s: CompanionState = initialCompanion();
    const effects: Effect[] = [];
    const evs = [{ type: "question" }, { type: "question" }, { type: "drag" }, { type: "onboard", step: "open" }, { type: "customize" }, { type: "onboard", step: "tree" }] as const;
    evs.forEach((ev, i) => {
      const r = applyEvent(s, ev, at(i), { world: "normal" });
      s = r.state;
      effects.push(...r.effects);
    });
    expect(s.onboard.finished).toBe(true);
    expect(effects.filter((e) => e.kind === "first_step").map((e) => (e as { step: string }).step)).toEqual(["ask", "drag", "open", "dress"]);
    // ekranda ve ipuçlarında sıra kronolojik: dunno.exe en üstte
    expect(FIRST_STEPS[0]).toBe("open");
    expect(effects.some((e) => e.kind === "first_done")).toBe(true);
    expect(levelOf(s.progress.xp)).toBeGreaterThanOrEqual(3);
    expect(companionView(s, "free").firstSteps).toBeNull();
  });

  it("hatırlatma: dakikalık nabızda, aralıkla, sınırlı; boşta ve bitince yok", () => {
    let o = initialOnboard();
    const r1 = onboardOnEvent(o, { type: "heartbeat" }, at(0));
    expect(r1.hint).toBe("open");
    o = r1.state;
    expect(onboardOnEvent(o, { type: "heartbeat" }, at(HINT_EVERY_MIN - 1)).hint).toBeNull();
    expect(onboardOnEvent(o, { type: "heartbeat", idle: true }, at(HINT_EVERY_MIN)).hint).toBeNull();
    expect(onboardOnEvent(o, { type: "heartbeat" }, at(HINT_EVERY_MIN)).hint).toBe("open");
    expect(onboardOnEvent({ ...o, hints: MAX_HINTS }, { type: "heartbeat" }, at(30)).hint).toBeNull();
  });

  it("FB6 düzeltme: bu özellikten önceki kayıt (xp'li) da ilk adımları görür; yeniden başlatınca XP ikinci kez verilmez", () => {
    expect(cleanCompanion({ progress: { xp: 300 } }).onboard.finished).toBe(false);
    expect(cleanCompanion({}).onboard.finished).toBe(false);
    let s = applyEvent(initialCompanion(), { type: "question" }, at(0), { world: "normal" }).state;
    const xp1 = s.progress.xp;
    s = { ...s, onboard: { ...s.onboard, done: [], finished: false } };
    s = applyEvent(s, { type: "question" }, at(1), { world: "normal" }).state;
    expect(s.onboard.done).toEqual(["ask"]);
    expect(s.progress.xp).toBe(xp1 + 5); // sadece soru xp'si
    expect(cleanCompanion({ progress: { xp: 30 }, onboard: { done: ["ask"], hints: 2 } }).onboard.done).toEqual(["ask"]);
  });

  it("laflar marka sesi: küçük harf, ünlem yok, ≤ 60", () => {
    for (const lang of ["tr", "en"] as const) {
      const t = COMPANION_STRINGS[lang];
      for (const x of [...FIRST_STEPS.map((k) => t.firstHint[k]), ...FIRST_STEPS.map((k) => t.firstNext(t.firstShort[k])), t.firstAllDone, t.firstToast]) {
        expect(x.length).toBeLessThanOrEqual(60);
        expect(x).toBe(x.toLocaleLowerCase(lang));
        expect(x).not.toContain("!");
      }
    }
  });
});

describe("ilk adımlar runtime (FB6 düzeltme)", () => {
  it("açılışta ilk ipucu; Dunno meşgulse birkaç saniye sonra yeniden denenir", async () => {
    const { CompanionRuntime } = await import("./runtime");
    const data = new Map<string, unknown>();
    const store = { get: async (k: string) => data.get(k), set: async (k: string, v: unknown) => void data.set(k, v), save: async () => undefined };
    let busy = true;
    const said: string[] = [];
    const rt = await CompanionRuntime.load({
      store: store as never,
      world: () => "normal",
      lang: () => "tr",
      say: async (s) => (busy ? false : (said.push(s.text), true)),
      now: () => at(0),
      rng: () => 0,
      saveDelayMs: 0,
      retryMs: 10,
    });
    rt.emit({ type: "session_start" });
    await new Promise((r) => setTimeout(r, 5));
    expect(said).toEqual([]);
    busy = false;
    await new Promise((r) => setTimeout(r, 40));
    expect(said).toContain(COMPANION_STRINGS.tr.firstHint.open);
  });
});
