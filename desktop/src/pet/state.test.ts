import { describe, expect, it } from "vitest";
import sheetJson from "../../assets/dunno_sheet.json";
import { parseSheet } from "../player/sheet";
import { checkSheet, ONE_SHOT, playOptions } from "./state";

describe("pet state contract", () => {
  it("assets/dunno_sheet.json sözleşmeye uyuyor", () => {
    const sheet = parseSheet(sheetJson);
    expect(checkSheet(sheet)).toEqual([]);
    expect([sheet.frameW, sheet.frameH]).toEqual([32, 32]);
    expect(sheet.placeholder).toBe(false);
  });

  it("kare süreleri SPEC 03 A2'deki gibi (diğerleri en az 250 ms)", () => {
    const sheet = parseSheet(sheetJson);
    const ms = (state: string) => sheet.frames[sheet.tags.get(state)!.from].duration;
    expect([ms("idle"), ms("walk"), ms("talk"), ms("sleep"), ms("shrug")]).toEqual([500, 220, 260, 800, 260]);
    for (const s of ["run_away", "sulk", "peek", "shh", "dragged"]) expect(ms(s)).toBeGreaterThanOrEqual(250);
  });

  it("eksik ve yanlış sayılı durumları raporlar", () => {
    const sheet = parseSheet({
      frames: [0, 1].map((i) => ({ frame: { x: i * 48, y: 0, w: 48, h: 48 } })),
      meta: { frameTags: [{ name: "idle", from: 0, to: 1 }] },
    });
    const problems = checkSheet(sheet);
    expect(problems).toContain("idle: 2 frames, expected 4");
    expect(problems).toContain("missing tag: walk");
  });

  it("shrug tek seferlik, diğerleri döner", () => {
    expect(ONE_SHOT.has("shrug")).toBe(true);
    expect(playOptions("shrug").loop).toBe(false);
    expect(playOptions("walk").loop).toBe(true);
  });
});
