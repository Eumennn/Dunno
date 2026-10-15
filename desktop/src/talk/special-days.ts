// FB14-3: Özel gün takvimi (mevsimler, bayramlar, pop kültür günleri).
// Yerel tarih bazlı saf hesaplama; dış takvim/API sorgusu yok (tam gizlilik).

import specialDaysData from "../../../content/context/special_days.json";

export interface SpecialDayConfig {
  id: string;
  name: { tr: string; en: string; es?: string };
  dates: { start: string; end: string } | "dynamic";
  theme: string | null;
  costume: string | null;
  lines_trigger: string;
  priority: number;
}

export interface ActiveSpecialDayResult {
  /** En yüksek öncelikli aktif gün (yoksa null) */
  activeDay: SpecialDayConfig | null;
  /** Aktif günlerin konuşma trigger'ları */
  triggers: string[];
  /** Uygulanacak tema id'si (yoksa null) */
  theme: string | null;
  /** Uygulanacak kostüm id'si (yoksa null) */
  costume: string | null;
}

const pad = (n: number) => n.toString().padStart(2, "0");

/**
 * MM-DD biçimindeki tarih aralığını kontrol eder.
 * Yıl aşan aralıkları (örn: 12-28 .. 01-03, 12-21 .. 03-20) doğru hesaplar.
 */
export function isDateInRange(date: Date, start: string, end: string): boolean {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const current = `${pad(m)}-${pad(d)}`;

  if (start <= end) {
    return current >= start && current <= end;
  }
  // Yıl dönümünü aşan aralık
  return current >= start || current <= end;
}

export function isFriday13th(date: Date): boolean {
  return date.getDate() === 13 && date.getDay() === 5;
}

export function isSpecialDayActive(day: SpecialDayConfig, date: Date): boolean {
  if (day.dates === "dynamic") {
    if (day.id === "friday_13th") return isFriday13th(date);
    return false;
  }
  return isDateInRange(date, day.dates.start, day.dates.end);
}

export function getActiveSpecialDays(
  date: Date,
  days: readonly SpecialDayConfig[] = specialDaysData.days as SpecialDayConfig[],
): SpecialDayConfig[] {
  return days.filter((d) => isSpecialDayActive(d, date));
}

/**
 * Aktif özel günleri önceliğe göre çözer:
 * - Tema ve kostüm en yüksek öncelikli olanından alınır
 * - Laflar tüm aktif özel gün havuzlarından toplanır
 */
export function resolveSpecialDay(activeDays: readonly SpecialDayConfig[]): ActiveSpecialDayResult {
  if (activeDays.length === 0) {
    return { activeDay: null, triggers: [], theme: null, costume: null };
  }

  const sorted = [...activeDays].sort((a, b) => b.priority - a.priority);
  const highest = sorted[0];
  const theme = sorted.find((d) => d.theme !== null)?.theme ?? null;
  const costume = sorted.find((d) => d.costume !== null)?.costume ?? null;
  const triggers = sorted.map((d) => d.lines_trigger);

  return {
    activeDay: highest,
    triggers,
    theme,
    costume,
  };
}

export function currentSpecialDay(
  date: Date = new Date(),
  days: readonly SpecialDayConfig[] = specialDaysData.days as SpecialDayConfig[],
): ActiveSpecialDayResult {
  return resolveSpecialDay(getActiveSpecialDays(date, days));
}
