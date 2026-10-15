import { afterEach, describe, expect, it, vi } from "vitest";
import type { Backend } from "../settings";
import { createStats, STATS_KEY, type StatsEvent } from "./stats";

/** Bellek store (settings testindeki gibi); yazılan her şeyi görebilmek için map açık. */
function memoryStore(initial: Record<string, unknown> = {}) {
  const map = new Map<string, unknown>(Object.entries(initial));
  const backend: Backend & { map: Map<string, unknown>; saves: number } = {
    map,
    saves: 0,
    get: async (k) => structuredClone(map.get(k)),
    set: async (k, v) => void map.set(k, structuredClone(v)),
    save: async () => void backend.saves++,
  };
  return backend;
}

const at = (d: number, h = 12, m = 0) => new Date(2026, 9, d, h, m);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("stats", () => {
  it("counts questions, clicks, drags and sleep minutes for today and in total", async () => {
    const store = memoryStore();
    const stats = createStats(store, { now: () => at(2) });
    for (const ev of [
      { type: "question" },
      { type: "question" },
      { type: "click" },
      { type: "drag" },
      { type: "sleep", ms: 90_000 },
      { type: "sleep", ms: 45_000 },
    ] as StatsEvent[]) {
      await stats.record(ev);
    }
    const snap = await stats.snapshot();
    expect(snap.day).toBe("2026-10-02");
    expect(snap.today).toMatchObject({ questions: 2, clicks: 1, drags: 1, sleepMinutes: 2, lines: 0, topApp: null });
    expect(snap.total).toEqual(snap.today);
    expect(store.saves).toBe(6);
  });

  it("reports the app it talked about most (ties alphabetical, unknown/null ignored)", async () => {
    const stats = createStats(memoryStore(), { now: () => at(2) });
    for (const app of ["excel", "browser", "excel", "browser", null, "Not A Tag", "vscode"]) {
      await stats.record({ type: "line", app });
    }
    expect((await stats.snapshot()).today.topApp).toBe("browser");
    await stats.record({ type: "line", app: "excel" });
    expect((await stats.snapshot()).total.topApp).toBe("excel");
  });

  it("starts a new today on the next local day and keeps the total", async () => {
    let now = at(2, 23, 59);
    const stats = createStats(memoryStore(), { now: () => now });
    await stats.record({ type: "question" });
    await stats.record({ type: "click" });
    now = at(3, 0, 1);
    expect((await stats.snapshot()).today.questions).toBe(0);
    await stats.record({ type: "question" });
    const snap = await stats.snapshot();
    expect(snap.day).toBe("2026-10-03");
    expect(snap.today).toMatchObject({ questions: 1, clicks: 0, drags: 0, sleepMinutes: 0, lines: 0, topApp: null });
    expect(snap.total).toMatchObject({ questions: 2, clicks: 1, drags: 0, sleepMinutes: 0, lines: 0, topApp: null });
  });

  it("uses the event's own time when given", async () => {
    const stats = createStats(memoryStore(), { now: () => at(5) });
    await stats.record({ type: "drag", at: at(4) });
    expect((await stats.snapshot(at(4))).today.drags).toBe(1);
    expect((await stats.snapshot(at(5))).today.drags).toBe(0);
  });

  it("persists across instances and survives a corrupt store", async () => {
    const store = memoryStore();
    await createStats(store, { now: () => at(2) }).record({ type: "click" });
    expect((await createStats(store, { now: () => at(2) }).snapshot()).total.clicks).toBe(1);

    const broken = memoryStore({ [STATS_KEY]: { day: 5, today: "x", total: { clicks: -3, apps: { "<b>": 9, excel: 2 } } } });
    const snap = await createStats(broken, { now: () => at(2) }).snapshot();
    expect(snap.total).toMatchObject({ questions: 0, clicks: 0, drags: 0, sleepMinutes: 0, lines: 0, topApp: "excel" });

    const failing: Backend = { get: async () => Promise.reject(new Error("io")), set: async () => {}, save: async () => {} };
    expect((await createStats(failing, { now: () => at(2) }).snapshot()).total.questions).toBe(0);
  });

  it("does not lose concurrent records", async () => {
    const store = memoryStore();
    const stats = createStats(store, { now: () => at(2) });
    await Promise.all(Array.from({ length: 25 }, () => stats.record({ type: "click" })));
    expect((await stats.snapshot()).total.clicks).toBe(25);
    expect((store.map.get(STATS_KEY) as { total: { clicks: number } }).total.clicks).toBe(25);
  });

  it("reset clears everything and saves", async () => {
    const store = memoryStore();
    const stats = createStats(store, { now: () => at(2) });
    await stats.record({ type: "question" });
    await stats.record({ type: "line", app: "excel" });
    await stats.reset();
    const snap = await stats.snapshot();
    expect(snap.today).toMatchObject({ questions: 0, clicks: 0, drags: 0, sleepMinutes: 0, lines: 0, topApp: null });
    expect(snap.total).toEqual(snap.today);
    expect(store.map.get(STATS_KEY)).toMatchObject({ day: "2026-10-02" });
  });

  it("counts every spoken line, even without an app, next to the per-app counts", async () => {
    let now = at(2, 23, 0);
    const stats = createStats(memoryStore(), { now: () => now });
    for (const app of ["excel", null, "excel", "Not A Tag"]) await stats.record({ type: "line", app });
    let snap = await stats.snapshot();
    expect(snap.today.lines).toBe(4);
    expect(snap.total.lines).toBe(4);
    expect(snap.today.topApp).toBe("excel");
    now = at(3, 9, 0);
    await stats.record({ type: "line", app: null });
    snap = await stats.snapshot();
    expect(snap.today.lines).toBe(1);
    expect(snap.total.lines).toBe(5);
    await stats.record({ type: "click" });
    expect((await stats.snapshot()).total.lines).toBe(5);
  });

  it("an older store without lines starts lines at 0 and keeps the rest", async () => {
    const old = memoryStore({
      [STATS_KEY]: {
        day: "2026-10-02",
        today: { questions: 2, clicks: 1, drags: 0, sleepMs: 0, apps: { excel: 3 } },
        total: { questions: 9, clicks: 4, drags: 1, sleepMs: 120_000, apps: { excel: 3 } },
      },
    });
    const stats = createStats(old, { now: () => at(2) });
    let snap = await stats.snapshot();
    expect(snap.today).toMatchObject({ questions: 2, clicks: 1, drags: 0, sleepMinutes: 0, lines: 0, topApp: "excel" });
    expect(snap.total).toMatchObject({ questions: 9, clicks: 4, drags: 1, sleepMinutes: 2, lines: 0, topApp: "excel" });
    await stats.record({ type: "line", app: "browser" });
    snap = await stats.snapshot();
    expect([snap.today.lines, snap.total.lines]).toEqual([1, 1]);
    expect((old.map.get(STATS_KEY) as { total: { lines: number } }).total.lines).toBe(1);
  });

  it("ignores bad sleep durations", async () => {
    const stats = createStats(memoryStore(), { now: () => at(2) });
    await stats.record({ type: "sleep", ms: -5 });
    await stats.record({ type: "sleep", ms: Number.NaN });
    expect((await stats.snapshot()).total.sleepMinutes).toBe(0);
  });
});

describe("privacy", () => {
  it("never stores question text, even if a caller passes it", async () => {
    const store = memoryStore();
    const stats = createStats(store, { now: () => at(2) });
    await stats.record({ type: "question", question: "zebra secret", text: "zebra" } as unknown as StatsEvent);
    await stats.record({ type: "line", app: "excel", text: "zebra line" } as unknown as StatsEvent);
    const saved = JSON.stringify([...store.map.entries()]);
    expect(saved).not.toContain("zebra");
    expect((await stats.snapshot()).today.questions).toBe(1);
  });

  it("never touches the network", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const stats = createStats(memoryStore(), { now: () => at(2) });
    await stats.record({ type: "question" });
    await stats.record({ type: "line", app: "browser" });
    await stats.snapshot();
    await stats.reset();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("stats.txt geçmiş (FB4-6)", () => {
  it("son 7 gün, birlikte geçen gün, aktif gün, ilk 3 uygulama, doğru cevap ve osuruk", async () => {
    let now = new Date(2026, 9, 1, 10);
    const s = createStats(memoryStore(), { now: () => now });
    await s.record({ type: "click" });
    await s.record({ type: "line", app: "excel" });
    await s.record({ type: "line", app: "excel" });
    await s.record({ type: "line", app: "browser" });
    await s.record({ type: "honest" });
    now = new Date(2026, 9, 3, 10);
    await s.record({ type: "question" });
    await s.record({ type: "fart" });
    await s.record({ type: "line", app: "vscode" });
    const snap = await s.snapshot();
    expect(snap.week.map((d) => d.day)).toEqual(["2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(snap.week[4]).toEqual({ day: "2026-10-01", questions: 0, clicks: 1, lines: 3 });
    expect(snap.week[5]).toEqual({ day: "2026-10-02", questions: 0, clicks: 0, lines: 0 });
    expect(snap.week[6]).toEqual({ day: "2026-10-03", questions: 1, clicks: 0, lines: 1 });
    expect(snap.since).toBe("2026-10-01");
    expect(snap.activeDays).toBe(2);
    expect(snap.total.apps).toEqual([{ app: "excel", n: 2 }, { app: "browser", n: 1 }, { app: "vscode", n: 1 }]);
    expect([snap.total.honest, snap.total.farts]).toEqual([1, 1]);
  });
});
