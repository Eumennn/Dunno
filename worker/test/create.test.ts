import { describe, expect, it } from "vitest";
import { route } from "../src/index";
import { checkPrompt, PALETTES, verifyPro, worldToPack } from "../src/lib/create";
import { checkPack } from "../src/lib/workshop";
import { FAKE_WORLD } from "../src/routes/create";
import { memoryKV } from "./helpers";

const ctx = { waitUntil: () => undefined };
const post = (body: unknown) => new Request("https://w.test/v1/create/world", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });

describe("AI dünya üretici", () => {
  it("fikir: uzunluk ve yasak konu", () => {
    expect(checkPrompt("dunno'nun yozlaşmış bir ceo olduğu dünya").ok).toBe(true);
    expect(checkPrompt("x".repeat(141))).toEqual({ ok: false, error: "idea too long" });
    expect(checkPrompt("a world about religion")).toEqual({ ok: false, error: "idea not allowed" });
  });

  it("model çıktısı sıkı doğrulanır; paket workshop kontrolünden geçer, renkler onaylı paletten", () => {
    const pack = worldToPack(FAKE_WORLD, "ab12")!;
    expect(pack.dir).toBe("ai_corrupt_office_ab12");
    expect(checkPack(pack).ok).toBe(true);
    const theme = JSON.parse(pack.files.find((f) => f.path.startsWith("themes/"))!.text!);
    expect(Object.values(PALETTES)).toContainEqual(theme.colors);
    // kötü çıktılar: büyük harf, ünlem, yasak konu, uydurma palet, az laf
    expect(worldToPack({ ...FAKE_WORLD, palette: "neon_pink" }, "x")).toBeNull();
    expect(worldToPack({ ...FAKE_WORLD, name: { tr: "BÜYÜK", en: "Big" } }, "x")).toBeNull();
    expect(worldToPack({ ...FAKE_WORLD, lines: FAKE_WORLD.lines.slice(0, 3) }, "x")).toBeNull();
    const bad = { ...FAKE_WORLD, lines: FAKE_WORLD.lines.map((l) => ({ ...l, tr: `${l.tr}!` })) };
    expect(worldToPack(bad, "x")).toBeNull();
  });

  it("Pro değilse 402; yerel geliştirmede sahte llm ile paket döner ve günde 3", async () => {
    const kv = memoryKV();
    const prod = await route(post({ deviceId: "device-12345678", idea: "space office", license: "nope" }), { DUNNO_KV: kv, PRO_PUBKEY: "AAAA", RL_SALT: "s" }, ctx);
    expect(prod.status).toBe(402);
    const env = { DUNNO_KV: kv, ENVIRONMENT: "dev", DUNNO_FAKE_LLM: "1" };
    for (let i = 0; i < 3; i++) expect((await route(post({ deviceId: "device-12345678", idea: "corrupt ceo" }), env, ctx)).status).toBe(200);
    expect((await route(post({ deviceId: "device-12345678", idea: "corrupt ceo" }), env, ctx)).status).toBe(429);
  });

  it("lisans doğrulama (Ed25519)", async () => {
    const kp = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])) as CryptoKeyPair;
    const raw = new Uint8Array((await crypto.subtle.exportKey("raw", kp.publicKey)) as ArrayBuffer);
    const pub = btoa(String.fromCharCode(...raw));
    const enc = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const body = new TextEncoder().encode(JSON.stringify({ v: 1, id: "lic_abcdef12", tier: "pro", issued: "2026-10-10" }));
    const sig = new Uint8Array(await crypto.subtle.sign({ name: "Ed25519" }, kp.privateKey, body));
    const lic = `DUNNO1.${enc(body)}.${enc(sig)}`;
    expect(await verifyPro(lic, pub)).toBe(true);
    expect(await verifyPro(lic.slice(0, -2) + "AA", pub)).toBe(false);
    expect(await verifyPro(lic, undefined)).toBe(false);
  });
});
