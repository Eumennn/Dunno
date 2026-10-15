import { beforeAll, describe, expect, it } from "vitest";
import { route } from "../src/index";
import type { Env } from "../src/lib/env";
import { memoryKV } from "./helpers";

const ctx = { waitUntil: () => undefined };
const SECRET = "whsec_test_123";
// node tipleri yok (worker tsconfig): anahtar ve imzalar WebCrypto ile
const b64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b)));
let PRIV = "";
let PUB = "";
beforeAll(async () => {
  const kp = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])) as CryptoKeyPair;
  PRIV = b64((await crypto.subtle.exportKey("pkcs8", kp.privateKey)) as ArrayBuffer);
  PUB = b64((await crypto.subtle.exportKey("raw", kp.publicKey)) as ArrayBuffer);
});
async function hmacHex(raw: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)))].map((x) => x.toString(16).padStart(2, "0")).join("");
}
const PRODUCTS = JSON.stringify({ "111": { tier: "pro", subscription: true }, "222": { tier: "packs", packs: ["halloween"] } });

function env(): Env & { DUNNO_KV: ReturnType<typeof memoryKV> } {
  return { DUNNO_KV: memoryKV(), ENVIRONMENT: "dev", LS_WEBHOOK_SECRET: SECRET, LS_PRODUCTS: PRODUCTS, LICENSE_PRIVATE_KEY: PRIV, PRO_PUBKEY: PUB } as Env & { DUNNO_KV: ReturnType<typeof memoryKV> };
}
const hook = async (body: unknown, sig?: string) => {
  const raw = JSON.stringify(body);
  return new Request("https://api.test/v1/billing/lemonsqueezy", { method: "POST", body: raw, headers: { "x-signature": sig ?? (await hmacHex(raw)) } });
};
const post = (path: string, body: unknown) => new Request(`https://api.test${path}`, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", "cf-connecting-ip": "1.2.3.4" } });
const payload = (lic: string) => {
  const p = lic.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(p + "===".slice((p.length + 3) % 4)), (c) => c.charCodeAt(0)))) as Record<string, unknown>;
};
const future = new Date(Date.now() + 30 * 86_400_000).toISOString();

describe("ödeme -> lisans", () => {
  it("imzasız / yanlış imzalı webhook reddedilir", async () => {
    expect((await route(await hook({ meta: { event_name: "order_created" } }, "00".repeat(32)), env(), ctx)).status).toBe(401);
  });

  it("tek seferlik paket: sipariş + doğru e-posta -> imzalı lisans (paketler); yanlış e-posta ayrımı söylenmez; iade sonrası yok", async () => {
    const e = env();
    const order = { meta: { event_name: "order_created" }, data: { type: "orders", id: "9001", attributes: { user_email: "Ayse@Example.com", status: "paid", first_order_item: { variant_id: 222 } } } };
    expect((await route(await hook(order), e, ctx)).status).toBe(200);
    for (const [k, v] of e.DUNNO_KV.store) expect(k + v).not.toContain("example.com"); // e-posta saklanmaz
    const bad = await route(post("/v1/license/claim", { order: "9001", email: "baska@example.com" }), e, ctx);
    expect(bad.status).toBe(404);
    const ok = (await (await route(post("/v1/license/claim", { order: "#9001", email: "ayse@example.com" }), e, ctx)).json()) as { license: string };
    expect(ok.license.startsWith("DUNNO1.")).toBe(true);
    expect(payload(ok.license)).toMatchObject({ v: 1, tier: "packs", packs: ["halloween"] });
    expect(payload(ok.license)).not.toHaveProperty("until");
    await route(await hook({ ...order, meta: { event_name: "order_refunded" } }), e, ctx);
    expect((await route(post("/v1/license/claim", { order: "9001", email: "ayse@example.com" }), e, ctx)).status).toBe(404);
  });

  it("abonelik: sipariş numarasıyla alınır, until = dönem sonu + 3 gün; yenileme aynı kimlik; süre bitince 410", async () => {
    const e = env();
    const sub = (status: string, renews: string) => ({ meta: { event_name: "subscription_updated" }, data: { type: "subscriptions", id: "77", attributes: { user_email: "m@x.io", status, variant_id: 111, order_id: 5005, renews_at: renews } } });
    await route(await hook({ ...sub("active", future), meta: { event_name: "subscription_created" } }), e, ctx);
    const first = ((await (await route(post("/v1/license/claim", { order: "5005", email: "m@x.io" }), e, ctx)).json()) as { license: string }).license;
    const p1 = payload(first);
    expect(p1.tier).toBe("pro");
    expect(typeof p1.until).toBe("string");
    const later = new Date(Date.now() + 60 * 86_400_000).toISOString();
    await route(await hook(sub("active", later)), e, ctx);
    const refreshed = ((await (await route(post("/v1/license/refresh", { license: first }), e, ctx)).json()) as { license: string }).license;
    expect(payload(refreshed).id).toBe(p1.id);
    expect(String(payload(refreshed).until) > String(p1.until)).toBe(true);
    await route(await hook({ ...sub("expired", later), meta: { event_name: "subscription_expired" } }), e, ctx);
    expect((await route(post("/v1/license/refresh", { license: first }), e, ctx)).status).toBe(410);
    expect((await route(post("/v1/license/refresh", { license: first.slice(0, -3) + "AAA" }), e, ctx)).status).toBe(400);
  });

  it("sırlar yoksa uçlar kapalı; tahmine karşı günlük deneme sınırı", async () => {
    const off = { DUNNO_KV: memoryKV(), ENVIRONMENT: "dev" } as unknown as Env;
    expect((await route(post("/v1/license/claim", { order: "1", email: "a@b.c" }), off, ctx)).status).toBe(503);
    const e = env();
    let last = 0;
    for (let i = 0; i < 11; i++) last = (await route(post("/v1/license/claim", { order: String(100 + i), email: "a@b.c" }), e, ctx)).status;
    expect(last).toBe(429);
  });
});
