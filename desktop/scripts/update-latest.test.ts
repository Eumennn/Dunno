// SPEC 10 CL1: latest.json üretimi ve yerel sahte sunucu üzerinden uçtan uca okuma (gerçek yayın yok).
// Uygulamanın kurulum adımı (imza doğrulama + NSIS) Windows'ta elle: manuel test bölüm 17.
import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";
import { isNewer } from "../src/update/update";
// @ts-expect-error saf .mjs, tip yok
import { latestJson, sources } from "./make-latest.mjs";
// @ts-expect-error saf .mjs, tip yok
import { updateServer } from "./serve-update.mjs";

const SIG = "dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkK"; // sahte (biçim testi)

describe("latest.json (SPEC 10 CL1)", () => {
  it("sürüm, not ve URL worker releases.json ile aynı kaynaktan; Tauri updater biçimi", () => {
    const src = sources();
    const j = latestJson({ ...src, signature: `${SIG}\n`, date: "2026-10-06T12:00:00Z" });
    expect(j).toEqual({
      version: src.version,
      notes: src.notes,
      pub_date: "2026-10-06T12:00:00.000Z",
      platforms: { "windows-x86_64": { signature: SIG, url: src.url } },
    });
    expect(src.url.endsWith(`Dunno_${src.version}_x64-setup.exe`)).toBe(true);
    expect(src.sig.replaceAll("\\", "/")).toMatch(/target\/release\/bundle\/nsis\/Dunno_[\d.]+_x64-setup\.exe\.sig$/);
  });

  it("bozuk girdi reddedilir (imza yok, sürüm bozuk, url yok)", () => {
    const ok = { version: "0.1.1", notes: "", url: "https://example.com/a.exe", signature: SIG };
    expect(() => latestJson({ ...ok, signature: " " })).toThrow(/signature/);
    expect(() => latestJson({ ...ok, version: "1.0" })).toThrow(/version/);
    expect(() => latestJson({ ...ok, url: "file:///x" })).toThrow(/url/);
    expect(() => latestJson({ ...ok, mac: { signature: SIG, url: undefined } })).toThrow(/mac url/);
  });

  it("mac (SPEC 19): universal paket iki darwin platformuna yazılır", () => {
    const ok = { version: "0.1.1", notes: "", url: "https://example.com/a.exe", signature: SIG };
    const j = latestJson({ ...ok, mac: { signature: SIG, url: "https://example.com/Dunno.app.tar.gz" } });
    expect(Object.keys(j.platforms).sort()).toEqual(["darwin-aarch64", "darwin-x86_64", "windows-x86_64"]);
    expect(j.platforms["darwin-aarch64"].url).toBe("https://example.com/Dunno.app.tar.gz");
  });

  it("uçtan uca: yerel sahte sunucudan latest.json ve kurulum dosyası okunur, eski sürüme göre yeni sayılır", async () => {
    const latest = latestJson({ version: "0.1.1", notes: "yerel", url: "http://127.0.0.1/x", signature: SIG });
    const exe = Buffer.from("MZ fake installer");
    const server = updateServer(latest, { "/Dunno_0.1.1_x64-setup.exe": exe });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
    const { port } = server.address() as AddressInfo;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/latest.json`);
      expect(res.headers.get("content-type")).toBe("application/json");
      const got = (await res.json()) as typeof latest;
      expect(got).toEqual(latest);
      expect(isNewer(got.version, "0.1.0")).toBe(true);
      expect(isNewer(got.version, "0.1.1")).toBe(false);
      const file = await fetch(`http://127.0.0.1:${port}/Dunno_0.1.1_x64-setup.exe`);
      expect(Buffer.from(await file.arrayBuffer())).toEqual(exe);
      expect((await fetch(`http://127.0.0.1:${port}/nope`)).status).toBe(404);
      expect((await fetch(`http://127.0.0.1:${port}/latest.json`, { method: "POST" })).status).toBe(405);
    } finally {
      server.close();
    }
  });
});
