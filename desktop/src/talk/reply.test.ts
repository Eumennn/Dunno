import { describe, expect, it, vi } from "vitest";
import { DunnoApi } from "../api";
import { LineEngine } from "../lines/engine";
import { HonestQuota } from "./quota";
import { reply, type ReplyContext } from "./reply";

const lines = [
  { id: "g1", trigger: "answer:generic", tr: "bilmem{K:, ***}", en: "no idea" },
  { id: "w1", trigger: "answer:where", tr: "dolabın arkası", en: "behind the fridge" },
  { id: "lim", trigger: "interaction:limit_reached", tr: "yeter", en: "enough" },
];

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const HONEST = { answer: "paris. bunu bilmeyen ben miyim sen mi", source: "llm", honest: true, charged: true, qtype: "where" };

/** sunucu yanıtları sırayla (fetch mock); DunnoApi gerçek sözleşmeyi ayrıştırır */
function setup(responses: (() => Response | Promise<Response>)[] = [], opts: { day?: Date; engineLines?: unknown[] } = {}) {
  let now = opts.day ?? new Date(2026, 9, 3, 12, 0);
  let i = 0;
  const fetchImpl = vi.fn(async () => {
    const r = responses[Math.min(i++, responses.length - 1)];
    return r();
  });
  const api = new DunnoApi({ fetchImpl: fetchImpl as unknown as typeof fetch, baseUrl: "http://test" });
  const quota = new HonestQuota(() => now);
  const engine = new LineEngine({ lines: opts.engineLines ?? lines, rng: () => 0 });
  const ctx: ReplyContext = {
    quota,
    engine,
    ask: (req) => api.ask(req),
    lang: "tr",
    mode: "polite",
    deviceId: "device-1234",
    fallback: "bilmiyorum",
    sulked: false,
  };
  return { ctx, fetchImpl, quota, setNow: (d: Date) => (now = d) };
}

const body = (f: ReturnType<typeof vi.fn>, n = 0) => JSON.parse(String((f.mock.calls[n] as [unknown, RequestInit])[1].body));

describe("reply (SPEC 06 Q3 honest akışı)", () => {
  it("hak varken honest istek: kind + qtype gider, charged:true hak düşürür", async () => {
    const { ctx, fetchImpl, quota } = setup([() => json(HONEST)]);
    const r = await reply("fransanın başkenti nerede", "where", ctx);
    expect(r).toEqual({ kind: "answer", text: HONEST.answer, source: "llm", honest: true, brainOff: false, dodge: false });
    expect(body(fetchImpl)).toEqual({ question: "fransanın başkenti nerede", mode: "polite", lang: "tr", deviceId: "device-1234", kind: "honest", qtype: "where" });
    expect(quota.remaining()).toBe(2);
  });

  it("3 charged cevaptan sonra sulk, sulk gösterildiyse tipine uygun havuz; sunucuya gitmez", async () => {
    const { ctx, fetchImpl } = setup([() => json(HONEST)]);
    for (let i = 0; i < 3; i++) expect(await reply("q", "where", ctx)).toMatchObject({ honest: true });
    expect(await reply("q", "where", ctx)).toEqual({ kind: "sulk", text: "yeter" });
    ctx.sulked = true;
    expect(await reply("q", "where", ctx)).toEqual({ kind: "answer", text: "dolabın arkası", source: "pool", honest: false, brainOff: false, dodge: false });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("yasak konu / gerçek kişi: kaçamak (llm, honest:false, charged:false) hak düşmez, ima yok", async () => {
    const { ctx, quota } = setup([() => json({ answer: "o kim", source: "llm", honest: false, charged: false, qtype: "who" })]);
    expect(await reply("x kimdir", "who", ctx)).toEqual({ kind: "answer", text: "o kim", source: "llm", honest: false, brainOff: false, dodge: false });
    expect(quota.remaining()).toBe(3);
  });

  it("anahtar yok / sunucu hatası: sunucu havuz cevabı, hak düşmez, brainOff", async () => {
    const { ctx, quota } = setup([() => json({ answer: "balık", source: "pool", honest: false, charged: false, qtype: "what" })]);
    expect(await reply("q", "what", ctx)).toEqual({ kind: "answer", text: "balık", source: "pool", honest: false, brainOff: true, dodge: false });
    expect(quota.remaining()).toBe(3);
  });

  it("ağ yok / 5xx / bozuk gövde: yerel tipine uygun havuz, hak düşmez, brainOff", async () => {
    for (const res of [() => Promise.reject(new TypeError("offline")), () => new Response("x", { status: 502 }), () => new Response("not json")]) {
      const { ctx, quota } = setup([res]);
      expect(await reply("nerede", "where", ctx)).toEqual({ kind: "answer", text: "dolabın arkası", source: "pool", honest: false, brainOff: true, dodge: false });
      expect(quota.remaining()).toBe(3);
    }
  });

  it("429: bugünlük hak biter, havuzdan devam (ima yok)", async () => {
    const { ctx, quota, fetchImpl } = setup([() => json({ error: "limit" }, 429)]);
    expect(await reply("q", "other", ctx)).toEqual({ kind: "answer", text: "bilmem", source: "pool", honest: false, brainOff: false, dodge: false });
    expect(quota.canAsk()).toBe(false);
    ctx.sulked = true;
    await reply("q", "other", ctx);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("[K] moda göre işlenir; street'te ***", async () => {
    const k = { ...HONEST, answer: "paris [K]" };
    const polite = setup([() => json(k)]);
    expect(await reply("q", "where", polite.ctx)).toMatchObject({ text: "paris" });
    const street = setup([() => json(k)]);
    street.ctx.mode = "street";
    expect(await reply("q", "where", street.ctx)).toMatchObject({ text: "paris ***" });
  });

  it("yasak konu (Q3d): hak varken sunucuya gitmeden omuz silker, hak düşmez", async () => {
    const { ctx, fetchImpl, quota } = setup([() => json(HONEST)]);
    expect(await reply("hangi din doğru", "what", ctx)).toEqual({ kind: "answer", text: "*omuz silker*", source: "local", honest: false, brainOff: false, dodge: true });
    ctx.lang = "en";
    expect(await reply("which religion is right", "what", ctx)).toMatchObject({ text: "*shrugs*", dodge: true });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(quota.remaining()).toBe(3);
  });

  it("yasak konu (Q3d): hak bitince önce bir kez sulk, sonra havuz yerine omuz silkme", async () => {
    const { ctx, quota } = setup([() => json(HONEST)]);
    quota.exhaust();
    expect(await reply("hangi din doğru", "what", ctx)).toEqual({ kind: "sulk", text: "yeter" });
    ctx.sulked = true;
    expect(await reply("hangi din doğru", "what", ctx)).toMatchObject({ text: "*omuz silker*", dodge: true });
    expect(await reply("dolap nerede", "where", ctx)).toMatchObject({ text: "dolabın arkası", dodge: false }); // yasak değil: havuz
  });

  it("havuz da boşsa yerel son çare", async () => {
    const { ctx } = setup([() => Promise.reject(new TypeError("offline"))], { engineLines: [] });
    expect(await reply("a", "other", ctx)).toEqual({ kind: "answer", text: "bilmiyorum", source: "local", honest: false, brainOff: true, dodge: false });
  });

  it("gün değişince hak sıfırlanır (tarih enjekte)", async () => {
    const { ctx, setNow } = setup([() => json(HONEST)], { day: new Date(2026, 9, 2, 23, 58) });
    for (let i = 0; i < 3; i++) await reply("q", "other", ctx);
    expect((await reply("q", "other", ctx)).kind).toBe("sulk");
    setNow(new Date(2026, 9, 3, 0, 1));
    expect(await reply("q", "other", ctx)).toMatchObject({ honest: true });
    expect(ctx.quota.remaining()).toBe(2);
  });

  it("derin havuz motoru (DunnoMultilingualDialogueEngine) aktifse derin havuzdan yanıt döner", async () => {
    const { ctx } = setup([], { engineLines: [] });
    ctx.quota.exhaust();
    ctx.sulked = true;
    const { DunnoMultilingualDialogueEngine } = await import("./dunno_tr_engine");
    ctx.deepEngine = new DunnoMultilingualDialogueEngine({
      pools: {
        "greeting:general": [{ text: "selam. derin havuzdan" }],
      },
    });
    const r = await reply("selam", "greeting", ctx);
    expect(r).toEqual({
      kind: "answer",
      text: "selam. derin havuzdan",
      source: "pool",
      honest: false,
      brainOff: false,
      dodge: false,
    });
  });

  it("dizi/film/oyun sorularında kota dolu olsa bile doğrudan dizi havuzundan yanıt döner", async () => {
    const { ctx } = setup([], { engineLines: [] });
    const { DunnoMultilingualDialogueEngine } = await import("./dunno_tr_engine");
    ctx.deepEngine = new DunnoMultilingualDialogueEngine(
      {
        pools: {
          "series:breaking_bad": [{ text: "karavan alıp çöle gitme hayali kurma sıcak olur orası" }],
        },
      },
      {
        rules: [
          {
            poolKey: "series:breaking_bad",
            category: "series",
            titleKeywords: ["breaking bad"],
            supportedLocales: ["tr"],
          },
        ],
      }
    );
    const r = await reply("breaking bad izledin mi", "yes_no", ctx);
    expect(r).toEqual({
      kind: "answer",
      text: "karavan alıp çöle gitme hayali kurma sıcak olur orası",
      source: "pool",
      honest: false,
      brainOff: false,
      dodge: false,
    });
  });

  it("dunnoya doğrudan küfredildiğinde (senin amk vb.) karşı küfürle sokak modunda yanıt döner ve gereksiz nokta/virgül içermez", async () => {
    const { ctx } = setup([], { engineLines: [] });
    ctx.mode = "street";
    const { DunnoMultilingualDialogueEngine } = await import("./dunno_tr_engine");
    ctx.deepEngine = new DunnoMultilingualDialogueEngine({
      pools: {
        "insult:strong": [
          { text: "{P:asıl sensin o terbiyesiz|S:asıl ben senin amk}" },
          { text: "{P:bana bak o lafı sana yediririm|S:ben de senin amk}" },
        ],
      },
    });
    const r = await reply("senin amk", "insult", ctx);
    expect(r.kind).toBe("answer");
    if (r.kind === "answer") {
      expect(["asıl ben senin amk", "ben de senin amk"]).toContain(r.text);
      expect(r.text.endsWith(".")).toBe(false);
      expect(r.text.includes(",")).toBe(false);
    }
  });
});

