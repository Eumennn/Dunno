import type { KVLike } from "./env";

export const DEFAULT_DAILY_LIMIT = 3;
/** gün anahtarı UTC; 48 saat saat dilimi/gecikme payı bırakır */
export const RL_TTL_SECONDS = 48 * 60 * 60;
/** Sadece ENVIRONMENT=dev iken ve RL_SALT yoksa kullanılır; canlıda asla (bkz. rateLimitSalt). */
export const LOCAL_SALT = "dunno-local-salt";

/**
 * Kota hash'inin tuzu. RL_SALT varsa o; yoksa sadece dev'de yerel sabit tuz.
 * Canlıda (ENVIRONMENT dev değil) tuz yoksa null: çağıran kotayı ve LLM'i atlayıp havuza düşer.
 */
export function rateLimitSalt(env: { RL_SALT?: string; ENVIRONMENT?: string }): string | null {
  if (env.RL_SALT) return env.RL_SALT;
  return env.ENVIRONMENT === "dev" ? LOCAL_SALT : null;
}

export type RateLimitResult = { allowed: boolean; remaining: number };

/** UTC gün, ör. "2026-10-02". */
export function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

/** env'deki kota; boş/bozuk/negatifse varsayılan. */
export function dailyLimit(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_DAILY_LIMIT;
}

/** SHA-256(tuz|deviceId|ip) hex. Ham deviceId/IP hiçbir yerde saklanmaz. */
export async function deviceHash(deviceId: string, ip: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode([salt, deviceId, ip].join("|"));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function rateLimitKey(hash: string, day: string): string {
  return `rl:${hash}:${day}`;
}

export interface RateLimitOptions {
  kv: KVLike;
  deviceId: string;
  ip: string;
  salt: string;
  now?: number;
  limit?: number;
}

/**
 * Sayaç izin veriyorsa bir artırır. KV atomik değil; eşzamanlı isteklerde
 * nadiren bir fazla soru geçebilir, şaka bir limit için kabul edilebilir.
 */
export async function checkRateLimit({
  kv,
  deviceId,
  ip,
  salt,
  now = Date.now(),
  limit = DEFAULT_DAILY_LIMIT,
}: RateLimitOptions): Promise<RateLimitResult> {
  const key = rateLimitKey(await deviceHash(deviceId, ip, salt), utcDay(now));
  const used = Number.parseInt((await kv.get(key)) ?? "0", 10) || 0;
  if (used >= limit) return { allowed: false, remaining: 0 };

  await kv.put(key, String(used + 1), { expirationTtl: RL_TTL_SECONDS });
  return { allowed: true, remaining: limit - used - 1 };
}

// ---------------------------------------------------------------- SPEC 06 Q3: honest sayacı

/**
 * Honest deneme tavanı (cihaz başı/gün): kaçamak ve hatalar hak düşürmez, ama sınırsız LLM çağrısı da olmasın.
 * Tavan dolunca honest istekleri havuzdan cevaplanır (charged:false), 429 değil.
 */
export const HONEST_ATTEMPTS_PER_DAY = 10;

/** başarılı honest cevaplar (hak) */
export const honestKey = (hash: string, day: string) => `hn:${hash}:${day}`;
/** honest LLM denemeleri (kaçamak/hata dahil) */
export const honestAttemptsKey = (hash: string, day: string) => `ha:${hash}:${day}`;

/** KV'deki sayaç (yoksa/bozuksa 0). */
export async function readCount(kv: KVLike, key: string): Promise<number> {
  return Number.parseInt((await kv.get(key)) ?? "0", 10) || 0;
}

/** Sayaç = n (TTL 48 saat). KV atomik değil; şaka bir limit için kabul edilebilir. */
export function writeCount(kv: KVLike, key: string, n: number): Promise<void> {
  return kv.put(key, String(n), { expirationTtl: RL_TTL_SECONDS });
}
