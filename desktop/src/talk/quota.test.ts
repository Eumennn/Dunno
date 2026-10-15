import { describe, expect, it } from "vitest";
import { HonestQuota } from "./quota";

describe("doğru cevap hakkı", () => {
  it("3 hak; sadece charge düşürür, gün dönünce sıfırlanır", () => {
    let now = new Date(2026, 9, 3, 23, 50);
    const q = new HonestQuota(() => now);
    expect(q.remaining()).toBe(3);
    q.charge();
    q.charge();
    q.charge();
    q.charge(); // tabanın altına inmez
    expect(q.remaining()).toBe(0);
    expect(q.canAsk()).toBe(false);
    now = new Date(2026, 9, 4, 0, 1);
    expect(q.remaining()).toBe(3);
  });

  it("429: bugünlük biter", () => {
    const q = new HonestQuota(() => new Date(2026, 9, 3, 12));
    q.exhaust();
    expect(q.canAsk()).toBe(false);
  });

  it("kayıttan geri yüklenir; bozuk kayıt sıfırdan başlar", () => {
    const now = () => new Date(2026, 9, 3, 12);
    expect(new HonestQuota(now, { day: "2026-10-03", used: 2 }).remaining()).toBe(1);
    expect(new HonestQuota(now, { day: "2026-10-02", used: 3 }).remaining()).toBe(3); // dünkü
    expect(new HonestQuota(now, { day: "2026-10-03", used: 99 }).remaining()).toBe(0);
    for (const bad of [null, "x", { day: "bugün", used: 1 }, { day: "2026-10-03", used: -1 }, { day: "2026-10-03", used: 1.5 }]) {
      expect(new HonestQuota(now, bad).remaining()).toBe(3);
    }
    expect(new HonestQuota(now, { day: "2026-10-03", used: 1 }).state).toEqual({ day: "2026-10-03", used: 1 });
  });
});
