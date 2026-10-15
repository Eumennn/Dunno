// Gardırop varlıkları (tek yükleyici): content/wardrobe/themes.json, content/wardrobe/accessories/<id>.{json,png},
// content/art/dunno_anchors.json. Tasarımcı yeni aksesuarı klasöre koyunca build'e kendiliğinden girer (glob).
import anchorsJson from "../../../content/art/dunno_anchors.json";
import themesJson from "../../../content/wardrobe/themes.json";
import type { Sheet } from "../player/sheet";
import type { AnchorsFile } from "./accessories";
import { parseAccessories, parseCostumes, WardrobeRenderer } from "./render";
import { loadThemes, type Theme } from "./themes";
import type { Accessory } from "./accessories";
import type { Costume } from "./costumes";

/** Dolap dışı ek parçalar: modlar (SPEC 12 B) ve gizli dünyalar (SPEC 14). Görüntüler URL (mod: data:, gizli: paket içi). */
export interface RenderExtras {
  themes?: readonly Theme[];
  accessories?: readonly { acc: Accessory; image: { dataUrl: string } }[];
  costumes?: readonly { costume: Costume; parts: Readonly<Record<string, { dataUrl: string }>> }[];
}

const accJson = import.meta.glob("../../../content/wardrobe/accessories/*.json", { eager: true, import: "default" });
const accPng = import.meta.glob("../../../content/wardrobe/accessories/*.png", { eager: true, query: "?url", import: "default" }) as Record<
  string,
  string
>;

const costumeJson = import.meta.glob("../../../content/wardrobe/costumes/*.json", { eager: true, import: "default" });
const costumePng = import.meta.glob("../../../content/wardrobe/costumes/*.png", { eager: true, query: "?url", import: "default" }) as Record<
  string,
  string
>;
const pngUrl = (all: Record<string, string>, file: string) => Object.entries(all).find(([p]) => p.endsWith(`/${file}`))?.[1];

export function loadThemeList(): Theme[] {
  return loadThemes(themesJson).file?.themes ?? [];
}

async function image(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

/** mods: doğrulanmış mod parçaları (SPEC 12 B) + gizli dünyalar (SPEC 14); görüntüler data:/paket URL'si (ağ yok). */
export async function loadWardrobeRenderer(sheet: Sheet, baseImage: HTMLImageElement, mods?: RenderExtras): Promise<WardrobeRenderer> {
  const tags = [...sheet.tags.keys()];
  const { list, errors } = parseAccessories(accJson, tags);
  if (errors.length && import.meta.env.DEV) for (const e of errors) console.warn(`[wardrobe] ${e}`);
  const images = new Map<string, CanvasImageSource>();
  await Promise.all(
    list.map(async (a) => {
      const url = Object.entries(accPng).find(([p]) => p.endsWith(`/${a.image}`))?.[1];
      if (url) images.set(a.id, await image(url));
    }),
  );
  const costumes = parseCostumes(costumeJson, tags);
  if (costumes.errors.length && import.meta.env.DEV) for (const e of costumes.errors) console.warn(`[wardrobe] ${e}`);
  const parts = new Map<string, CanvasImageSource>();
  await Promise.all(
    costumes.list.flatMap((c) =>
      c.parts.map(async (p) => {
        const url = pngUrl(costumePng, p.image);
        if (url) parts.set(`${c.id}.${p.id}`, await image(url));
      }),
    ),
  );
  const modCostumes = mods?.costumes ?? [];
  await Promise.allSettled([
    ...(mods?.accessories ?? []).map(async (a) => {
      images.set(a.acc.id, await image(a.image.dataUrl));
    }),
    ...modCostumes.flatMap((c) => Object.entries(c.parts).map(async ([id, img]) => parts.set(`${c.costume.id}.${id}`, await image(img.dataUrl)))),
  ]);
  return new WardrobeRenderer(
    sheet,
    baseImage,
    [...loadThemeList(), ...(mods?.themes ?? [])],
    [...list, ...(mods?.accessories ?? []).map((a) => a.acc)],
    images,
    anchorsJson as unknown as AnchorsFile,
    [...costumes.list, ...modCostumes.map((c) => c.costume)],
    parts,
  );
}

/** Kostüm dolap simgesi (idle, kostümlü; dunno.exe ızgarası). */
export function costumeIconUrl(id: string): string | undefined {
  return pngUrl(costumePng, `${id}.png`);
}

/** Aksesuar dolap simgesi (dunno.exe ızgarası, UX-01): Dunno'nun üstünde; yoksa aksesuarın kendi görüntüsü. */
export function accessoryImageUrl(id: string): string | undefined {
  return pngUrl(accPng, `${id}.icon.png`) ?? pngUrl(accPng, `${id}.png`);
}
