import { describe, expect, it } from "vitest";
import { createTelemetry, eventBody, type TelemetryEvent } from "./telemetry";

const all: TelemetryEvent[] = [
  { event: "app_opened" },
  { event: "question_asked", source: "llm" },
  { event: "achievement_unlocked", id: "poke_100" },
];

describe("telemetry (SPEC 10 CL6)", () => {
  it("kapalıyken ağ çağrısı sıfır", () => {
    let calls = 0;
    const t = createTelemetry(() => false, async () => void calls++);
    for (let i = 0; i < 50; i++) for (const e of all) t.track(e);
    expect(calls).toBe(0);
  });

  it("açıkken sadece izinli alanlar gider; fazladan alan (soru metni, başlık) kopyalanmaz", () => {
    const sent: string[] = [];
    const t = createTelemetry(() => true, async (b) => void sent.push(b));
    t.track({ event: "question_asked", source: "pool", question: "su kaç derecede kaynar", title: "x - YouTube" } as unknown as TelemetryEvent);
    t.track({ event: "app_opened", deviceId: "abc" } as unknown as TelemetryEvent);
    expect(sent).toEqual(['{"event":"question_asked","source":"pool"}', '{"event":"app_opened"}']);
    expect(sent.join()).not.toMatch(/kaynar|YouTube|abc/);
  });

  it("geçersiz değer gönderilmez", () => {
    expect(eventBody({ event: "question_asked", source: "nope" as "llm" })).toBeNull();
    expect(eventBody({ event: "achievement_unlocked", id: "Bir Başlık" })).toBeNull();
    expect(eventBody({ event: "window_title" } as unknown as TelemetryEvent)).toBeNull();
  });

  it("açık/kapalı her olayda okunur (kapatınca anında durur), birikip sonra gitmez", () => {
    let on = true;
    let calls = 0;
    const t = createTelemetry(() => on, async () => void calls++);
    t.track({ event: "app_opened" });
    on = false;
    t.track({ event: "app_opened" });
    on = true;
    expect(calls).toBe(1);
  });

  it("gönderim hatası sessiz", async () => {
    const t = createTelemetry(() => true, () => Promise.reject(new Error("offline")));
    expect(() => t.track({ event: "app_opened" })).not.toThrow();
  });
});
