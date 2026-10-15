import type { Ctx, Env } from "./lib/env";
import { error, json, preflight, withCors } from "./lib/http";
import { generateAll } from "./lib/lines";
import { poolAnswer } from "./lib/pool";
import { handleAsk } from "./routes/ask";
import { handleEvent } from "./routes/event";
import { handleLines } from "./routes/lines";
import { handleDownload, handleRelease } from "./routes/release";
import { handleWorkshop } from "./routes/workshop";
import { handleCreateWorld } from "./routes/create";
import { handleAdminWorkshop } from "./routes/admin";
import { handleLemonWebhook, handleLicenseClaim, handleLicenseRefresh } from "./routes/billing";

type Handler = (request: Request, env: Env, ctx: Ctx) => Response | Promise<Response>;

// yol -> metot -> handler
const routes: Record<string, Partial<Record<string, Handler>>> = {
  "/v1/ask": { POST: handleAsk },
  "/v1/event": { POST: handleEvent },
  "/v1/lines": { GET: handleLines },
  "/v1/release": { GET: handleRelease },
  "/v1/create/world": { POST: handleCreateWorld },
  "/download": { GET: handleDownload },
  "/admin/workshop": { GET: handleAdminWorkshop },
  "/v1/billing/lemonsqueezy": { POST: handleLemonWebhook },
  "/v1/license/claim": { POST: handleLicenseClaim },
  "/v1/license/refresh": { POST: handleLicenseRefresh },
};

export async function route(request: Request, env: Env, ctx: Ctx): Promise<Response> {
  const { pathname } = new URL(request.url);
  // SPEC 18 workshop: alt yollar (item/<id>, creator/<ad>, upload, like, moderate, pending)
  const methods = pathname === "/v1/workshop" || pathname.startsWith("/v1/workshop/") ? { GET: handleWorkshop, POST: handleWorkshop } : routes[pathname];
  if (!methods) return error(404, "not found");

  if (request.method === "OPTIONS") return preflight(request.headers.get("origin"), Object.keys(methods));

  const handler = methods[request.method] ?? (request.method === "HEAD" ? methods.GET : undefined);
  if (!handler) {
    const res = error(405, "method not allowed");
    res.headers.set("allow", [...Object.keys(methods), "OPTIONS"].join(", "));
    return res;
  }
  return handler(request, env, ctx);
}

/** Origin okuma bile patlarsa CORS'suz devam. */
function originOf(request: Request): string | null {
  try {
    return request.headers.get("origin");
  } catch {
    return null;
  }
}

/**
 * Beklenmeyen hata: /v1/ask'te kullanıcı fark etmesin (200 + havuz, dil/mod bilinmediği için en/polite),
 * diğer uçlarda 500 sabit metin. Hata ayrıntısı yanıta da loga da girmez.
 */
export function unexpected(request: Request): Response {
  let pathname = "";
  try {
    pathname = new URL(request.url).pathname;
  } catch {
    // yol bile okunamadıysa 500
  }
  if (pathname === "/v1/ask" && request.method === "POST") {
    return json({ answer: poolAnswer("en", "polite"), source: "pool" });
  }
  return error(500, "internal error");
}

export default {
  async fetch(request: Request, env: Env, ctx: Ctx): Promise<Response> {
    let res: Response;
    try {
      res = await route(request, env, ctx);
    } catch {
      res = unexpected(request);
    }
    return withCors(res, originOf(request));
  },

  // cron: günlük laf üretimi (tr + en); hata sessizce yutulur, önceki gün kalır
  async scheduled(_controller: unknown, env: Env, ctx: Ctx): Promise<void> {
    ctx.waitUntil(generateAll(env).catch(() => undefined));
  },
};
