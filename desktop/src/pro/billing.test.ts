import { describe, expect, it } from "vitest";
import { claimLicense, refreshLicense, shouldRefresh } from "./billing";

const fake = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe("ödeme -> lisans istemcisi", () => {
  it("lisans gelirse ok, hata durumu taşınır, ağ yoksa 0", async () => {
    expect(await claimLicense("9001", "a@b.c", "http://x", fake(200, { license: "DUNNO1.a.b" }))).toEqual({ ok: true, license: "DUNNO1.a.b" });
    expect(await claimLicense("9001", "a@b.c", "http://x", fake(404, { error: "no" }))).toEqual({ ok: false, status: 404 });
    expect(await refreshLicense("DUNNO1.a.b", "http://x", (async () => { throw new Error("off"); }) as unknown as typeof fetch)).toEqual({ ok: false, status: 0 });
    expect(await claimLicense("9001", "a@b.c", "http://x", fake(200, { license: "<script>" }))).toEqual({ ok: false, status: 502 });
  });
  it("yenileme: süresiz lisans hiç, bitişe 10 gün kala ve geçince evet", () => {
    expect(shouldRefresh(null, "2026-10-10")).toBe(false);
    expect(shouldRefresh("2026-11-30", "2026-10-10")).toBe(false);
    expect(shouldRefresh("2026-10-20", "2026-10-10")).toBe(true);
    expect(shouldRefresh("2026-10-01", "2026-10-10")).toBe(true);
  });
});
