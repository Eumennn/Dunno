import type { KVLike } from "./env";
import { utcDay } from "./ratelimit";

/** DAILY_SPEND_CAP_REQUESTS boş/bozuksa: bilerek düşük tutulur (yanlış ayarda fatura yerine havuz) */
export const DEFAULT_SPEND_CAP = 200;
export const ALERT_RATIO = 0.8;
export const SPEND_TTL_SECONDS = 48 * 60 * 60;
export const ALERT_TIMEOUT_MS = 5000;

export type SpendState = { requests: number; tokens: number };

export const spendKey = (day: string) => `spend:${day}`;
export const alertKey = (day: string) => `spend-alert:${day}`;

/** env'deki tavan; 0 geçerli (LLM tamamen kapalı), boş/bozuk/negatifse varsayılan. */
export function spendCap(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_SPEND_CAP;
}

/** %80 eşiği; tavan 0 iken alarm yok. */
export function alertThreshold(cap: number): number {
  return cap > 0 ? Math.ceil(cap * ALERT_RATIO) : Infinity;
}

/** Bozuk değer 0 sayılır; KV okuma hatası ise fırlar (tavan sessizce açılmasın). */
export async function readSpend(kv: KVLike, day: string): Promise<SpendState> {
  const raw = await kv.get(spendKey(day));
  try {
    const parsed = JSON.parse(raw ?? "{}") as Partial<SpendState>;
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
    return { requests: num(parsed.requests), tokens: num(parsed.tokens) };
  } catch {
    return { requests: 0, tokens: 0 };
  }
}

/** Tavanın altındaysa true. Okuma hatası çağırana fırlar (çağıran havuza düşer). */
export async function underCap(kv: KVLike, cap: number, now = Date.now()): Promise<boolean> {
  return (await readSpend(kv, utcDay(now))).requests < cap;
}

export interface RecordSpendOptions {
  kv: KVLike;
  tokens: number;
  cap: number;
  webhook?: string;
  now?: number;
  fetchImpl?: typeof fetch;
}

/**
 * Bir LLM denemesini (başarılı, hata ya da timeout) sayar; %80'i geçince günde bir kez alarm.
 * KV atomik değil; eşzamanlı isteklerde sayaç nadiren eksik sayabilir. Tavan bu yüzden pay bırakılarak ayarlanır.
 * Alarm gövdesinde sadece sayaç/tavan/tarih var; soru ya da kimlik yok.
 */
export async function recordSpend({
  kv,
  tokens,
  cap,
  webhook,
  now = Date.now(),
  fetchImpl = fetch,
}: RecordSpendOptions): Promise<SpendState> {
  const day = utcDay(now);
  const prev = await readSpend(kv, day);
  const next = { requests: prev.requests + 1, tokens: prev.tokens + Math.max(0, tokens) };
  await kv.put(spendKey(day), JSON.stringify(next), { expirationTtl: SPEND_TTL_SECONDS });

  if (webhook && next.requests >= alertThreshold(cap) && (await kv.get(alertKey(day))) === null) {
    // bayrak önce: webhook hata verse de ikinci kez denenmez (alarm spam'i yerine sessizlik)
    await kv.put(alertKey(day), "1", { expirationTtl: SPEND_TTL_SECONDS });
    await sendAlert(webhook, { event: "spend_80", date: day, requests: next.requests, tokens: next.tokens, cap }, fetchImpl);
  }
  return next;
}

async function sendAlert(url: string, body: Record<string, unknown>, fetchImpl: typeof fetch): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ALERT_TIMEOUT_MS);
  try {
    await fetchImpl(url, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // alarm kaybolabilir; istek etkilenmez
  } finally {
    clearTimeout(timer);
  }
}
