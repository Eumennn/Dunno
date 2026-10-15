import { describe, expect, it } from "vitest";
import {
  currentSpecialDay,
  getActiveSpecialDays,
  isDateInRange,
  isFriday13th,
  resolveSpecialDay,
  type SpecialDayConfig,
} from "./special-days";

describe("special days detection (FB14-3)", () => {
  it("date range within same year", () => {
    expect(isDateInRange(new Date(2026, 9, 31), "10-25", "11-01")).toBe(true);
    expect(isDateInRange(new Date(2026, 9, 24), "10-25", "11-01")).toBe(false);
    expect(isDateInRange(new Date(2026, 10, 2), "10-25", "11-01")).toBe(false);
  });

  it("date range crossing new year (12-28 .. 01-03, winter 12-21 .. 03-20)", () => {
    expect(isDateInRange(new Date(2026, 11, 31), "12-28", "01-03")).toBe(true);
    expect(isDateInRange(new Date(2026, 0, 1), "12-28", "01-03")).toBe(true);
    expect(isDateInRange(new Date(2026, 0, 4), "12-28", "01-03")).toBe(false);

    expect(isDateInRange(new Date(2026, 0, 15), "12-21", "03-20")).toBe(true);
  });

  it("Friday the 13th dynamic check", () => {
    // 2026-11-13 is a Friday
    const fri13 = new Date(2026, 10, 13);
    expect(fri13.getDay()).toBe(5);
    expect(isFriday13th(fri13)).toBe(true);

    // 2026-10-13 is a Tuesday
    const tue13 = new Date(2026, 9, 13);
    expect(isFriday13th(tue13)).toBe(false);
  });

  it("priority resolution: specific day overrides seasonal theme and costume", () => {
    const mockDays: SpecialDayConfig[] = [
      {
        id: "winter",
        name: { tr: "kış", en: "winter" },
        dates: { start: "12-21", end: "03-20" },
        theme: "night",
        costume: null,
        lines_trigger: "special:winter",
        priority: 0,
      },
      {
        id: "new_year",
        name: { tr: "yılbaşı", en: "new year" },
        dates: { start: "12-28", end: "01-03" },
        theme: "midnight",
        costume: null,
        lines_trigger: "special:new_year",
        priority: 2,
      },
    ];

    const active = getActiveSpecialDays(new Date(2026, 11, 31), mockDays);
    expect(active.length).toBe(2);

    const resolved = resolveSpecialDay(active);
    expect(resolved.activeDay?.id).toBe("new_year");
    expect(resolved.theme).toBe("midnight");
    expect(resolved.triggers).toContain("special:new_year");
    expect(resolved.triggers).toContain("special:winter");
  });

  it("halloween applies ghost costume and pumpkin theme", () => {
    const halloween = currentSpecialDay(new Date(2026, 9, 31));
    expect(halloween.activeDay?.id).toBe("halloween");
    expect(halloween.costume).toBe("ghost");
    expect(halloween.theme).toBe("halloween_pumpkin");
    expect(halloween.triggers).toContain("special:halloween");
  });
});
