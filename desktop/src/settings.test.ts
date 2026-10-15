import { describe, expect, it, vi } from "vitest";
import {
  DEVICE_ID_RE,
  isMuted,
  localDate,
  newDeviceId,
  sanitize,
  SETTINGS_EVENT,
  SettingsStore,
  type Backend,
} from "./settings";

function memory(initial?: unknown, opts: { failGet?: boolean } = {}) {
  const data = new Map<string, unknown>();
  if (initial !== undefined) data.set("settings", initial);
  const backend: Backend & { saves: number; data: Map<string, unknown> } = {
    saves: 0,
    data,
    async get(k) {
      if (opts.failGet) throw new Error("corrupt");
      return data.get(k);
    },
    async set(k, v) {
      data.set(k, structuredClone(v));
    },
    async save() {
      backend.saves++;
    },
  };
  return backend;
}

describe("deviceId", () => {
  it("UUID backend formatına uyar", () => {
    for (let i = 0; i < 20; i++) expect(newDeviceId()).toMatch(DEVICE_ID_RE);
  });
});

describe("SettingsStore.open", () => {
  it("boş store'da varsayılanları yazar", async () => {
    const b = memory();
    const s = await SettingsStore.open(b, { newId: () => "device-1234" });
    expect(s.get()).toEqual({
      lang: "tr",
      mode: "polite",
      frequency: "normal",
      deviceId: "device-1234",
      autostart: false,
      muteUntil: null,
      firstRunDone: false,
      bubbleSpeed: "normal",
      darkMode: "off",
      size: 25,
      fart: true,
      tabTitles: true,
      telemetry: false,
      music: false,
      telemetryAsked: false,
      voice: true,
      voiceVolume: 50,
      mods: {},
      personality: "balanced",
      bubbleStyle: "classic",
      voiceStyle: "classic",
    });
    expect(b.data.get("settings")).toEqual(s.get());
    expect(b.saves).toBe(1);
  });

  it("geçerli store'u aynen okur, yeniden yazmaz", async () => {
    const saved = {
      lang: "en",
      mode: "street",
      frequency: "high",
      deviceId: "abcDEF_123-x",
      autostart: true,
      muteUntil: "2026-10-02",
      firstRunDone: true,
      bubbleSpeed: "long",
      darkMode: "system",
      size: 75,
      fart: false,
      tabTitles: false,
      telemetry: true,
      music: true,
      telemetryAsked: true,
      voice: false,
      voiceVolume: 85,
      mods: { pastel: true, other_mod: false },
      personality: "chaotic",
      bubbleStyle: "night",
      voiceStyle: "robot",
    };
    const b = memory(saved);
    const s = await SettingsStore.open(b);
    expect(s.get()).toEqual(saved);
    expect(b.saves).toBe(0);
  });

  it("bubbleSpeed: eski store'da yoksa normal yazılır, geçersiz reddedilir, değişince dinleyiciye gider (SPEC 07 FB5)", async () => {
    const b = memory({ lang: "en", mode: "street", frequency: "high", deviceId: "abcDEF_123-x", autostart: true, muteUntil: null, firstRunDone: true });
    const s = await SettingsStore.open(b);
    expect(s.get().bubbleSpeed).toBe("normal");
    expect(b.saves).toBe(1);
    const seen: string[] = [];
    s.onChange((n) => seen.push(n.bubbleSpeed));
    await s.update({ bubbleSpeed: "short" });
    expect(seen).toEqual(["short"]);
    await expect(s.update({ bubbleSpeed: "fast" as never })).rejects.toThrow(/bubbleSpeed/);
    expect(s.get().bubbleSpeed).toBe("short");
  });

  it("bozuk alanları varsayılana döndürür, sağlamları korur", async () => {
    const b = memory({ lang: "de", mode: "street", frequency: 5, deviceId: "x", firstRunDone: "yes", muteUntil: "dün" });
    const s = await SettingsStore.open(b, { newId: () => "fresh-id-0001" });
    expect(s.get()).toMatchObject({
      lang: "tr",
      mode: "street",
      frequency: "normal",
      deviceId: "fresh-id-0001",
      firstRunDone: false,
      muteUntil: null,
    });
    expect(b.saves).toBe(1);
  });

  it("store tamamen bozuksa (dizi, okuma hatası) varsayılana döner", async () => {
    expect((await SettingsStore.open(memory([1, 2]), { newId: () => "aaaaaaaa" })).get().deviceId).toBe("aaaaaaaa");
    const s = await SettingsStore.open(memory(undefined, { failGet: true }), { newId: () => "bbbbbbbb" });
    expect(s.get().lang).toBe("tr");
  });
});

describe("SettingsStore.update", () => {
  it("kaydeder, dinleyicileri çağırır ve olay yayar", async () => {
    const b = memory();
    const emit = vi.fn();
    const s = await SettingsStore.open(b, { emit, newId: () => "device-1234" });
    const local = vi.fn();
    s.onChange(local);
    await s.update({ lang: "en", firstRunDone: true });
    expect(b.data.get("settings")).toMatchObject({ lang: "en", firstRunDone: true });
    expect(local).toHaveBeenCalledWith(expect.objectContaining({ lang: "en" }));
    expect(emit).toHaveBeenCalledWith(SETTINGS_EVENT, expect.objectContaining({ lang: "en", deviceId: "device-1234" }));
  });

  it("değişiklik yoksa olay yaymaz", async () => {
    const emit = vi.fn();
    const s = await SettingsStore.open(memory(), { emit });
    await s.update({ lang: "tr" });
    expect(emit).not.toHaveBeenCalled();
  });

  it("geçersiz değeri reddeder, deviceId değişmez", async () => {
    const s = await SettingsStore.open(memory(), { newId: () => "device-1234" });
    await expect(s.update({ mode: "uncensored" as never })).rejects.toThrow(/mode/);
    await s.update({ deviceId: "hack" } as never);
    expect(s.get().deviceId).toBe("device-1234");
  });
});

describe("bugün sus", () => {
  const base = sanitize({ muteUntil: "2026-10-02" }).settings;

  it("tarih dahil susar, ertesi gün konuşur", () => {
    expect(isMuted(base, new Date(2026, 9, 2, 23, 59))).toBe(true);
    expect(isMuted(base, new Date(2026, 9, 3, 0, 0))).toBe(false);
    expect(isMuted({ ...base, muteUntil: null }, new Date(2026, 9, 2))).toBe(false);
  });

  it("yerel tarihi sıfır dolgulu yazar", () => {
    expect(localDate(new Date(2026, 0, 5, 1, 0))).toBe("2026-01-05");
  });

  it("mods (SPEC 12 B): yoksa {} (hepsi kapalı), bozuk değer onarılır", async () => {
    const b = memory({ lang: "en", mode: "street", frequency: "high", deviceId: "abcDEF_123-x", autostart: true, muteUntil: null, firstRunDone: true });
    expect((await SettingsStore.open(b)).get().mods).toEqual({});
    for (const bad of [[], "x", { "Bad Id": true }, { ok_id: "yes" }]) {
      const s = await SettingsStore.open(memory({ deviceId: "abcDEF_123-x", mods: bad }));
      expect(s.get().mods).toEqual({});
    }
  });
});

describe("FB4-2 boyut ve ses 0..100", () => {
  it("eski seviye adları sayıya taşınır; sayı aralıkta kalır; bozuk değer onarılır", async () => {
    const old = await SettingsStore.open(memory({ deviceId: "abcDEF_123-x", size: "dev", voiceVolume: "low" }));
    expect([old.get().size, old.get().voiceVolume]).toEqual([100, 25]);
    const num = await SettingsStore.open(memory({ deviceId: "abcDEF_123-x", size: 37, voiceVolume: 0 }));
    expect([num.get().size, num.get().voiceVolume]).toEqual([37, 0]);
    const bad = await SettingsStore.open(memory({ deviceId: "abcDEF_123-x", size: 500, voiceVolume: "loud" }));
    expect([bad.get().size, bad.get().voiceVolume]).toEqual([25, 50]);
  });
});

import { isDark as isDarkMode } from "./settings";
describe("SPEC 17 karanlık mod", () => {
  it("kapalı / açık / sistem", () => {
    expect(isDarkMode("off", true)).toBe(false);
    expect(isDarkMode("on", false)).toBe(true);
    expect(isDarkMode("system", true)).toBe(true);
    expect(isDarkMode("system", false)).toBe(false);
  });
});
