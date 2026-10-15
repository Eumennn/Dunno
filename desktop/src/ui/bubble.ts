// Pet'in üstündeki açılır yüzey (konuşma balonu, ask.exe, setup.exe, error.exe, toast) için konumlayıcı kap.
// İçerik ui-kit HTML'i (surfaces.ts); kap sadece yerleşim, tıklama alanı ve kuyruk konumu (--tail-x) taşır. Stil: styles/pet.css.
import type { Rect } from "../layout";
import type { HitRegions } from "./hit";

const GAP = 12; // kuyruk payı
const EDGE = 4;

export interface BubbleHost {
  stage: HTMLElement;
  hit: HitRegions;
  /** pet kutusu (pencereye göre, mantıksal) */
  petBox: () => Rect;
  /** pencerenin ekranda görünen yatay aralığı [min, max) (pencere kenarda kısmen ekran dışında olabilir) */
  visibleX: () => [number, number];
  /**
   * Konumlandırma motoru (UP1, ui/popover.ts): verilirse yüzey ekran/çalışma alanına göre yerleşir, pencere geçici büyür.
   * Verilmezse (studio gibi sabit sahne) yüzey pet'in üstünde sahne içine sığdırılır.
   */
  place?: (el: HTMLElement) => void;
  release?: (el: HTMLElement) => void;
}

/** Balonun sol kenarı: pet'e ortalı, görünen aralıktan taşmaz. */
export function bubbleLeft(petCenterX: number, bubbleW: number, minX: number, maxX: number): number {
  const left = Math.round(petCenterX - bubbleW / 2);
  return Math.min(Math.max(minX + EDGE, left), Math.max(minX + EDGE, maxX - bubbleW - EDGE));
}

export class Bubble {
  readonly el: HTMLDivElement;

  constructor(private readonly host: BubbleHost) {
    this.el = document.createElement("div");
    this.el.className = "pet-pop";
    this.el.setAttribute("role", "dialog");
    host.stage.append(this.el);
    host.hit.add(this.el);
  }

  /** İçeriği değiştirir ve yeniden konumlar. */
  set(content: Node[]): void {
    this.el.replaceChildren(...content);
    this.place();
  }

  /** ui-kit HTML'iyle içerik (metinler üreticide kaçışlanır). */
  setHtml(html: string): void {
    this.el.innerHTML = html;
    this.place();
  }

  place(): void {
    if (this.host.place) {
      this.host.place(this.el);
      return;
    }
    const pet = this.host.petBox();
    const [minX, maxX] = this.host.visibleX();
    const stageH = this.host.stage.clientHeight;
    this.el.style.bottom = `${stageH - pet.y + GAP}px`;
    const w = this.el.offsetWidth;
    const center = pet.x + pet.w / 2;
    const left = bubbleLeft(center, w, minX, maxX);
    this.el.style.left = `${left}px`;
    // kuyruk pet'in ortasını gösterir, balonun içinde kalır
    this.el.style.setProperty("--tail-x", `${Math.min(w - 12, Math.max(12, center - left))}px`);
    this.host.hit.refresh();
  }

  close(): void {
    this.host.hit.remove(this.el);
    this.el.remove();
    this.host.release?.(this.el);
  }
}

/** Küçük DOM yardımcısı. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: { className?: string; text?: string; onClick?: () => void } = {},
  children: Node[] = [],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props.className) el.className = props.className;
  if (props.text !== undefined) el.textContent = props.text;
  if (props.onClick) el.addEventListener("click", props.onClick);
  el.append(...children);
  return el;
}
