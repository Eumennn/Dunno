// İsteğe bağlı kullanım istatistiği (SPEC 10 CL6). Clicky'deki tek dosyalık olay sarmalayıcı fikri; üçüncü taraf SDK yok.
// Varsayılan KAPALI; settings.exe'de açık rıza. Kapalıyken ağ çağrısı SIFIR (testli).
// Açıkken sadece sayısal/anonim olay: app_opened, question_asked{source}, achievement_unlocked{id}.
// Soru metni, pencere başlığı, cihaz kimliği, kişisel veri ASLA: izinli alan listesi dışında hiçbir şey gövdeye girmez.
// Hedef kendi Worker'ımız: POST /v1/event (KV sayaç, çerezsiz; worker/src/lib/event.ts aynı listeyi doğrular).

export const EVENTS = ["app_opened", "question_asked", "achievement_unlocked"] as const;
export const SOURCES = ["llm", "pool", "local"] as const;

export type TelemetryEvent =
  | { event: "app_opened" }
  | { event: "question_asked"; source: (typeof SOURCES)[number] }
  | { event: "achievement_unlocked"; id: string };

const ACH_ID = /^[a-z][a-z0-9_]{1,39}$/;

/** Gövde: sadece izinli anahtarlar (çağıran fazladan alan verse de kopyalanmaz). Geçersizse null. */
export function eventBody(e: TelemetryEvent): string | null {
  switch (e.event) {
    case "app_opened":
      return JSON.stringify({ event: "app_opened" });
    case "question_asked":
      return (SOURCES as readonly string[]).includes(e.source) ? JSON.stringify({ event: "question_asked", source: e.source }) : null;
    case "achievement_unlocked":
      return ACH_ID.test(e.id) ? JSON.stringify({ event: "achievement_unlocked", id: e.id }) : null;
    default:
      return null;
  }
}

export interface Telemetry {
  track(e: TelemetryEvent): void;
}

/**
 * enabled: settings.telemetry (her olayda okunur; kapatınca anında durur). send: ağ (testte sahte).
 * Hata sessiz; yeniden deneme yok, kuyruk yok (kapalıyken birikip sonra gitmez).
 */
export function createTelemetry(enabled: () => boolean, send: (body: string) => Promise<unknown>): Telemetry {
  return {
    track(e) {
      if (!enabled()) return;
      const body = eventBody(e);
      if (body) void send(body).catch(() => undefined);
    },
  };
}

/** Gerçek gönderici: çerezsiz (credentials omit), keepalive, kısa. */
export function httpSender(baseUrl: string): (body: string) => Promise<unknown> {
  return (body) =>
    fetch(`${baseUrl}/v1/event`, { method: "POST", headers: { "content-type": "application/json" }, body, credentials: "omit", keepalive: true });
}
