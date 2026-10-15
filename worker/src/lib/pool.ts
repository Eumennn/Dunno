import poolEn from "../../../content/pool/pool_en.json";
import poolTr from "../../../content/pool/pool_tr.json";
import type { Lang, Mode, QType } from "./validate";

/**
 * Yedek cevap havuzu. Küfür yeri [K] olarak durur; moda göre değiştirme masaüstünde yapılır.
 * en: handoff §5.1 / dunno-reference.dc.html ile aynı (*** -> [K]).
 * tr: PLACEHOLDER, tasarımcının pool_tr.json'u gelene kadar.
 */
export const POOLS: Record<Lang, Record<Mode, readonly string[]>> = {
  en: {
    polite: [
      "dunno. google it maybe",
      "about four. emotionally",
      "fish",
      "have you tried not knowing",
      "that sounds like a you problem",
      "i used to know that. then i retired",
      "the answer is inside you. i'm not going in there",
      "probably a duck",
      "*shrugs*",
      "ask me in 2019. i cared back then",
    ],
    street: [
      "dunno. google it, [K]",
      "who the [K] asks that",
      "fish. [K] fish",
      "i retired from this [K] years ago",
      "that's a [K] you problem",
      "*shrugs* in [K]",
      "the answer is [K]. next",
      "i'm on my [K] break",
    ],
  },
  // placeholder
  tr: {
    polite: [
      "bilmiyorum. google'a sor belki",
      "balık",
      "eskiden bilirdim. sonra emekli oldum",
      "*omuz silker*",
    ],
    street: [
      "bilmiyorum. google'a sor, [K]",
      "bunu kim sorar ya [K]",
      "mesai bitti [K]. yarın gel",
      "*omuz silker* [K]",
    ],
  },
};

/** Havuzdan rastgele cevap. Sunucu kullanıcı başına sıra tutmaz. */
export function poolAnswer(lang: Lang, mode: Mode, random: () => number = Math.random): string {
  const pool = POOLS[lang][mode];
  return pool[Math.floor(random() * pool.length) % pool.length];
}

// ---------------------------------------------------------------- SPEC 06: soru tipine göre havuz

/** content/pool tek kaynak; sadece answer:* lafları tutulur. */
const ANSWER_LINES: Record<Lang, { trigger: string; text: string }[]> = {
  tr: (poolTr as unknown as Record<string, string>[]).filter((l) => l.trigger?.startsWith("answer:")).map((l) => ({ trigger: l.trigger, text: l.tr })),
  en: (poolEn as unknown as Record<string, string>[]).filter((l) => l.trigger?.startsWith("answer:")).map((l) => ({ trigger: l.trigger, text: l.en })),
};

const K_BLOCK = /\{K:([^{}]*)\}/g;

/**
 * Havuz lafını sunucu cevap biçimine çevirir: polite'ta {K:...} silinir; street'te açılır ve *** -> [K]
 * (masaüstü [K]'yi moda göre işler; aq kısaltması olduğu gibi kalır).
 */
export function renderPoolLine(text: string, mode: Mode): string {
  const s = mode === "street" ? text.replace(K_BLOCK, "$1").replace(/\*{3}/g, "[K]") : text.replace(K_BLOCK, "");
  return s
    .replace(/\s+/g, " ")
    .replace(/\s+([.,?;:])/g, "$1")
    .replace(/[,;:]\s*([.?])/g, "$1")
    .replace(/[\s,;:]+$/, "")
    .trim();
}

/**
 * Ters cevap (SPEC 09 K8): yön/selam tiplerinde cevap karşıt tipin havuzundan.
 * desktop/src/talk/classify.ts INVERSE ve content/pool/inverse.md ile aynı (test kontrol eder).
 */
export const INVERSE: Readonly<Partial<Record<QType, QType>>> = {
  to_where: "from_where",
  from_where: "to_where",
  to_whom: "from_whom",
  from_whom: "to_whom",
  good_morning: "good_night",
  good_night: "good_morning",
  good_afternoon: "good_evening",
  good_evening: "good_afternoon",
  bye: "greeting",
  greeting: "bye",
};

/**
 * Soru tipine uygun havuz cevabı: answer:<qtype> (ters tiplerde karşıtı), yoksa answer:generic, o da yoksa eski POOLS.
 * qtype "other" ve tipsiz eski istemci (pool_hint) için çağıran poolAnswer'ı kullanır.
 */
export function typedPoolAnswer(lang: Lang, mode: Mode, qtype: QType, random: () => number = Math.random): string {
  const lines = ANSWER_LINES[lang];
  for (const trigger of [`answer:${INVERSE[qtype] ?? qtype}`, "answer:generic"]) {
    const texts = lines
      .filter((l) => l.trigger === trigger)
      .map((l) => renderPoolLine(l.text, mode))
      .filter((t) => t !== "");
    if (texts.length) return texts[Math.floor(random() * texts.length) % texts.length];
  }
  return poolAnswer(lang, mode, random);
}
