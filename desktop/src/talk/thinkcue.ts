// Düşünme görünürlüğü (SPEC 07 FB6, saf): think.ts planından düşünme metninin değişim zamanları + pet üstü işaret durumu.
// Kullanıcı düşünmeyi fark etmedi: metin her düşünmede en az bir kez değişir, uzunda 2-3 kez; uyuyakalmada zzz'den önce en az bir kez.
// Son değişim cevaptan en az ANSWER_GAP_MS önce (cevap gelirken metin titremesin). think.ts değişmez; rng enjekte.
import { DOZE_STEPS, VERB_MS, type ThinkPlan } from "./think";

/** son metin değişimi ile cevap (ya da zzz) arasında en az bu kadar */
export const ANSWER_GAP_MS = 600;
/** ilk metin en az bu kadar görünsün */
export const FIRST_VERB_MIN_MS = 400;
/** uzun düşünmede değişim sayısı */
export const LONG_CHANGES = [2, 3] as const;

const between = (rng: () => number, [a, b]: readonly [number, number]) => Math.round(a + rng() * (b - a));

/**
 * end anına kadar (son değişim <= end - ANSWER_GAP_MS) VERB_MS ritminde değişimler; [min, max] adet garanti.
 * Ritim sığmazsa (kısa düşünme) değişimler aralığa eşit dağıtılır.
 */
function changes(end: number, min: number, max: number, rng: () => number): number[] {
  const last = end - ANSWER_GAP_MS;
  if (last < FIRST_VERB_MIN_MS) return [];
  const out: number[] = [];
  let t = between(rng, VERB_MS);
  while (t <= last && out.length < max) {
    out.push(t);
    t += between(rng, VERB_MS);
  }
  if (out.length >= min) return out;
  // ritim sığmadı: [FIRST_VERB_MIN_MS, last] aralığına min adet eşit aralıklı
  const span = last - FIRST_VERB_MIN_MS;
  return Array.from({ length: min }, (_, i) => Math.round(FIRST_VERB_MIN_MS + (min === 1 ? span * rng() : (span * i) / (min - 1))));
}

/**
 * Havuz cevabında düşünme metninin değişeceği anlar (düşünme başından ms, artan).
 * normal: en az 1 · uzun (plan.long): 2-3 · uyuyakalma: zzz'den (DOZE_STEPS.asleep) önce en az 1; zzz sonrası metni
 * talker'ın rethink'i değiştirir. honest (LLM) cevabında süre baştan bilinmez: çağıran planı yine kullanır, cevap erken
 * gelirse trimVerbs ile keser.
 */
export function verbSchedule(plan: ThinkPlan, rng: () => number): number[] {
  if (plan.doze) return changes(DOZE_STEPS.asleep, 1, 1, rng);
  if (plan.long) return changes(plan.poolMs, LONG_CHANGES[0], LONG_CHANGES[1], rng);
  return changes(plan.poolMs, 1, 1, rng);
}

/** Cevap answerAt'te geldi: ondan ANSWER_GAP_MS'den daha yakın ya da sonraki değişimler atılır. */
export function trimVerbs(schedule: readonly number[], answerAt: number): number[] {
  return schedule.filter((t) => t <= answerAt - ANSWER_GAP_MS);
}

// ---------------------------------------------------------------- pet üstü işaret

/** dots: başının üstünde piksel "…" · hourglass: landing kum saati (uzun düşünme) · off: yok */
export type Cue = "off" | "dots" | "hourglass";

/** think: düşünme başladı · doze: zzz (uyuyakaldı) · rethink: uyanıp yeniden düşünüyor · answer: cevap geldi · cancel: kapandı */
export type CueEvent = "think" | "doze" | "rethink" | "answer" | "cancel";

/** Düşünme işaretinin türü: uzun düşünmede kum saati, değilse noktalar. */
export const cueFor = (plan: ThinkPlan): Exclude<Cue, "off"> => (plan.long ? "hourglass" : "dots");

/**
 * İşaret durumu: düşünme başlar -> açık (plana göre tür), uyuyakalma -> kapalı (zzz kendisi işaret),
 * yeniden düşünme -> tekrar açık, cevap/iptal -> kapalı. Saf geçiş tablosu; olay sırası talker'da.
 */
export function cueStep(cue: Cue, ev: CueEvent, plan: ThinkPlan): Cue {
  switch (ev) {
    case "think":
      return cueFor(plan);
    case "rethink":
      return cue === "off" ? cueFor(plan) : cue;
    case "doze":
    case "answer":
    case "cancel":
      return "off";
  }
}
