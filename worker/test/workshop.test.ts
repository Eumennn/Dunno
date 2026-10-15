import { describe, expect, it } from "vitest";
import { route } from "../src/index";
import type { Env } from "../src/lib/env";
import { checkPack } from "../src/lib/workshop";
import { memoryKV } from "./helpers";

const ctx = { waitUntil: () => undefined };
const ADMIN = "x".repeat(32);
const manifest = (id = "cozy_pack", extra: Record<string, unknown> = {}) =>
  JSON.stringify({ schema: 1, id, name: { tr: "rahat paket", en: "cozy pack" }, version: "1.0.0", author: "someone", permissions: ["reactions"], contents: { reactions: { tr: "lines_tr.json" } }, ...extra });
const pack = (id = "cozy_pack", files: { path: string; text?: string; base64?: string }[] = []) => ({
  dir: id,
  files: [{ path: "manifest.json", size: 1, text: manifest(id) }, { path: "lines_tr.json", size: 1, text: '[{"trigger":"time:night","tr":"uyu artık"}]' }, ...files],
});

function env(): Env & { DUNNO_KV: ReturnType<typeof memoryKV> } {
  return { DUNNO_KV: memoryKV(), ENVIRONMENT: "dev", WORKSHOP_ADMIN_TOKEN: ADMIN, WORKSHOP_UPLOADS: "open" } as Env & { DUNNO_KV: ReturnType<typeof memoryKV> };
}
const req = (path: string, init: RequestInit = {}) => new Request(`https://w.test${path}`, init);
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  req(path, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", ...headers } });

describe("workshop paket doğrulama", () => {
  it("geçerli veri paketi geçer; kod, yol kaçışı, yasak içerik geçmez", () => {
    expect(checkPack(pack()).ok).toBe(true);
    expect(checkPack(pack("x", [{ path: "evil.js", text: "alert(1)" }]))).toEqual({ ok: false, error: "file type not allowed" });
    expect(checkPack(pack("x", [{ path: "../../win.txt", text: "hi" }]))).toEqual({ ok: false, error: "unsafe path" });
    expect(checkPack(pack("x", [{ path: "a.png", base64: "AAAA" }]))).toEqual({ ok: false, error: "not a png" });
    expect(checkPack(pack("x", [{ path: "notes.md", text: "pray to the gods" }]))).toEqual({ ok: false, error: "content not allowed" });
    expect(checkPack({ dir: "x", files: [{ path: "lines.json", size: 1, text: "[]" }] })).toEqual({ ok: false, error: "missing manifest" });
  });
});

describe("workshop akışı", () => {
  it("yükle -> bekler (listede yok) -> onay -> listede -> indir sayılır -> beğeni cihaz başı bir", async () => {
    const e = env();
    const up = await route(post("/v1/workshop/upload", { deviceId: "device-12345678", handle: "mert_dev", pack: pack() }), e, ctx);
    expect(up.status).toBe(200);
    expect(((await (await route(req("/v1/workshop"), e, ctx)).json()) as { items: unknown[] }).items).toHaveLength(0);
    expect((await route(post("/v1/workshop/moderate", { id: "cozy_pack", status: "approved" }), e, ctx)).status).toBe(403);
    const pending = (await (await route(req("/v1/workshop/pending", { headers: { authorization: `Bearer ${ADMIN}` } }), e, ctx)).json()) as { items: { id: string }[] };
    expect(pending.items.map((i) => i.id)).toEqual(["cozy_pack"]);
    expect((await route(post("/v1/workshop/moderate", { id: "cozy_pack", status: "approved" }, { authorization: `Bearer ${ADMIN}` }), e, ctx)).status).toBe(200);
    const list = (await (await route(req("/v1/workshop?sort=top"), e, ctx)).json()) as { items: Record<string, unknown>[] };
    expect(list.items.map((i) => i.id)).toEqual(["cozy_pack"]);
    expect(list.items[0]).not.toHaveProperty("owner");
    const got = (await (await route(req("/v1/workshop/item/cozy_pack"), e, ctx)).json()) as { item: { downloads: number }; pack: { files: unknown[] } };
    expect(got.pack.files.length).toBe(2);
    const like1 = (await (await route(post("/v1/workshop/like", { deviceId: "device-12345678", id: "cozy_pack" }), e, ctx)).json()) as { likes: number };
    const like2 = (await (await route(post("/v1/workshop/like", { deviceId: "device-12345678", id: "cozy_pack" }), e, ctx)).json()) as { likes: number };
    expect([like1.likes, like2.likes]).toEqual([1, 0]);
    const creator = (await (await route(req("/v1/workshop/creator/mert_dev"), e, ctx)).json()) as { packs: number };
    expect(creator.packs).toBe(1);
    // ham cihaz kimliği hiçbir anahtar/değerde yok
    for (const [k, v] of e.DUNNO_KV.store) expect(k + v).not.toContain("device-12345678");
  });

  it("başkasının paket id'si alınamaz; günde 3 yükleme", async () => {
    const e = env();
    await route(post("/v1/workshop/upload", { deviceId: "device-aaaaaaaa", handle: "first", pack: pack("shared_id") }), e, ctx);
    const taken = await route(post("/v1/workshop/upload", { deviceId: "device-bbbbbbbb", handle: "second", pack: pack("shared_id") }), e, ctx);
    expect(taken.status).toBe(409);
    for (const n of [1, 2]) await route(post("/v1/workshop/upload", { deviceId: "device-aaaaaaaa", handle: "first", pack: pack(`p${n}x`) }), e, ctx);
    const fourth = await route(post("/v1/workshop/upload", { deviceId: "device-aaaaaaaa", handle: "first", pack: pack("p4x") }), e, ctx);
    expect(fourth.status).toBe(429);
  });
});

describe("FB6 workshop launch ayarları", () => {
  it("yükleme varsayılan kapalı; davetli modda sadece listedekiler; inceleme ucu sadece yönetici", async () => {
    const e = { ...env(), WORKSHOP_UPLOADS: undefined };
    expect((await route(post("/v1/workshop/upload", { deviceId: "device-12345678", handle: "mert_dev", pack: pack() }), e, ctx)).status).toBe(403);
    const inv = { ...env(), WORKSHOP_UPLOADS: "invite", WORKSHOP_INVITES: "mert_dev, ayse" };
    expect((await route(post("/v1/workshop/upload", { deviceId: "device-12345678", handle: "mert_dev", pack: pack() }), inv, ctx)).status).toBe(200);
    expect((await route(post("/v1/workshop/upload", { deviceId: "device-87654321", handle: "baskasi", pack: pack("other_x") }), inv, ctx)).status).toBe(403);
    expect((await route(req("/v1/workshop/review/cozy_pack"), inv, ctx)).status).toBe(403);
    const rv = await route(req("/v1/workshop/review/cozy_pack", { headers: { authorization: `Bearer ${ADMIN}` } }), inv, ctx);
    expect(rv.status).toBe(200);
    expect(((await rv.json()) as { item: Record<string, unknown> }).item).not.toHaveProperty("owner");
  });

  it("yönetici sayfası: sır yok, katı CSP, içerik textContent ile", async () => {
    const r = await route(req("/admin/workshop"), env(), ctx);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-security-policy")).toContain("connect-src 'self'");
    expect(r.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    const html = await r.text();
    expect(html).not.toContain(ADMIN);
    expect(html).not.toContain("innerHTML");
  });
});
