// Kullanım istatistiği (SPEC 10 CL6, saf): istemci isteğe bağlı (varsayılan KAPALI) sadece sayısal/anonim olay yollar.
// İzinli olaylar ve alanlar dışında her şey reddedilir: soru metni, pencere başlığı, cihaz kimliği, IP saklanmaz.
// Sayaç: KV'de gün + olay (+ izinli tek alan) başına bir sayı. Çerez yok, kullanıcı ayrımı yok.

export const EVENTS = ["app_opened", "question_asked", "achievement_unlocked"] as const;
export type EventName = (typeof EVENTS)[number];

/** question_asked kaynağı (reply.ts source ile aynı değerler) */
export const SOURCES = ["llm", "pool", "local"] as const;

/** başarım id'si biçimi (desktop/src/wardrobe/achievements.ts) */
const ACH_ID = /^[a-z][a-z0-9_]{1,39}$/;

/** gövde üst sınırı (bayt): olay + tek alan bundan büyük olamaz */
export const MAX_EVENT_BYTES = 256;
/** sayaçlar ~13 ay tutulur */
export const EVENT_TTL_S = 400 * 24 * 3600;

export type ValidEvent =
  | { event: "app_opened" }
  | { event: "question_asked"; source: (typeof SOURCES)[number] }
  | { event: "achievement_unlocked"; id: string };

/** Ham gövde -> geçerli olay ya da null. Bilinmeyen anahtar varsa da null (fazladan veri kabul edilmez). */
export function parseEvent(raw: unknown): ValidEvent | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const keys = Object.keys(r);
  switch (r.event) {
    case "app_opened":
      return keys.length === 1 ? { event: "app_opened" } : null;
    case "question_asked":
      return keys.length === 2 && (SOURCES as readonly unknown[]).includes(r.source)
        ? { event: "question_asked", source: r.source as (typeof SOURCES)[number] }
        : null;
    case "achievement_unlocked":
      return keys.length === 2 && typeof r.id === "string" && ACH_ID.test(r.id) ? { event: "achievement_unlocked", id: r.id } : null;
    default:
      return null;
  }
}

/** KV sayaç anahtarı: ev:<gün>:<olay>[:<alan>] */
export function eventKey(e: ValidEvent, day: string): string {
  const extra = e.event === "question_asked" ? `:${e.source}` : e.event === "achievement_unlocked" ? `:${e.id}` : "";
  return `ev:${day}:${e.event}${extra}`;
}
