// Günlük "doğru cevap" hakkı (SPEC 06 Q3, saf): hak SADECE sunucu charged:true dediğinde düşer.
// Yerel gün değişince sıfırlanır; 429 gelirse bugünlük biter (havuz modunda devam). Sadece sayaç, soru yok.
import { DAILY_QUESTIONS, localDay } from "../lines/engine";

export interface QuotaState {
  /** yerel gün YYYY-MM-DD */
  day: string;
  used: number;
}

export class HonestQuota {
  private s: QuotaState;

  constructor(
    private readonly now: () => Date = () => new Date(),
    state: unknown = null,
    private readonly limit = DAILY_QUESTIONS,
  ) {
    this.s = isQuota(state) ? { day: state.day, used: Math.min(state.used, limit) } : { day: localDay(now()), used: 0 };
  }

  /** Kaydedilecek durum (kopya). */
  get state(): QuotaState {
    this.sync();
    return { ...this.s };
  }

  remaining(): number {
    this.sync();
    return this.limit - this.s.used;
  }

  canAsk(): boolean {
    return this.remaining() > 0;
  }

  /** Sunucu charged:true: bir hak düşer. */
  charge(): void {
    this.sync();
    this.s.used = Math.min(this.limit, this.s.used + 1);
  }

  /** Sunucu 429: sunucu sayacı dolu, bugünlük biter. */
  exhaust(): void {
    this.sync();
    this.s.used = this.limit;
  }

  /** Test modu (SPEC 07 FB2): bugünkü yerel hak sıfırlanır. Sunucu sayacı ayrı (yerelde anahtarsız worker zaten saymaz). */
  reset(): void {
    this.s = { day: localDay(this.now()), used: 0 };
  }

  private sync(): void {
    const today = localDay(this.now());
    if (this.s.day !== today) this.s = { day: today, used: 0 };
  }
}

function isQuota(v: unknown): v is QuotaState {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  return typeof s.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.day) && Number.isInteger(s.used) && (s.used as number) >= 0;
}
