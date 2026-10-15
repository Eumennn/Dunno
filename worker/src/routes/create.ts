// POST /v1/create/world (SPEC 18 Faz 3 AI World Generator, Pro): {deviceId, license, idea} -> {pack} (SPEC 12 veri modu).
// Sıra: gövde -> fikir (uzunluk, yasak konu) -> Pro lisansı (Ed25519) -> cihaz başı günlük sınır -> harcama tavanı -> LLM -> sıkı doğrulama.
// Fikir metni saklanmaz/loglanmaz. Hata metinleri sabit.
import type { Ctx, Env } from "../lib/env";
import { error, json } from "../lib/http";
import { chat } from "../lib/llm";
import { deviceHash, rateLimitSalt, readCount, utcDay, writeCount } from "../lib/ratelimit";
import { recordSpend, spendCap, underCap } from "../lib/spend";
import { DEVICE_ID } from "../lib/validate";
import { buildCreateMessages, checkPrompt, CREATE_MAX_TOKENS, CREATE_PER_DAY, CREATE_TIMEOUT_MS, parseWorld, verifyPro, worldToPack } from "../lib/create";

export const createKey = (hash: string, day: string) => `cw:${hash}:${day}`;

/** DUNNO_FAKE_LLM=1 (sadece yerel): sabit örnek dünya */
export const FAKE_WORLD = {
  name: { tr: "yozlaşmış ofis", en: "corrupt office" },
  palette: "coffee",
  lore: { tr: "dunno bir şirketin başına geçti. hiçbir şey bilmiyor ama toplantı yapıyor.", en: "dunno runs a company now. knows nothing, holds meetings." },
  lines: [
    ["interaction:click", "toplantıdayım. dürtme", "in a meeting. no poking"],
    ["interaction:drag", "beni terfi ettirmeden taşıma", "don't move me without a promotion"],
    ["time:morning", "sabah toplantısı. ben gelmeyeceğim", "morning meeting. i won't attend"],
    ["time:night", "mesai bitti. ben hiç başlamadım", "shift is over. i never started"],
    ["idle:10", "verimlilik raporu: sıfır", "productivity report: zero"],
    ["app:excel", "bu tabloda kâr yok. bende de", "no profit in this sheet. none in me"],
    ["app:browser", "pazar araştırması mı, video mu", "market research or videos"],
    ["random", "strateji değiştirdik. hâlâ bilmiyorum", "new strategy. still no idea"],
  ].map(([trigger, tr, en]) => ({ trigger, tr, en })),
};

export async function handleCreateWorld(request: Request, env: Env, ctx: Ctx): Promise<Response> {
  let b: Record<string, unknown>;
  try {
    b = (await request.json()) as Record<string, unknown>;
  } catch {
    return error(400, "invalid body");
  }
  if (typeof b !== "object" || b === null) return error(400, "invalid body");
  const idea = checkPrompt(b.idea);
  if (!idea.ok) return error(400, idea.error);
  const deviceId = typeof b.deviceId === "string" && DEVICE_ID.test(b.deviceId) ? b.deviceId : null;
  if (!deviceId) return error(400, "invalid device id");
  // Pro: lisans doğrulanır; yerel geliştirmede anahtar yoksa açık
  const devOpen = env.ENVIRONMENT === "dev" && !env.PRO_PUBKEY;
  if (!devOpen && !(await verifyPro(b.license, env.PRO_PUBKEY))) return error(402, "pro only");
  const salt = rateLimitSalt(env);
  if (salt === null) return error(503, "studio is resting");
  const kv = env.DUNNO_KV;
  const hash = await deviceHash(deviceId, "", salt);
  const day = utcDay(Date.now());
  const used = await readCount(kv, createKey(hash, day));
  if (used >= CREATE_PER_DAY) return error(429, "enough worlds for today");

  let raw: unknown;
  if (env.DUNNO_FAKE_LLM === "1") raw = FAKE_WORLD;
  else {
    const cap = spendCap(env.DAILY_SPEND_CAP_REQUESTS);
    if (!env.OPENROUTER_API_KEY || !(await underCap(kv, cap))) return error(503, "studio is resting");
    const { text, tokens } = await chat({ messages: buildCreateMessages(idea.prompt), maxTokens: CREATE_MAX_TOKENS, timeoutMs: CREATE_TIMEOUT_MS, apiKey: env.OPENROUTER_API_KEY, model: env.DUNNO_MODEL });
    ctx.waitUntil(recordSpend({ kv, tokens, cap, webhook: env.ALERT_WEBHOOK }).catch(() => undefined));
    raw = text === null ? null : parseWorld(text);
  }
  await writeCount(kv, createKey(hash, day), used + 1);
  const suffix = Array.from(crypto.getRandomValues(new Uint8Array(2)), (x) => x.toString(16).padStart(2, "0")).join("");
  const pack = worldToPack(raw, suffix);
  if (!pack) return error(422, "the world came out wrong. try another idea");
  return json({ pack, left: CREATE_PER_DAY - used - 1 });
}
