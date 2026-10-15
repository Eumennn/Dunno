// Daktilo balon metni (SPEC 10 CL3, saf): harf harf akış zamanlaması. Clicky'deki karakter karakter balon fikri; kod taşınmadı.
// Karakter başına 25–40 ms, noktalama sonrası kısa duraklama. readingMs (FB5) akış bittikten sonra başlar (talker).
// DOM yok: zamanlama burada, yazıcı ui/typewriter.ts.

export const CHAR_MIN_MS = 25;
export const CHAR_MAX_MS = 40;
/** cümle sonu (. ? ! …) sonrası ek bekleme */
export const STOP_PAUSE_MS = 220;
/** virgül, noktalı virgül, iki nokta sonrası ek bekleme */
export const COMMA_PAUSE_MS = 110;

const STOPS = new Set([".", "?", "!", "…"]);
const COMMAS = new Set([",", ";", ":"]);

/**
 * Her karakterin göründüğü an (ms, akış başından): at[i] = i. karakter (0 tabanlı) ekrana geldiği an.
 * İlk karakter hemen (0). Boşluklar da karakter sayılır (kelime arası doğal akar). rng: [0,1) (test için enjekte).
 * Duraklama, noktalama karakterinden SONRAKİ karaktere eklenir; metnin sonundaki noktalama beklemez.
 */
export function typeSchedule(text: string, rng: () => number = Math.random): number[] {
  const chars = [...text];
  const at: number[] = [];
  let t = 0;
  chars.forEach((c, i) => {
    if (i > 0) {
      const prev = chars[i - 1];
      t += CHAR_MIN_MS + Math.floor(rng() * (CHAR_MAX_MS - CHAR_MIN_MS + 1));
      if (STOPS.has(prev) && c === " ") t += STOP_PAUSE_MS;
      else if (COMMAS.has(prev) && c === " ") t += COMMA_PAUSE_MS;
    }
    at.push(t);
  });
  return at;
}

/** Akışın toplam süresi (son karakterin geldiği an); boş metinde 0. */
export function typeMs(schedule: readonly number[]): number {
  return schedule.length ? schedule[schedule.length - 1] : 0;
}

/** t anında görünen karakter sayısı. */
export function shownAt(schedule: readonly number[], t: number): number {
  let n = 0;
  while (n < schedule.length && schedule[n] <= t) n++;
  return n;
}
