// SPEC 09 K9 başarım adları ve koşul metinleri (TR/EN). Biçim i18n.ts `achievements` ile aynı: desktop oraya birleştirir.
// Marka sesi: küçük harf, kuru, ünlemsiz, emojisiz. Hepsi tasarımcı onayı bekliyor (orchestrator/notes/achievements-k9.md).
import type { AchievementId } from "./achievements";
import type { Spec12Id } from "./achievements-spec12.strings";

export interface AchievementText {
  title: string;
  goal: (target: number) => string;
}

type K9Id = Exclude<
  AchievementId,
  | "learned_nothing_7"
  | "poke_100"
  | "night_owl"
  | "out_of_questions_5"
  | "drag_50"
  | "meeting_survivor"
  | "spreadsheet_10"
  | "idle_hour"
  | "street_mode_day"
  | Spec12Id
>;

export const K9_ACHIEVEMENT_TEXT: Record<"tr" | "en", Record<K9Id, AchievementText>> = {
  tr: {
    sweet_tooth: { title: "tatlı krizi", goal: (n) => `${n} kez acıktım de` },
    early_bird: { title: "erkenci kuş", goal: (n) => `sabah 9'dan önce ${n} soru sor` },
    edge_dweller: { title: "kenar mahalle", goal: (n) => `${n} kez kenardan baktır` },
    two_weeks: { title: "iki hafta dayandın", goal: (n) => `${n} gün üst üste aç` },
    thank_you_10: { title: "kibar şeftali", goal: (n) => `${n} kez teşekkür et` },
    quiet_days: { title: "gri sessizlik", goal: (n) => `${n} farklı gün "bugün sus" de` },
    good_morning_10: { title: "kahve kokulu sabah", goal: (n) => `${n} kez günaydın de` },
    good_night_10: { title: "gece yarısı", goal: (n) => `${n} kez iyi geceler de` },
    questions_100: { title: "eski monitör", goal: (n) => `${n} soru sor` },
    love_5: { title: "pamuk kalp", goal: (n) => `${n} kez seni seviyorum de` },
    bored_10: { title: "sıkıntıdan karpuz", goal: (n) => `${n} kez sıkıldım de` },
    drag_200: { title: "taşınan böcek", goal: (n) => `${n} kez sürükle` },
    too_fast_10: { title: "sinekleştin", goal: (n) => `${n} kez çok hızlı soru sor` },
    honest_15: { title: "bal gibi doğru", goal: (n) => `${n} doğru cevap al` },
    ghost_hours: { title: "yokmuş gibi", goal: (n) => `${n} saat boşta kal` },
    fossil_30: { title: "fosilleştin", goal: (n) => `${n} farklı gün aç` },
    night_frog_20: { title: "gece vıraklaması", goal: (n) => `gece 5'ten önce ${n} soru sor` },
    meetings_50: { title: "uzaya kaçış", goal: (n) => `${n} toplantıda saklan` },
    hungry_25: { title: "bir dilim daha", goal: (n) => `${n} kez acıktım de` },
    drag_100: { title: "kovboy taşıması", goal: (n) => `${n} kez sürükle` },
    out_of_questions_15: { title: "yağma bitti", goal: (n) => `${n} farklı gün hakkını bitir` },
    fart_5: { title: "mutfakta bir şey var", goal: (n) => `${n} sessiz olaya şahit ol` },
    why_20: { title: "neden büyücüsü", goal: (n) => `${n} kez neden diye sor` },
    honest_3: { title: "pelerinli kahraman", goal: (n) => `${n} doğru cevap al` },
    sorry_10: { title: "papyonlu özür", goal: (n) => `${n} kez özür dile` },
    what_30: { title: "o ne, bu ne", goal: (n) => `${n} kez ne diye sor` },
    math_20: { title: "hesap kitap", goal: (n) => `${n} matematik sorusu sor` },
    streak_7: { title: "bir haftalık atkı", goal: (n) => `${n} gün üst üste aç` },
    hello_20: { title: "miyav selam", goal: (n) => `${n} kez selam ver` },
    bye_10: { title: "gitmeyen veda", goal: (n) => `${n} kez görüşürüz de` },
    how_are_you_10: { title: "nasılsın çiçeği", goal: (n) => `${n} kez nasılsın de` },
    questions_50: { title: "mezun olamadın", goal: (n) => `${n} soru sor` },
    app_lines_50: { title: "iş başında", goal: (n) => `çalışırken ${n} laf ye` },
  },
  en: {
    sweet_tooth: { title: "sweet tooth", goal: (n) => `say you're hungry ${n} times` },
    early_bird: { title: "early bird", goal: (n) => `ask ${n} questions before 9 am` },
    edge_dweller: { title: "edge dweller", goal: (n) => `peek from the edge ${n} times` },
    two_weeks: { title: "two weeks, somehow", goal: (n) => `open ${n} days in a row` },
    thank_you_10: { title: "polite peach", goal: (n) => `say thanks ${n} times` },
    quiet_days: { title: "gray silence", goal: (n) => `pick "quiet today" on ${n} days` },
    good_morning_10: { title: "coffee morning", goal: (n) => `say good morning ${n} times` },
    good_night_10: { title: "midnight", goal: (n) => `say good night ${n} times` },
    questions_100: { title: "old monitor", goal: (n) => `ask ${n} questions` },
    love_5: { title: "cotton heart", goal: (n) => `say i love you ${n} times` },
    bored_10: { title: "bored melon", goal: (n) => `say you're bored ${n} times` },
    drag_200: { title: "carried bug", goal: (n) => `drag ${n} times` },
    too_fast_10: { title: "you got pesky", goal: (n) => `ask too fast ${n} times` },
    honest_15: { title: "honey honest", goal: (n) => `get ${n} honest answers` },
    ghost_hours: { title: "not even here", goal: (n) => `stay idle for ${n} hours` },
    fossil_30: { title: "fossilized", goal: (n) => `open on ${n} different days` },
    night_frog_20: { title: "night croak", goal: (n) => `ask ${n} questions before 5 am` },
    meetings_50: { title: "space escape", goal: (n) => `hide in ${n} meetings` },
    hungry_25: { title: "one more slice", goal: (n) => `say you're hungry ${n} times` },
    drag_100: { title: "cowboy carry", goal: (n) => `drag ${n} times` },
    out_of_questions_15: { title: "loot's gone", goal: (n) => `run out of questions on ${n} days` },
    fart_5: { title: "something in the kitchen", goal: (n) => `witness ${n} quiet incidents` },
    why_20: { title: "why wizard", goal: (n) => `ask why ${n} times` },
    honest_3: { title: "caped hero", goal: (n) => `get ${n} honest answers` },
    sorry_10: { title: "bow tie apology", goal: (n) => `say sorry ${n} times` },
    what_30: { title: "what's that", goal: (n) => `ask what ${n} times` },
    math_20: { title: "number cruncher", goal: (n) => `ask ${n} math questions` },
    streak_7: { title: "week-long scarf", goal: (n) => `open ${n} days in a row` },
    hello_20: { title: "meow hello", goal: (n) => `say hi ${n} times` },
    bye_10: { title: "goodbye that stays", goal: (n) => `say bye ${n} times` },
    how_are_you_10: { title: "how are you flower", goal: (n) => `ask how i am ${n} times` },
    questions_50: { title: "no diploma", goal: (n) => `ask ${n} questions` },
    app_lines_50: { title: "on the job", goal: (n) => `hear ${n} lines while working` },
  },
};
