import { describe, expect, it } from "vitest";
import { parseTrayAction } from "./ipc-tray";

describe("parseTrayAction", () => {
  it("accepts every action rust emits", () => {
    const ok = [
      { action: "mode", value: "polite" },
      { action: "mode", value: "street" },
      { action: "frequency", value: "low" },
      { action: "frequency", value: "normal" },
      { action: "frequency", value: "high" },
      { action: "lang", value: "tr" },
      { action: "lang", value: "en" },
      { action: "mute_today", value: true },
      { action: "meeting", value: false },
      { action: "autostart", value: true },
      { action: "quit" },
    ];
    for (const raw of ok) expect(parseTrayAction(raw)).toEqual(raw);
  });

  it("rejects unknown or malformed payloads", () => {
    const bad = [
      null,
      "quit",
      {},
      { action: "mode", value: "loud" },
      { action: "frequency", value: 3 },
      { action: "lang", value: "de" },
      { action: "mute_today", value: "yes" },
      { action: "explode", value: true },
    ];
    for (const raw of bad) expect(parseTrayAction(raw)).toBeNull();
  });
});
