// content/art/dunno_anchors.json ve content/wardrobe/accessories/* üreticiyle (gen-wardrobe.mjs) güncel mi.
import { readdirSync, readFileSync } from "node:fs";
import { COSTUME_BLOCKS } from "../src/app/wardrobe-view";
import { checkCostume } from "../src/wardrobe/costumes";
import { ACCESSORIES as ACCESSORY_IDS, ACCESSORY_SLOTS, COSTUMES as COSTUME_IDS, type AccessoryId } from "../src/wardrobe/wardrobe";
import { describe, expect, it } from "vitest";
// @ts-expect-error saf .mjs üretici, tip yok
import { accessoryGrid, accessoryIconPng, accessoryJson, accessoryPng, anchorsJson, costumeIconPng, costumeJson, costumePartPng } from "./gen-wardrobe.mjs";
// @ts-expect-error saf .mjs üretici, tip yok
import { COSTUMES } from "./sprites/costumes.mjs";
// @ts-expect-error saf .mjs üretici, tip yok
import { STATES } from "./sprites/states.mjs";
// @ts-expect-error saf .mjs üretici, tip yok
import { ACCESSORIES, ACCESSORY_PALETTE } from "./sprites/accessories.mjs";
// @ts-expect-error saf .mjs üretici, tip yok
import { PALETTE } from "./sprites/grid.mjs";

const root = new URL("../../content/", import.meta.url);
const read = (p: string) => readFileSync(new URL(p, root));
const STALE = "üretilmiş dosya eski: cd desktop; node scripts/gen-wardrobe.mjs";

describe("wardrobe content is generated", () => {
  it("anchors file matches the generator", () => {
    expect(JSON.parse(read("art/dunno_anchors.json").toString()), STALE).toEqual(anchorsJson());
  });

  it("accessory json + png match the generator", () => {
    for (const acc of ACCESSORIES) {
      expect(JSON.parse(read(`wardrobe/accessories/${acc.id}.json`).toString()), `${acc.id}: ${STALE}`).toEqual(accessoryJson(acc));
      expect(Buffer.compare(read(`wardrobe/accessories/${acc.id}.png`), Buffer.from(accessoryPng(acc))), `${acc.id}: ${STALE}`).toBe(0);
      expect(Buffer.compare(read(`wardrobe/accessories/${acc.id}.icon.png`), Buffer.from(accessoryIconPng(acc))), `${acc.id} icon: ${STALE}`).toBe(0);
    }
  });

  it("accessory maps use only main palette colours", () => {
    const allowed = new Set<string>([...Object.values(PALETTE as Record<string, string>), "#FFFFFF"]);
    for (const c of Object.values(ACCESSORY_PALETTE as Record<string, string>)) expect(allowed.has(c), c).toBe(true);
    for (const acc of ACCESSORIES as { id: string; map: string[] }[]) {
      for (const ch of acc.map.join("")) expect(ch === "." || ch in ACCESSORY_PALETTE, `${acc.id}: ${ch}`).toBe(true);
    }
  });

  it("K6: 20 aksesuar, slotlar wardrobe.ts ACCESSORY_SLOTS ile aynı", () => {
    const files = readdirSync(new URL("wardrobe/accessories/", root)).filter((f) => f.endsWith(".json"));
    expect(files.length).toBe(ACCESSORY_IDS.length);
    for (const f of files) {
      const j = JSON.parse(read(`wardrobe/accessories/${f}`).toString()) as { id: AccessoryId; slot: string };
      expect(j.slot, j.id).toBe(ACCESSORY_SLOTS[j.id]);
    }
  });

  it("K2: kostüm json + parça png + simge üreticiyle aynı, doğrulayıcıdan geçer, renkler palet/tema", () => {
    const themes = JSON.parse(read("wardrobe/themes.json").toString()) as { themes: { colors: Record<string, string> }[] };
    const allowed = new Set<string>([...Object.values(PALETTE as Record<string, string>), "#FFFFFF", ...themes.themes.flatMap((t) => Object.values(t.colors))]);
    const tags = Object.keys(STATES);
    const ids = readdirSync(new URL("wardrobe/costumes/", root)).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
    expect(ids.sort()).toEqual([...COSTUME_IDS].sort());
    for (const c of COSTUMES as { id: string; parts: { id: string }[]; blocks: string[] }[]) {
      const json = JSON.parse(read(`wardrobe/costumes/${c.id}.json`).toString());
      expect(json, `${c.id}: ${STALE}`).toEqual(costumeJson(c));
      expect(checkCostume(json, tags, allowed), c.id).toEqual([]);
      expect(Buffer.compare(read(`wardrobe/costumes/${c.id}.png`), Buffer.from(costumeIconPng(c))), `${c.id}: ${STALE}`).toBe(0);
      for (const p of c.parts) expect(Buffer.compare(read(`wardrobe/costumes/${c.id}.${p.id}.png`), Buffer.from(costumePartPng(c, p))), `${c.id}.${p.id}`).toBe(0);
      expect(COSTUME_BLOCKS[c.id], `${c.id} blocks (wardrobe-view.ts)`).toEqual(c.blocks);
    }
  });

  it("üretici harita piksellerini kırpmaz (origin 32x32 görüntünün dışına itmiyor)", () => {
    const count = (rows: string[]) => rows.join("").replaceAll(".", "").length;
    const maps = [
      ...(ACCESSORIES as { id: string; map: string[] }[]).map((a) => [a.id, a] as const),
      ...(COSTUMES as { id: string; parts: { id: string; map: string[] }[] }[]).flatMap((c) => c.parts.map((p) => [`${c.id}.${p.id}`, p] as const)),
    ];
    for (const [id, m] of maps) expect(count(accessoryGrid(m)), id).toBe(count(m.map));
  });
});

