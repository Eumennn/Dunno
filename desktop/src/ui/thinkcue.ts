// Pet üstü düşünme işareti (SPEC 07 FB6): başın üstünde piksel "…" (3 kare, sırayla) ya da landing kum saati (uzun düşünme).
// Durum talk/thinkcue.ts cueStep'ten gelir; burası sadece çizer. Tıklamayı yakalamaz (pointer-events: none).
// Pencere açılır yüzeyle büyüyünce pet kutusu kayar: işaret açıkken her karede pet canvas'ının üstüne hizalanır.
import { hourglassIconHtml } from "@ui-kit/kit";
import type { Cue } from "../talk/thinkcue";

/** pet kutusunun üst kenarı ile işaretin alt kenarı arası (mantıksal px) */
export const CUE_GAP = 2;

export function cueHtml(cue: Cue): string {
  switch (cue) {
    case "off":
      return "";
    case "dots":
      return `<span class="pet-cue__dots"><i></i><i></i><i></i></span>`;
    case "hourglass":
      return hourglassIconHtml;
  }
}

/** İşaretin sol üstü: pet kutusunun yatay ortası, üst kenarının hemen üstü (pencere içi, mantıksal). */
export function cuePosition(pet: { x: number; y: number; w: number }, cue: { w: number; h: number }): { x: number; y: number } {
  return { x: Math.round(pet.x + (pet.w - cue.w) / 2), y: Math.max(0, pet.y - cue.h - CUE_GAP) };
}

export class ThinkCueView {
  private readonly el: HTMLElement;
  private cue: Cue = "off";
  private raf = 0;

  constructor(private readonly pet: HTMLElement) {
    this.el = document.createElement("div");
    this.el.className = "pet-cue";
    this.el.setAttribute("aria-hidden", "true");
    this.el.hidden = true;
    document.body.append(this.el);
  }

  /** Pet boyutu (SPEC 08): bir sprite pikseli kaç CSS px (işaret pet ile aynı piksel ölçeğinde). */
  setScale(spritePx: number): void {
    this.el.style.setProperty("--cue-px", `${spritePx}px`);
  }

  set(cue: Cue): void {
    if (cue === this.cue) return;
    this.cue = cue;
    this.el.innerHTML = cueHtml(cue);
    this.el.hidden = cue === "off";
    cancelAnimationFrame(this.raf);
    if (cue !== "off") this.follow();
  }

  private follow = (): void => {
    const r = this.pet.getBoundingClientRect();
    const p = cuePosition({ x: r.left, y: r.top, w: r.width }, { w: this.el.offsetWidth, h: this.el.offsetHeight });
    this.el.style.transform = `translate(${p.x}px, ${p.y}px)`;
    this.raf = requestAnimationFrame(this.follow);
  };
}
