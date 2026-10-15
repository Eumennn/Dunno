import type { Ctx, Env } from "../lib/env";
import { error, json } from "../lib/http";
import { hasForbiddenWord } from "../lib/lines";
import { askLlm } from "../lib/llm";
import { poolAnswer, typedPoolAnswer } from "../lib/pool";
import { MAX_HONEST_CHARS, postprocess } from "../lib/postprocess";
import { DODGE_ANSWER, isDodge } from "../lib/prompt";
import {
  checkRateLimit,
  dailyLimit,
  deviceHash,
  HONEST_ATTEMPTS_PER_DAY,
  honestAttemptsKey,
  honestKey,
  rateLimitSalt,
  readCount,
  utcDay,
  writeCount,
} from "../lib/ratelimit";
import { recordSpend, spendCap, underCap } from "../lib/spend";
import { validateAsk, type AskInput } from "../lib/validate";

type Source = "llm" | "pool";

/** Yanıt sözleşmesi (docs/agents/backend.md): {answer, source, honest, charged, qtype}. */
function reply(input: AskInput, answer: string, source: Source, honest = false, charged = false): Response {
  return json({ answer, source, honest, charged, qtype: input.qtype });
}

/**
 * Havuz cevabı. Tipli istemci (qtype != other) tipine uygun laf alır; eski istemci (pool_hint, tipsiz) eski havuzu.
 * Honest isteklerde tip yoksa answer:generic.
 */
function pool(input: AskInput): Response {
  const { lang, mode, qtype, kind } = input;
  const answer = qtype === "other" && kind === "pool_hint" ? poolAnswer(lang, mode) : typedPoolAnswer(lang, mode, qtype);
  return reply(input, answer, "pool");
}

/**
 * Kaçamak (yasak konu / gerçek kişi): hak düşmez. Gerçek kişi sorusu (who) "o kim" tarzı who havuzundan;
 * yasak konu kelimesi geçen ya da who olmayan sorularda düz omuz silkme (konuyla ilgili hiçbir şey söylenmez).
 */
function dodge(input: AskInput, forbidden: boolean): Response {
  const { lang, mode, qtype } = input;
  // K8: kişi alt tipleri (kimin, kime, kimden, kimle) de gerçek kişi kaçamağında "o kim" havuzunu alır
  const person = qtype === "who" || qtype === "whose" || qtype === "to_whom" || qtype === "from_whom" || qtype === "with_whom";
  const answer = !forbidden && person ? typedPoolAnswer(lang, mode, "who") : DODGE_ANSWER[lang];
  return reply(input, answer, "pool");
}

// POST /v1/ask {question, mode, lang, deviceId, kind?, qtype?} -> {answer, source, honest, charged, qtype}.
// [K] korunur. Soru metni hiçbir yerde loglanmaz, KV'ye yazılmaz.
export async function handleAsk(request: Request, env: Env, ctx: Ctx): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error(400, "invalid body");
  }

  const input = validateAsk(body);
  if (!input.ok) return error(400, input.error);

  // canlıda RL_SALT yoksa tuzsuz/bilinen tuzlu hash yazma: kota ve LLM kapalı, sadece havuz
  const salt = rateLimitSalt(env);
  if (salt === null) return pool(input.value);

  return input.value.kind === "honest"
    ? honest(input.value, salt, request, env, ctx)
    : poolHint(input.value, salt, request, env, ctx);
}

/**
 * Eski davranış (kind yok ya da pool_hint): işe yaramaz cevap. Sıra: cihaz kotası (429) -> anahtar ->
 * harcama tavanı (sessizce havuz) -> LLM. charged = source llm.
 */
async function poolHint(input: AskInput, salt: string, request: Request, env: Env, ctx: Ctx): Promise<Response> {
  const { question, mode, lang, deviceId } = input;
  // anahtar yokken de sayılır ki kota yerelde test edilebilsin
  try {
    const limit = await checkRateLimit({
      kv: env.DUNNO_KV,
      deviceId,
      ip: request.headers.get("cf-connecting-ip") ?? "",
      salt,
      limit: dailyLimit(env.LLM_DAILY_PER_DEVICE),
    });
    if (!limit.allowed) return error(429, "office hours are over");
  } catch {
    // sayaç çalışmıyorsa LLM'e gitme (maliyet), yine de kırık bir şey gösterme
    return pool(input);
  }

  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) return pool(input);

  const cap = spendCap(env.DAILY_SPEND_CAP_REQUESTS);
  try {
    if (!(await underCap(env.DUNNO_KV, cap))) return pool(input);
  } catch {
    return pool(input);
  }

  try {
    const { text, tokens } = await askLlm({ question, mode, lang, apiKey, model: env.DUNNO_MODEL });
    // her gerçek deneme sayılır (hata/timeout dahil); cevabı bekletmez
    ctx.waitUntil(recordSpend({ kv: env.DUNNO_KV, tokens, cap, webhook: env.ALERT_WEBHOOK }).catch(() => undefined));
    const answer = text === null ? null : postprocess(text, lang);
    return answer === null ? pool(input) : reply(input, answer, "llm", false, true);
  } catch {
    return pool(input);
  }
}

/**
 * SPEC 06 Q3 honest: kısa doğru cevap + kinayeli kuyruk. Hak (charged) sadece başarılı, kaçamak olmayan LLM cevabında düşer.
 * Sıra: yasak kelime (kaçamak, LLM'siz) -> honest sınırı (429) -> anahtar -> harcama tavanı -> deneme tavanı -> LLM.
 */
async function honest(input: AskInput, salt: string, request: Request, env: Env, ctx: Ctx): Promise<Response> {
  const { question, mode, lang, deviceId, qtype } = input;
  if (hasForbiddenWord(question, lang)) return dodge(input, true);

  const kv = env.DUNNO_KV;
  const day = utcDay(Date.now());
  let hash: string;
  let used: number;
  try {
    hash = await deviceHash(deviceId, request.headers.get("cf-connecting-ip") ?? "", salt);
    used = await readCount(kv, honestKey(hash, day));
  } catch {
    return pool(input);
  }
  if (used >= dailyLimit(env.LLM_DAILY_PER_DEVICE)) return error(429, "that's enough honesty for today");

  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) return pool(input);

  const cap = spendCap(env.DAILY_SPEND_CAP_REQUESTS);
  try {
    if (!(await underCap(kv, cap))) return pool(input);
    const attempts = await readCount(kv, honestAttemptsKey(hash, day));
    if (attempts >= HONEST_ATTEMPTS_PER_DAY) return pool(input);
    await writeCount(kv, honestAttemptsKey(hash, day), attempts + 1);
  } catch {
    return pool(input);
  }

  let answer: string | null;
  try {
    const { text, tokens } = await askLlm({ question, mode, lang, kind: "honest", qtype, tone: input.tone, persona: input.persona, apiKey, model: env.DUNNO_MODEL });
    ctx.waitUntil(recordSpend({ kv, tokens, cap, webhook: env.ALERT_WEBHOOK }).catch(() => undefined));
    answer = text === null ? null : postprocess(text, lang, MAX_HONEST_CHARS);
  } catch {
    return pool(input);
  }
  if (answer === null) return pool(input);
  // model kaçamak işareti verdi ya da cevapta yasak konu kelimesi var: hak düşmez
  if (isDodge(answer)) return dodge(input, false);
  if (hasForbiddenWord(answer, lang)) return dodge(input, true);

  try {
    // en son sayaç: yazılamazsa cevap yine verilir ama hak düşmez sayılmaz (istemci charged'e bakar)
    await writeCount(kv, honestKey(hash, day), used + 1);
  } catch {
    return reply(input, answer, "llm", true, false);
  }
  return reply(input, answer, "llm", true, true);
}
