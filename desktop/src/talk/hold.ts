// Balonu okuma süresi kadar tutar (SPEC 07 FB5): reading.ts durum makinesini balon elemanının imleç olaylarına bağlar.
// pointerenter -> durur, pointerleave -> max(okuma bitişi, 2 sn) sonra kapanır, click -> hemen kapanır.
// Pencere imleci bırakınca DOM pointerleave gelmeyebilir: Rust cursor://state `pop` bayrağı enter()/leave() ile aynı olayları verir.
// Eleman sadece EventTarget olarak kullanılır (testte DOM'suz).
import { bubbleStep, openBubble, type BubbleEvent, type BubbleTimer } from "./reading";

/** süre kontrol aralığı */
export const HOLD_TICK_MS = 200;

export type HoldEnd = "timeout" | "click" | "closed";

export interface HoldOptions {
  now?: () => number;
  /** false dönerse balon dışarıdan kapandı (toplantı koruması vb.): bekleme "closed" ile biter */
  alive?: () => boolean;
}

export class HoverHold {
  readonly done: Promise<HoldEnd>;
  private timer: BubbleTimer;
  private finish!: (end: HoldEnd) => void;
  private readonly now: () => number;
  private readonly interval: ReturnType<typeof setInterval>;
  private readonly onEnter = () => this.feed("enter");
  private readonly onLeave = () => this.feed("leave");
  private readonly onClick = () => this.feed("click");

  constructor(
    private readonly el: EventTarget,
    ms: number,
    private readonly opts: HoldOptions = {},
  ) {
    this.now = opts.now ?? (() => Date.now());
    this.timer = openBubble(this.now(), ms);
    this.done = new Promise((resolve) => (this.finish = resolve));
    el.addEventListener("pointerenter", this.onEnter);
    el.addEventListener("pointerleave", this.onLeave);
    el.addEventListener("click", this.onClick);
    this.interval = setInterval(() => {
      if (this.opts.alive && !this.opts.alive()) return this.end("closed");
      this.feed("tick");
    }, HOLD_TICK_MS);
  }

  /** imleç balona girdi (Rust pop) */
  enter(): void {
    this.feed("enter");
  }

  /** imleç balondan çıktı (Rust pop) */
  leave(): void {
    this.feed("leave");
  }

  get phase(): BubbleTimer["phase"] {
    return this.timer.phase;
  }

  private feed(ev: BubbleEvent): void {
    if (this.timer.phase === "closed") return;
    const r = bubbleStep(this.timer, ev, this.now());
    this.timer = r.timer;
    if (r.close) this.end(ev === "click" ? "click" : "timeout");
  }

  private end(how: HoldEnd): void {
    this.timer = { ...this.timer, phase: "closed", closeAt: null };
    clearInterval(this.interval);
    this.el.removeEventListener("pointerenter", this.onEnter);
    this.el.removeEventListener("pointerleave", this.onLeave);
    this.el.removeEventListener("click", this.onClick);
    this.finish(how);
  }
}
