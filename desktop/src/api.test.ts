import { afterEach, describe, expect, it, vi } from "vitest";
import { ASK_TIMEOUT_MS, DEFAULT_BASE_URL, DunnoApi, LOCAL_BASE_URL, resolveBaseUrl } from "./api";

const REQ = { question: "capital of france", mode: "street", lang: "tr", deviceId: "3f2b9c1e-7a4d-4e8f", kind: "honest", qtype: "where" } as const;

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { ...init, headers: { "content-type": "application/json", ...init.headers } });

type Call = [string, RequestInit];

function mockFetch(...responses: (Response | Error)[]) {
  const calls: Call[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push([String(input), init ?? {}]);
    const next = responses.length > 1 ? responses.shift()! : responses[0];
    if (next instanceof Error) throw next;
    return next.clone();
  });
  return { fetchImpl: fn as unknown as typeof fetch, calls };
}

const header = (init: RequestInit, name: string) => new Headers(init.headers).get(name);

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ask (SPEC 06 Q3)", () => {
  const ANSWER = { answer: "paris. bunu bilmeyen ben miyim sen mi [K]", source: "llm", honest: true, charged: true, qtype: "where" };

  it("posts kind + qtype and returns the honest answer with [K] intact", async () => {
    const { fetchImpl, calls } = mockFetch(json(ANSWER));
    const api = new DunnoApi({ fetchImpl });
    expect(await api.ask(REQ)).toEqual({
      kind: "answer",
      result: { answer: ANSWER.answer, source: "llm", honest: true, charged: true },
    });
    const [url, init] = calls[0];
    expect(url).toBe(`${DEFAULT_BASE_URL}/v1/ask`);
    expect(init.method).toBe("POST");
    expect(header(init, "content-type")).toBe("application/json");
    expect(JSON.parse(String(init.body))).toEqual(REQ);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("uses a configurable base url without a trailing slash", async () => {
    const { fetchImpl, calls } = mockFetch(json(ANSWER));
    await new DunnoApi({ baseUrl: "https://api.example.com/", fetchImpl }).ask(REQ);
    expect(calls[0][0]).toBe("https://api.example.com/v1/ask");
  });

  it("server pool fallback (no key / error) is not charged", async () => {
    const { fetchImpl } = mockFetch(json({ answer: "balık", source: "pool", honest: false, charged: false, qtype: "where" }));
    expect(await new DunnoApi({ fetchImpl }).ask(REQ)).toEqual({
      kind: "answer",
      result: { answer: "balık", source: "pool", honest: false, charged: false },
    });
  });

  it("charged/honest only when exactly true (old server without the fields charges nothing)", async () => {
    for (const body of [{ answer: "fish", source: "llm" }, { answer: "fish", source: "llm", honest: "yes", charged: 1 }]) {
      const { fetchImpl } = mockFetch(json(body));
      const out = await new DunnoApi({ fetchImpl }).ask(REQ);
      expect(out).toMatchObject({ kind: "answer", result: { honest: false, charged: false } });
    }
  });

  it("429 -> limit", async () => {
    const { fetchImpl } = mockFetch(json({ error: "office hours are over" }, { status: 429 }));
    expect(await new DunnoApi({ fetchImpl }).ask(REQ)).toEqual({ kind: "limit" });
  });

  it("4xx, 5xx, network errors and bad bodies -> error", async () => {
    const cases: (Response | Error)[] = [
      json({ error: "invalid lang" }, { status: 400 }),
      new Response("nope", { status: 502 }),
      new TypeError("Failed to fetch"),
      new Response("not json", { status: 200 }),
      json({ answer: "" }),
      json({ nope: 1 }),
    ];
    for (const c of cases) {
      const { fetchImpl } = mockFetch(c);
      expect(await new DunnoApi({ fetchImpl }).ask(REQ)).toEqual({ kind: "error" });
    }
  });

  it("gives up after 6 seconds (worker LLM timeout is 4)", async () => {
    vi.useFakeTimers();
    const hang = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
    );
    const api = new DunnoApi({ fetchImpl: hang as unknown as typeof fetch });
    const pending = api.ask(REQ);
    await vi.advanceTimersByTimeAsync(ASK_TIMEOUT_MS - 1);
    expect(hang.mock.calls[0][1]?.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toEqual({ kind: "error" });
    expect(ASK_TIMEOUT_MS).toBe(6000);
  });

  it("falls back to the global fetch without unbinding it", async () => {
    const spy = vi.fn(async () => json(ANSWER));
    vi.stubGlobal("fetch", spy);
    expect((await new DunnoApi().ask(REQ)).kind).toBe("answer");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("never logs the question", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {}),
    );
    const { fetchImpl } = mockFetch(new TypeError("offline"));
    await new DunnoApi({ fetchImpl }).ask({ ...REQ, question: "zebra secret" });
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});

describe("fetchLines", () => {
  const SET = {
    date: "2026-10-02",
    lines: [
      { id: "gen_tr_20261002_001", trigger: "app:excel", intent: "x", tr: "yine mi tablo{K:, ***}" },
      { id: "gen_tr_20261002_002", trigger: "random", intent: "y", tr: "balık" },
      { id: "broken" },
    ],
  };

  it("normalizes lines, stores the etag and revalidates with If-None-Match", async () => {
    const { fetchImpl, calls } = mockFetch(json(SET, { headers: { etag: '"abc"' } }), new Response(null, { status: 304 }));
    const api = new DunnoApi({ fetchImpl });

    const first = await api.fetchLines("tr");
    expect(calls[0][0]).toBe(`${DEFAULT_BASE_URL}/v1/lines?lang=tr`);
    expect(header(calls[0][1], "if-none-match")).toBeNull();
    expect(first.map((l) => l.id)).toEqual(["gen_tr_20261002_001", "gen_tr_20261002_002"]);

    const second = await api.fetchLines("tr");
    expect(header(calls[1][1], "if-none-match")).toBe('"abc"');
    expect(second).toEqual(first);
  });

  it("keeps etags per language", async () => {
    const { fetchImpl, calls } = mockFetch(json(SET, { headers: { etag: '"tr"' } }), json({ date: null, lines: [] }));
    const api = new DunnoApi({ fetchImpl });
    await api.fetchLines("tr");
    await api.fetchLines("en");
    expect(header(calls[1][1], "if-none-match")).toBeNull();
  });

  it("returns the cache (or []) on errors and offline", async () => {
    expect(await new DunnoApi({ fetchImpl: mockFetch(new TypeError("offline")).fetchImpl }).fetchLines("tr")).toEqual([]);

    const { fetchImpl } = mockFetch(json(SET, { headers: { etag: '"abc"' } }), new Response("x", { status: 500 }));
    const api = new DunnoApi({ fetchImpl });
    const ok = await api.fetchLines("tr");
    expect(await api.fetchLines("tr")).toEqual(ok);
  });

  it("an empty set from the server is a valid answer", async () => {
    const { fetchImpl } = mockFetch(json({ date: null, lines: [] }, { headers: { etag: '"e"' } }));
    expect(await new DunnoApi({ fetchImpl }).fetchLines("en")).toEqual([]);
  });

  it("snapshot restores across sessions and is a copy", async () => {
    const a = new DunnoApi({ fetchImpl: mockFetch(json(SET, { headers: { etag: '"abc"' } })).fetchImpl });
    await a.fetchLines("tr");
    const snap = a.snapshot();
    expect(snap.tr?.etag).toBe('"abc"');
    expect(snap.tr?.date).toBe("2026-10-02");

    const { fetchImpl, calls } = mockFetch(new Response(null, { status: 304 }));
    const b = new DunnoApi({ fetchImpl, cache: snap });
    snap.tr!.lines = [];
    const lines = await b.fetchLines("tr");
    expect(header(calls[0][1], "if-none-match")).toBe('"abc"');
    expect(lines).toHaveLength(2);
  });
});

describe("base url", () => {
  it("comes from VITE_API_BASE, falling back to the local worker", () => {
    expect(resolveBaseUrl(undefined)).toBe(LOCAL_BASE_URL);
    expect(resolveBaseUrl("")).toBe(LOCAL_BASE_URL);
    expect(resolveBaseUrl("  ")).toBe(LOCAL_BASE_URL);
    expect(resolveBaseUrl("http://127.0.0.1:8789/")).toBe("http://127.0.0.1:8789");
    expect(resolveBaseUrl("https://api.example.com")).toBe("https://api.example.com");
    expect(LOCAL_BASE_URL).toBe("http://127.0.0.1:8787");
  });

  it("the default follows the build env (unset in tests)", () => {
    expect(DEFAULT_BASE_URL).toBe(resolveBaseUrl(import.meta.env.VITE_API_BASE));
  });
});
