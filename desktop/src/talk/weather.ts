// FB14-2: Hava durumu lafları için mevsim/ay tabanlı yerel tahmin.
// Dış API, GPS veya kesin konum ASLA kullanılmaz. Sadece cihazın yerel tarihi (ay) ve rastgelelik.

export type WeatherTrigger = "weather:hot" | "weather:cold" | "weather:rain" | "weather:clear";

export const WEATHER_TRIGGERS: readonly WeatherTrigger[] = [
  "weather:hot",
  "weather:cold",
  "weather:rain",
  "weather:clear",
];

/**
 * Verilen tarihin ayına göre mevsime uygun hava durumu trigger'ı seçer.
 * - Aralık, Ocak, Şubat: kış (ağırlıklı cold)
 * - Haziran, Temmuz, Ağustos: yaz (ağırlıklı hot)
 * - Mart, Nisan, Mayıs: ilkbahar (ağırlıklı rain / clear)
 * - Eylül, Ekim, Kasım: sonbahar (ağırlıklı rain / cold)
 */
export function seasonalWeather(date: Date, rng: () => number = Math.random): WeatherTrigger {
  const month = date.getMonth(); // 0..11
  const r = rng();

  // Kış: 11 (Aralık), 0 (Ocak), 1 (Şubat)
  if (month === 11 || month === 0 || month === 1) {
    if (r < 0.7) return "weather:cold";
    if (r < 0.85) return "weather:rain";
    return "weather:clear";
  }

  // Yaz: 5 (Haziran), 6 (Temmuz), 7 (Ağustos)
  if (month >= 5 && month <= 7) {
    if (r < 0.75) return "weather:hot";
    if (r < 0.9) return "weather:clear";
    return "weather:rain";
  }

  // İlkbahar: 2 (Mart), 3 (Nisan), 4 (Mayıs)
  if (month >= 2 && month <= 4) {
    if (r < 0.5) return "weather:rain";
    if (r < 0.8) return "weather:clear";
    return "weather:cold";
  }

  // Sonbahar: 8 (Eylül), 9 (Ekim), 10 (Kasım)
  if (r < 0.5) return "weather:rain";
  if (r < 0.8) return "weather:cold";
  return "weather:clear";
}
