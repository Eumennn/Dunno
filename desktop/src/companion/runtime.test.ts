import { describe, expect, it } from "vitest";
import type { Backend } from "../settings";
import { COMPANION_KEY } from "./companion";
import { CompanionRuntime, type Say } from "./runtime";

function mem(): Backend & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  return { data, get: async (k) => data.get(k), set: async (k, v) => void data.set(k, v), save: async () => undefined };
}

describe("companion runtime", () => {
  it("dönüş lafı kuyruğa girer, talker meşgulken bekler, boşalınca söylenir; durum store'a yazılır", async () => {
    const store = mem();
    let now = new Date(2026, 9, 1, 12);
    let free = false;
    const said: Say[] = [];
    const rt = await CompanionRuntime.load({
      store,
      world: () => "normal",
      lang: () => "en",
      say: async (s) => (free ? (said.push(s), true) : false),
      now: () => now,
      rng: () => 0,
      saveDelayMs: 0,
    });
    rt.emit({ type: "session_start" });
    now = new Date(2026, 9, 6, 12);
    rt.emit({ type: "session_start" });
    await Promise.resolve();
    expect(said).toEqual([]);
    expect(rt.pending.map((s) => s.text)).toContain("oh. you exist.");
    free = true;
    await rt.flush();
    expect(said.map((s) => s.text)).toContain("oh. you exist.");
    expect(rt.pending).toHaveLength(0);
    expect(store.data.get(COMPANION_KEY)).toBeTruthy();
    const again = await CompanionRuntime.load({ store, world: () => "normal", lang: () => "en", say: async () => true, saveDelayMs: 0 });
    expect(again.state.rel.daysTogether).toBe(2);
  });

  it("Pro yol seçimi sadece geçerli dalda", async () => {
    const store = mem();
    store.data.set(COMPANION_KEY, { evo: { path: ["dunno", "chaos"] } });
    const rt = await CompanionRuntime.load({ store, world: () => "normal", lang: () => "tr", say: async () => true, saveDelayMs: 0 });
    expect(rt.form).toBe("chaos");
    expect(rt.choose("sloth")).toBe(false);
    expect(rt.choose("chill")).toBe(true);
    expect(rt.form).toBe("chill");
  });
});
