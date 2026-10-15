// Gardırop çizimi (SPEC 05 W1/W2, SPEC 07 FB1): tema + aksesuar TEK kaynaktan, dress.ts (composeFrame + placeAccessory):
// renk, aksesuar konumu, kenar kırpması (clipRight) ve tüy sırası wardrobe-*.png şeritleriyle aynı kod. Sonuç aynı düzende
// "giydirilmiş" bir sheet; Player onu normal sheet gibi oynatır, ayna (sola bakış) ve tam sayı ölçek Player'ın dönüşümünden gelir,
// yani aksesuar gövdeyle birlikte aynalanır (compose.ts mirrorX ile aynı sonuç).
import type { Player } from "../player/player";
import type { Sheet } from "../player/sheet";
import { checkAccessory, type Accessory, type AnchorsFile } from "./accessories";
import type { Pixels } from "./compose";
import { checkCostume, type Costume } from "./costumes";
import { dressSheet, type Rect, type Worn } from "./dress";
import type { Theme } from "./themes";

/** content/wardrobe/accessories/*.json (geçersizler atlanır, hata listesi döner). */
export function parseAccessories(raw: Record<string, unknown>, tags: readonly string[]): { list: Accessory[]; errors: string[] } {
  const list: Accessory[] = [];
  const errors: string[] = [];
  for (const [path, json] of Object.entries(raw)) {
    const problems = checkAccessory(json, tags);
    if (problems.length) errors.push(...problems.map((p) => `${path}: ${p}`));
    else list.push(json as Accessory);
  }
  return { list, errors };
}

/** content/wardrobe/costumes/*.json (geçersizler atlanır). */
export function parseCostumes(raw: Record<string, unknown>, tags: readonly string[]): { list: Costume[]; errors: string[] } {
  const list: Costume[] = [];
  const errors: string[] = [];
  for (const [path, json] of Object.entries(raw)) {
    const problems = checkCostume(json, tags);
    if (problems.length) errors.push(...problems.map((p) => `${path}: ${p}`));
    else list.push(json as Costume);
  }
  return { list, errors };
}

/** Giyim seçimi: tema + aksesuarlar (slot başına bir) + kostüm. */
export interface Outfit {
  theme: string;
  accessories: readonly string[];
  costume: string | null;
}

/** Sheet karelerinin dikdörtgenleri, kare sırasıyla (anchors.frames ile aynı sıra). */
export function frameRects(sheet: Sheet): Rect[] {
  return sheet.frames.map(({ x, y, w, h }) => ({ x, y, w, h }));
}

/** Bir görüntünün RGBA pikselleri (canvas'a çizip okur). */
function readPixels(img: CanvasImageSource, width: number, height: number): Pixels {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, width, height);
  return { data: d.data, width, height };
}

/** Pet ve dunno.exe önizlemesi için tek nokta: Player'a giydirilmiş sheet verir. */
export class WardrobeRenderer {
  /** "<tema>|<kostüm>|<aksesuarlar>" -> giydirilmiş sheet (bir kez üretilir) */
  private readonly dressed = new Map<string, CanvasImageSource>();
  private base?: Pixels;
  private readonly accPixels = new Map<string, Pixels>();

  constructor(
    private readonly sheet: Sheet,
    private readonly baseImage: HTMLImageElement,
    private readonly themes: readonly Theme[],
    private readonly accessories: readonly Accessory[],
    private readonly accImages: ReadonlyMap<string, CanvasImageSource>,
    private readonly anchors: AnchorsFile | null,
    private readonly costumes: readonly Costume[] = [],
    /** "<kostüm>.<parça>" -> görüntü */
    private readonly partImages: ReadonlyMap<string, CanvasImageSource> = new Map(),
  ) {}

  apply(player: Player, outfit: Outfit): void {
    player.setImage(this.imageFor(outfit));
  }

  imageFor(outfit: Outfit): CanvasImageSource {
    const theme = outfit.theme === "classic" ? undefined : this.themes.find((t) => t.id === outfit.theme);
    const worn: Worn[] = [];
    if (this.anchors) {
      for (const id of outfit.accessories) {
        const acc = this.accessories.find((a) => a.id === id);
        const img = acc ? this.accImages.get(acc.id) : undefined;
        if (acc && img) worn.push({ acc, pixels: this.pixelsOf(acc.id, img, acc.size) });
      }
    }
    const costume = outfit.costume && this.anchors ? this.costumes.find((c) => c.id === outfit.costume) : undefined;
    const parts = new Map<string, Pixels>();
    for (const p of costume?.parts ?? []) {
      const img = this.partImages.get(`${costume!.id}.${p.id}`);
      if (img) parts.set(p.id, this.pixelsOf(`${costume!.id}.${p.id}`, img, p.size));
    }
    const wearCostume = costume ? { costume, parts } : null;
    if (!theme && !worn.length && !wearCostume) return this.baseImage;
    const key = `${theme?.id ?? "classic"}|${costume?.id ?? ""}|${worn.map((w) => w.acc.id).join(",")}`;
    const cached = this.dressed.get(key);
    if (cached) return cached;
    const base = (this.base ??= readPixels(this.baseImage, this.baseImage.naturalWidth, this.baseImage.naturalHeight));
    // anchors yoksa wear null: dressSheet sadece renk uygular, anchors'a bakmaz
    const anchors = this.anchors ?? ({ frames: [] } as unknown as AnchorsFile);
    const data = dressSheet(base, frameRects(this.sheet), anchors, theme?.colors ?? null, worn, wearCostume);
    const c = document.createElement("canvas");
    c.width = base.width;
    c.height = base.height;
    const ctx = c.getContext("2d")!;
    const out = ctx.createImageData(base.width, base.height);
    out.data.set(data);
    ctx.putImageData(out, 0, 0);
    this.dressed.set(key, c);
    return c;
  }

  private pixelsOf(key: string, img: CanvasImageSource, size: number): Pixels {
    let p = this.accPixels.get(key);
    if (!p) {
      p = readPixels(img, size, size);
      this.accPixels.set(key, p);
    }
    return p;
  }
}
