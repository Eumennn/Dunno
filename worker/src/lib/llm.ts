import { buildMessages, type ChatMessage } from "./prompt";
import type { Kind, Lang, Mode, Persona, QType, Tone } from "./validate";

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const DEFAULT_MODEL = "moonshotai/kimi-k2.6";
export const LLM_TIMEOUT_MS = 4000;
export const LLM_MAX_TOKENS = 60;

export type LlmResult = { text: string | null; tokens: number };

export interface ChatOptions {
  messages: ChatMessage[];
  maxTokens: number;
  timeoutMs: number;
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

/**
 * OpenRouter chat çağrısı: ham içerik (anahtar yoksa, hata/timeout olursa ya da içerik yoksa text null)
 * ve yanıttaki usage.total_tokens (yoksa 0). Thinking kapalı.
 * Hiçbir şey loglanmaz. İsteğe kullanıcıyı tanımlayan bilgi eklenmez.
 */
export async function chat({
  messages,
  maxTokens,
  timeoutMs,
  apiKey,
  model,
  fetchImpl = fetch,
}: ChatOptions): Promise<LlmResult> {
  if (!apiKey) return { text: null, tokens: 0 };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "x-title": "dunno",
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        messages,
        max_tokens: maxTokens,
        temperature: 1,
        reasoning: { enabled: false },
        stream: false,
      }),
    });
    if (!res.ok) return { text: null, tokens: 0 };
    const data = (await res.json()) as {
      choices?: { message?: { content?: unknown } }[];
      usage?: { total_tokens?: unknown };
    };
    const content = data.choices?.[0]?.message?.content;
    const total = data.usage?.total_tokens;
    const tokens = typeof total === "number" && Number.isFinite(total) && total > 0 ? total : 0;
    return { text: typeof content === "string" ? content : null, tokens };
  } catch {
    return { text: null, tokens: 0 };
  } finally {
    clearTimeout(timer);
  }
}

/** honest cevap ~120 karakter: Türkçe için ~60 token yetmez */
export const LLM_HONEST_MAX_TOKENS = 120;

export interface AskLlmOptions {
  question: string;
  mode: Mode;
  lang: Lang;
  /** varsayılan pool_hint (eski davranış) */
  kind?: Kind;
  qtype?: QType;
  /** SPEC 17 ipuçları (enum) */
  tone?: Tone;
  persona?: Persona;
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/** /v1/ask için tek satırlık cevap (pool_hint max_tokens 60, honest 120; 4 sn). */
export function askLlm({
  question,
  mode,
  lang,
  kind = "pool_hint",
  qtype = "other",
  tone,
  persona,
  timeoutMs = LLM_TIMEOUT_MS,
  ...rest
}: AskLlmOptions): Promise<LlmResult> {
  return chat({
    messages: buildMessages(question, mode, lang, kind, qtype, { tone, persona }),
    maxTokens: kind === "honest" ? LLM_HONEST_MAX_TOKENS : LLM_MAX_TOKENS,
    timeoutMs,
    ...rest,
  });
}
