// Gizli dünya varlıkları (SPEC 14): content/eggs/worlds.json (dünya + canavar temaları) ve content/eggs/costumes (gizli yaratıklar).
// Dolap klasörlerinin dışında: dolap listesinde görünmezler; açılınca eggs.ts kuralıyla kullanılır.
import worldsJson from "../../../content/eggs/worlds.json";
import type { RenderExtras } from "../wardrobe/assets";
import type { Costume } from "../wardrobe/costumes";
import { parseCostumes } from "../wardrobe/render";
import { loadThemes, type Theme } from "../wardrobe/themes";

const costumeJson = import.meta.glob("../../../content/eggs/costumes/*.json", { eager: true, import: "default" });
const costumePng = import.meta.glob("../../../content/eggs/costumes/*.png", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const pngUrl = (file: string) => Object.entries(costumePng).find(([p]) => p.endsWith(`/${file}`))?.[1];

export function eggThemes(): Theme[] {
  return loadThemes(worldsJson).file?.themes ?? [];
}

export function eggCostumes(tags: readonly string[]): Costume[] {
  return parseCostumes(costumeJson, tags).list;
}

/** Renderer'a eklenecek gizli tema + kostümler. */
export function eggExtras(tags: readonly string[]): Required<Pick<RenderExtras, "themes" | "costumes">> {
  return {
    themes: eggThemes(),
    costumes: eggCostumes(tags).map((costume) => ({
      costume,
      parts: Object.fromEntries(costume.parts.flatMap((p) => {
        const url = pngUrl(p.image);
        return url ? [[p.id, { dataUrl: url }]] : [];
      })),
    })),
  };
}

/** Gizli yaratığın dolap simgesi (glitch dünyası açılınca dolapta görünür). */
export function eggCostumeIconUrl(id: string): string | undefined {
  return pngUrl(`${id}.png`);
}
