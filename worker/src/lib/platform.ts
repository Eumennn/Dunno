export type Platform = "windows" | "mac";

/** User-Agent'tan indirme platformu. Tanınmayan her şey windows. */
export function platformFromUserAgent(ua: string | null | undefined): Platform {
  if (!ua) return "windows";
  // iPhone/iPad UA'ları "like Mac OS X" içerir ama "Macintosh" içermez.
  return /Macintosh/i.test(ua) ? "mac" : "windows";
}
