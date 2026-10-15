import { describe, expect, it } from "vitest";
import { parseUiAction } from "./ipc-app";

describe("parseUiAction", () => {
  it("dunno.exe'ye özel aksiyonlar", () => {
    expect(parseUiAction({ action: "summon" })).toEqual({ action: "summon" });
    expect(parseUiAction({ action: "send_edge" })).toEqual({ action: "send_edge" });
    expect(parseUiAction({ action: "fart", value: false })).toEqual({ action: "fart", value: false }); // SPEC 09 K3
    expect(parseUiAction({ action: "fart", value: "no" })).toBeNull();
    expect(parseUiAction({ action: "wardrobe", theme: "night" })).toEqual({ action: "wardrobe", theme: "night" });
    expect(parseUiAction({ action: "wardrobe", accessory: null })).toEqual({ action: "wardrobe", accessory: null });
    expect(parseUiAction({ action: "wardrobe", theme: "../x" })).toBeNull();
    expect(parseUiAction({ action: "stats_reset", value: 1 })).toEqual({ action: "stats_reset" });
  });

  it("ayar aksiyonları tray ile aynı doğrulamadan geçer", () => {
    expect(parseUiAction({ action: "mode", value: "street" })).toEqual({ action: "mode", value: "street" });
    expect(parseUiAction({ action: "frequency", value: "high" })).toEqual({ action: "frequency", value: "high" });
    expect(parseUiAction({ action: "mute_today", value: true })).toEqual({ action: "mute_today", value: true });
    expect(parseUiAction({ action: "autostart", value: false })).toEqual({ action: "autostart", value: false });
  });

  it("bozuk yükü reddeder", () => {
    expect(parseUiAction({ action: "mode", value: "uncensored" })).toBeNull();
    expect(parseUiAction({ action: "rm -rf" })).toBeNull();
    expect(parseUiAction(null)).toBeNull();
    expect(parseUiAction("summon")).toBeNull();
  });
});
