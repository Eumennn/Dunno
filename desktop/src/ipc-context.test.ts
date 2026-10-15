import { describe, expect, it } from "vitest";
import { contextTriggers } from "./ipc-context";

describe("contextTriggers", () => {
  it("turns a payload into active triggers", () => {
    expect(
      contextTriggers({ app: "excel", idleTrigger: "idle:30", batteryTrigger: "battery:low", timeTrigger: "time:night" }),
    ).toEqual(["app:excel", "time:night", "idle:30", "battery:low"]);
  });

  it("skips missing parts", () => {
    expect(contextTriggers({ app: null, idleTrigger: null, batteryTrigger: null, timeTrigger: "time:morning" })).toEqual([
      "time:morning",
    ]);
    expect(contextTriggers(null)).toEqual([]);
  });
});

describe("site kategorisi (SPEC 09 K7b)", () => {
  const base = { app: "browser", idleTrigger: null, batteryTrigger: null, timeTrigger: "time:noon" } as const;
  it("site önce gelir; sessiz kategoride trigger yok; eski yük (site yok) çalışır", () => {
    expect(contextTriggers({ ...base, site: "video", siteSilent: false })).toEqual(["site:video", "app:browser", "time:noon"]);
    expect(contextTriggers({ ...base, site: "adult", siteSilent: true })).toEqual(["app:browser", "time:noon"]);
    expect(contextTriggers(base)).toEqual(["app:browser", "time:noon"]);
  });
});
