// SPEC 10 CL6: /v1/event sadece izinli sayısal/anonim olaylar; KV sayaç; çerez/IP yok; istemciyle aynı olay listesi.
import { describe, expect, it } from "vitest";
import telemetrySrc from "../../desktop/src/telemetry.ts?raw";
import worker from "../src/index";
import type { Env } from "../src/lib/env";
import { EVENTS, eventKey, parseEvent, SOURCES } from "../src/lib/event";
import { memoryKV } from "./helpers";

const ctx = { waitUntil: () => {} };
const post = (body: unknown, env: Partial<Env>, headers: Record<string, string> = {}) =>
  worker.fetch(
    new Request("http://localhost/v1/event", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) }),
    env as Env,
    ctx,
  );
const today = () => new Date().toISOString().slice(0, 10);

describe("parseEvent", () => {
  it("izinli olaylar", () => {
    expect(parseEvent({ event: "app_opened" })).toEqual({ event: "app_opened" });
    expect(parseEvent({ event: "question_asked", source: "llm" })).toEqual({ event: "question_asked", source: "llm" });
    expect(parseEvent({ event: "achievement_unlocked", id: "poke_100" })).toEqual({ event: "achievement_unlocked", id: "poke_100" });
  });

  it("fazla alan, metin, bilinmeyen olay reddedilir", () => {
    expect(parseEvent({ event: "app_opened", deviceId: "x" })).toBeNull();
    expect(parseEvent({ event: "question_asked", source: "llm", question: "su kaç derecede kaynar" })).toBeNull();
    expect(parseEvent({ event: "question_asked", source: "su kaç derecede kaynar" })).toBeNull();
    expect(parseEvent({ event: "achievement_unlocked", id: "Bir Başlık - YouTube" })).toBeNull();
    expect(parseEvent({ event: "window_title", title: "x" })).toBeNull();
    expect(parseEvent([{ event: "app_opened" }])).toBeNull();
    expect(parseEvent(null)).toBeNull();
  });

  it("anahtar: gün + olay + izinli alan", () => {
    expect(eventKey({ event: "question_asked", source: "pool" }, "2026-10-06")).toBe("ev:2026-10-06:question_asked:pool");
    expect(eventKey({ event: "app_opened" }, "2026-10-06")).toBe("ev:2026-10-06:app_opened");
  });
});

describe("POST /v1/event", () => {
  it("geçerli olay sayılır, 204, çerez yok, başlıklar (IP) saklanmaz", async () => {
    const kv = memoryKV();
    const env = { DUNNO_KV: kv };
    const r1 = await post({ event: "app_opened" }, env, { "cf-connecting-ip": "1.2.3.4", "user-agent": "secret-ua" });
    const r2 = await post({ event: "app_opened" }, env);
    expect([r1.status, r2.status]).toEqual([204, 204]);
    expect(r1.headers.get("set-cookie")).toBeNull();
    expect(kv.store.get(`ev:${today()}:app_opened`)).toBe("2");
    const dump = JSON.stringify([...kv.store]);
    expect(dump).not.toContain("1.2.3.4");
    expect(dump).not.toContain("secret-ua");
  });

  it("geçersiz 400, büyük gövde 413, GET 405; hiçbirinde KV yazılmaz", async () => {
    const kv = memoryKV();
    const env = { DUNNO_KV: kv };
    expect((await post({ event: "question_asked", source: "llm", text: "soru" }, env)).status).toBe(400);
    expect((await post("not json", env)).status).toBe(400);
    expect((await post({ event: "app_opened", pad: "x".repeat(300) }, env)).status).toBe(413);
    const get = await worker.fetch(new Request("http://localhost/v1/event"), env as Env, ctx);
    expect(get.status).toBe(405);
    expect(kv.store.size).toBe(0);
  });

  it("KV bozuksa da 204 (istemci tekrar denemez)", async () => {
    const broken = { get: () => Promise.reject(new Error("kv")), put: () => Promise.reject(new Error("kv")) };
    expect((await post({ event: "app_opened" }, { DUNNO_KV: broken })).status).toBe(204);
  });

  it("olay ve kaynak listesi istemciyle (desktop telemetry.ts) aynı", () => {
    const list = (name: string) => [...new RegExp(`export const ${name} = \\[([^\\]]*)\\]`).exec(telemetrySrc)![1].matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
    expect(list("EVENTS")).toEqual([...EVENTS]);
    expect(list("SOURCES")).toEqual([...SOURCES]);
  });
});
