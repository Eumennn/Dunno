// WR4s: try.exe kıyafet seçici. Tema + aksesuar içerikten (content/wardrobe, content/art) okunur, doğrulanır;
// sheet masaüstünün saf dressSheet'iyle boyanıp Player'a verilir (Player değişmez).
import anchorsRaw from "../../content/art/dunno_anchors.json";
import themesRaw from "../../content/wardrobe/themes.json";
import { checkAccessory, checkAnchors, type Accessory, type AnchorsFile } from "@desktop/wardrobe/accessories";
import { dressSheet } from "@desktop/wardrobe/dress";
import { ACCESSORIES } from "@desktop/wardrobe/wardrobe";
import { loadThemes, type Theme } from "@desktop/wardrobe/themes";
import type { Sheet } from "@desktop/player/sheet";

export interface Outfit {
  theme: string;
  /** null: aksesuar yok */
  accessory: string | null;
}

export interface WardrobeOptions {
  themes: Theme[];
  accessories: { acc: Accessory; url: string }[];
  anchors: AnchorsFile | null;
  /** içerik hataları (studio'da gösterilir; hatalı aksesuar listeye girmez) */
  errors: string[];
}

// sıra masaüstü dolabıyla aynı (SPEC 05 altı + SPEC 09 K6 on dört); studio tek aksesuar önizler
const ACC_ORDER: readonly string[] = ACCESSORIES;

/** Saf: ham içerikten seçenekler. jsons/urls dosya yolu -> içerik. */
export function wardrobeOptions(
  themes: unknown,
  anchors: unknown,
  jsons: Record<string, unknown>,
  urls: Record<string, string>,
  sheetFrames: string[],
  tags: string[],
): WardrobeOptions {
  const errors: string[] = [];
  const t = loadThemes(themes);
  errors.push(...t.errors);
  const anchorErrs = checkAnchors(anchors, { frames: sheetFrames, tags });
  errors.push(...anchorErrs);
  const accessories: WardrobeOptions["accessories"] = [];
  for (const [path, raw] of Object.entries(jsons)) {
    const errs = checkAccessory(raw, tags);
    const acc = raw as Accessory;
    const url = errs.length ? undefined : urls[path.replace(/[^/]+$/, acc.image)];
    if (errs.length) errors.push(...errs);
    else if (!url) errors.push(`${acc.id}: ${acc.image} yok`);
    else accessories.push({ acc, url });
  }
  const rank = (id: string) => (ACC_ORDER.indexOf(id) + 1 || 999);
  accessories.sort((a, b) => rank(a.acc.id) - rank(b.acc.id) || a.acc.id.localeCompare(b.acc.id));
  return { themes: t.file?.themes ?? [], accessories, anchors: anchorErrs.length ? null : (anchors as AnchorsFile), errors };
}

export function themeLabel(t: Theme): string {
  return t.status === "candidate" ? `${t.name.tr} (aday)` : t.name.tr;
}

const jsons = import.meta.glob("../../content/wardrobe/accessories/*.json", { eager: true, import: "default" });
const urls = import.meta.glob<string>("../../content/wardrobe/accessories/*.png", { eager: true, query: "?url", import: "default" });

export function loadWardrobe(sheetJson: { frames: Record<string, unknown> }, sheet: Sheet): WardrobeOptions {
  return wardrobeOptions(themesRaw, anchorsRaw, jsons, urls, Object.keys(sheetJson.frames), [...sheet.tags.keys()]);
}

function pixelsOf(img: HTMLImageElement): { data: Uint8ClampedArray; width: number; height: number } {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  return { data: ctx.getImageData(0, 0, c.width, c.height).data, width: c.width, height: c.height };
}

const images = new Map<string, Promise<HTMLImageElement>>();
function image(url: string): Promise<HTMLImageElement> {
  let p = images.get(url);
  if (!p) {
    p = new Promise((ok, fail) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => fail(new Error(`yüklenemedi: ${url}`));
      img.src = url;
    });
    images.set(url, p);
  }
  return p;
}

/** Kıyafetli sheet'i target canvas'a yazar (boyut sheet'le aynı). */
export async function dressInto(
  target: HTMLCanvasElement,
  sheetImg: HTMLImageElement,
  sheet: Sheet,
  options: WardrobeOptions,
  outfit: Outfit,
): Promise<void> {
  const base = pixelsOf(sheetImg);
  const theme = options.themes.find((t) => t.id === outfit.theme);
  const found = options.accessories.find((a) => a.acc.id === outfit.accessory);
  const accessory = found && options.anchors ? { acc: found.acc, pixels: pixelsOf(await image(found.url)) } : null;
  const data = dressSheet(base, sheet.frames, options.anchors ?? { size: 0, points: [], frames: [], hidden: {} }, theme?.colors ?? null, accessory);
  target.width = base.width;
  target.height = base.height;
  target.getContext("2d")!.putImageData(new ImageData(Uint8ClampedArray.from(data), base.width, base.height), 0, 0);
}
