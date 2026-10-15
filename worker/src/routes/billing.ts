// Ödeme -> lisans uçları (launch planı):
//   POST /v1/billing/lemonsqueezy   webhook (X-Signature HMAC); sipariş/abonelik kaydını tutar. Gövde loglanmaz.
//   POST /v1/license/claim  {order, email}   ödenmiş siparişin lisansını verir (yanlış e-posta / sipariş ayrımı söylenmez)
//   POST /v1/license/refresh {license}        abonelik sürüyorsa yeni `until` ile aynı kimlikte lisans
// Sırlar: LS_WEBHOOK_SECRET, LS_PRODUCTS (ürün eşlemesi), LICENSE_PRIVATE_KEY, PRO_PUBKEY, RL_SALT. Biri yoksa uç kapalı (503).
import type { Ctx, Env } from "../lib/env";
import { error, json } from "../lib/http";
import { deviceHash, rateLimitSalt, readCount, utcDay, writeCount } from "../lib/ratelimit";
import {
  addDays,
  emailHash,
  GRACE_DAYS,
  licenseId,
  licIndexKey,
  newLicId,
  orderAliasKey,
  parseLemon,
  productsFrom,
  readRecord,
  signLicense,
  subActive,
  verifyHmac,
  writeRecord,
  type BillRecord,
} from "../lib/billing";

/** IP başına günlük lisans alma denemesi (sipariş no tahminine karşı) */
export const CLAIMS_PER_DAY = 10;
const claimKey = (hash: string, day: string) => `lc:${hash}:${day}`;
const ORDER = /^[0-9]{1,20}$/;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}$/;

export async function handleLemonWebhook(request: Request, env: Env, _ctx: Ctx): Promise<Response> {
  const salt = rateLimitSalt(env);
  if (!env.LS_WEBHOOK_SECRET || salt === null) return error(503, "billing is resting");
  const raw = await request.text();
  if (raw.length > 256 * 1024 || !(await verifyHmac(raw, request.headers.get("x-signature"), env.LS_WEBHOOK_SECRET))) return error(401, "bad signature");
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return error(400, "invalid body");
  }
  const ev = parseLemon(body);
  if (!ev) return json({ ok: true, ignored: true });
  const product = productsFrom(env.LS_PRODUCTS)[ev.variantId];
  const kv = env.DUNNO_KV;

  if (ev.kind === "order" && (ev.event === "order_created" || ev.event === "order_refunded")) {
    if (!product) return json({ ok: true, ignored: true });
    const alias = await kv.get(orderAliasKey(ev.id));
    const key = alias ?? `o:${ev.id}`;
    const prev = await readRecord(kv, key);
    if (ev.event === "order_refunded") {
      if (prev) await writeRecord(kv, key, { ...prev, active: false });
      return json({ ok: true });
    }
    if (product.subscription) return json({ ok: true }); // abonelik kaydı subscription_* olaylarında
    if (ev.status !== "paid") return json({ ok: true, ignored: true });
    const rec: BillRecord = { emailHash: await emailHash(ev.email, salt), tier: product.tier, packs: product.packs ?? [], licId: prev?.licId ?? newLicId(), active: true };
    await writeRecord(kv, key, rec);
    return json({ ok: true });
  }

  if (ev.kind === "subscription" && ev.event.startsWith("subscription_")) {
    if (!product?.subscription) return json({ ok: true, ignored: true });
    const key = `s:${ev.id}`;
    const prev = await readRecord(kv, key);
    const rec: BillRecord = {
      emailHash: prev?.emailHash ?? (await emailHash(ev.email, salt)),
      tier: product.tier,
      packs: product.packs ?? [],
      licId: prev?.licId ?? newLicId(),
      until: ev.periodEnd ? addDays(ev.periodEnd, GRACE_DAYS) : prev?.until,
      active: subActive(ev.status),
    };
    await writeRecord(kv, key, rec);
    if (ev.orderId) await kv.put(orderAliasKey(ev.orderId), key);
    return json({ ok: true });
  }
  return json({ ok: true, ignored: true });
}

const usable = (r: BillRecord | null, now: Date): r is BillRecord => !!r && r.active && (!r.until || r.until >= now.toISOString().slice(0, 10));

export async function handleLicenseClaim(request: Request, env: Env, _ctx: Ctx): Promise<Response> {
  const salt = rateLimitSalt(env);
  if (!env.LICENSE_PRIVATE_KEY || salt === null) return error(503, "billing is resting");
  let b: Record<string, unknown>;
  try {
    b = (await request.json()) as Record<string, unknown>;
  } catch {
    return error(400, "invalid body");
  }
  const order = typeof b?.order === "string" ? b.order.replace(/^#/, "").trim() : "";
  const email = typeof b?.email === "string" ? b.email.trim() : "";
  if (!ORDER.test(order) || !EMAIL.test(email)) return error(400, "invalid claim");
  const kv = env.DUNNO_KV;
  const day = utcDay(Date.now());
  const ipHash = await deviceHash("claim", request.headers.get("cf-connecting-ip") ?? "0.0.0.0", salt);
  const used = await readCount(kv, claimKey(ipHash, day));
  if (used >= CLAIMS_PER_DAY) return error(429, "enough tries for today");
  await writeCount(kv, claimKey(ipHash, day), used + 1);
  const key = (await kv.get(orderAliasKey(order))) ?? `o:${order}`;
  const rec = await readRecord(kv, key);
  const now = new Date();
  if (!usable(rec, now) || rec.emailHash !== (await emailHash(email, salt))) return error(404, "no paid order with that email");
  return json({ license: await signLicense(env.LICENSE_PRIVATE_KEY, rec, now) });
}

export async function handleLicenseRefresh(request: Request, env: Env, _ctx: Ctx): Promise<Response> {
  if (!env.LICENSE_PRIVATE_KEY || !env.PRO_PUBKEY) return error(503, "billing is resting");
  let b: Record<string, unknown>;
  try {
    b = (await request.json()) as Record<string, unknown>;
  } catch {
    return error(400, "invalid body");
  }
  const id = await licenseId(b?.license, env.PRO_PUBKEY);
  if (!id) return error(400, "invalid license");
  const key = await env.DUNNO_KV.get(licIndexKey(id));
  const rec = key ? await readRecord(env.DUNNO_KV, key) : null;
  const now = new Date();
  if (!usable(rec, now)) return error(410, "license ended");
  return json({ license: await signLicense(env.LICENSE_PRIVATE_KEY, rec, now) });
}
