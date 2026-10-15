// SPEC 12 yaratık başarımları: ad + koşul (TR/EN). Marka sesi: küçük harf, kuru, ünlemsiz. Tasarımcı onayı bekliyor.
import type { AchievementId } from "./achievements";
import type { AchievementText } from "./achievements-k9.strings";

export type Spec12Id =
  | "drag_500"
  | "poke_300"
  | "open_60"
  | "idle_24"
  | "quiet_10"
  | "questions_300"
  | "night_50"
  | "edge_100"
  | "hello_50"
  | "out_30"
  | "good_night_25"
  | "fart_20";

export const SPEC12_ACHIEVEMENT_TEXT: Record<"tr" | "en", Record<Spec12Id & AchievementId, AchievementText>> = {
  tr: {
    drag_500: { title: "yorulmayan böcek", goal: (n) => `${n} kez sürükle` },
    poke_300: { title: "kedi gibi dürtülmüş", goal: (n) => `${n} kez dürt` },
    open_60: { title: "sadık dost", goal: (n) => `${n} farklı gün aç` },
    idle_24: { title: "yapış yapış", goal: (n) => `${n} saat boşta kal` },
    quiet_10: { title: "mantar gibi sessiz", goal: (n) => `${n} farklı gün "bugün sus" de` },
    questions_300: { title: "soru makinesi", goal: (n) => `${n} soru sor` },
    night_50: { title: "gece ziyaretçisi", goal: (n) => `gece 5'ten önce ${n} soru sor` },
    edge_100: { title: "akvaryum camı", goal: (n) => `${n} kez kenardan baktır` },
    hello_50: { title: "vak vak merhaba", goal: (n) => `${n} kez selam ver` },
    out_30: { title: "kemikleşmiş alışkanlık", goal: (n) => `${n} farklı gün hakkını bitir` },
    good_night_25: { title: "gece hiç bitmez", goal: (n) => `${n} kez iyi geceler de` },
    fart_20: { title: "canavar gibi", goal: (n) => `${n} sessiz olaya şahit ol` },
  },
  en: {
    drag_500: { title: "tireless bug", goal: (n) => `drag ${n} times` },
    poke_300: { title: "poked like a cat", goal: (n) => `poke ${n} times` },
    open_60: { title: "loyal friend", goal: (n) => `open on ${n} different days` },
    idle_24: { title: "sticky", goal: (n) => `stay idle for ${n} hours` },
    quiet_10: { title: "quiet as a mushroom", goal: (n) => `pick "quiet today" on ${n} days` },
    questions_300: { title: "question machine", goal: (n) => `ask ${n} questions` },
    night_50: { title: "night visitor", goal: (n) => `ask ${n} questions before 5 am` },
    edge_100: { title: "aquarium glass", goal: (n) => `peek from the edge ${n} times` },
    hello_50: { title: "quack hello", goal: (n) => `say hi ${n} times` },
    out_30: { title: "bone-deep habit", goal: (n) => `run out of questions on ${n} days` },
    good_night_25: { title: "endless night", goal: (n) => `say good night ${n} times` },
    fart_20: { title: "monstrous", goal: (n) => `witness ${n} quiet incidents` },
  },
};
