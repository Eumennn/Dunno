// Sprite oynatıcı: sheet + PNG'yi canvas'a, tam sayı cihaz pikseli ölçeğinde, yumuşatmasız çizer.
import { frameAt, tagSequence } from "./animation";
import type { Sheet } from "./sheet";

export type Facing = "left" | "right";

export interface PlayOptions {
  /** varsayılan true; false ise son karede durur ve onDone bir kez çağrılır */
  loop?: boolean;
  onDone?: () => void;
}

/** Oynatıcının ihtiyaç duyduğu canvas yüzeyi (testte sahtesi verilir). */
export interface Surface {
  width: number;
  height: number;
  getContext(id: "2d"): CanvasRenderingContext2D | null;
}

/**
 * Cihaz pikseli başına tam sayı ölçek. %150'de 3x mantıksal ölçek 4.5 olur; yuvarlanır ki
 * her sprite pikseli aynı sayıda ekran pikseline düşsün (bulanıklık / düzensiz piksel yok).
 */
export function pixelScale(scale: number, dpr: number): number {
  // FB4-2: size.ts quantize ile aynı (yarım piksel); tam sayı ölçeklerde eskisi gibi
  return Math.max(1, Math.round(scale * dpr * 2) / 2);
}

export class Player {
  private readonly ctx: CanvasRenderingContext2D;
  private stateName = "";
  private seq: number[] = [];
  private loop = true;
  private onDone?: () => void;
  private startedAt = 0;
  private finished = false;
  private facing: Facing = "right";
  private devScale = 1;
  private drawn: { frame: number; facing: Facing; devScale: number } | null = null;
  private onDraw?: (index: number, facing: Facing, image: CanvasImageSource) => void;

  constructor(
    private readonly surface: Surface,
    private readonly sheet: Sheet,
    private image: CanvasImageSource,
    private readonly clock: () => number = () => performance.now(),
  ) {
    const ctx = surface.getContext("2d");
    if (!ctx) throw new Error("player: 2d context unavailable");
    this.ctx = ctx;
  }

  get state(): string {
    return this.stateName;
  }

  /**
   * Canvas'ı (scale x dpr) tam sayı ölçeğe göre boyutlar.
   * Dönen değer: pet kutusunun CSS (mantıksal) piksel boyutu.
   */
  resize(scale: number, dpr: number): { w: number; h: number } {
    this.devScale = pixelScale(scale, dpr);
    this.surface.width = this.sheet.frameW * this.devScale;
    this.surface.height = this.sheet.frameH * this.devScale;
    this.drawn = null;
    return { w: this.surface.width / dpr, h: this.surface.height / dpr };
  }

  /** Durumu değiştirir. Aynı durum zaten oynuyorsa baştan başlatmaz (restart: true hariç). */
  setState(name: string, opts: PlayOptions & { restart?: boolean } = {}): void {
    const tag = this.sheet.tags.get(name);
    if (!tag) throw new Error(`player: no tag "${name}" in sheet`);
    if (name === this.stateName && !opts.restart) {
      this.onDone = opts.onDone ?? this.onDone;
      return;
    }
    this.stateName = name;
    this.seq = tagSequence(tag);
    this.loop = opts.loop ?? true;
    this.onDone = opts.onDone;
    this.startedAt = this.clock();
    this.finished = false;
  }

  /** Sheet görüntüsünü değiştirir (giydirilmiş sheet: tema + aksesuar, wardrobe/render.ts); aynı kare yeniden çizilir. */
  setImage(image: CanvasImageSource): void {
    this.image = image;
    this.drawn = null;
  }

  /** Her çizimde (kare, yön ya da görüntü değişince): pet tıklama maskesi bunu izler (SPEC 08 SZ1c). */
  setOnDraw(cb: ((index: number, facing: Facing, image: CanvasImageSource) => void) | undefined): void {
    this.onDraw = cb;
  }

  setFacing(facing: Facing): void {
    this.facing = facing;
  }

  getFacing(): Facing {
    return this.facing;
  }

  /** Her animasyon karesinde çağrılır; kare değiştiyse çizer. */
  tick(): void {
    if (!this.stateName) return;
    const pos = frameAt(this.seq, this.sheet.frames, this.clock() - this.startedAt, this.loop);
    const d = this.drawn;
    if (!d || d.frame !== pos.frame || d.facing !== this.facing || d.devScale !== this.devScale) {
      this.draw(pos.frame);
    }
    if (pos.done && !this.finished) {
      this.finished = true;
      this.onDone?.();
    }
  }

  private draw(index: number): void {
    const f = this.sheet.frames[index];
    const s = this.devScale;
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.surface.width, this.surface.height);
    ctx.imageSmoothingEnabled = false;
    if (this.facing === "left") {
      // sprite'lar sağa bakar; sola gidişte yatay ayna
      ctx.translate(this.surface.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(this.image, f.x, f.y, f.w, f.h, f.ox * s, f.oy * s, f.w * s, f.h * s);
    this.drawn = { frame: index, facing: this.facing, devScale: s };
    this.onDraw?.(index, this.facing, this.image);
  }
}
