import { describe, expect, it } from "vitest";
import { afterCheck, cleanUpdateState, initialUpdateState, isNewer, parseVersion, shouldCheck } from "./update";

describe("güncelleme kararları (SPEC 10 CL1)", () => {
  it("sürüm karşılaştırma", () => {
    expect(parseVersion("v1.2.3")).toEqual([1, 2, 3]);
    expect(parseVersion("1.2")).toBeNull();
    expect(isNewer("0.2.0", "0.1.0")).toBe(true);
    expect(isNewer("0.1.10", "0.1.9")).toBe(true);
    expect(isNewer("0.1.0", "0.1.0")).toBe(false);
    expect(isNewer("0.0.9", "0.1.0")).toBe(false);
    expect(isNewer("bozuk", "0.1.0")).toBe(false);
  });

  it("günde bir kontrol", () => {
    const s = initialUpdateState();
    expect(shouldCheck(s, "2026-10-06")).toBe(true);
    const r = afterCheck(s, "2026-10-06", null, "0.1.0");
    expect(r.notify).toBe(false);
    expect(shouldCheck(r.state, "2026-10-06")).toBe(false);
    expect(shouldCheck(r.state, "2026-10-07")).toBe(true);
  });

  it("yeni sürüm başına tek bildirim; daha yenisi yine bir kez", () => {
    let s = initialUpdateState();
    let r = afterCheck(s, "2026-10-06", "0.2.0", "0.1.0");
    expect(r.notify).toBe(true);
    s = r.state;
    r = afterCheck(s, "2026-10-07", "0.2.0", "0.1.0");
    expect(r.notify).toBe(false);
    r = afterCheck(r.state, "2026-10-08", "0.3.0", "0.1.0");
    expect(r.notify).toBe(true);
    // kurulduktan sonra (current yükseldi) aynı sürüm bildirilmez
    expect(afterCheck(initialUpdateState(), "2026-10-09", "0.3.0", "0.3.0").notify).toBe(false);
  });

  it("bozuk kaydı onarır", () => {
    expect(cleanUpdateState({ checkedDay: "dün", notified: "x" })).toEqual(initialUpdateState());
    expect(cleanUpdateState({ checkedDay: "2026-10-06", notified: "0.2.0" })).toEqual({ checkedDay: "2026-10-06", notified: "0.2.0" });
  });
});
