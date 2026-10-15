// SPEC 06 Q3: kind honest akışı. Hak (charged) sadece başarılı, kaçamak olmayan LLM cevabında düşer.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import poolEn from "../../content/pool/pool_en.json";
import poolTr from "../../content/pool/pool_tr.json";
import worker from "../src/index";
import type { Env } from "../src/lib/env";
import { LLM_HONEST_MAX_TOKENS, LLM_TIMEOUT_MS } from "../src/lib/llm";
import { POOLS, renderPoolLine, typedPoolAnswer } from "../src/lib/pool";
import { buildMessages, DODGE_ANSWER, isDodge, SYSTEM_PROMPT } from "../src/lib/prompt";
import { HONEST_ATTEMPTS_PER_DAY } from "../src/lib/ratelimit";
import { validateAsk } from "../src/lib/validate";
import { memoryKV } from "./helpers";

let background: Promise<unknown>[] = [];
const ctx = { waitUntil: (p: Promise<unknown>) => void background.push(p) };
const DEVICE = "honest-device-01";

type Body = { answer: string; source: string; honest: boolean; charged: boolean; qtype: string };

function ask(body: Record<string, unknown>, e: Env, ip = "1.2.3.4") {
  const req = new Request("http://localhost/v1/ask", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": ip },
    body: JSON.stringify({ mode: "polite", lang: "tr", deviceId: DEVICE, kind: "honest", ...body }),
  });
  return worker.fetch(req, e, ctx);
}

const llmReply = (content: string) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }], usage: { total_tokens: 42 } }), {
    headers: { "content-type": "application/json" },
  });

/** answer:<trigger> lafları, sunucu biçiminde */
const rendered = (lang: "tr" | "en", trigger: string, mode: "polite" | "street") =>
  ((lang === "tr" ? poolTr : poolEn) as unknown as Record<string, string>[])
    .filter((l) => l.trigger === trigger)
    .map((l) => renderPoolLine(l[lang], mode));

let env: Env;
let kv: ReturnType<typeof memoryKV>;

beforeEach(() => {
  kv = memoryKV();
  env = { RL_SALT: "test-salt", DUNNO_KV: kv, OPENROUTER_API_KEY: "test-key" };
  background = [];
});

afterEach(async () => {
  await Promise.all(background.splice(0));
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("validate kind + qtype", () => {
  const base = { question: "hi", mode: "polite", lang: "en", deviceId: DEVICE };
  it("kind defaults to pool_hint, unknown kind is 400, bad qtype becomes other", () => {
    expect(validateAsk(base)).toMatchObject({ ok: true, value: { kind: "pool_hint", qtype: "other" } });
    expect(validateAsk({ ...base, kind: "honest", qtype: "where" })).toMatchObject({ ok: true, value: { kind: "honest", qtype: "where" } });
    expect(validateAsk({ ...base, kind: "HONEST" })).toEqual({ ok: false, error: "invalid kind" });
    expect(validateAsk({ ...base, kind: "honest", qtype: "nonsense" })).toMatchObject({ value: { qtype: "other" } });
    expect(validateAsk({ ...base, kind: "honest", qtype: 3 })).toMatchObject({ value: { qtype: "other" } });
  });
});

describe("honest prompt", () => {
  it("one fixed system prompt for both kinds; honest adds kind + qtype lines", () => {
    const [sysA, userA] = buildMessages("paris nerede", "street", "tr", "honest", "where");
    const [sysB, userB] = buildMessages("paris nerede", "street", "tr");
    expect(sysA).toEqual(sysB);
    expect(userA.content).toBe("lang: tr\nmode: street\nkind: honest\nqtype: where\nquestion: paris nerede");
    expect(userB.content).toBe("lang: tr\nmode: street\nquestion: paris nerede");
    for (const rule of ["kind honest", "120 characters", "correct answer first", "sarcastic tail", "never invent", "real person"]) {
      expect(SYSTEM_PROMPT).toContain(rule);
    }
  });

  it("detects the dodge token in either language", () => {
    expect(isDodge("*shrugs*")).toBe(true);
    expect(isDodge("*omuz silker* [K]")).toBe(true);
    expect(isDodge("paris. herkes bilir")).toBe(false);
  });
});

describe("typed pool", () => {
  it("renders {K:} for the server: polite drops it, street opens it and *** -> [K], aq stays", () => {
    expect(renderPoolLine("o kim{K: aq}", "polite")).toBe("o kim");
    expect(renderPoolLine("o kim{K: aq}", "street")).toBe("o kim aq");
    expect(renderPoolLine("fish. still fish{K:, *** fish}", "street")).toBe("fish. still fish, [K] fish");
  });

  it("answer:<qtype>, then answer:generic", () => {
    expect(rendered("tr", "answer:where", "polite")).toContain(typedPoolAnswer("tr", "polite", "where"));
    expect(rendered("en", "answer:generic", "street")).toContain(typedPoolAnswer("en", "street", "other"));
  });
});

describe("POST /v1/ask kind honest", () => {
  it("success: short correct answer, honest + charged, 120-char budget, one honest right used", async () => {
    const fetchSpy = vi.fn(async () => llmReply("Paris. bunu bilmeyen ben miyim sen mi!"));
    vi.stubGlobal("fetch", fetchSpy);
    const res = await ask({ question: "fransa'nın başkenti neresi", qtype: "where" }, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      answer: "paris. bunu bilmeyen ben miyim sen mi",
      source: "llm",
      honest: true,
      charged: true,
      qtype: "where",
    });
    const sent = JSON.parse(String((fetchSpy.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(sent.max_tokens).toBe(LLM_HONEST_MAX_TOKENS);
    expect(sent.messages[1].content).toBe("lang: tr\nmode: polite\nkind: honest\nqtype: where\nquestion: fransa'nın başkenti neresi");
    expect([...kv.store].filter(([k]) => k.startsWith("hn:")).map(([, v]) => v)).toEqual(["1"]);
  });

  it("caps the answer at about 120 characters", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => llmReply("evet ".repeat(60))));
    const body = (await (await ask({ question: "uzun mu" }, env)).json()) as Body;
    expect(Array.from(body.answer).length).toBeLessThanOrEqual(120);
    expect(body.charged).toBe(true);
  });

  it("forbidden topic in the question: dodge without the llm, not charged", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const body = (await (await ask({ question: "namaz kaçta", qtype: "when" }, env)).json()) as Body;
    expect(body).toEqual({ answer: DODGE_ANSWER.tr, source: "pool", honest: false, charged: false, qtype: "when" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("real person (model dodges a who question): 'o kim' style from answer:who, not charged", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => llmReply("*omuz silker*")));
    const body = (await (await ask({ question: "ünlü bir şarkıcı kimdir", qtype: "who", mode: "street" }, env)).json()) as Body;
    expect(body).toMatchObject({ source: "pool", honest: false, charged: false, qtype: "who" });
    expect(rendered("tr", "answer:who", "street")).toContain(body.answer);
    expect([...kv.store.keys()].some((k) => k.startsWith("hn:"))).toBe(false);
  });

  it("model dodge on another type, or a forbidden word in the answer: plain shrug, not charged", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => llmReply("*shrugs*")));
    expect(await (await ask({ question: "is it true", qtype: "yes_no", lang: "en" }, env)).json()).toMatchObject({
      answer: DODGE_ANSWER.en,
      charged: false,
    });
    vi.stubGlobal("fetch", vi.fn(async () => llmReply("go pray about it, honestly")));
    expect(await (await ask({ question: "what now", qtype: "advice", lang: "en" }, env)).json()).toMatchObject({
      answer: DODGE_ANSWER.en,
      honest: false,
      charged: false,
    });
  });

  it("no api key: typed pool, not charged, no fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const body = (await (await ask({ question: "paris nerede", qtype: "where" }, { ...env, OPENROUTER_API_KEY: undefined })).json()) as Body;
    expect(body).toMatchObject({ source: "pool", honest: false, charged: false, qtype: "where" });
    expect(rendered("tr", "answer:where", "polite")).toContain(body.answer);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("llm error, empty answer or timeout: typed pool, not charged", async () => {
    for (const impl of [async () => new Response("nope", { status: 500 }), async () => llmReply("!!! 🎉")]) {
      vi.stubGlobal("fetch", vi.fn(impl));
      expect(await (await ask({ question: "2+2", qtype: "math" }, env)).json()).toMatchObject({ source: "pool", charged: false });
    }
    vi.useFakeTimers();
    const hang = vi.fn(
      (_u: string, init: RequestInit) =>
        new Promise<Response>((_r, reject) => init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))),
    );
    vi.stubGlobal("fetch", hang);
    const pending = ask({ question: "2+2", qtype: "math" }, env);
    // önce gerçek async işler (crypto, kv) bitsin, sonra saati ilerlet
    await vi.waitFor(() => expect(hang).toHaveBeenCalled());
    await vi.advanceTimersByTimeAsync(LLM_TIMEOUT_MS);
    const body = (await (await pending).json()) as Body;
    expect(body).toMatchObject({ source: "pool", charged: false });
    expect(rendered("tr", "answer:math", "polite")).toContain(body.answer);
  });

  it("server honest limit: 429 after 3 charged answers; dodges and failures do not count", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => llmReply("*omuz silker*")));
    for (let i = 0; i < 3; i++) await ask({ question: "kim bu", qtype: "who" }, env);
    vi.stubGlobal("fetch", vi.fn(async () => llmReply("dört. matematik seni yormasın")));
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) statuses.push((await ask({ question: "2+2", qtype: "math" }, env)).status);
    expect(statuses).toEqual([200, 200, 200, 429]);
    expect(await (await ask({ question: "2+2" }, env)).json()).toEqual({ error: "that's enough honesty for today" });
    // pool_hint kotası ayrı
    const old = await worker.fetch(
      new Request("http://localhost/v1/ask", {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "1.2.3.4" },
        body: JSON.stringify({ question: "hi", mode: "polite", lang: "tr", deviceId: DEVICE }),
      }),
      env,
      ctx,
    );
    expect(old.status).toBe(200);
  });

  it("attempt ceiling: after many uncharged attempts, answers from the pool without calling the llm", async () => {
    const fetchSpy = vi.fn(async () => llmReply("*omuz silker*"));
    vi.stubGlobal("fetch", fetchSpy);
    for (let i = 0; i < HONEST_ATTEMPTS_PER_DAY; i++) await ask({ question: "kim bu", qtype: "who" }, env);
    expect(fetchSpy).toHaveBeenCalledTimes(HONEST_ATTEMPTS_PER_DAY);
    const res = await ask({ question: "kim bu", qtype: "who" }, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ source: "pool", charged: false });
    expect(fetchSpy).toHaveBeenCalledTimes(HONEST_ATTEMPTS_PER_DAY);
  });

  it("broken counter: pool, no llm", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const broken = { ...env, DUNNO_KV: { get: async () => Promise.reject(new Error("kv")), put: async () => undefined } };
    expect(await (await ask({ question: "paris nerede", qtype: "where" }, broken)).json()).toMatchObject({ source: "pool", charged: false });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("stores only hashed counters: no question, device id or ip in kv", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => llmReply("paris. bilinen bir gerçek")));
    await ask({ question: "zebra paris nerede", qtype: "where" }, env);
    const dump = JSON.stringify([...kv.store]);
    for (const secret of ["zebra", DEVICE, "1.2.3.4"]) expect(dump).not.toContain(secret);
  });

  it("old clients (no kind) keep the old pool and contract fields", async () => {
    const res = await worker.fetch(
      new Request("http://localhost/v1/ask", {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "5.5.5.5" },
        body: JSON.stringify({ question: "hi", mode: "polite", lang: "en", deviceId: DEVICE }),
      }),
      { ...env, OPENROUTER_API_KEY: undefined },
      ctx,
    );
    const body = (await res.json()) as Body;
    expect(body).toMatchObject({ source: "pool", honest: false, charged: false, qtype: "other" });
    expect(POOLS.en.polite).toContain(body.answer);
  });
});
