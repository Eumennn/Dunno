import { describe, expect, it } from "vitest";
import { isMuted, sanitize } from "../settings";
import { settingsPatchFor, trayStateOf } from "./tray-map";

const now = new Date(2026, 9, 2, 15, 0);

describe("settingsPatchFor", () => {
  it("ayar aksiyonlarını eşler", () => {
    expect(settingsPatchFor({ action: "mode", value: "street" }, now)).toEqual({ mode: "street" });
    expect(settingsPatchFor({ action: "frequency", value: "low" }, now)).toEqual({ frequency: "low" });
    expect(settingsPatchFor({ action: "lang", value: "en" }, now)).toEqual({ lang: "en" });
    expect(settingsPatchFor({ action: "autostart", value: true }, now)).toEqual({ autostart: true });
    expect(settingsPatchFor({ action: "voice", value: false }, now)).toEqual({ voice: false });
  });

  it("ayar dışı aksiyonlar null", () => {
    expect(settingsPatchFor({ action: "meeting", value: true }, now)).toBeNull();
    expect(settingsPatchFor({ action: "quit" }, now)).toBeNull();
  });

  it("bugün sus: bugünün tarihi, kapatınca temizlenir", () => {
    expect(settingsPatchFor({ action: "mute_today", value: true }, now)).toEqual({ muteUntil: "2026-10-02" });
    expect(settingsPatchFor({ action: "mute_today", value: false }, now)).toEqual({ muteUntil: null });
  });

  it("bugün sus ertesi gün kendiliğinden kalkar (tarih enjekte)", () => {
    const s = { ...sanitize({}).settings, ...settingsPatchFor({ action: "mute_today", value: true }, now) };
    expect(isMuted(s, new Date(2026, 9, 2, 23, 59, 59))).toBe(true);
    expect(isMuted(s, new Date(2026, 9, 3, 0, 0, 0))).toBe(false);
    expect(trayStateOf(s, new Date(2026, 9, 3, 9), false).muted).toBe(false);
  });
});

describe("trayStateOf", () => {
  it("ayarları ve manuel toplantıyı yansıtır", () => {
    const s = sanitize({ mode: "street", frequency: "high", lang: "en", autostart: true, muteUntil: "2026-10-02" }).settings;
    expect(trayStateOf(s, now, true)).toEqual({
      mode: "street",
      muted: true,
      frequency: "high",
      lang: "en",
      autostart: true,
      manualMeeting: true,
      voice: true,
    });
  });
});
