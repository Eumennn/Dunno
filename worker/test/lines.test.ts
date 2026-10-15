import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import poolCheckSrc from "../../desktop/src/lines/pool-check.ts?raw";
import worker from "../src/index";
import type { Env } from "../src/lib/env";
import {
  EXPLICIT_SWEARS,
  fakeGeneration,
  GEN_MAX_TOKENS,
  generateAll,
  generateLines,
  hasForbiddenWord,
  latestKey,
  LINE_TRIGGERS,
  LINES_TTL_SECONDS,
  linesKey,
  MIN_VALID_LINES,
  parseGenerated,
  validateLine,
  validateLines,
  writeLineSet,
} from "../src/lib/lines";
import { OPENROUTER_URL } from "../src/lib/llm";
import { readSpend, spendKey } from "../src/lib/spend";
import { memoryKV } from "./helpers";

const DAY1 = Date.UTC(2026, 9, 2, 6, 0, 0);
const DAY2 = Date.UTC(2026, 9, 3, 6, 0, 0);

const ok = (over: Record<string, unknown> = {}, lang: "tr" | "en" = "en") => ({
  trigger: "app:excel",
  intent: "mocks the spreadsheet",
  [lang]: "is this a spreadsheet or a cry for help",
  ...over,
});

const v = (raw: unknown, lang: "tr" | "en" = "en") => validateLine(raw, lang, "x", new Set());

/** n tane birbirinden farklı geçerli laf */
function validBatch(n: number, lang: "tr" | "en") {
  return Array.from({ length: n }, (_, i) => ({
    trigger: LINE_TRIGGERS[i % LINE_TRIGGERS.length],
    intent: "test line",
    [lang]: lang === "tr" ? `test lafı ${i + 1}` : `test line ${i + 1}`,
  }));
}

function llmJson(content: unknown, tokens = 1000) {
  const text = typeof content === "string" ? content : JSON.stringify(content);
  return new Response(JSON.stringify({ choices: [{ message: { content: text } }], usage: { total_tokens: tokens } }));
}

describe("validateLine", () => {
  it("accepts a valid line, trims, and keeps a single {K:...} tail", () => {
    expect(v(ok())).toEqual({
      id: "x",
      trigger: "app:excel",
      intent: "mocks the spreadsheet",
      en: "is this a spreadsheet or a cry for help",
    });
    expect(v(ok({ tr: "  normalde böyle dosya mı yapılır ya{K:, ne bu ***}  " }), "tr")).toMatchObject({
      tr: "normalde böyle dosya mı yapılır ya{K:, ne bu ***}",
    });
  });

  it("rejects triggers outside the allowed set, including meeting apps", () => {
    for (const trigger of ["app:zoom", "app:teams", "app:outlook", "time:dawn", "", 3, undefined]) {
      expect(v(ok({ trigger }))).toBeNull();
    }
  });

  it("enforces length: visible <= 60, full <= 90", () => {
    expect(v(ok({ en: "a".repeat(60) }))).not.toBeNull();
    expect(v(ok({ en: "a".repeat(61) }))).toBeNull();
    const tail = `{K:${"b".repeat(26)}}`; // 30 karakter
    expect(v(ok({ en: `${"a".repeat(60)}${tail}` }))).not.toBeNull(); // 90
    expect(v(ok({ en: `${"a".repeat(60)}{K:${"b".repeat(27)}}` }))).toBeNull(); // 91
  });

  it("rejects uppercase, bangs, emoji, newlines, empty text", () => {
    expect(v(ok({ en: "Fish" }))).toBeNull();
    expect(v(ok({ en: "fish!" }))).toBeNull();
    expect(v(ok({ en: "fish 🐟" }))).toBeNull();
    expect(v(ok({ en: "fish\nmore fish" }))).toBeNull();
    expect(v(ok({ en: "   " }))).toBeNull();
    expect(v(ok({ en: "{K:only street}" }))).toBeNull();
    expect(v(ok({ en: undefined }))).toBeNull();
    // dil tutarsızsa (en istendi, tr geldi) atılır
    expect(v(ok({ en: undefined, tr: "balık" }))).toBeNull();
  });

  it("lowercase check is locale aware", () => {
    expect(v(ok({ tr: "ılık bir gün" }), "tr")).not.toBeNull();
    expect(v(ok({ tr: "Ilık bir gün" }), "tr")).toBeNull();
  });

  it("rejects broken or repeated {K:...}, [K], and *** outside {K:}", () => {
    for (const en of [
      "fish{K:, ***",
      "fish{K:, ***}}",
      "fish{K:}",
      "fish{X:, ***}",
      "fish{K:a} and {K:b}",
      "fish {k:, ***}",
      "fish{K:{K:a}}",
      "who the [K] asks",
      "who the [k] asks",
      "who the *** asks",
    ]) {
      expect(v(ok({ en }))).toBeNull();
    }
  });

  it("swearing: only *** or aq, only inside {K:...} (SPEC 06)", () => {
    expect(v(ok({ tr: "o kim{K: aq}" }), "tr")).not.toBeNull();
    expect(v(ok({ tr: "o kim{K:, *** kim}" }), "tr")).not.toBeNull();
    for (const tr of ["o kim aq", "o kim{K: amk}", "siktirgit bakalım", "o kim{K:, orospu}"]) expect(v(ok({ tr }), "tr"), tr).toBeNull();
    expect(v(ok({ en: "who{K: the fucking} asks" }))).toBeNull();
    // kelime sınırı
    expect(v(ok({ tr: "götür bunu, sıkıldım" }), "tr")).not.toBeNull();
    expect(v(ok({ en: "aqua is a colour" }))).not.toBeNull();
  });

  it("explicit swear list matches the desktop pool checker", () => {
    const list = (poolCheckSrc.match(/EXPLICIT_SWEARS: readonly string\[\] = \[([\s\S]*?)\];/)?.[1] ?? "").match(/"[^"]+"/g)!;
    expect(list.map((s) => JSON.parse(s) as string)).toEqual([...EXPLICIT_SWEARS]);
  });

  it("rejects forbidden topics in both languages, in text or intent", () => {
    expect(v(ok({ en: "pray to the spreadsheet" }))).toBeNull();
    expect(v(ok({ en: "time to vote for lunch" }))).toBeNull();
    expect(v(ok({ en: "fish{K:, go see a doctor ***}" }))).toBeNull();
    expect(v(ok({ tr: "bugün namaz vakti mi" }), "tr")).toBeNull();
    expect(v(ok({ tr: "ölüm gibi bir excel" }), "tr")).toBeNull();
    expect(v(ok({ tr: "seçim senin" }), "tr")).toBeNull();
    expect(v(ok({ intent: "jokes about politics" }))).toBeNull();
  });

  it("does not flag harmless words that only share letters", () => {
    expect(hasForbiddenWord("electric fish", "en")).toBe(false);
    expect(hasForbiddenWord("seksen tane sekme açık", "tr")).toBe(false);
    expect(hasForbiddenWord("ölçü birimi balık", "tr")).toBe(false);
    expect(hasForbiddenWord("diet coke", "en")).toBe(false);
    expect(hasForbiddenWord("i will die on this hill", "en")).toBe(true);
    expect(hasForbiddenWord("self-harm", "en")).toBe(true);
  });

  it("drops duplicates by visible text", () => {
    const seen = new Set<string>();
    expect(validateLine(ok(), "en", "a", seen)).not.toBeNull();
    expect(validateLine(ok({ en: "is this a spreadsheet,  or a cry for help" }), "en", "b", seen)).toBeNull();
    expect(validateLine(ok({ en: "is this a spreadsheet or a cry for help{K:, ***}" }), "en", "c", seen)).toBeNull();
  });

  it("requires a short intent", () => {
    expect(v(ok({ intent: "" }))).toBeNull();
    expect(v(ok({ intent: 5 }))).toBeNull();
    expect(v(ok({ intent: "x".repeat(161) }))).toBeNull();
  });
});

describe("parse + validateLines", () => {
  it("parses {lines}, bare arrays, fenced json and junk", () => {
    expect(parseGenerated('{"lines":[1,2]}')).toEqual([1, 2]);
    expect(parseGenerated("[1]")).toEqual([1]);
    expect(parseGenerated('```json\n{"lines":[{"a":1}]}\n```')).toEqual([{ a: 1 }]);
    expect(parseGenerated('here you go: {"lines":[3]} enjoy')).toEqual([3]);
    expect(parseGenerated("no json here")).toEqual([]);
    expect(parseGenerated('{"nope":1}')).toEqual([]);
  });

  it("assigns sequential ids per lang and day, skipping invalid ones", () => {
    const lines = validateLines([ok({ en: "a" }), { trigger: "app:zoom" }, ok({ en: "b" })], "en", "2026-10-02");
    expect(lines.map((l) => l.id)).toEqual(["gen_en_20261002_001", "gen_en_20261002_002"]);
  });

  it("the fake generation passes validation", () => {
    for (const lang of ["tr", "en"] as const) {
      const lines = validateLines(parseGenerated(fakeGeneration(lang)), lang, "2026-10-02");
      expect(lines.length).toBeGreaterThanOrEqual(MIN_VALID_LINES);
      expect(lines.some((l) => l[lang]?.includes("{K:"))).toBe(true);
    }
  });
});

describe("generateLines", () => {
  let env: Env;
  beforeEach(() => {
    env = { DUNNO_KV: memoryKV(), OPENROUTER_API_KEY: "test-key", DAILY_SPEND_CAP_REQUESTS: "100" };
  });

  it("writes a valid set with ttl and a latest pointer, counts spend", async () => {
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) =>
      llmJson({ lines: [...validBatch(25, "tr"), { trigger: "app:zoom", intent: "x", tr: "toplantı" }] }, 3500),
    );
    const res = await generateLines({ env, lang: "tr", now: DAY1, fetchImpl: fetchSpy as unknown as typeof fetch });
    expect(res).toEqual({ status: "written", count: 25 });

    const kv = env.DUNNO_KV as ReturnType<typeof memoryKV>;
    const set = JSON.parse(kv.store.get(linesKey("tr", "2026-10-02"))!);
    expect(set.date).toBe("2026-10-02");
    expect(set.lines).toHaveLength(25);
    expect(set.lines[0]).toEqual({ id: "gen_tr_20261002_001", trigger: "app:excel", intent: "test line", tr: "test lafı 1" });
    expect(kv.ttls.get(linesKey("tr", "2026-10-02"))).toBe(LINES_TTL_SECONDS);
    expect(kv.store.get(latestKey("tr"))).toBe("2026-10-02");
    expect(await readSpend(kv, "2026-10-02")).toEqual({ requests: 1, tokens: 3500 });

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(OPENROUTER_URL);
    const sent = JSON.parse(String(init?.body));
    expect(sent.max_tokens).toBe(GEN_MAX_TOKENS);
    expect(sent.reasoning).toEqual({ enabled: false });
    expect(sent.messages[1].content).toContain("lang: tr");
  });

  it("keeps the previous set when fewer than 20 lines survive", async () => {
    const kv = env.DUNNO_KV as ReturnType<typeof memoryKV>;
    await writeLineSet(kv, "en", { date: "2026-10-01", lines: [] });
    const bad = [...validBatch(MIN_VALID_LINES - 1, "en"), ...validBatch(10, "en").map((l) => ({ ...l, en: l.en + "!" }))];
    const fetchSpy = vi.fn(async () => llmJson({ lines: bad }));
    const res = await generateLines({ env, lang: "en", now: DAY1, fetchImpl: fetchSpy as unknown as typeof fetch });
    expect(res).toEqual({ status: "too_few", count: MIN_VALID_LINES - 1 });
    expect(kv.store.has(linesKey("en", "2026-10-02"))).toBe(false);
    expect(kv.store.get(latestKey("en"))).toBe("2026-10-01");
  });

  it("writes with exactly 20 valid lines", async () => {
    const fetchSpy = vi.fn(async () => llmJson({ lines: validBatch(MIN_VALID_LINES, "en") }));
    const res = await generateLines({ env, lang: "en", now: DAY1, fetchImpl: fetchSpy as unknown as typeof fetch });
    expect(res.status).toBe("written");
  });

  it("fails without writing on an llm error, but still counts the attempt", async () => {
    const fetchSpy = vi.fn(async () => new Response("nope", { status: 503 }));
    const res = await generateLines({ env, lang: "en", now: DAY1, fetchImpl: fetchSpy as unknown as typeof fetch });
    expect(res.status).toBe("failed");
    const kv = env.DUNNO_KV as ReturnType<typeof memoryKV>;
    expect(kv.store.has(latestKey("en"))).toBe(false);
    expect(await readSpend(kv, "2026-10-02")).toEqual({ requests: 1, tokens: 0 });
  });

  it("skips without an api key and without calling fetch", async () => {
    const fetchSpy = vi.fn();
    const res = await generateLines({
      env: { ...env, OPENROUTER_API_KEY: undefined },
      lang: "en",
      now: DAY1,
      fetchImpl: fetchSpy as unknown as typeof fetch,
    });
    expect(res.status).toBe("skipped_no_key");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("skips when the spend cap is reached", async () => {
    const kv = env.DUNNO_KV as ReturnType<typeof memoryKV>;
    await kv.put(spendKey("2026-10-02"), JSON.stringify({ requests: 100, tokens: 0 }));
    const fetchSpy = vi.fn();
    const res = await generateLines({ env, lang: "tr", now: DAY1, fetchImpl: fetchSpy as unknown as typeof fetch });
    expect(res.status).toBe("skipped_cap");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(kv.store.has(latestKey("tr"))).toBe(false);
  });

  it("uses the fixed fake output with DUNNO_FAKE_LLM=1, no key, no fetch, no spend", async () => {
    const fetchSpy = vi.fn();
    const fake = { DUNNO_KV: memoryKV(), DUNNO_FAKE_LLM: "1" } as Env;
    const res = await generateLines({ env: fake, lang: "tr", now: DAY1, fetchImpl: fetchSpy as unknown as typeof fetch });
    expect(res.status).toBe("written");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(await readSpend(fake.DUNNO_KV, "2026-10-02")).toEqual({ requests: 0, tokens: 0 });
  });

  it("generateAll runs tr and en independently", async () => {
    const fetchSpy = vi.fn(async (_url: string, init?: RequestInit) => {
      const lang = String(init?.body).includes("lang: tr") ? "tr" : "en";
      if (lang === "tr") throw new Error("boom");
      return llmJson({ lines: validBatch(30, "en") });
    });
    const res = await generateAll(env, DAY2, fetchSpy as unknown as typeof fetch);
    expect(res).toEqual({ tr: { status: "failed", count: 0 }, en: { status: "written", count: 30 } });
  });
});

describe("GET /v1/lines + scheduled", () => {
  let env: Env;
  let background: Promise<unknown>[];
  const ctx = { waitUntil: (p: Promise<unknown>) => void background.push(p) };
  const get = (query: string, headers: Record<string, string> = {}) =>
    worker.fetch(new Request(`http://localhost/v1/lines${query}`, { headers }), env, ctx);

  beforeEach(() => {
    env = { DUNNO_KV: memoryKV() };
    background = [];
  });
  afterEach(() => vi.useRealTimers());

  it("400 on a missing or unknown lang", async () => {
    for (const q of ["", "?lang=de", "?lang=TR"]) {
      const res = await get(q);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "invalid lang" });
    }
  });

  it("returns an empty set before any generation", async () => {
    const res = await get("?lang=tr");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ date: null, lines: [] });
  });

  it("serves the latest set with an etag, 304 on a match, 200 after a new set", async () => {
    await writeLineSet(env.DUNNO_KV, "tr", { date: "2026-10-01", lines: validateLines(validBatch(20, "tr"), "tr", "2026-10-01") });
    const first = await get("?lang=tr");
    expect(first.status).toBe(200);
    expect(first.headers.get("cache-control")).toBe("public, max-age=300");
    expect(first.headers.get("content-type")).toContain("application/json");
    const etag = first.headers.get("etag")!;
    expect(etag).toMatch(/^"[0-9a-f]{32}"$/);
    const body = (await first.json()) as { date: string; lines: unknown[] };
    expect(body.date).toBe("2026-10-01");
    expect(body.lines).toHaveLength(20);

    const again = await get("?lang=tr", { "if-none-match": etag });
    expect(again.status).toBe(304);
    expect(again.headers.get("etag")).toBe(etag);
    expect(await again.text()).toBe("");
    expect((await get("?lang=tr", { "if-none-match": `W/${etag}, "other"` })).status).toBe(304);
    expect((await get("?lang=tr", { "if-none-match": '"stale"' })).status).toBe(200);
    // diğer dil etkilenmez
    expect(await (await get("?lang=en")).json()).toEqual({ date: null, lines: [] });

    await writeLineSet(env.DUNNO_KV, "tr", { date: "2026-10-02", lines: validateLines(validBatch(21, "tr"), "tr", "2026-10-02") });
    const fresh = await get("?lang=tr", { "if-none-match": etag });
    expect(fresh.status).toBe(200);
    expect(fresh.headers.get("etag")).not.toBe(etag);
  });

  it("scheduled handler writes both languages in fake mode", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(DAY1);
    env = { DUNNO_KV: memoryKV(), DUNNO_FAKE_LLM: "1" };
    await worker.scheduled({}, env, ctx);
    await Promise.all(background);
    for (const lang of ["tr", "en"]) {
      const body = (await (await get(`?lang=${lang}`)).json()) as { date: string; lines: unknown[] };
      expect(body.date).toBe("2026-10-02");
      expect(body.lines.length).toBeGreaterThanOrEqual(MIN_VALID_LINES);
    }
  });

  it("scheduled handler skips quietly without a key", async () => {
    await worker.scheduled({}, env, ctx);
    await Promise.all(background);
    expect((env.DUNNO_KV as ReturnType<typeof memoryKV>).store.size).toBe(0);
  });
});
