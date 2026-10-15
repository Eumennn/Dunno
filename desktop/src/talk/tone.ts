// Ton algısı (SPEC 17 L1, saf): mesajın duygusu sad / angry / joking / kind / neutral (TR + EN).
// Niyetten (classify) ayrı: "neden" sorusu kızgın da sorulabilir, şakacı da. Küfür tek başına öfke sayılmaz ("anlamadım aq").
// Sonuç sadece enum: ilişkiyi besler (kind -> güven+, angry -> güven-), LLM'e ipucu olarak gider (metin değil).
import type { Tone } from "../companion/events";
import { fold, type QType } from "./classify";

const SAD = [
  /\b(uzgunum ya|cok uzgunum|uzuldum|moralim bozuk|moralim sifir|canim sikkin|canim cok sikkin|mutsuzum|aglıyorum|agliyorum|aglayacagim|kotu hissediyorum|yalnizim|kimse yok|berbat bir gun|bugun berbat|hic iyi degilim|iyi degilim)\b/,
  /\b(i'?m sad|so sad|feel(ing)? (bad|down|awful|terrible)|lonely|bad day|terrible day|upset|i'?m not (ok|okay|fine)|heartbroken|miserable|crying)\b/,
  /(:\(|:'\(|;\(|☹)/,
];
const ANGRY = [
  /\b(sinir oldum|sinirliyim|cok sinirli|deli ediyorsun|delirtme|kizdim|kizgınım|kizginim|bıktım|biktim|nefret ediyorum|uyuz oldum|yeter artik|sus artik)\b/,
  /\b(i'?m (so )?angry|pissed|hate (you|this|it)|so annoying|you'?re annoying|shut up|stop it|fed up|wtf)\b/,
];
const JOKING = [
  /\b(a?(ha){2,}h?|(ah){2,}a?|(he){3,}|sj(sj)+|js(js)+|asd(asd)?|kdjs|lol+|lmao+|rofl|xd+|sakaydi|saka yaptim|just kidding|jk)\b/,
  /(:d\b|:p\b|=\)|xd\b)/,
];
const KIND = [
  /\b(canim benim|tatlissin|tatlisin|cok tatli|seviyorum seni|iyi ki varsin|tesekkurler|tesekkur ederim|sagol|eyvallah|cok iyisin)\b/,
  /\b(you'?re (so )?(sweet|cute|the best|great)|love you|thank you|thanks|ty|appreciate (it|you)|you rock)\b/,
  /(<3|♥)/,
];

const QTYPE_TONE: Partial<Record<QType, Tone>> = {
  compliment: "kind",
  love: "kind",
  thanks: "kind",
  insult: "angry",
  insult_strong: "angry",
  amusement: "joking",
};

/** Büyük harf oranı (bağırma): en az 6 harf ve %70+ büyük harf */
function shouting(raw: string): boolean {
  const letters = [...raw].filter((c) => c.toLocaleLowerCase("tr") !== c.toLocaleUpperCase("tr"));
  if (letters.length < 6) return false;
  const upper = letters.filter((c) => c === c.toLocaleUpperCase("tr") && c !== c.toLocaleLowerCase("tr")).length;
  return upper / letters.length >= 0.7;
}

/**
 * Mesajın tonu. Öncelik: açık üzüntü > öfke > şaka > nezaket > niyetten gelen ton > nötr.
 * Üzüntü önce: "çok üzgünüm haha" bir yardım çağrısı olabilir; yumuşak cevap güvenli taraf.
 */
export function detectTone(raw: string, qtype: QType = "other"): Tone {
  const s = fold(raw).replace(/['’`]/g, "'").replace(/\s+/g, " ").trim();
  if (!s) return "neutral";
  const any = (rs: readonly RegExp[]) => rs.some((r) => r.test(s) || r.test(raw.toLowerCase()));
  if (any(SAD)) return "sad";
  if (any(ANGRY) || shouting(raw) || /!{3,}/.test(raw)) return "angry";
  if (any(JOKING)) return "joking";
  if (any(KIND)) return "kind";
  return QTYPE_TONE[qtype] ?? "neutral";
}
