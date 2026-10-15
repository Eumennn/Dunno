// Pet tıklama alanı = o anki karenin dolu pikselleri (SPEC 08 SZ1c). Rust'ta pet kutusu (hit rect'lerin ilki) sadece
// yakınlık/hover; tıklama bu maske rect'leriyle: saydam köşeler alttaki pencereye geçer.
// Maske giydirilmiş sheet'ten (tema + aksesuar dahil), yöne göre aynalı; görüntü/kare/yön başına bir kez hesaplanır,
// kare değişince sadece önbellekten ölçeklenip gönderilir (IPC: ~10-30 küçük rect).
import type { Rect } from "../layout";
import type { Facing } from "../player/player";
import type { Frame } from "../player/sheet";
import { logicalPerSpritePx, maskFromRgba, maskRects, mirrorMask, scaleRects, SPRITE, type SizeLevel } from "../size/size";

export interface Pixels {
  data: ArrayLike<number>;
  width: number;
}

/** Sheet içindeki bir karenin dolu piksel rect'leri (sprite px, karenin sol üstü origin); sola bakışta aynalı. */
export function frameMaskRects(sheet: Pixels, f: Pick<Frame, "x" | "y" | "w" | "h">, facing: Facing): Rect[] {
  const w = Math.min(f.w, SPRITE);
  const h = Math.min(f.h, SPRITE);
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = ((f.y + y) * sheet.width + f.x + x) * 4;
      rgba.set([sheet.data[s], sheet.data[s + 1], sheet.data[s + 2], sheet.data[s + 3]], (y * w + x) * 4);
    }
  }
  const mask = maskFromRgba(rgba, w, h);
  return maskRects(facing === "left" ? mirrorMask(mask) : mask);
}

/** Görüntünün tüm pikselleri (bir kez okunur). */
function readPixels(img: CanvasImageSource & { width: number; height: number }): Pixels {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  return { data: ctx.getImageData(0, 0, c.width, c.height).data, width: c.width };
}

export class PetMask {
  private readonly pixels = new WeakMap<object, Pixels>();
  private readonly rects = new WeakMap<object, Map<string, Rect[]>>();
  private last?: { image: CanvasImageSource; frame: Frame; facing: Facing };

  constructor(
    private readonly canvas: HTMLElement,
    private readonly frames: readonly Frame[],
    private readonly level: () => SizeLevel,
    private readonly send: (rects: Rect[]) => void,
  ) {}

  /** Player bir kare çizdi. */
  drawn(image: CanvasImageSource, index: number, facing: Facing): void {
    const frame = this.frames[index];
    if (!frame) return;
    this.last = { image, frame, facing };
    this.refresh();
  }

  /**
   * O anki karenin saydam kenar payları (mantıksal px, pet kutusuna göre): balon yerleşimi görünen gövdeye yaklaşsın (SPEC 09 K4).
   * Kare yoksa ya da boşsa null.
   */
  visibleInset(): { left: number; right: number; top: number; bottom: number } | null {
    const l = this.last;
    if (!l) return null;
    const rects = this.rects.get(l.image)?.get(`${l.frame.x},${l.frame.y}:${l.facing}`);
    if (!rects || rects.length === 0) return null;
    const minX = Math.min(...rects.map((r) => r.x));
    const minY = Math.min(...rects.map((r) => r.y));
    const maxX = Math.max(...rects.map((r) => r.x + r.w));
    const maxY = Math.max(...rects.map((r) => r.y + r.h));
    const s = logicalPerSpritePx(this.level(), window.devicePixelRatio || 1);
    return { left: minX * s, top: minY * s, right: (SPRITE - maxX) * s, bottom: (SPRITE - maxY) * s };
  }

  /** Kare aynı, pet yeri/boyutu değişti (relayout, açılır yüzey). */
  refresh(): void {
    const l = this.last;
    if (!l) return;
    const key = `${l.frame.x},${l.frame.y}:${l.facing}`;
    let byKey = this.rects.get(l.image);
    if (!byKey) {
      byKey = new Map();
      this.rects.set(l.image, byKey);
    }
    let sprite = byKey.get(key);
    if (!sprite) {
      let px = this.pixels.get(l.image);
      if (!px) {
        px = readPixels(l.image as CanvasImageSource & { width: number; height: number });
        this.pixels.set(l.image, px);
      }
      sprite = frameMaskRects(px, l.frame, l.facing);
      byKey.set(key, sprite);
    }
    const r = this.canvas.getBoundingClientRect();
    this.send(scaleRects(sprite, this.level(), window.devicePixelRatio || 1, { x: r.left, y: r.top }));
  }
}
