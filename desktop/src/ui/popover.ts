// Pet penceresinde açılır yüzeyleri UP1 motoruyla yerleştirir (desktop/src/place/placement.ts, tek kaynak).
// Yüzey ölçülür -> placePopover (çalışma alanına göre, görev çubuğu hariç) -> pencere geçici olarak pet + yüzey kutusuna
// taşınır/boyutlanır -> pet ve yüzey pencere içinde yerine konur, kuyruk pet'e döner. Son yüzey kapanınca taban pencereye dönülür.
import { placePopover, type Box, type Placement, type TailSide } from "../place/placement";

export interface PopStyles {
  pet: { left: number; top: number } | null;
  pop: { left: number; top: number; width?: number; height?: number };
  tail: { side: TailSide; offset: number } | null;
  /** yüzey küçültüldü: içerik kaydırılır */
  scroll: boolean;
}

/** Yerleşim sonucunu pencere içi CSS değerlerine çevirir (saf). */
export function popStyles(p: Placement): PopStyles {
  return {
    pet: p.local.pet ? { left: p.local.pet.x, top: p.local.pet.y } : null,
    pop: p.shrunk ? { left: p.local.popover.x, top: p.local.popover.y, width: p.w, height: p.h } : { left: p.local.popover.x, top: p.local.popover.y },
    tail: p.tail,
    scroll: p.shrunk,
  };
}

/** Düşünce balonunda balon ile pet arası (SPEC 09 K4): noktalar THOUGHT_DOTS + aralar. */
export const THOUGHT_GAP = 28;

export interface PopoverDeps {
  pet: HTMLElement;
  /** pet kutusu, çalışma alanına göre mantıksal (controller) */
  petBox: () => Box;
  /** çalışma alanı (mantıksal genişlik/yükseklik + ölçek); bilinmiyorsa null */
  workArea: () => { width: number; height: number; scale: number } | null;
  /** pencereyi çalışma alanına göre mantıksal kutuya taşı + boyutla (Rust set_window_box) */
  setWindowBox: (b: Box) => Promise<void>;
  /** son yüzey kapandı: taban pencere boyutu + controller konumu */
  restore: () => void;
  /** tıklama alanlarını yenile */
  refreshHit: () => void;
  /** pet kutusunun o karedeki saydam payları (SPEC 09 K4): balon görünen gövdeye yaklaşır; yoksa tam kutu */
  petInset?: () => { left: number; right: number; top: number; bottom: number } | null;
}

/** İçeriğin doğal ölçüsü (küçültülüp kaydırılıyorsa da tam boy). */
export const naturalSize = (el: Pick<HTMLElement, "offsetWidth" | "offsetHeight" | "scrollWidth" | "scrollHeight">) => ({
  w: Math.max(el.offsetWidth, el.scrollWidth),
  h: Math.max(el.offsetHeight, el.scrollHeight),
});

/**
 * FB5: balon/pencere gölgesi (kit drop-shadow 3px 3px, bulanıksız) yüzey kutusunun sağına ve altına taşar. Yerleşim bu payla
 * yapılır: köşede/kenarda pencere gölgeyi (ve balon kenarını) kesmez, yüzey ekran içinde tam okunur.
 */
export const POP_SHADOW = 3;

/** FB4-5: açıkken boyu değişen yüzey (ask.exe'ye cevap eklendi, balon metni uzadı) bu kadar px değişince yeniden yerleşir. */
export const REPLACE_PX = 2;

export class PopoverHost {
  private readonly active = new Set<HTMLElement>();
  private seq = 0;
  /** son yerleşimde ölçülen doğal boy */
  private readonly measured = new Map<HTMLElement, { w: number; h: number }>();
  private readonly ro: ResizeObserver | null;
  private pending = false;
  /** FB5: son yerleşimde pet'in büyük pencere içindeki yeri (mantıksal); açık yüzey yokken null */
  private petLocal: { x: number; y: number } | null = null;

  constructor(private readonly d: PopoverDeps) {
    // FB4-5: yerleşimden sonra büyüyen yüzey ekran kenarından taşmasın: boy değişince yeniden yerleş
    this.ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => this.schedule()) : null;
  }

  private schedule(): void {
    if (this.pending) return;
    this.pending = true;
    const run = () => {
      this.pending = false;
      for (const el of this.active) {
        const was = this.measured.get(el);
        const now = naturalSize(el);
        if (was && (Math.abs(now.w - was.w) > REPLACE_PX || Math.abs(now.h - was.h) > REPLACE_PX)) this.place(el);
      }
    };
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
    else setTimeout(run, 16);
  }

  /**
   * FB5: yüzey açıkken pet hareket ederse (sürükle-bırak sonrası uçuş, paraşüt, iniş yaylanması) pencere taban ofsetle
   * değil buna göre taşınır: balon pet'le birlikte gider, pet pencere içinde kaymaz. Yüzey yoksa null.
   */
  windowAt(box: { x: number; y: number }): { x: number; y: number } | null {
    if (!this.busy || !this.petLocal) return null;
    return { x: box.x - this.petLocal.x, y: box.y - this.petLocal.y };
  }

  /** FB5: pet yere indi: açık yüzeyler yeni yere göre yeniden yerleşir (ekran kenarından taşmasın). */
  replaceAll(): void {
    for (const el of [...this.active]) this.place(el);
  }

  /** Açık yüzey var mı (relayout bu sırada pencereye dokunmamalı). */
  get busy(): boolean {
    return this.active.size > 0;
  }

  place(el: HTMLElement): void {
    this.active.add(el);
    const run = ++this.seq;
    // ölçmek için sol üste koy (genişlik kendi CSS'inden; sahne dar olsa da max-content)
    el.style.left = "0px";
    el.style.top = "0px";
    el.style.bottom = "";
    el.style.width = "";
    el.style.height = "";
    const size = { w: el.offsetWidth + POP_SHADOW, h: el.offsetHeight + POP_SHADOW };
    this.measured.set(el, naturalSize(el));
    this.ro?.observe(el);
    const wa = this.d.workArea();
    if (!wa) {
      this.d.refreshHit();
      return;
    }
    const p = placePopover(this.d.petBox(), size, { x: 0, y: 0, w: wa.width, h: wa.height }, {
      scaleFactor: wa.scale,
      petInset: this.d.petInset?.() ?? undefined,
      // düşünce balonu: 3 nokta (8 + 6 + 4 + 3 x 3 px) balon ile pet arasına sığsın
      gap: el.querySelector(".thought-bubble") ? THOUGHT_GAP : undefined,
    });
    this.petLocal = p.local.pet;
    void this.d.setWindowBox(p.window).then(() => {
      if (run !== this.seq || !this.active.has(el)) return; // bu arada başka yüzey yerleşti / kapandı
      const s = popStyles(p);
      if (s.pet) {
        this.d.pet.style.left = `${s.pet.left}px`;
        this.d.pet.style.top = `${s.pet.top}px`;
      }
      el.style.left = `${s.pop.left}px`;
      el.style.top = `${s.pop.top}px`;
      if (s.pop.width !== undefined) el.style.width = `${s.pop.width - POP_SHADOW}px`;
      if (s.pop.height !== undefined) el.style.height = `${s.pop.height - POP_SHADOW}px`;
      el.classList.toggle("pet-pop--scroll", s.scroll);
      if (s.tail) {
        el.dataset.tail = s.tail.side;
        el.style.setProperty("--tail", `${s.tail.offset}px`);
      } else {
        delete el.dataset.tail;
      }
      this.d.refreshHit();
    });
  }

  release(el: HTMLElement): void {
    if (!this.active.delete(el)) return;
    this.ro?.unobserve(el);
    this.measured.delete(el);
    if (this.active.size === 0) {
      this.seq++;
      this.petLocal = null;
      this.d.restore();
    }
  }
}
