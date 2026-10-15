import type { Env } from "../lib/env";
import { error } from "../lib/http";
import { etagFor, readLatestRaw } from "../lib/lines";
import { LANGS, type Lang } from "../lib/validate";

export const LINES_CACHE = "public, max-age=300";
const EMPTY = JSON.stringify({ date: null, lines: [] });

function matches(ifNoneMatch: string | null, etag: string): boolean {
  if (!ifNoneMatch) return false;
  return ifNoneMatch
    .split(",")
    .map((t) => t.trim().replace(/^W\//, ""))
    .some((t) => t === "*" || t === etag);
}

// GET /v1/lines?lang=tr|en -> 200 {date, lines} + ETag · 304 · hiç set yoksa {date:null, lines:[]}
export async function handleLines(request: Request, env: Env): Promise<Response> {
  const lang = new URL(request.url).searchParams.get("lang");
  if (!(LANGS as readonly string[]).includes(lang ?? "")) return error(400, "invalid lang");

  let body: string;
  try {
    body = (await readLatestRaw(env.DUNNO_KV, lang as Lang)) ?? EMPTY;
  } catch {
    // KV yoksa boş set; önbelleğe alınmaz
    return new Response(EMPTY, { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
  }

  const etag = await etagFor(body);
  const headers = { etag, "cache-control": LINES_CACHE };
  if (matches(request.headers.get("if-none-match"), etag)) return new Response(null, { status: 304, headers });
  return new Response(body, { headers: { ...headers, "content-type": "application/json; charset=utf-8" } });
}
