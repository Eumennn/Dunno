// Toplantı koruması davranışı (saf TS): meeting://state + o anki arayüz durumu -> yapılacaklar.
// Bağlama desktop'ta: aksiyonları uygular, shh -> saklan geçişi için `hideAt`'e göre zamanlayıcı kurar ya da tick() çağırır.
// Emin değilken (ilk durum gelmeden) toplantı varsayılır: laf yok, mod polite.
import type { Mode } from "../lines/types";

/** shh animasyonu bir kez tam oynar (3 kare x 400 ms), sonra pet saklanır (SPEC 07 FB4: ≈1 sn, anında kaybolmaz). */
export const SHH_MS = 1_200;

export interface GuardContext {
  askboxOpen: boolean;
  bubbleVisible: boolean;
  /** kullanıcının seçtiği mod */
  mode: Mode;
}

/**
 * Tek seferlik komutlar (true ise şimdi yap) + kalıcı durum (suppress, effectiveMode).
 * Aynı durum tekrar gelince tek seferlikler false döner.
 */
export interface GuardActions {
  closeAskbox: boolean;
  hideBubble: boolean;
  playShh: boolean;
  /** pet görünmez olsun (pencereyi gizle / ekran dışına çekil) */
  hide: boolean;
  /** pet geri gelsin, bastırma kalksın */
  restore: boolean;
  /** kendiliğinden laf ve cevaplar bastırılsın */
  suppress: boolean;
  /** konuşulacaksa kullanılacak mod: toplantıda/bilinmezken her zaman polite */
  effectiveMode: Mode;
}

/** unknown: ilk durum gelmedi · clear: toplantı yok · shh: toplantı başladı, shh oynuyor · hidden: saklandı */
export type GuardPhase = "unknown" | "clear" | "shh" | "hidden";

export interface GuardOptions {
  now?: () => number;
  shhMs?: number;
}

export class MeetingGuard {
  private readonly now: () => number;
  private readonly shhMs: number;
  private phase: GuardPhase = "unknown";
  private shhSince = 0;

  constructor({ now = () => Date.now(), shhMs = SHH_MS }: GuardOptions = {}) {
    this.now = now;
    this.shhMs = shhMs;
  }

  get state(): GuardPhase {
    return this.phase;
  }

  /** shh bitince saklanma zamanı (epoch ms); shh oynamıyorsa null. Desktop bu ana zamanlayıcı kurar. */
  get hideAt(): number | null {
    return this.phase === "shh" ? this.shhSince + this.shhMs : null;
  }

  /** Toplantı durumu geldiğinde (meeting://state, getWatchState, tray anahtarı). */
  update(inMeeting: boolean, ctx: GuardContext): GuardActions {
    const out = this.base(ctx);
    if (inMeeting) {
      if (this.phase === "unknown" || this.phase === "clear") {
        this.phase = "shh";
        this.shhSince = this.now();
        out.closeAskbox = ctx.askboxOpen;
        out.hideBubble = ctx.bubbleVisible;
        out.playShh = true;
      }
      return this.advance(out, ctx);
    }
    if (this.phase !== "clear") {
      // unknown'dan çıkışta gizlenmiş bir şey yok: sadece bastırma kalkar
      out.restore = this.phase === "shh" || this.phase === "hidden";
      this.phase = "clear";
    }
    return { ...out, ...this.flags(ctx) };
  }

  /** Durum değişmeden zaman geçince (zamanlayıcı ya da döngü): shh süresi dolduysa saklanır. */
  tick(ctx: GuardContext): GuardActions {
    return this.advance(this.base(ctx), ctx);
  }

  private advance(out: GuardActions, ctx: GuardContext): GuardActions {
    if (this.phase === "shh" && this.now() - this.shhSince >= this.shhMs) {
      this.phase = "hidden";
      out.hide = true;
    }
    return { ...out, ...this.flags(ctx) };
  }

  private base(ctx: GuardContext): GuardActions {
    return {
      closeAskbox: false,
      hideBubble: false,
      playShh: false,
      hide: false,
      restore: false,
      ...this.flags(ctx),
    };
  }

  private flags(ctx: GuardContext): Pick<GuardActions, "suppress" | "effectiveMode"> {
    const quiet = this.phase !== "clear";
    return { suppress: quiet, effectiveMode: quiet ? "polite" : ctx.mode };
  }
}
