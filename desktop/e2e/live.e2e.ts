// Canlı uçtan uca: gerçek worker (wrangler dev, ayrı port) + masaüstünün GERÇEK api.ts, reply(), LineEngine, HonestQuota.
// UI'ya, fareye, klavyeye dokunmaz. Worker'ı bu dosya açar ve her durumda kapatır (süreç ağacı, port boş kalır).
import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import poolEn from "../assets/pool_en.json";
import poolTr from "../assets/pool_tr.json";
import { DEFAULT_BASE_URL, DunnoApi, type LinesCache } from "../src/api";
import { LineEngine, mergeLines } from "../src/lines/engine";
import type { Line } from "../src/lines/types";
import { HonestQuota } from "../src/talk/quota";
import { reply, type ReplyContext } from "../src/talk/reply";

const PORT = Number(process.env.E2E_PORT ?? 8788);
const BASE = `http://127.0.0.1:${PORT}`;
const WORKER_DIR = resolve(__dirname, "..", "..", "worker");
/** soru metninin worker çıktısına düşmediğini aramak için benzersiz işaret */
const MARKER = `e2e-zebra-${Date.now().toString(36)}`;
const DEVICE = `e2e-${Math.random().toString(36).slice(2, 12)}`;

let worker: ChildProcess | undefined;
let workerLog = "";
let offlineCache: LinesCache = {};

/** worker'ın gördüğü istekleri değil, istemcinin yaptığı istekleri sayar (method, yol, durum ya da hata) */
type Call = { method: string; path: string; status: number | "error" };
function recordingFetch(calls: Call[]): typeof fetch {
  return async (input, init) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    try {
      const res = await fetch(input, init);
      calls.push({ method, path: url.pathname, status: res.status });
      return res;
    } catch (e) {
      calls.push({ method, path: url.pathname, status: "error" });
      throw e;
    }
  };
}

async function up(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/v1/release`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

async function waitFor(cond: () => Promise<boolean>, ms: number): Promise<boolean> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await cond()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function killWorker(): void {
  if (worker?.pid === undefined || worker.exitCode !== null) return;
  try {
    // Windows: sadece kendi başlattığımız ağacı (cmd -> node -> workerd) kapat
    execFileSync("taskkill", ["/F", "/T", "/PID", String(worker.pid)], { stdio: "ignore" });
  } catch {
    // zaten kapanmış
  }
}

function ctx(engine: LineEngine, quota: HonestQuota, api: DunnoApi, sulked = false): ReplyContext {
  return {
    quota,
    engine,
    ask: (req) => api.ask(req),
    lang: "tr",
    mode: "street",
    deviceId: DEVICE,
    fallback: "...",
    sulked,
  };
}

beforeAll(async () => {
  if (await up()) throw new Error(`port ${PORT} is already in use; refusing to touch someone else's worker`);
  worker = spawn(
    "cmd.exe",
    [
      "/d",
      "/s",
      "/c",
      `npx wrangler dev --port ${PORT} --ip 127.0.0.1 --show-interactive-dev-session=false --test-scheduled --var DUNNO_FAKE_LLM:1`,
    ],
    { cwd: WORKER_DIR, windowsHide: true },
  );
  worker.stdout?.on("data", (d) => (workerLog += String(d)));
  worker.stderr?.on("data", (d) => (workerLog += String(d)));
  if (!(await waitFor(up, 90_000))) {
    killWorker();
    throw new Error(`worker did not start on ${PORT}\n${workerLog.slice(-2000)}`);
  }
  const cron = await fetch(`${BASE}/__scheduled?cron=0+6+*+*+*`);
  expect(cron.status).toBe(200);
  // cron waitUntil ile yazar; set görünene kadar bekle
  await waitFor(async () => {
    const r = await fetch(`${BASE}/v1/lines?lang=tr`);
    return ((await r.json()) as { lines: unknown[] }).lines.length > 0;
  }, 15_000);
});

afterAll(async () => {
  killWorker();
  await waitFor(async () => !(await up()), 15_000);
});

describe("live worker", () => {
  it("api.ts points at the e2e worker through VITE_API_BASE", () => {
    expect(DEFAULT_BASE_URL).toBe(BASE);
    expect(new DunnoApi().baseUrl).toBe(BASE);
  });

  it("/v1/lines: fetched, revalidated with 304, merged with the local pool", async () => {
    const calls: Call[] = [];
    const api = new DunnoApi({ fetchImpl: recordingFetch(calls) });
    const remote = await api.fetchLines("tr");
    expect(remote.length).toBeGreaterThanOrEqual(20);
    expect(remote.every((l) => l.id.startsWith("gen_tr_") && typeof l.tr === "string")).toBe(true);

    const again = await api.fetchLines("tr");
    expect(again).toEqual(remote);
    expect(calls.map((c) => `${c.method} ${c.path} ${c.status}`)).toEqual([
      "GET /v1/lines 200",
      "GET /v1/lines 304",
    ]);

    const local = mergeLines(poolTr, poolEn);
    const merged = mergeLines(poolTr, poolEn, remote);
    expect(merged.length).toBe(local.length + remote.length);
    // tohumlu rng: deterministik ama yayılı seçim (sabit 0 hep ilk taze yerel lafı seçer)
    let seed = 42;
    const rng = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    const engine = new LineEngine({ lines: merged, rng });
    const ids = new Set<string>();
    for (let i = 0; i < 200; i++) ids.add(engine.pick([], "tr", "polite")!.id);
    expect([...ids].some((id) => id.startsWith("gen_tr_"))).toBe(true);

    offlineCache = api.snapshot();
  });

  it("SPEC 06 Q3, keyless worker: every question is an honest request, server pool answer, nothing charged, brain off", async () => {
    const calls: Call[] = [];
    const api = new DunnoApi({ fetchImpl: recordingFetch(calls) });
    const engine = new LineEngine({ lines: mergeLines(poolTr, poolEn), rng: () => 0 });
    const quota = new HonestQuota();
    const c = ctx(engine, quota, api);

    const replies = [];
    for (let i = 0; i < 4; i++) replies.push(await reply(`${MARKER} soru ${i}`, "where", c));

    expect(calls.map((x) => `${x.method} ${x.path} ${x.status}`)).toEqual(Array(4).fill("POST /v1/ask 200"));
    expect(quota.remaining()).toBe(3); // anahtarsız: charged:false, hak düşmez
    for (const r of replies) {
      expect(r).toMatchObject({ kind: "answer", source: "pool", honest: false, brainOff: true });
      expect(r.kind === "answer" && r.text.length > 0).toBe(true);
      expect(r.kind === "answer" && r.text.includes("[K]")).toBe(false); // street'te *** olarak render edilmiş
    }
  });

  it("quota used up and sulk shown: typed local pool, no request", async () => {
    const calls: Call[] = [];
    const api = new DunnoApi({ fetchImpl: recordingFetch(calls) });
    const engine = new LineEngine({ lines: mergeLines(poolTr, poolEn), rng: () => 0 });
    const quota = new HonestQuota();
    quota.exhaust();
    expect(await reply(`${MARKER} soru`, "where", ctx(engine, quota, api))).toMatchObject({ kind: "sulk" });
    expect(await reply(`${MARKER} soru`, "where", ctx(engine, quota, api, true))).toMatchObject({ kind: "answer", source: "pool", brainOff: false });
    expect(calls).toEqual([]);
  });

  it("the worker never logged the question", () => {
    expect(workerLog).not.toContain(MARKER);
  });
});

describe("worker down", () => {
  beforeAll(async () => {
    killWorker();
    expect(await waitFor(async () => !(await up()), 15_000)).toBe(true);
  });

  it("an honest question falls back to a typed local pool answer, nothing charged, brain off", async () => {
    const calls: Call[] = [];
    const api = new DunnoApi({ fetchImpl: recordingFetch(calls) });
    const engine = new LineEngine({ lines: mergeLines(poolTr, poolEn), rng: () => 0 });
    const quota = new HonestQuota();
    const r = await reply("offline soru", "where", ctx(engine, quota, api));
    expect(calls).toEqual([{ method: "POST", path: "/v1/ask", status: "error" }]);
    expect(r).toMatchObject({ kind: "answer", source: "pool", honest: false, brainOff: true });
    expect(quota.remaining()).toBe(3);
    const localAnswers = new Set(
      mergeLines(poolTr).filter((l: Line) => l.trigger.startsWith("answer:") || l.trigger === "random").map((l) => l.id),
    );
    expect(localAnswers.size).toBeGreaterThan(0);
  });

  it("/v1/lines offline: cached set when there is one, local pool lines either way", async () => {
    const cached = new DunnoApi({ cache: offlineCache });
    const fromCache = await cached.fetchLines("tr");
    expect(fromCache.length).toBeGreaterThanOrEqual(20);

    const fresh = new DunnoApi();
    expect(await fresh.fetchLines("tr")).toEqual([]);
    const engine = new LineEngine({ lines: mergeLines(poolTr, poolEn), rng: () => 0 });
    expect(engine.say(["app:excel"], "tr", "polite")).toBeTruthy();
    expect(engine.say([], "en", "street")).toBeTruthy();
  });
});
