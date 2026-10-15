// SPEC 07 FB2/FB5: Talker'ın DOM'suz yeni yüzeyi (test modu hak sıfırlama, Rust pop bayrağı).
// Tempo dalları AskWindow (DOM) açtığı için kararları devmode/testmode.test.ts (testGate, tempoActive) kapsar.
import { describe, expect, it, vi } from "vitest";
import type { TalkerDeps } from "./talker";
import { Talker } from "./talker";

function talker(honest: unknown) {
  const save = vi.fn(async () => undefined);
  const d = {
    settings: { get: () => ({ lang: "tr", mode: "polite", frequency: "normal", bubbleSpeed: "normal" }), onChange: () => () => undefined },
    memory: { initial: { recent: [], honest, sulkDay: null }, save },
    api: {},
    pet: {},
    host: {},
    setInteractive: async () => undefined,
    setVisible: async () => undefined,
    pools: [],
    now: () => new Date(2026, 9, 3, 12),
  } as unknown as TalkerDeps;
  return { t: new Talker(d), save };
}

describe("Talker test mode surface", () => {
  it("resetQuota gives today's answers back and saves the honest state", async () => {
    const { t, save } = talker({ day: "2026-10-03", used: 3 });
    expect(t.questionsLeft).toBe(0);
    await t.resetQuota();
    expect(t.questionsLeft).toBe(3);
    expect(save).toHaveBeenCalledWith({ honest: { day: "2026-10-03", used: 0 } });
  });

  it("setTestMode and onCursor accept the documented shapes (pop optional for old payloads)", () => {
    const { t } = talker(null);
    expect(() => t.setTestMode({ on: true, tempoOff: true })).not.toThrow();
    expect(() => t.onCursor({ pop: true })).not.toThrow();
    expect(() => t.onCursor({})).not.toThrow();
  });
});
