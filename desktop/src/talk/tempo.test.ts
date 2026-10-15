import { describe, expect, it } from "vitest";
import { COOLDOWN_MS, gate, initialTempo, LOCK_MS, record, waitSeconds, type Tempo } from "./tempo";

const s = (x: number) => x * 1000;

function askAt(t: Tempo, at: number) {
  return record(t, s(at));
}

describe("soru temposu", () => {
  it("ilk soru serbest, sonrası 20 sn bekler", () => {
    let t = initialTempo();
    expect(gate(t, s(0))).toEqual({ kind: "ok" });
    t = askAt(t, 0).tempo;
    expect(gate(t, s(5))).toEqual({ kind: "cooldown", waitMs: s(15) });
    expect(gate(t, s(19.9)).kind).toBe("cooldown");
    expect(gate(t, s(0) + COOLDOWN_MS)).toEqual({ kind: "ok" });
  });

  it("2 dk içinde 4. soru: yavaş + 60 sn kilit, soru sayılmaz", () => {
    let t = initialTempo();
    for (const at of [0, 20, 40]) {
      const r = askAt(t, at);
      expect(r.tooFast).toBe(false);
      t = r.tempo;
    }
    const r = askAt(t, 60);
    expect(r.tooFast).toBe(true);
    expect(r.tempo.asks).toEqual([0, s(20), s(40)]);
    expect(gate(r.tempo, s(61))).toEqual({ kind: "locked", waitMs: LOCK_MS - s(1) });
    expect(gate(r.tempo, s(60) + LOCK_MS)).toEqual({ kind: "ok" });
  });

  it("pencere kayar: 2 dk'dan eski sorular sayılmaz", () => {
    let t = initialTempo();
    for (const at of [0, 20, 40]) t = askAt(t, at).tempo;
    const r = askAt(t, 125); // 0 düştü (125 - 0 >= 120), 20 ve 40 kaldı
    expect(r.tooFast).toBe(false);
    expect(r.tempo.asks).toEqual([s(20), s(40), s(125)]);
  });

  it("yavaş sorular hiç kilitlenmez", () => {
    let t = initialTempo();
    for (let i = 0; i < 20; i++) {
      const at = i * 45;
      expect(gate(t, s(at)).kind).toBe("ok");
      const r = askAt(t, at);
      expect(r.tooFast).toBe(false);
      t = r.tempo;
    }
  });

  it("kilit saniyesi yukarı yuvarlanır", () => {
    expect(waitSeconds(59_001)).toBe(60);
    expect(waitSeconds(1)).toBe(1);
    expect(waitSeconds(0)).toBe(1);
  });
});
