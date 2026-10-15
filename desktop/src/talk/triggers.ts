// Etkin trigger'lar (saf): saat dilimi, tıklama sıklığı, okuma süresi.

/**
 * Saat (0-23) -> time:* trigger'ı. TEK KAYNAK Rust `context::time_trigger` (src-tauri/src/context/mod.rs);
 * bu tablo onunla birebir aynı tutulur (triggers.test.ts Rust kaynağını okuyup karşılaştırır).
 * late_night 0-4, morning 5-10, noon 11-15, evening 16-20, night 21-23.
 */
export function hourSlot(hour: number): string {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  if (h <= 4) return "time:late_night";
  if (h <= 10) return "time:morning";
  if (h <= 15) return "time:noon";
  if (h <= 20) return "time:evening";
  return "time:night";
}

/** Yerel saate göre time:* trigger'ı (Rust bağlamı yokken; varken onunki kullanılır, değerler aynı). */
export function timeTrigger(now: Date): string {
  return hourSlot(now.getHours());
}

/**
 * Kendiliğinden laf için etkin trigger'lar. extra: bağlamdan gelenler (contextTriggers: app/time/idle/battery).
 * Bağlam saat dilimi taşıyorsa o kullanılır, yoksa yerel saatten hesaplanır.
 */
export function activeTriggers(now: Date, extra: readonly string[] = []): string[] {
  if (extra.some((t) => t.startsWith("time:"))) return [...extra];
  return [...extra, timeTrigger(now)];
}

export const SPAM_WINDOW_MS = 2_000;
export const SPAM_CLICKS = 4;

/** Kısa sürede çok tıklama = spam_click. */
export class ClickTracker {
  private times: number[] = [];

  /** Tıklamayı kaydeder; spam ise true. */
  click(nowMs: number): boolean {
    this.times = [...this.times.filter((t) => nowMs - t < SPAM_WINDOW_MS), nowMs];
    if (this.times.length >= SPAM_CLICKS) {
      this.times = [];
      return true;
    }
    return false;
  }
}

