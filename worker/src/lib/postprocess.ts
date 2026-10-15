import type { Lang } from "./validate";

export const MAX_ANSWER_CHARS = 60;
/** SPEC 06 honest cevap (balonda 2 satır) */
export const MAX_HONEST_CHARS = 120;

// emoji + birleştiriciler: ZWJ, varyasyon seçicileri, ten rengi, bayrak harfleri, keycap
const EMOJI =
  /[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{1F1E6}-\u{1F1FF}‍︎️⃣]/gu;
const BANG = /[!¡！]/g;
// modelin yazdığı [k] / *** -> tek biçim [K]; *shrugs* gibi tek yıldızlar dokunulmaz
const CURSE = /\[k\]|\*{3}/gi;

/**
 * LLM çıktısını marka kurallarına zorlar. [K] korunur (moda göre değiştirme masaüstünde).
 * Kullanılabilir bir şey kalmazsa null döner (çağıran havuza düşer).
 */
export function postprocess(raw: string, lang: Lang, max: number = MAX_ANSWER_CHARS): string | null {
  let s = raw.split(/\r?\n/).find((line) => line.trim() !== "") ?? "";

  s = s
    .trim()
    .replace(/^dunno\s*:\s*/i, "")
    .replace(/^["'“”‘’`]+|["'“”‘’`]+$/g, "")
    .replace(EMOJI, "")
    .replace(BANG, "")
    .toLocaleLowerCase(lang)
    .replace(CURSE, "[K]");

  s = s
    .replace(/\s+/g, " ")
    .replace(/\s+([.,?;:])/g, "$1")
    .replace(/^[\s.,;:]+/, "")
    .trim();

  s = truncate(s, max);
  // sadece küfür yer tutucusundan ibaret cevap cevap değildir
  return s.replace(/\[K\]/g, "").replace(/[\s.,;:?*]/g, "") === "" ? null : s;
}

function truncate(s: string, max: number): string {
  const chars = Array.from(s);
  if (chars.length <= max) return s;
  let cut = chars.slice(0, max).join("");
  // kelime ortasında kesme; makul uzaklıkta boşluk varsa oradan kes
  const space = cut.lastIndexOf(" ");
  if (space >= max * 0.6) cut = cut.slice(0, space);
  // yarım kalmış yer tutucu bırakma ("... [", "... [K")
  return cut.replace(/\[K?$/, "").replace(/[\s,;:\-]+$/, "");
}
