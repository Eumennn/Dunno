// Tıklamayı alan DOM bölgeleri. İlki her zaman pet kutusu (Rust yakınlığı ona göre hesaplar).
import { hitRectOf, type Rect } from "../layout";

export class HitRegions {
  private readonly overlays = new Set<HTMLElement>();

  constructor(
    private readonly pet: HTMLElement,
    private readonly send: (rects: Rect[]) => void,
  ) {}

  add(el: HTMLElement): void {
    this.overlays.add(el);
    this.refresh();
  }

  remove(el: HTMLElement): void {
    this.overlays.delete(el);
    this.refresh();
  }

  refresh(): void {
    const els = [this.pet, ...this.overlays];
    this.send(els.map((el) => hitRectOf(el.getBoundingClientRect())));
  }
}
