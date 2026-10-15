// Ödeme -> lisans istemcisi (worker /v1/license/claim, /v1/license/refresh). Lisans metni sadece Rust komutuna gider (license_activate);
// store'a yazılmaz. Sipariş numarası + e-posta sadece bu istekle gider; uygulama saklamaz.
import { DEFAULT_BASE_URL } from "../api";

export type BillingResult = { ok: true; license: string } | { ok: false; status: number };

async function post(path: string, body: unknown, base: string, fetcher: typeof fetch): Promise<BillingResult> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8_000);
  try {
    const r = await fetcher(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: ctl.signal });
    if (!r.ok) return { ok: false, status: r.status };
    const j = (await r.json()) as { license?: unknown };
    return typeof j.license === "string" && j.license.startsWith("DUNNO1.") ? { ok: true, license: j.license } : { ok: false, status: 502 };
  } catch {
    return { ok: false, status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

export const claimLicense = (order: string, email: string, base = DEFAULT_BASE_URL, fetcher: typeof fetch = fetch) =>
  post("/v1/license/claim", { order: order.trim(), email: email.trim() }, base, fetcher);

export const refreshLicense = (license: string, base = DEFAULT_BASE_URL, fetcher: typeof fetch = fetch) => post("/v1/license/refresh", { license }, base, fetcher);

/** abonelik bitişine bu kadar gün kala (ya da geçtiyse) yenileme denenir */
export const REFRESH_WITHIN_DAYS = 10;

/** saf: yenileme zamanı mı (until YYYY-MM-DD, today YYYY-MM-DD) */
export function shouldRefresh(until: string | null | undefined, today: string): boolean {
  if (!until) return false;
  const days = (Date.parse(`${until}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000;
  return days <= REFRESH_WITHIN_DAYS;
}
