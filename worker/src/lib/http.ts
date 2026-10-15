export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  if (!headers.has("cache-control")) headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

/** Hata metni marka sesinde olmalı: küçük harf, ünlemsiz. Soru metni asla eklenmez. */
export function error(status: number, message: string): Response {
  return json({ error: message }, { status });
}

/**
 * CORS: sadece masaüstü uygulaması (Tauri webview) ve site.
 * Site origin'i yer tutucu; gerçek domain belli olunca değişir.
 */
export const ALLOWED_ORIGINS: readonly string[] = [
  "tauri://localhost", // Tauri, macOS
  "http://tauri.localhost", // Tauri, Windows
  "http://localhost:1420", // Tauri dev (vite)
  "https://example.com", // site, yer tutucu
];

export const isAllowedOrigin = (origin: string | null): origin is string =>
  origin !== null && ALLOWED_ORIGINS.includes(origin);

/** İzinli origin'den gelen yanıta CORS başlıklarını ekler; diğerlerine dokunmaz (her zaman Vary). */
export function withCors(res: Response, origin: string | null): Response {
  const out = new Response(res.body, res);
  out.headers.append("vary", "origin");
  if (isAllowedOrigin(origin)) {
    out.headers.set("access-control-allow-origin", origin);
    out.headers.set("access-control-expose-headers", "etag");
  }
  return out;
}

/** OPTIONS ön kontrolü: izinli origin 204, diğerleri 403. */
export function preflight(origin: string | null, methods: string[]): Response {
  if (!isAllowedOrigin(origin)) return error(403, "origin not allowed");
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": origin,
      "access-control-allow-methods": [...methods, "OPTIONS"].join(", "),
      "access-control-allow-headers": "content-type, if-none-match",
      "access-control-max-age": "86400",
      vary: "origin",
    },
  });
}
