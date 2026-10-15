// Sunucu testleri: gerçek content/pool'a yazılmaz; dosyalar geçici dizine kopyalanır.
import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { askWorker, createPoolApi, formatPool, readPool, type Entry, type PoolApiOptions } from "./server";

const REAL = resolve(__dirname, "..", "content", "pool");
const FILES = ["pool_tr.json", "pool_en.json", "banned_tr.txt", "banned_en.txt", "COVERAGE.md"];

let dir: string;
let assets: string;
let server: Server;
let base: string;
let opts: PoolApiOptions;
const fetchSpy = vi.fn<typeof fetch>();

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "dunno-studio-"));
  assets = join(dir, "assets");
  for (const f of FILES) await copyFile(join(REAL, f), join(dir, f));
  opts = { contentDir: dir, assetsDir: assets, workerBase: "http://worker.test", fetchImpl: fetchSpy };
  const handler = createPoolApi(opts);
  server = createServer((req, res) =>
    void handler(req, res, () => {
      res.statusCode = 404;
      res.end("next");
    }),
  );
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  await new Promise((r) => server.close(r));
  await rm(dir, { recursive: true, force: true });
  fetchSpy.mockReset();
});

afterAll(() => vi.restoreAllMocks());

const json = (method: string, body?: unknown, headers: Record<string, string> = {}) => ({
  method,
  headers: { "content-type": "application/json", ...headers },
  body: body === undefined ? undefined : JSON.stringify(body),
});

describe("formatPool", () => {
  it("reproduces the committed pool files byte for byte", async () => {
    for (const lang of ["tr", "en"]) {
      const text = await readFile(join(REAL, `pool_${lang}.json`), "utf8");
      expect(formatPool(JSON.parse(text) as Entry[])).toBe(text);
    }
  });

  it("keeps key order, one object per line, blank line between triggers", () => {
    const out = formatPool([
      { tr: "a", trigger: "random", id: "x_1", intent: "i" },
      { id: "x_2", trigger: "random", intent: "i", tr: "b" },
      { id: "y_1", trigger: "app:excel", intent: "i", tr: "c" },
    ]);
    expect(out).toBe(
      '[\n  { "id": "x_1", "trigger": "random", "intent": "i", "tr": "a" },\n' +
        '  { "id": "x_2", "trigger": "random", "intent": "i", "tr": "b" },\n\n' +
        '  { "id": "y_1", "trigger": "app:excel", "intent": "i", "tr": "c" }\n]\n',
    );
    expect(formatPool([])).toBe("[]\n");
  });
});

describe("/api/pool", () => {
  it("GET returns both languages and coverage", async () => {
    const res = await fetch(`${base}/api/pool`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { tr: Entry[]; en: Entry[]; coverage: { trigger: string }[] };
    expect(body.tr.length).toBeGreaterThanOrEqual(388);
    expect(body.en.length).toBeGreaterThanOrEqual(388);
    expect(body.coverage.some((r) => r.trigger === "app:excel")).toBe(true);
  });

  it("PUT with a valid change writes the file in pool format, refreshes COVERAGE.md and copies to assets", async () => {
    const pool = await readPool(dir);
    const next = [...pool.tr, { id: "tr_random_99", trigger: "random", intent: "test line", tr: "deneme lafı" }];
    const res = await fetch(`${base}/api/pool/tr`, json("PUT", next));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { ok: boolean }).ok).toBe(true);

    const written = await readFile(join(dir, "pool_tr.json"), "utf8");
    expect(written).toBe(formatPool(next));
    expect(written).toContain('{ "id": "tr_random_99", "trigger": "random", "intent": "test line", "tr": "deneme lafı" }');
    expect(await readFile(join(assets, "pool_tr.json"), "utf8")).toBe(written);
    expect(await readFile(join(dir, "COVERAGE.md"), "utf8")).toContain("| `random` | 40 | 41 | 40 |");
  });

  it("PUT with rule errors writes nothing and returns the issues per row", async () => {
    const before = await readFile(join(dir, "pool_en.json"), "utf8");
    const pool = await readPool(dir);
    const bad = [...pool.en];
    bad[3] = { ...bad[3], en: "SHOUTING!" };
    const res = await fetch(`${base}/api/pool/en`, json("PUT", bad));
    expect(res.status).toBe(422);
    const body = (await res.json()) as { ok: boolean; issues: { index: number; message: string; severity: string }[] };
    expect(body.ok).toBe(false);
    const row3 = body.issues.filter((i) => i.index === 3).map((i) => i.message);
    expect(row3).toContain("text must be lowercase");
    expect(row3).toContain("no exclamation marks");
    expect(await readFile(join(dir, "pool_en.json"), "utf8")).toBe(before);
  });

  it("PUT rejects non-arrays and unknown languages", async () => {
    expect((await fetch(`${base}/api/pool/en`, json("PUT", { not: "array" }))).status).toBe(400);
    expect((await fetch(`${base}/api/pool/de`, json("PUT", []))).status).toBe(404);
  });
});

describe("/api/check", () => {
  it("returns issues without writing", async () => {
    const before = await readFile(join(dir, "pool_tr.json"), "utf8");
    const res = await fetch(`${base}/api/check`, json("POST", { lang: "tr", entries: [{ id: "A", trigger: "nope" }] }));
    const { issues } = (await res.json()) as { issues: { message: string }[] };
    expect(issues.map((i) => i.message)).toContain('unknown trigger "nope"');
    expect(await readFile(join(dir, "pool_tr.json"), "utf8")).toBe(before);
  });
});

describe("/api/ask", () => {
  it("proxies to the worker without the user's identity and maps the source", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ answer: "balık [K]", source: "pool" })));
    const res = await fetch(`${base}/api/ask`, json("POST", { question: "neden", mode: "street", lang: "tr" }));
    expect(await res.json()).toEqual({ answer: "balık [K]", source: "pool" });
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://worker.test/v1/ask");
    expect(JSON.parse(String(init.body))).toEqual({
      question: "neden",
      mode: "street",
      lang: "tr",
      deviceId: "studio-local-0001",
    });
  });

  it("reports offline, limit and errors explicitly", async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError("refused"));
    expect(await askWorker(opts, { question: "q", mode: "polite", lang: "en" })).toEqual({ answer: null, source: "offline" });
    fetchSpy.mockResolvedValueOnce(new Response("{}", { status: 429 }));
    expect(await askWorker(opts, { question: "q", mode: "polite", lang: "en" })).toEqual({ answer: null, source: "limit" });
    fetchSpy.mockResolvedValueOnce(new Response("{}", { status: 500 }));
    expect(await askWorker(opts, { question: "q", mode: "polite", lang: "en" })).toEqual({ answer: null, source: "error" });
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ answer: "fish", source: "llm" })));
    expect(await askWorker(opts, { question: "q", mode: "polite", lang: "en" })).toEqual({ answer: "fish", source: "llm" });
  });

  it("validates the request", async () => {
    expect((await fetch(`${base}/api/ask`, json("POST", { question: "", lang: "tr" }))).status).toBe(400);
    expect((await fetch(`${base}/api/ask`, json("POST", { question: "q", lang: "de" }))).status).toBe(400);
  });
});

describe("safety", () => {
  it("refuses cross-origin writes and non-json bodies", async () => {
    const pool = await readPool(dir);
    const evil = await fetch(`${base}/api/pool/tr`, json("PUT", pool.tr, { origin: "https://evil.example" }));
    expect(evil.status).toBe(403);
    const same = await fetch(`${base}/api/check`, json("POST", { lang: "tr", entries: [] }, { origin: base }));
    expect(same.status).toBe(200);
    const text = await fetch(`${base}/api/check`, { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" });
    expect(text.status).toBe(415);
  });

  it("passes non-api paths to vite and hides internal errors", async () => {
    expect(await (await fetch(`${base}/index.html`)).text()).toBe("next");
    const broken = await fetch(`${base}/api/check`, { method: "POST", headers: { "content-type": "application/json" }, body: "{oops" });
    expect(broken.status).toBe(500);
    expect(await broken.json()).toEqual({ error: "studio server error" });
  });
});
