// /v1/workshop* (SPEC 18 Faz 2). Uçlar:
//   GET  /v1/workshop?sort=new|top&kind=<tür>        onaylı paket özetleri
//   GET  /v1/workshop/item/<id>                       özet + paket (indirme sayılır)
//   GET  /v1/workshop/creator/<takma ad>              yaratıcı profili (onaylı paketleri)
//   POST /v1/workshop/upload   {deviceId, handle, pack}  -> pending (cihaz başı günde 3)
//   POST /v1/workshop/like     {deviceId, id}           beğeni aç/kapat (cihaz başı bir)
//   POST /v1/workshop/moderate {id, status}  Authorization: Bearer WORKSHOP_ADMIN_TOKEN
//   GET  /v1/workshop/pending  (yönetici)               onay bekleyenler
//   GET  /v1/workshop/review/<id> (yönetici)            bekleyen paketin tamamı (inceleme; indirme sayılmaz)
// Yükleme anahtarı (FB6): WORKSHOP_UPLOADS = open | invite (+ WORKSHOP_INVITES) | kapalı (varsayılan). Yönetici sayfası: /admin/workshop
// Sahiplik ve beğeni tuzlu cihaz hash'iyle; ham kimlik/IP saklanmaz. Tuz yoksa (canlıda RL_SALT eksik) yazma kapalı.
import type { Ctx, Env } from "../lib/env";
import { error, json } from "../lib/http";
import { deviceHash, rateLimitSalt, utcDay } from "../lib/ratelimit";
import { DEVICE_ID } from "../lib/validate";
import {
  checkPack,
  HANDLE,
  INDEX_KEY,
  itemKey,
  likeKey,
  listApproved,
  packKey,
  PENDING_KEY,
  readIndex,
  readJson,
  summary,
  uploadsKey,
  WS_KINDS,
  WS_UPLOADS_PER_DAY,
  type Item,
  type Pack,
  type Status,
} from "../lib/workshop";

const ipOf = (r: Request) => r.headers.get("cf-connecting-ip") ?? "0.0.0.0";

async function body(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const b = (await request.json()) as unknown;
    return typeof b === "object" && b !== null ? (b as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** FB6: launch'ta yükleme kapalı ya da davetli (moderasyon kuyruğu tek kişilik) */
export function uploadsOpenFor(env: Env, handle: string): boolean {
  const mode = (env.WORKSHOP_UPLOADS ?? "").trim();
  if (mode === "open") return true;
  if (mode !== "invite") return false;
  return (env.WORKSHOP_INVITES ?? "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .includes(handle);
}

function isAdmin(request: Request, env: Env): boolean {
  const token = env.WORKSHOP_ADMIN_TOKEN;
  return !!token && token.length >= 24 && request.headers.get("authorization") === `Bearer ${token}`;
}

export async function handleWorkshop(request: Request, env: Env, _ctx: Ctx): Promise<Response> {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean); // v1, workshop, ...
  const sub = parts[2] ?? "";
  const kv = env.DUNNO_KV;

  if (request.method === "GET" && sub === "") {
    const sort = url.searchParams.get("sort") === "top" ? "top" : "new";
    const kind = url.searchParams.get("kind");
    const k = kind && (WS_KINDS as readonly string[]).includes(kind) ? kind : undefined;
    return json({ items: await listApproved(kv, sort, k) }, { headers: { "cache-control": "public, max-age=60" } });
  }

  if (request.method === "GET" && sub === "item" && parts[3]) {
    const id = parts[3];
    const item = await readJson<Item>(kv, itemKey(id));
    if (!item || item.status !== "approved") return error(404, "not found");
    const pack = await readJson<Pack>(kv, packKey(id));
    if (!pack) return error(404, "not found");
    await kv.put(itemKey(id), JSON.stringify({ ...item, downloads: item.downloads + 1 }));
    return json({ item: summary(item), pack });
  }

  if (request.method === "GET" && sub === "creator" && parts[3]) {
    const handle = parts[3];
    if (!HANDLE.test(handle)) return error(404, "not found");
    const items = (await listApproved(kv, "top")).filter((i) => i.author === handle);
    const likes = items.reduce((a, i) => a + i.likes, 0);
    return json({ handle, items, likes, packs: items.length });
  }

  if (request.method === "GET" && sub === "pending") {
    if (!isAdmin(request, env)) return error(403, "forbidden");
    const ids = await readIndex(kv, PENDING_KEY);
    const items = (await Promise.all(ids.map((id) => readJson<Item>(kv, itemKey(id))))).filter((x): x is Item => x?.status === "pending");
    return json({ items: items.map(summary) });
  }

  if (request.method === "GET" && sub === "review" && parts[3]) {
    if (!isAdmin(request, env)) return error(403, "forbidden");
    const item = await readJson<Item>(kv, itemKey(parts[3]));
    const pack = await readJson<Pack>(kv, packKey(parts[3]));
    if (!item || !pack) return error(404, "not found");
    return json({ item: summary(item), pack });
  }

  if (request.method !== "POST") return error(405, "method not allowed");
  const b = await body(request);
  if (!b) return error(400, "invalid body");

  if (sub === "moderate") {
    if (!isAdmin(request, env)) return error(403, "forbidden");
    const id = typeof b.id === "string" ? b.id : "";
    const status = b.status === "approved" || b.status === "rejected" ? (b.status as Status) : null;
    const item = await readJson<Item>(kv, itemKey(id));
    if (!item || !status) return error(400, "invalid moderation");
    const premium = b.premium === true;
    await kv.put(itemKey(id), JSON.stringify({ ...item, status, premium }));
    const pending = (await readIndex(kv, PENDING_KEY)).filter((x) => x !== id);
    await kv.put(PENDING_KEY, JSON.stringify(pending));
    const index = (await readIndex(kv)).filter((x) => x !== id);
    if (status === "approved") index.unshift(id);
    await kv.put(INDEX_KEY, JSON.stringify(index));
    return json({ ok: true });
  }

  // cihaz kimliği gereken yazma uçları
  const deviceId = typeof b.deviceId === "string" && DEVICE_ID.test(b.deviceId) ? b.deviceId : null;
  if (!deviceId) return error(400, "invalid device id");
  const salt = rateLimitSalt(env);
  if (salt === null) return error(503, "workshop is resting");
  const hash = await deviceHash(deviceId, "", salt); // IP'siz: beğeni ve sahiplik ağ değişse de aynı cihaz

  if (sub === "like") {
    const id = typeof b.id === "string" ? b.id : "";
    const item = await readJson<Item>(kv, itemKey(id));
    if (!item || item.status !== "approved") return error(404, "not found");
    const liked = (await kv.get(likeKey(id, hash))) === "1";
    await kv.put(likeKey(id, hash), liked ? "0" : "1");
    const likes = Math.max(0, item.likes + (liked ? -1 : 1));
    await kv.put(itemKey(id), JSON.stringify({ ...item, likes }));
    return json({ liked: !liked, likes });
  }

  if (sub === "upload") {
    const handle = typeof b.handle === "string" ? b.handle.toLowerCase() : "";
    if (!HANDLE.test(handle)) return error(400, "invalid handle");
    if (!uploadsOpenFor(env, handle)) return error(403, "uploads are closed for now");
    const day = utcDay(Date.now());
    const ipHash = await deviceHash(deviceId, ipOf(request), salt);
    const used = Number((await kv.get(uploadsKey(ipHash, day))) ?? "0");
    if (used >= WS_UPLOADS_PER_DAY) return error(429, "enough uploads for today");
    const check = checkPack(b.pack);
    if (!check.ok) return error(400, check.error);
    const existing = await readJson<Item>(kv, itemKey(check.item.id));
    if (existing && existing.owner !== hash) return error(409, "id taken");
    const item: Item = {
      ...check.item,
      author: handle,
      owner: hash,
      createdAt: new Date().toISOString(),
      status: "pending",
      likes: existing?.likes ?? 0,
      downloads: existing?.downloads ?? 0,
    };
    await kv.put(uploadsKey(ipHash, day), String(used + 1), { expirationTtl: 48 * 3600 });
    await kv.put(packKey(item.id), JSON.stringify({ dir: item.id, files: (b.pack as Pack).files }));
    await kv.put(itemKey(item.id), JSON.stringify(item));
    const pending = (await readIndex(kv, PENDING_KEY)).filter((x) => x !== item.id);
    await kv.put(PENDING_KEY, JSON.stringify([...pending, item.id]));
    // güncelleme: yeniden onaya düşer (listeden çıkar)
    if (existing) await kv.put(INDEX_KEY, JSON.stringify((await readIndex(kv)).filter((x) => x !== item.id)));
    return json({ ok: true, status: "pending", id: item.id });
  }

  return error(404, "not found");
}
