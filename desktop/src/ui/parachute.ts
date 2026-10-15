// Mini piksel paraşüt (Plan v2 CL2 ek isteği): havadan bırakılan Dunno süzülürken başının üstünde. Sadece çizer, tıklama yakalamaz.
// Harita sprite pikseli cinsinden; pet ile aynı ölçek (setScale). Renkler token (SVG fill var(--…)), hex yok.
// İplerin ucu kafanın tepesine (sprite satır 7) oturur; pencerede pet'in üstünde 10 sprite px boşluk var (size.ts PAD.top).

/** K kontur, P pembe, C krem (ana palet) */
export const CHUTE_MAP = [
  ".....KKKKKKKKKK.....",
  "...KKPPPCCCCPPPKK...",
  "..KPPPCCCPPCCCPPPK..",
  ".KPPCCCPPPPPPCCCPPK.",
  "KKKKKKKKKKKKKKKKKKKK",
  ".K......K..K......K.",
  "..K.....K..K.....K..",
  "...K....K..K....K...",
  "....K...K..K...K....",
  ".....K..K..K..K.....",
  "......K.K..K.K......",
];
const W = CHUTE_MAP[0].length;
const H = CHUTE_MAP.length;
/** kafa tepesi (sprite satırı): iplerin alt ucu buraya */
export const HEAD_ROW = 7;
const FILL: Record<string, string> = { K: "var(--ink)", P: "var(--pink)", C: "var(--cream)" };

/** Harita -> SVG (1 birim = 1 sprite pikseli). */
export function chuteSvg(): string {
  const rects: string[] = [];
  CHUTE_MAP.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c !== ".") rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${FILL[c]}"/>`);
    }),
  );
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" shape-rendering="crispEdges" aria-hidden="true">${rects.join("")}</svg>`;
}

/** Paraşütün sol üstü (pencere içi, CSS px): pet canvas'ının yatay ortası, iplerin ucu kafa tepesinde. */
export function chutePosition(pet: { x: number; y: number; w: number }, px: number): { x: number; y: number } {
  return { x: Math.round(pet.x + pet.w / 2 - (W * px) / 2), y: Math.round(pet.y + (HEAD_ROW - H) * px) };
}

export class ParachuteView {
  private readonly el: HTMLElement;
  private px = 2;
  private raf = 0;

  constructor(private readonly pet: HTMLElement) {
    this.el = document.createElement("div");
    this.el.className = "pet-chute";
    this.el.hidden = true;
    this.el.innerHTML = chuteSvg();
    Object.assign(this.el.style, { position: "absolute", left: "0", top: "0", pointerEvents: "none" });
    document.body.append(this.el);
    this.size();
  }

  /** Bir sprite pikseli kaç CSS px (SPEC 08 boyutu). */
  setScale(spritePx: number): void {
    this.px = spritePx;
    this.size();
  }

  set(open: boolean): void {
    this.el.hidden = !open;
    cancelAnimationFrame(this.raf);
    if (open) this.follow();
  }

  private size(): void {
    this.el.style.width = `${W * this.px}px`;
    this.el.style.height = `${H * this.px}px`;
  }

  private follow = (): void => {
    const r = this.pet.getBoundingClientRect();
    const p = chutePosition({ x: r.left, y: r.top, w: r.width }, this.px);
    this.el.style.transform = `translate(${p.x}px, ${p.y}px)`;
    this.raf = requestAnimationFrame(this.follow);
  };
}
