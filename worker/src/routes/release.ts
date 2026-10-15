import { json } from "../lib/http";
import { platformFromUserAgent } from "../lib/platform";
import { downloadUrl, release } from "../lib/release";

// GET /v1/release -> sürüm metadata'sı (src/data/releases.json).
export function handleRelease(): Response {
  return json(release, { headers: { "cache-control": "public, max-age=300" } });
}

// GET /download -> User-Agent'a göre platform dosyasına 302.
export function handleDownload(request: Request): Response {
  const platform = platformFromUserAgent(request.headers.get("user-agent"));
  return new Response(null, {
    status: 302,
    headers: {
      location: downloadUrl(release, platform),
      "cache-control": "no-store",
    },
  });
}
