import type { Env } from "../lib/env";
import { error } from "../lib/http";
import { EVENT_TTL_S, eventKey, MAX_EVENT_BYTES, parseEvent } from "../lib/event";

// POST /v1/event (SPEC 10 CL6): {event, (source|id)} -> 204. Geçersiz/fazla alan -> 400, büyük gövde -> 413.
// İstek başlıkları (IP, user-agent) okunmaz; yanıtta çerez yok. KV yazılamazsa da 204 (istemci tekrar denemez).
export async function handleEvent(request: Request, env: Env): Promise<Response> {
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_EVENT_BYTES) return error(413, "too big");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return error(400, "invalid event");
  }
  const ev = parseEvent(raw);
  if (!ev) return error(400, "invalid event");
  const key = eventKey(ev, new Date().toISOString().slice(0, 10));
  try {
    const n = Number((await env.DUNNO_KV.get(key)) ?? "0") || 0;
    await env.DUNNO_KV.put(key, String(n + 1), { expirationTtl: EVENT_TTL_S });
  } catch {
    // sayaç kaybı kabul: kullanıcıya etkisi yok
  }
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}
