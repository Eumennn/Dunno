import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { APPS_DATA } from "./data/apps";
import { AMBIENT_DATA } from "./data/ambient";
import { INTERACTIONS_DATA } from "./data/interactions";
import { SITES_DATA } from "./data/sites";
import { QUESTIONS_BASE_DATA } from "./data/questions_base";
import { QUESTIONS_QTYPES_DATA } from "./data/questions_qtypes";

const __dirname = dirname(fileURLToPath(import.meta.url));
const poolPath = join(__dirname, "../../content/pool/pool_tr.json");

describe("build-social-pool", () => {
  it("generates and saves new pool_tr.json", () => {
    const currentPool = JSON.parse(readFileSync(poolPath, "utf8"));

    const ALL_DATA: Record<string, { intent: string; tr: string }[]> = {
      ...APPS_DATA,
      ...AMBIENT_DATA,
      ...INTERACTIONS_DATA,
      ...SITES_DATA,
      ...QUESTIONS_BASE_DATA,
      ...QUESTIONS_QTYPES_DATA,
    };

    const triggerIndices: Record<string, number> = {};
    const newPool = currentPool.map((entry: { id: string; trigger: string; intent: string; tr: string }) => {
      const trigger = entry.trigger;
      const list = ALL_DATA[trigger];
      if (!list) {
        throw new Error(`Missing replacement data for trigger: ${trigger}`);
      }
      const idx = triggerIndices[trigger] || 0;
      triggerIndices[trigger] = idx + 1;
      const replacement = list[idx];
      if (!replacement) {
        throw new Error(`Out of replacements for trigger: ${trigger} at index ${idx}`);
      }
      return {
        id: entry.id,
        trigger: entry.trigger,
        intent: replacement.intent,
        tr: replacement.tr,
      };
    });

    for (const [trigger, list] of Object.entries(ALL_DATA)) {
      const used = triggerIndices[trigger] || 0;
      expect(used).toBe(list.length);
    }

    expect(newPool.length).toBe(currentPool.length);

    const KEY_ORDER = ["id", "trigger", "intent", "tr"];
    const ordered = newPool.map((e: any) => {
      const obj: any = {};
      for (const k of KEY_ORDER) obj[k] = e[k];
      return obj;
    });

    writeFileSync(poolPath, JSON.stringify(ordered) + "\n", "utf8");
    console.log(`Saved minified pool_tr.json with ${newPool.length} entries.`);
  });
});
