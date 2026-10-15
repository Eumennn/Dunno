import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../src/index";
import type { Env } from "../src/lib/env";
import { LLM_TIMEOUT_MS, OPENROUTER_URL } from "../src/lib/llm";
import { POOLS } from "../src/lib/pool";
import releases from "../src/data/releases.json";
import { memoryKV } from "./helpers";

// ctx.waitUntil ile arka plana atılan işler (harcama sayacı, alarm); settle() bekler
let background: Promise<unknown>[] = [];
const ctx = { waitUntil: (p: Promise<unknown>) => void background.push(p) };

function run(request: Request, env: Partial<Env> = {}) {
  return worker.fetch(request, env as Env, ctx);
}

async function settle() {
  await Promise.all(background.splice(0));
}

const DEVICE = "test-device-0001";

/** nesne gövdelerde eksik lang/deviceId varsayılanla dolar; string gövde olduğu gibi gider */
function askRequest(body: string | Record<string, unknown>, ip = "1.2.3.4") {
  return new Request("http://localhost/v1/ask", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": ip, "user-agent": "test" },
    body: typeof body === "string" ? body : JSON.stringify({ lang: "en", deviceId: DEVICE, ...body }),
  });
}

function llmReply(content: string) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    headers: { "content-type": "application/json" },
  });
}

let env: Env;

beforeEach(() => {
  env = { RL_SALT: "test-salt", DUNNO_KV: memoryKV() };
  background = [];
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /v1/ask", () => {
  it("400 on broken json", async () => {
    const res = await run(askRequest("{nope"), env);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid body" });
  });

  it("400 on invalid input without spending a question", async () => {
    const cases: [Record<string, unknown>, string][] = [
      [{ question: "hi", mode: "loud" }, "invalid mode"],
      [{ question: "hi", mode: "polite", lang: "de" }, "invalid lang"],
      [{ question: "hi", mode: "polite", deviceId: undefined }, "invalid device id"],
      [{ question: " ", mode: "polite" }, "empty question"],
    ];
    for (const [body, message] of cases) {
      const res = await run(askRequest(body), env);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: message });
    }
    expect((env.DUNNO_KV as ReturnType<typeof memoryKV>).store.size).toBe(0);
  });

  it("answers from the pool without an api key and never calls fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const res = await run(askRequest({ question: "capital of france", mode: "polite" }), env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { answer: string; source: string };
    expect(body.source).toBe("pool");
    expect(POOLS.en.polite).toContain(body.answer);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("picks the pool by lang and mode", async () => {
    for (const [lang, mode] of [["tr", "street"], ["tr", "polite"], ["en", "street"], ["en", "polite"]] as const) {
      const res = await run(askRequest({ question: "hi", mode, lang }, `10.0.0.${lang}${mode}`), env);
      const body = (await res.json()) as { answer: string; source: string };
      expect(body.source).toBe("pool");
      expect(POOLS[lang][mode]).toContain(body.answer);
    }
  });

  it("429 on the 4th question of the day", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      statuses.push((await run(askRequest({ question: "hi", mode: "street" }), env)).status);
    }
    expect(statuses).toEqual([200, 200, 200, 429]);
    const last = await run(askRequest({ question: "hi", mode: "street" }), env);
    expect(await last.json()).toEqual({ error: "office hours are over" });
    // başka cihaz ya da aynı cihaz başka ağdan etkilenmez
    expect((await run(askRequest({ question: "hi", mode: "street", deviceId: "other-device-01" }), env)).status).toBe(200);
    expect((await run(askRequest({ question: "hi", mode: "street" }, "9.9.9.9"), env)).status).toBe(200);
  });

  it("resets the quota on the next utc day", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.UTC(2026, 9, 2, 23, 59, 0));
    for (let i = 0; i < 3; i++) await run(askRequest({ question: "hi", mode: "polite" }), env);
    expect((await run(askRequest({ question: "hi", mode: "polite" }), env)).status).toBe(429);
    vi.setSystemTime(Date.UTC(2026, 9, 3, 0, 0, 1));
    expect((await run(askRequest({ question: "hi", mode: "polite" }), env)).status).toBe(200);
  });

  it("reads the quota from LLM_DAILY_PER_DEVICE", async () => {
    const one = { ...env, LLM_DAILY_PER_DEVICE: "1" };
    expect((await run(askRequest({ question: "hi", mode: "polite" }), one)).status).toBe(200);
    expect((await run(askRequest({ question: "hi", mode: "polite" }), one)).status).toBe(429);
  });

  it("keeps raw device id and ip out of kv", async () => {
    await run(askRequest({ question: "hi", mode: "polite" }), env);
    const kv = env.DUNNO_KV as ReturnType<typeof memoryKV>;
    const dump = JSON.stringify([...kv.store]);
    expect(dump).not.toContain(DEVICE);
    expect(dump).not.toContain("1.2.3.4");
    expect(dump).not.toContain("hi");
  });

  it("uses the llm answer after postprocess and keeps [K]", async () => {
    const fetchSpy = vi.fn(async () => llmReply("Paris? SALI GÜNÜ [K]! 🎉"));
    vi.stubGlobal("fetch", fetchSpy);
    const res = await run(askRequest({ question: "capital of france", mode: "street", lang: "tr" }), {
      ...env,
      OPENROUTER_API_KEY: "test-key",
      DUNNO_MODEL: "test/model",
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ answer: "paris? salı günü [K]", source: "llm", honest: false, charged: true, qtype: "other" });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(OPENROUTER_URL);
    const sent = JSON.parse(String(init.body));
    expect(sent.model).toBe("test/model");
    expect(sent.max_tokens).toBe(60);
    expect(sent.reasoning).toEqual({ enabled: false });
    expect(sent.messages[1].content).toBe("lang: tr\nmode: street\nquestion: capital of france");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    // kullanıcıyı tanımlayan bilgi gönderilmez
    expect(JSON.stringify(init)).not.toContain("1.2.3.4");
    expect(JSON.stringify(init)).not.toContain(DEVICE);
    expect(sent.user).toBeUndefined();
  });

  it("defaults to kimi k2.6 when DUNNO_MODEL is not set", async () => {
    const fetchSpy = vi.fn(async () => llmReply("fish"));
    vi.stubGlobal("fetch", fetchSpy);
    await run(askRequest({ question: "hi", mode: "polite" }), { ...env, OPENROUTER_API_KEY: "test-key" });
    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body)).model).toBe("moonshotai/kimi-k2.6");
  });

  it("falls back to the pool when the llm fails or returns nothing usable", async () => {
    const withKey = { ...env, OPENROUTER_API_KEY: "test-key" };

    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    expect(await (await run(askRequest({ question: "a", mode: "polite" }), withKey)).json()).toMatchObject({
      source: "pool",
    });

    vi.stubGlobal("fetch", vi.fn(async () => llmReply("🎉🎉!!")));
    expect(await (await run(askRequest({ question: "b", mode: "polite" }), withKey)).json()).toMatchObject({
      source: "pool",
    });

    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network"); }));
    expect(await (await run(askRequest({ question: "c", mode: "polite" }), withKey)).json()).toMatchObject({
      source: "pool",
    });
  });

  it("falls back to the pool when the llm times out", async () => {
    vi.useFakeTimers();
    const hang = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
    );
    vi.stubGlobal("fetch", hang);
    const pending = run(askRequest({ question: "slow", mode: "street" }), {
      ...env,
      OPENROUTER_API_KEY: "test-key",
    });
    // önce gerçek async işler (crypto, kv) bitip zamanlayıcı kurulsun, sonra saati ilerlet
    await vi.waitFor(() => expect(hang).toHaveBeenCalled());
    await vi.advanceTimersByTimeAsync(LLM_TIMEOUT_MS);
    const res = await pending;
    expect(res.status).toBe(200);
    const body = (await res.json()) as { answer: string; source: string };
    expect(body.source).toBe("pool");
    expect(POOLS.en.street).toContain(body.answer);
  });

  it("answers from the pool with 200 when the counter is broken, without calling the llm", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const broken: Env = {
      ...env,
      OPENROUTER_API_KEY: "test-key",
      DUNNO_KV: { get: async () => { throw new Error("kv down"); }, put: async () => {} },
    };
    const res = await run(askRequest({ question: "hi", mode: "polite" }), broken);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ source: "pool" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("never logs the question", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {}),
    );
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("boom"); }));
    await run(askRequest({ question: "zebra secret", mode: "polite" }), { ...env, OPENROUTER_API_KEY: "k" });
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});

describe("POST /v1/ask spend cap", () => {
  const HOOK = "https://hooks.example/dunno";
  const SECRET = "zebra secret question";

  /** openrouter'a cevap veren, webhook çağrılarını ayrı tutan sahte fetch */
  function fakeNet(llm: () => Response | Promise<Response> = () => llmReply("fish")) {
    const calls = { llm: 0, hook: [] as string[] };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === OPENROUTER_URL) {
          calls.llm++;
          return llm();
        }
        calls.hook.push(String(init?.body));
        return new Response("ok");
      }),
    );
    return calls;
  }

  // her soru ayrı cihazdan: cihaz kotası (3) tavan testine karışmasın
  let n = 0;
  const ask = async (e: Partial<Env>, question = SECRET) => {
    const res = await run(askRequest({ question, mode: "polite", deviceId: `spend-device-${n++}` }), e);
    await settle();
    return res;
  };

  const capped = () => ({ ...env, OPENROUTER_API_KEY: "test-key", DAILY_SPEND_CAP_REQUESTS: "5", ALERT_WEBHOOK: HOOK });
  const spend = async (e: Partial<Env>, day = "2026-10-02") =>
    JSON.parse((await e.DUNNO_KV!.get(`spend:${day}`)) ?? "null");

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.UTC(2026, 9, 2, 12, 0, 0));
  });

  it("alerts once at 80 percent without the question or any id, then serves the pool at 100", async () => {
    const calls = fakeNet();
    const e = capped();
    for (let i = 0; i < 3; i++) await ask(e);
    expect(calls.hook).toHaveLength(0);

    await ask(e); // 4/5
    expect(calls.hook).toHaveLength(1);
    expect(calls.hook[0]).not.toContain("zebra");
    expect(calls.hook[0]).not.toContain("spend-device");
    expect(calls.hook[0]).not.toContain("1.2.3.4");
    expect(JSON.parse(calls.hook[0])).toMatchObject({ event: "spend_80", date: "2026-10-02", requests: 4, cap: 5 });

    expect(await (await ask(e)).json()).toEqual({ answer: "fish", source: "llm", honest: false, charged: true, qtype: "other" }); // 5/5
    expect(calls.hook).toHaveLength(1);
    expect(calls.llm).toBe(5);

    const res = await ask(e); // tavan dolu
    expect(res.status).toBe(200);
    const body = (await res.json()) as { answer: string; source: string };
    expect(body.source).toBe("pool");
    expect(POOLS.en.polite).toContain(body.answer);
    expect(calls.llm).toBe(5);
    expect(calls.hook).toHaveLength(1);
    expect(await spend(e)).toEqual({ requests: 5, tokens: 0 });
  });

  it("resets the cap on the next utc day", async () => {
    const calls = fakeNet();
    const e = { ...capped(), DAILY_SPEND_CAP_REQUESTS: "1" };
    await ask(e);
    expect(await (await ask(e)).json()).toMatchObject({ source: "pool" });
    expect(calls.llm).toBe(1);
    vi.setSystemTime(Date.UTC(2026, 9, 3, 0, 0, 1));
    expect(await (await ask(e)).json()).toMatchObject({ source: "llm" });
    expect(calls.llm).toBe(2);
  });

  it("works without a webhook", async () => {
    const calls = fakeNet();
    const e = { ...capped(), ALERT_WEBHOOK: undefined };
    for (let i = 0; i < 5; i++) expect((await ask(e)).status).toBe(200);
    expect(calls.hook).toHaveLength(0);
    expect(await spend(e)).toEqual({ requests: 5, tokens: 0 });
  });

  it("does not count when there is no api key", async () => {
    const calls = fakeNet();
    const e = { ...capped(), OPENROUTER_API_KEY: undefined };
    for (let i = 0; i < 3; i++) expect(await (await ask(e)).json()).toMatchObject({ source: "pool" });
    expect(calls.llm).toBe(0);
    expect(await spend(e)).toBeNull();
  });

  it("counts failed llm attempts and sums usage tokens", async () => {
    let reply: () => Response = () => new Response("nope", { status: 502 });
    fakeNet(() => reply());
    const e = capped();
    expect(await (await ask(e)).json()).toMatchObject({ source: "pool" });
    reply = () =>
      new Response(JSON.stringify({ choices: [{ message: { content: "fish" } }], usage: { total_tokens: 42 } }));
    await ask(e);
    await ask(e);
    expect(await spend(e)).toEqual({ requests: 3, tokens: 84 });
  });

  it("serves the pool without calling the llm when the spend counter is broken", async () => {
    const calls = fakeNet();
    const kv = memoryKV();
    const flaky = { ...kv, get: async (k: string) => (k.startsWith("spend:") ? Promise.reject(new Error("kv")) : kv.get(k)) };
    const res = await ask({ ...capped(), DUNNO_KV: flaky });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ source: "pool" });
    expect(calls.llm).toBe(0);
  });
});

describe("router", () => {
  const ROUTES: [string, string][] = [
    ["/v1/ask", "POST"],
    ["/v1/event", "POST"],
    ["/v1/lines", "GET"],
    ["/v1/release", "GET"],
    ["/download", "GET"],
  ];

  it("404 on unknown paths, including the old /api prefix", async () => {
    for (const path of ["/api/ask", "/", "/v1", "/v1/ask/extra", "/__scheduled"]) {
      const res = await run(new Request(`http://localhost${path}`, { method: "POST", body: "{}" }), env);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "not found" });
    }
  });

  it("405 in lowercase with an allow header on every route", async () => {
    for (const [path, method] of ROUTES) {
      const wrong = method === "POST" ? "GET" : "DELETE";
      const res = await run(new Request(`http://localhost${path}`, { method: wrong }), env);
      expect(res.status).toBe(405);
      expect(await res.json()).toEqual({ error: "method not allowed" });
      expect(res.headers.get("allow")).toBe(`${method}, OPTIONS`);
    }
  });

  it("serves HEAD on GET routes", async () => {
    const res = await run(new Request("http://localhost/v1/release", { method: "HEAD" }), env);
    expect(res.status).toBe(200);
  });
});

describe("CORS", () => {
  const ALLOWED = ["tauri://localhost", "http://tauri.localhost", "http://localhost:1420", "https://example.com"];
  const preflightReq = (path: string, origin?: string) =>
    new Request(`http://localhost${path}`, {
      method: "OPTIONS",
      headers: origin ? { origin, "access-control-request-method": "POST" } : {},
    });

  it("answers preflight for allowed origins on every route", async () => {
    for (const origin of ALLOWED) {
      const res = await run(preflightReq("/v1/ask", origin), env);
      expect(res.status).toBe(204);
      expect(res.headers.get("access-control-allow-origin")).toBe(origin);
      expect(res.headers.get("access-control-allow-methods")).toBe("POST, OPTIONS");
      expect(res.headers.get("access-control-allow-headers")).toContain("content-type");
      expect(res.headers.get("vary")).toContain("origin");
    }
    const lines = await run(preflightReq("/v1/lines", "http://tauri.localhost"), env);
    expect(lines.headers.get("access-control-allow-methods")).toBe("GET, OPTIONS");
    expect(lines.headers.get("access-control-allow-headers")).toContain("if-none-match");
  });

  it("rejects preflight from other or missing origins", async () => {
    for (const origin of ["https://evil.example", "http://localhost:3000", "null", undefined]) {
      const res = await run(preflightReq("/v1/ask", origin), env);
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "origin not allowed" });
      expect(res.headers.get("access-control-allow-origin")).toBeNull();
    }
  });

  it("404 on preflight for unknown paths", async () => {
    expect((await run(preflightReq("/nope", "tauri://localhost"), env)).status).toBe(404);
  });

  it("adds allow-origin to real responses only for allowed origins and exposes etag", async () => {
    const ask = (origin: string) =>
      run(
        new Request("http://localhost/v1/ask", {
          method: "POST",
          headers: { "content-type": "application/json", origin },
          body: JSON.stringify({ question: "hi", mode: "polite", lang: "en", deviceId: `cors-${origin.length}-device` }),
        }),
        env,
      );
    const ok = await ask("http://tauri.localhost");
    expect(ok.status).toBe(200);
    expect(ok.headers.get("access-control-allow-origin")).toBe("http://tauri.localhost");
    expect(ok.headers.get("access-control-expose-headers")).toBe("etag");

    const other = await ask("https://evil.example");
    expect(other.headers.get("access-control-allow-origin")).toBeNull();
    expect(other.headers.get("vary")).toContain("origin");

    const err = await run(new Request("http://localhost/v1/lines?lang=xx", { headers: { origin: "tauri://localhost" } }), env);
    expect(err.status).toBe(400);
    expect(err.headers.get("access-control-allow-origin")).toBe("tauri://localhost");
  });
});

describe("GET /download", () => {
  const req = (ua?: string) =>
    new Request("http://localhost/download", { headers: ua ? { "user-agent": ua } : {} });

  it("302 to the mac url for mac", async () => {
    const res = await run(req("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(releases.urls.mac);
  });

  it("302 to the windows url otherwise", async () => {
    const res = await run(req("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(releases.urls.windows);
    expect((await run(req())).headers.get("location")).toBe(releases.urls.windows);
  });
});

describe("GET /v1/release", () => {
  it("returns releases.json with a short cache", async () => {
    const res = await run(new Request("http://localhost/v1/release"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("cache-control")).toBe("public, max-age=300");
    expect(await res.json()).toEqual(releases);
  });

  it("matches the contract: bare semver, tauri nsis file name", () => {
    expect(Object.keys(releases).sort()).toEqual(["notes", "size", "urls", "version"]);
    expect(releases.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(releases.urls.windows.endsWith(`/Dunno_${releases.version}_x64-setup.exe`)).toBe(true);
    expect(releases.urls.mac).toMatch(/^https:\/\//);
  });

  it("version equals desktop/src-tauri/tauri.conf.json (skipped if the desktop app is absent)", async (t) => {
    let conf: { version?: string };
    try {
      conf = (await import("../../desktop/src-tauri/tauri.conf.json")) as { version?: string };
    } catch {
      t.skip();
      return;
    }
    expect(conf.version).toBe(releases.version);
  });
});

describe("unexpected errors", () => {
  /** env alanı okununca patlayan sahte env (route içinde try/catch dışına düşen hata) */
  const exploding = (base: Partial<Env>, field: keyof Env) => {
    const e = { ...base } as Env;
    Object.defineProperty(e, field, {
      get() {
        throw new Error("secret internal detail zebra");
      },
    });
    return e;
  };

  it("/v1/ask answers 200 from the pool, no detail, nothing logged", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {}),
    );
    const res = await run(
      askRequest({ question: "zebra secret", mode: "polite" }),
      exploding({ RL_SALT: "s", DUNNO_KV: memoryKV() }, "OPENROUTER_API_KEY"),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { answer: string; source: string };
    expect(body.source).toBe("pool");
    expect(POOLS.en.polite).toContain(body.answer);
    expect(JSON.stringify(body)).not.toContain("zebra");
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });

  it("other routes answer 500 with a fixed message and keep CORS", async () => {
    const req = new Request("http://localhost/download", { headers: { origin: "http://tauri.localhost" } });
    Object.defineProperty(req, "headers", {
      get() {
        throw new Error("secret internal detail zebra");
      },
    });
    const res = await run(req, env);
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: "internal error" });
    expect(text).not.toContain("zebra");
  });

  it("scheduled swallows failures", async () => {
    const pending: Promise<unknown>[] = [];
    const broken = exploding({}, "DUNNO_KV");
    await worker.scheduled({}, { ...broken, OPENROUTER_API_KEY: "k" } as Env, {
      waitUntil: (p) => void pending.push(p),
    });
    await expect(Promise.all(pending)).resolves.toBeDefined();
  });
});

describe("production without RL_SALT", () => {
  it("skips the quota and the llm, answers from the pool, writes nothing", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const kv = memoryKV();
    const prod = { DUNNO_KV: kv, OPENROUTER_API_KEY: "k" } as Env;
    for (let i = 0; i < 5; i++) {
      const res = await run(askRequest({ question: "hi", mode: "polite" }), prod);
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ source: "pool" });
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(kv.store.size).toBe(0);
  });

  it("dev without RL_SALT still counts with the local salt", async () => {
    const dev = { DUNNO_KV: memoryKV(), ENVIRONMENT: "dev" } as Env;
    const codes: number[] = [];
    for (let i = 0; i < 4; i++) codes.push((await run(askRequest({ question: "hi", mode: "polite" }), dev)).status);
    expect(codes).toEqual([200, 200, 200, 429]);
  });
});
