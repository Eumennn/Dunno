// Ödeme -> lisans (launch planı). Sağlayıcı: Lemon Squeezy (vergiyi üstlenen satıcı; Türkiye'ye ödeme desteği hesap açarken doğrulanmalı).
// Başka sağlayıcıya geçiş: sadece parseLemon + imza doğrulaması değişir; kayıt ve lisans kısmı aynı kalır.
// Gizlilik: e-posta saklanmaz, sadece tuzlu SHA-256 karması (lisansı sipariş + e-postayla geri almak için). Lisansın içinde kişisel veri yok.
// Lisans biçimi masaüstü license.rs ile aynı: DUNNO1.<b64url json>.<b64url Ed25519 imzası>; abonelikte `until` (YYYY-MM-DD) var.
import type { KVLike } from "./env";

export type Tier = "pro" | "packs";
export interface Product {
  tier: Tier;
  packs?: string[];
  /** abonelik (Pro aylık/yıllık): lisans `until` taşır, yenilendikçe uzar */
  subscription?: boolean;
}

/** LS_PRODUCTS (JSON): {"<variant id>": {"tier":"pro","subscription":true} | {"tier":"packs","packs":["halloween"]}} */
export function productsFrom(raw: string | undefined): Record<string, Product> {
  try {
    const v = JSON.parse(raw ?? "{}") as Record<string, Product>;
    const out: Record<string, Product> = {};
    for (const [k, p] of Object.entries(v)) {
      if (p?.tier === "pro" || (p?.tier === "packs" && Array.isArray(p.packs) && p.packs.length)) out[k] = { tier: p.tier, packs: p.packs?.filter((x) => /^[a-z0-9_]{2,32}$/.test(x)), subscription: p.subscription === true };
    }
    return out;
  } catch {
    return {};
  }
}

/** abonelik bitişinden sonra tanınan süre (ödeme gecikmesi, saat farkı) */
export const GRACE_DAYS = 3;

export interface BillRecord {
  emailHash: string;
  tier: Tier;
  packs: string[];
  /** lisans kimliği (rastgele, kalıcı; yenilemede aynı kalır) */
  licId: string;
  /** abonelikte geçerlilik sonu (grace dahil), tek seferlikte yok */
  until?: string;
  active: boolean;
}

export const billKey = (k: string) => `bill:${k}`;
export const licIndexKey = (licId: string) => `bill:lic:${licId}`;
export const orderAliasKey = (orderId: string) => `bill:alias:o:${orderId}`;

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const enc = new TextEncoder();

/** X-Signature: gövdenin HMAC-SHA256'sı (hex). Sabit süreli karşılaştırma. */
export async function verifyHmac(rawBody: string, signature: string | null, secret: string | undefined): Promise<boolean> {
  if (!secret || !signature || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const want = hex(await crypto.subtle.sign("HMAC", key, enc.encode(rawBody)));
  const got = signature.toLowerCase();
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ got.charCodeAt(i);
  return diff === 0;
}

export async function emailHash(email: string, salt: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(`${salt}:${email.trim().toLowerCase()}`)));
}

export interface LemonEvent {
  event: string;
  kind: "order" | "subscription" | "other";
  id: string;
  orderId: string | null;
  email: string;
  variantId: string;
  status: string;
  /** abonelikte sıradaki yenileme ya da bitiş (ISO) */
  periodEnd: string | null;
}

/** Lemon Squeezy webhook gövdesi -> ihtiyacımız olan alanlar (gerisi yok sayılır) */
export function parseLemon(body: unknown): LemonEvent | null {
  const b = body as { meta?: { event_name?: unknown }; data?: { id?: unknown; type?: unknown; attributes?: Record<string, unknown> } };
  const a = b?.data?.attributes;
  if (typeof b?.meta?.event_name !== "string" || !a || (typeof b.data?.id !== "string" && typeof b.data?.id !== "number")) return null;
  const type = b.data?.type;
  const kind = type === "orders" ? "order" : type === "subscriptions" ? "subscription" : "other";
  const item = a.first_order_item as { variant_id?: unknown } | undefined;
  const variant = kind === "order" ? item?.variant_id : a.variant_id;
  const str = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v) : "");
  return {
    event: b.meta.event_name,
    kind,
    id: str(b.data?.id),
    orderId: kind === "subscription" ? str(a.order_id) || null : str(b.data?.id),
    email: str(a.user_email),
    variantId: str(variant),
    status: str(a.status),
    periodEnd: typeof a.ends_at === "string" ? a.ends_at : typeof a.renews_at === "string" ? a.renews_at : null,
  };
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** aboneliğin lisans verdiği durumlar (iptal edilmiş ama dönem sonu gelmemiş olan da sayılır; until bunu sınırlar) */
const LIVE_SUB = new Set(["active", "on_trial", "past_due", "cancelled"]);
export const subActive = (status: string) => LIVE_SUB.has(status);

export async function readRecord(kv: KVLike, key: string): Promise<BillRecord | null> {
  const v = await kv.get(billKey(key));
  if (!v) return null;
  try {
    return JSON.parse(v) as BillRecord;
  } catch {
    return null;
  }
}

export async function writeRecord(kv: KVLike, key: string, r: BillRecord): Promise<void> {
  await kv.put(billKey(key), JSON.stringify(r));
  await kv.put(licIndexKey(r.licId), key);
}

export const newLicId = () => `lic_${hex(crypto.getRandomValues(new Uint8Array(8)).buffer)}`;

const b64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** Ed25519 ile lisans imzalar. Özel anahtar: LICENSE_PRIVATE_KEY (PKCS8, base64 DER; `scripts/license.mjs keygen` PEM gövdesi). */
export async function signLicense(privateB64: string, r: BillRecord, now: Date): Promise<string> {
  const der = fromB64(privateB64.replace(/-----[^-]+-----/g, "").replace(/\s+/g, ""));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "Ed25519" }, false, ["sign"]);
  const payload = { v: 1, id: r.licId, tier: r.tier, issued: now.toISOString().slice(0, 10), ...(r.packs.length ? { packs: r.packs } : {}), ...(r.until ? { until: r.until } : {}) };
  const body = enc.encode(JSON.stringify(payload));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "Ed25519" }, key, body));
  return `DUNNO1.${b64url(body)}.${b64url(sig)}`;
}

/** Lisans metninden kimlik (imza ayrıca doğrulanır: create.ts verifyPro gibi, burada tür fark etmez) */
export async function licenseId(license: unknown, pubkeyB64: string | undefined): Promise<string | null> {
  if (!pubkeyB64 || typeof license !== "string" || license.length > 1024 || !license.startsWith("DUNNO1.")) return null;
  const parts = license.slice(7).split(".");
  if (parts.length !== 2) return null;
  const dec = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
  try {
    const body = dec(parts[0]);
    const key = await crypto.subtle.importKey("raw", fromB64(pubkeyB64), { name: "Ed25519" }, false, ["verify"]);
    if (!(await crypto.subtle.verify({ name: "Ed25519" }, key, dec(parts[1]), body))) return null;
    const p = JSON.parse(new TextDecoder().decode(body)) as { id?: unknown };
    return typeof p.id === "string" ? p.id : null;
  } catch {
    return null;
  }
}
