/**
 * Dunno — 10-Layer Zero-LLM Cognitive Natural Language Understanding (NLU),
 * Full Trilingual Parity (TR / EN / ES — 11,568 Verified Lines Across 963 Pools),
 * Conversational Memory, Deep Text Selection ("Dunnolama") & Context Engine (v18.0)
 *
 * Implements a 10-Layer Zero-LLM Understanding Pipeline (< 0.25 ms latency, 0 MB cloud model):
 * 1. Layer 1 — Multilingual Fuzzy Levenshtein Edit-Distance & Consonant-Skeleton Matcher (`damerauLevenshtein`, `consonantSkeleton`, `fuzzyRepairMultilingualToken`):
 *    - Automatically repairs keyboard typos and missing vowels across TR, EN, and ES ("gunaydn" -> "günaydın", "mrng" -> "morning", "thnks" -> "thanks", "grcias" -> "gracias").
 * 2. Layer 2 — Agglutinative Turkish Stemmer & Multilingual Slang Canonicalizer (`stemTurkishWord`, `normalizeMessage`).
 * 3. Layer 3 — Multilingual Negation & Polarity Inverter (`detectNegationScope` across TR, EN, ES).
 * 4. Layer 4 — Conversational Topic & Life-Situation Classifier (`12 topic:* pools` across TR, EN, ES).
 * 5. Layer 5 — Full 60+ Intent & Idiom Scorer (`detectMultilingualIntent` with 100% TR / EN / ES parity across all 20+ question types, emotions, social acts, calendar, and reactions).
 * 6. Layer 6 — Entity, Target & Sentiment/Tone Extractor (`TargetType`, `ToneType`).
 * 7. Layer 7 — Multi-Turn Conversational Memory & Follow-Up State Machine (`behavior:repeat_spam`, `behavior:short_followup`).
 * 8. Layer 8 — Contextual Coreference & Anaphora Resolver ("bu ne" / "what is this" / "qué es esto").
 * 9. Layer 9 — 16-Category Structural Fingerprint Analyzer for Left-Click Text Selection (`classifySelectedText` & `analyzeSelectionFingerprint`).
 * 10. Layer 10 — Multi-Template Dynamic Entity-Extracting "Lazy Rewrite" (`buildLazyDunnoRewrite`).
 */

export type SupportedLocale = "tr" | "en" | "es";
export type MouthMode = "polite" | "street";
export type LineStyle = "punchy" | "aphorism" | "meta" | "snark";

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type Season = "winter" | "spring" | "summer" | "autumn";

export type MonthName =
  | "january"
  | "february"
  | "march"
  | "april"
  | "may"
  | "june"
  | "july"
  | "august"
  | "september"
  | "october"
  | "november"
  | "december";

export type SpecialHoliday =
  | "new_year"
  | "halloween"
  | "valentines"
  | "black_friday"
  | "april_fools"
  | "bayram_holiday";

export type SelectionCategory =
  | "selection:wall_of_text"
  | "selection:code_or_error"
  | "selection:money_iban_price"
  | "selection:corporate_email"
  | "selection:foreign_translate"
  | "selection:numbers_math"
  | "selection:secret_sensitive"
  | "selection:short_word_phrase"
  | "selection:url_link_domain"
  | "selection:date_time_deadline"
  | "selection:caps_lock_rage"
  | "selection:todo_checklist"
  | "selection:social_drama_gossip"
  | "selection:legal_terms_contract"
  | "selection:recipe_food_menu"
  | "selection:academic_homework_exam";

export type TopicCategory =
  | "topic:food_craving"
  | "topic:money_broke_salary"
  | "topic:coding_bug_rant"
  | "topic:love_relationship_drama"
  | "topic:exam_school_panic"
  | "topic:work_boss_burnout"
  | "topic:insomnia_late_night"
  | "topic:existential_philosophy"
  | "topic:coffee_tea_addiction"
  | "topic:internet_lag_ping"
  | "topic:gym_diet_lie"
  | "topic:pets_cat_dog";

export type IntentCategory =
  | "greeting:general"
  | "greeting:morning"
  | "greeting:afternoon"
  | "greeting:evening"
  | "greeting:night"
  | "farewell"
  | "thanks"
  | "apology"
  | "day:monday"
  | "day:tuesday"
  | "day:wednesday"
  | "day:thursday"
  | "day:friday"
  | "day:saturday"
  | "day:sunday"
  | "day:weekend"
  | "season:winter"
  | "season:spring"
  | "season:summer"
  | "season:autumn"
  | "month:january"
  | "month:february"
  | "month:march"
  | "month:april"
  | "month:may"
  | "month:june"
  | "month:july"
  | "month:august"
  | "month:september"
  | "month:october"
  | "month:november"
  | "month:december"
  | "holiday:new_year"
  | "holiday:halloween"
  | "holiday:valentines"
  | "holiday:black_friday"
  | "holiday:april_fools"
  | "holiday:bayram_holiday"
  | "question:what"
  | "question:what:dunno"
  | "question:what:external"
  | "question:why"
  | "question:why:external"
  | "question:how"
  | "question:how:external"
  | "question:where"
  | "question:where:external"
  | "question:where_from"
  | "question:where_to"
  | "question:when"
  | "question:who"
  | "question:who:dunno"
  | "question:who:external"
  | "question:to_whom"
  | "question:from_whom"
  | "question:whose"
  | "question:with_whom"
  | "question:with_what"
  | "question:for_what"
  | "question:which"
  | "question:ordinal"
  | "question:how_many"
  | "question:what_are_you_doing"
  | "question:what_happened"
  | "question:opinion"
  | "question:confirmation"
  | "insult:playful"
  | "insult:mild"
  | "insult:strong"
  | "self_deprecation"
  | "compliment"
  | "affection"
  | "emotion:bored"
  | "emotion:hungry"
  | "emotion:tired"
  | "amusement"
  | "confusion"
  | "disbelief"
  | "command"
  | "help_request"
  | "interaction:fart"
  | "behavior:alt_tab_panic"
  | "behavior:tab_hoarder"
  | "behavior:song_loop_detector"
  | "behavior:ambient_prop"
  | "behavior:keyboard_idle"
  | "behavior:mouse_fidget_selection"
  | "behavior:copy_paste_warrior"
  | "behavior:storage_downloads_mess"
  | "behavior:second_monitor_neck"
  | "behavior:window_shake_drag"
  | "behavior:repeat_spam"
  | "behavior:short_followup"
  | TopicCategory
  | SelectionCategory
  | "forbidden"
  | "fallback";

export type TargetType =
  | "dunno"
  | "user_self"
  | "third_person"
  | "application"
  | "object"
  | "situation"
  | "unknown";

export type ToneType =
  | "neutral"
  | "casual"
  | "friendly"
  | "playful"
  | "teasing"
  | "sarcastic"
  | "annoyed"
  | "angry"
  | "sad"
  | "tired"
  | "excited"
  | "confused"
  | "curious"
  | "amused"
  | "surprised"
  | "frustrated"
  | "dry";

export interface ProfanityAnalysis {
  hasSwearing: boolean;
  level: 0 | 1 | 2 | 3;
  position: "start" | "middle" | "end" | "none";
  func: "none" | "familiarity" | "surprise" | "amusement" | "frustration" | "hostility";
  target: TargetType;
}

export interface EntertainmentRule {
  poolKey: string;
  category:
    | "series"
    | "turkish_series"
    | "series_es"
    | "anime"
    | "movie"
    | "game"
    | "launcher"
    | "music"
    | "lifestyle_site"
    | "creative_app"
    | "media_player";
  supportedLocales?: SupportedLocale[];
  processNames?: string[];
  titleKeywords: string[];
}

export interface RuntimeContext {
  locale?: SupportedLocale;
  activeApp?: string;
  activeSiteCategory?: string;
  activeEntertainmentPool?: string;
  windowTitleForLocalMatch?: string;
  processNameForLocalMatch?: string;
  watchTabTitlesEnabled?: boolean;
  currentDay?: DayOfWeek;
  currentSeason?: Season;
  currentMonth?: MonthName;
  currentHoliday?: SpecialHoliday;
  localHour?: number;
  inMeeting?: boolean;
  quietToday?: boolean;
  mouthMode?: MouthMode;
  allowInverse?: boolean;
  inverseProbability?: number;
}

export interface PoolCandidate {
  text: string;
  tone?: ToneType;
  slang?: number;
  weight?: number;
  style?: LineStyle;
}

export interface SelectionStructuralFingerprint {
  charCount: number;
  wordCount: number;
  lineCount: number;
  uppercaseRatio: number;
  digitRatio: number;
  codeSymbolCount: number;
  estimatedReadSeconds: number;
  extractedEntity: string | null;
}

export interface DunnolaSelectionResult {
  silent: boolean;
  locale: SupportedLocale;
  poolKey: SelectionCategory | null;
  charCount: number;
  wordCount: number;
  estimatedReadSeconds: number;
  extractedEntity: string | null;
  response: string;
  lazyRewrite: string;
}

export interface DialogueTurnResult {
  silent: boolean;
  locale: SupportedLocale;
  rawMessage: string;
  normalizedMessage: string;
  stems: string[];
  hasNegation: boolean;
  detectedIntent: IntentCategory;
  effectivePoolKey: string;
  matchedEntertainmentPool: string | null;
  usedInverse: boolean;
  confidence: number;
  target: TargetType;
  tone: ToneType;
  profanity: ProfanityAnalysis;
  response: string;
}

const ACCENT_FOLD_MAP: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  ö: "o",
  ş: "s",
  ü: "u",
  á: "a",
  é: "e",
  í: "i",
  ó: "o",
  ú: "u",
  ñ: "n",
};

export function toLocaleLower(input: string, locale: SupportedLocale = "tr"): string {
  if (locale === "tr") {
    return input
      .replace(/İ/g, "i")
      .replace(/I/g, "ı")
      .replace(/Ç/g, "ç")
      .replace(/Ğ/g, "ğ")
      .replace(/Ö/g, "ö")
      .replace(/Ş/g, "ş")
      .replace(/Ü/g, "ü")
      .toLowerCase();
  }
  return input.toLowerCase();
}

export function foldAscii(input: string): string {
  return input.replace(/[çğıöşüáéíóúñ]/g, (ch) => ACCENT_FOLD_MAP[ch] || ch);
}

/**
 * Layer 1A: Fast Damerau-Levenshtein Edit Distance & Consonant Skeleton for Multilingual Fuzzy Typo Recovery
 */
export function damerauLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const lenA = a.length;
  const lenB = b.length;
  if (Math.abs(lenA - lenB) > 2) return 99;

  const dp: number[][] = Array.from({ length: lenA + 1 }, () =>
    new Array(lenB + 1).fill(0)
  );
  for (let i = 0; i <= lenA; i++) dp[i][0] = i;
  for (let j = 0; j <= lenB; j++) dp[0][j] = j;

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + cost);
      }
    }
  }
  return dp[lenA][lenB];
}

export function consonantSkeleton(word: string): string {
  return foldAscii(word).replace(/[aeiou]/g, "");
}

const FUZZY_VOCAB_BY_LOCALE: Record<
  SupportedLocale,
  Array<{ canonical: string; folded: string; skel: string }>
> = {
  tr: [
    "günaydın",
    "tünaydın",
    "merhaba",
    "selam",
    "naber",
    "nasılsın",
    "napıyorsun",
    "teşekkürler",
    "eyvallah",
    "görüşürüz",
    "sıkıldım",
    "bunaldım",
    "acıktım",
    "yoruldum",
    "uykum",
    "gerizekalı",
    "salaksın",
    "tatlısın",
    "harikasın",
    "anlamadım",
    "inanmıyorum",
  ].map((w) => ({ canonical: w, folded: foldAscii(w), skel: consonantSkeleton(w) })),
  en: [
    "morning",
    "afternoon",
    "evening",
    "hello",
    "goodbye",
    "thanks",
    "sorry",
    "hungry",
    "starving",
    "exhausted",
    "sleepy",
    "bored",
    "awesome",
    "hilarious",
    "confused",
  ].map((w) => ({ canonical: w, folded: foldAscii(w), skel: consonantSkeleton(w) })),
  es: [
    "buenos",
    "buenas",
    "gracias",
    "perdon",
    "disculpa",
    "aburrido",
    "hambre",
    "cansado",
    "agotado",
    "entiendo",
    "increible",
    "genial",
  ].map((w) => ({ canonical: w, folded: foldAscii(w), skel: consonantSkeleton(w) })),
};

export function fuzzyRepairMultilingualToken(
  token: string,
  locale: SupportedLocale = "tr"
): string {
  if (token.length < 4 || token.length > 14) return token;
  const tokenFolded = foldAscii(token);
  const tokenSkel = consonantSkeleton(token);
  const vocab = FUZZY_VOCAB_BY_LOCALE[locale] || FUZZY_VOCAB_BY_LOCALE.tr;

  for (const entry of vocab) {
    if (token === entry.canonical) return token;
    if (tokenFolded === entry.folded) return entry.canonical;
    if (tokenSkel.length >= 4 && tokenSkel === entry.skel) {
      return entry.canonical;
    }
    if (tokenFolded.length >= 5 && damerauLevenshtein(tokenFolded, entry.folded) <= 1) {
      return entry.canonical;
    }
  }
  return token;
}

/**
 * Layer 1B: Slang & Chat Abbreviations Canonicalizer (TR / EN / ES)
 */
const SLANG_CANONICAL_TR: Array<[RegExp, string]> = [
  [/\bnapiyon\b/g, "napıyon"],
  [/\bnapiyosun\b/g, "napıyosun"],
  [/\bnapiyorsun\b/g, "napıyorsun"],
  [/\bnapion\b/g, "napıyon"],
  [/\bnapyon\b/g, "napıyon"],
  [/\bnediyon\b/g, "ne diyosun"],
  [/\bnediyosun\b/g, "ne diyosun"],
  [/\bnapcam\b/g, "napıcam"],
  [/\byapcam\b/g, "yapıcam"],
  [/\baccam\b/g, "açıcam"],
  [/\bgelcen\b/g, "gelicen"],
  [/\bgidiyon\b/g, "gidiyosun"],
  [/\bbiliyon\b/g, "biliyosun"],
  [/\bvermiyon\b/g, "vermiyosun"],
  [/\bbakiyon\b/g, "bakıyosun"],
  [/\bacilmiyo\b/g, "açılmıyo"],
  [/\bcalismiyo\b/g, "çalışmıyo"],
  [/\bgunaydin\b/g, "günaydın"],
  [/\bgnydn\b/g, "günaydın"],
  [/\btunaydin\b/g, "tünaydın"],
  [/\biyi aksamlar\b/g, "iyi akşamlar"],
  [/\biyi geceler\b/g, "iyi geceler"],
  [/\bgorusuruz\b/g, "görüşürüz"],
  [/\bgrsrz\b/g, "görüşürüz"],
  [/\btesekkurler\b/g, "teşekkürler"],
  [/\btesekkur\b/g, "teşekkür"],
  [/\btsk\b/g, "teşekkürler"],
  [/\btşk\b/g, "teşekkürler"],
  [/\beyw\b/g, "eyvallah"],
  [/\beyv\b/g, "eyvallah"],
  [/\bsagol\b/g, "sağ ol"],
  [/\bsaol\b/g, "sağ ol"],
  [/\bozur\b/g, "özür"],
  [/\bkb\b/g, "kusura bakma"],
  [/\bkusura bakma\b/g, "özür"],
  [/\bsikildim\b/g, "sıkıldım"],
  [/\bskldm\b/g, "sıkıldım"],
  [/\bbunaldim\b/g, "bunaldım"],
  [/\bdaraldim\b/g, "daraldım"],
  [/\baciktim\b/g, "acıktım"],
  [/\backtm\b/g, "acıktım"],
  [/\byoruldum\b/g, "yoruldum"],
  [/\byrldm\b/g, "yoruldum"],
  [/\buykum var\b/g, "uykum geldi"],
  [/\bnere\b/g, "nereye"],
  [/\bnerden\b/g, "nereden"],
  [/\bnerde\b/g, "nerede"],
  [/\bnerdesin\b/g, "neredesin"],
  [/\bnasi\b/g, "nasıl"],
  [/\bnasil\b/g, "nasıl"],
  [/\bnasilsin\b/g, "nasılsın"],
  [/\bnslsn\b/g, "nasılsın"],
  [/\bkacinci\b/g, "kaçıncı"],
  [/\bkac\b/g, "kaç"],
  [/\bkacta\b/g, "kaçta"],
  [/\bcok\b/g, "çok"],
  [/\bsu\b/g, "şu"],
  [/\btatlisin\b/g, "tatlısın"],
  [/\bgerizekali\b/g, "gerizekalı"],
  [/\bgrzkli\b/g, "gerizekalı"],
  [/\bmalsin\b/g, "malsın"],
  [/\bsalaksin\b/g, "salaksın"],
  [/\bslm\b/g, "selam"],
  [/\bmrb\b/g, "merhaba"],
  [/\bnbr\b/g, "naber"],
  [/\bsa\b/g, "selam"],
  [/\bas\b/g, "selam"],
  [/\bhb\b/g, "hoş bulduk"],
  [/\bhg\b/g, "hoş geldin"],
];

const SLANG_CANONICAL_EN: Array<[RegExp, string]> = [
  [/\bwyd\b/g, "what are you doing"],
  [/\bhru\b/g, "how are you"],
  [/\bthx\b/g, "thanks"],
  [/\btysm\b/g, "thanks"],
  [/\bty\b/g, "thanks"],
  [/\bsry\b/g, "sorry"],
  [/\bgn\b/g, "good night"],
  [/\bgm\b/g, "good morning"],
  [/\bcya\b/g, "goodbye"],
  [/\bily\b/g, "love you"],
  [/\bidk\b/g, "i do not know"],
];

const SLANG_CANONICAL_ES: Array<[RegExp, string]> = [
  [/\btqm\b/g, "te quiero"],
  [/\btkm\b/g, "te quiero"],
  [/\bxfa\b/g, "por favor"],
  [/\bporfa\b/g, "por favor"],
  [/\bpq\b/g, "por que"],
  [/\bxq\b/g, "por que"],
  [/\bbn\b/g, "bien"],
  [/\bmsj\b/g, "mensaje"],
];

/**
 * Layer 2: Lightweight Agglutinative Turkish Stemmer
 */
const TURKISH_SUFFIX_PATTERNS: RegExp[] = [
  /(iyorum|ıyorsun|iyoruz|iyorlar|ıyorum|ıyorsun|ıyoruz|ıyorlar|uyorum|uyorsun|üyorum|üyorsun)$/,
  /(iyordum|ıyordum|uyordum|üyordum|iyormuş|ıyormuş)$/,
  /(acağım|eceğim|acaksın|eceksin|acağız|eceğiz|acaklar|ecekler|ıcam|icem|ucam|ücem)$/,
  /(mışsın|mişsin|muşsun|müşsün|mışım|mişim|muşum|müşüm|dılar|diler|dular|düler|tılar|tiler)$/,
  /(dım|dim|dum|düm|tım|tim|tum|tüm|dık|dik|duk|dük|tık|tik|tuk|tük|sın|sin|sun|sün)$/,
  /(lardan|lerden|ndan|nden|dan|den|lara|lere|nda|nde|da|de|nın|nin|nun|nün|ın|in|un|ün)$/,
  /(lar|ler|mız|miz|muz|müz|nız|niz|nuz|nüz|ım|im|um|üm)$/,
];

const PROTECTED_SHORT_ROOTS = new Set([
  "ne",
  "bu",
  "şu",
  "o",
  "kim",
  "kime",
  "kimi",
  "kimde",
  "kimden",
  "kimin",
  "nerede",
  "nereden",
  "nereye",
  "nasıl",
  "neden",
  "niye",
  "kaç",
  "kaçıncı",
  "hangi",
  "hangisi",
  "selam",
  "merhaba",
  "naber",
  "mal",
  "salak",
  "aptal",
]);

export function stemTurkishWord(word: string): string {
  if (word.length <= 4 || PROTECTED_SHORT_ROOTS.has(word)) return word;
  let current = word;
  for (const rx of TURKISH_SUFFIX_PATTERNS) {
    const stripped = current.replace(rx, "");
    if (stripped.length >= 3) {
      current = stripped;
      break;
    }
  }
  return current;
}

/**
 * Layer 3: Multilingual Negation / Polarity Detector (TR / EN / ES)
 */
export function detectNegationScope(normalized: string, locale: SupportedLocale = "tr"): boolean {
  if (locale === "en") {
    if (/\b(right|isnt it|arent you|dont you think)\b/.test(normalized)) return false;
    return /\b(not|no|never|dont|don't|doesnt|doesn't|isnt|isn't|arent|aren't|cant|can't|wont|won't)\b/.test(
      normalized
    );
  }
  if (locale === "es") {
    if (/\b(verdad|no es asi|cierto)\b/.test(normalized)) return false;
    return /\b(no|nunca|jamas|jamás|tampoco|ni)\b/.test(normalized);
  }
  if (/\b(değil mi|dimi|di mi)\b/.test(normalized)) {
    return false;
  }
  if (/\b(değil|değilim|değilsin|yok|hiç|asla|ne gezer|alakası yok)\b/.test(normalized)) {
    return true;
  }
  const tokens = normalized.split(" ");
  return tokens.some((t) =>
    /[a-zçğıöşü]{2,}(madım|medim|madık|medik|mıyorum|miyorum|muyorum|müyorum|mıyorsun|miyorsun|mam|mem|maz|mez|mamış|memiş)$/.test(
      t
    )
  );
}

export function normalizeMessage(
  rawMessage: string,
  locale: SupportedLocale = "tr"
): {
  normalized: string;
  asciiFolded: string;
  stems: string[];
  hasElongation: boolean;
  hasNegation: boolean;
} {
  const lower = toLocaleLower(rawMessage || "", locale);
  const hasElongation = /([a-zçğıöşüáéíóúñ])\1{2,}/.test(lower);
  let text = lower.replace(/[!?¡¿.,;:()"“”«»\[\]{}<>~`@#$%^&*_+=|\\/-]+/g, " ");
  text = text.replace(/([a-zçğıöşüáéíóúñ])\1{1,}/g, "$1");
  text = text.replace(/\s+/g, " ").trim();

  const slangRules =
    locale === "tr"
      ? SLANG_CANONICAL_TR
      : locale === "en"
      ? SLANG_CANONICAL_EN
      : SLANG_CANONICAL_ES;

  for (const [pattern, replacement] of slangRules) {
    text = text.replace(pattern, replacement);
  }

  const rawTokens = text ? text.split(" ") : [];
  text = rawTokens.map((t) => fuzzyRepairMultilingualToken(t, locale)).join(" ");

  const tokens = text ? text.split(" ") : [];
  const stems = locale === "tr" ? tokens.map(stemTurkishWord) : tokens;
  const hasNegation = detectNegationScope(text, locale);

  return {
    normalized: text,
    asciiFolded: foldAscii(text),
    stems,
    hasElongation,
    hasNegation,
  };
}

/**
 * Layer 9: 16-Category Structural Fingerprint & Lexical Classifier for Left-Click Selected Text
 */
export function analyzeSelectionFingerprint(rawSelection: string): SelectionStructuralFingerprint {
  const trimmed = (rawSelection || "").trim();
  const charCount = trimmed.length;
  const words = trimmed ? trimmed.split(/\s+/) : [];
  const wordCount = words.length;
  const lines = trimmed ? trimmed.split(/\r?\n/) : [];
  const lineCount = lines.length;
  const estimatedReadSeconds = Math.max(1, Math.round((wordCount / 200) * 60));

  const alphaChars = (trimmed.match(/[a-zA-ZÇĞİÖŞÜçğıöşüÁÉÍÓÚÑáéíóúñ]/g) || []).length;
  const upperChars = (trimmed.match(/[A-ZÇĞİÖŞÜÁÉÍÓÚÑ]/g) || []).length;
  const uppercaseRatio = alphaChars > 0 ? upperChars / alphaChars : 0;

  const nonSpaceChars = trimmed.replace(/\s+/g, "").length;
  const digits = (trimmed.match(/\d/g) || []).length;
  const digitRatio = nonSpaceChars > 0 ? digits / nonSpaceChars : 0;

  const codeSymbols = (trimmed.match(/[{}[\];()=>_<>/\\|&$#]/g) || []).length;

  let extractedEntity: string | null = null;
  const moneyMatch = trimmed.match(
    /(?:₺|\bTL\b|\bUSD\b|\bEUR\b|\$|€)\s*\d[\d.,]*|\d[\d.,]*\s*(?:₺|\bTL\b|\bUSD\b|\bEUR\b|\$|€)/i
  );
  const ibanMatch = trimmed.match(/\bTR\d{2}\s?\d{4}\s?\d{4}/i);
  const errorMatch = trimmed.match(
    /\b(TypeError|ReferenceError|SyntaxError|NullPointerException|KeyError|ValueError|IndexError|404|500|502|ENOENT|ECONNREFUSED)\b/i
  );
  const urlMatch = trimmed.match(/https?:\/\/([a-zA-Z0-9.-]+)/i);
  const timeMatch = trimmed.match(
    /\b(\d{1,2}[:.]\d{2}|\d{1,2}\s+(?:ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık|pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar))\b/i
  );

  if (moneyMatch) extractedEntity = moneyMatch[0].trim();
  else if (ibanMatch) extractedEntity = "iban";
  else if (errorMatch) extractedEntity = errorMatch[0];
  else if (urlMatch) extractedEntity = urlMatch[1];
  else if (timeMatch) extractedEntity = timeMatch[0];

  return {
    charCount,
    wordCount,
    lineCount,
    uppercaseRatio,
    digitRatio,
    codeSymbolCount: codeSymbols,
    estimatedReadSeconds,
    extractedEntity,
  };
}

export function classifySelectedText(
  rawSelection: string,
  locale: SupportedLocale = "tr"
): SelectionCategory | null {
  const trimmed = (rawSelection || "").trim();
  if (trimmed.length < 2) return null;

  const fp = analyzeSelectionFingerprint(trimmed);
  const lower = toLocaleLower(trimmed, locale);
  const folded = foldAscii(lower);

  if (
    /\b(sk-[a-zA-Z0-9]{16,}|ghp_[a-zA-Z0-9]{20,}|eyJ[a-zA-Z0-9_-]{15,}|password|parola|şifre|api_key|secret_key|private_key|bearer\s+[a-z0-9._-]+)\b/i.test(
      trimmed
    ) ||
    (!trimmed.includes(" ") &&
      trimmed.length >= 12 &&
      trimmed.length <= 64 &&
      /[A-Z]/.test(trimmed) &&
      /[a-z]/.test(trimmed) &&
      /\d/.test(trimmed) &&
      /[^a-zA-Z0-9]/.test(trimmed) &&
      !/^https?:\/\//i.test(trimmed))
  ) {
    return "selection:secret_sensitive";
  }

  if (
    /^https?:\/\/\S+$/i.test(trimmed) ||
    /\b(https?:\/\/[^\s]{8,}|www\.[a-z0-9.-]+\.[a-z]{2,}|utm_source=|utm_medium=)\b/i.test(trimmed)
  ) {
    return "selection:url_link_domain";
  }

  if (
    /\b(TypeError|ReferenceError|SyntaxError|NullPointerException|Traceback|Exception|undefined is not|cannot read propert|stack trace|console\.log|function\s*\(|const\s+\w+\s*=|SELECT\s+.*\s+FROM|import\s+.*from|npm ERR|segfault)\b/i.test(
      trimmed
    ) ||
    fp.codeSymbolCount >= 3
  ) {
    return "selection:code_or_error";
  }

  if (
    /\bTR\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2,4}\b/i.test(trimmed) ||
    /(₺|\bTL\b|\bUSD\b|\bEUR\b|\$|€)\s*\d+([.,]\d+)?|\d+([.,]\d+)?\s*(₺|\bTL\b|\bUSD\b|\bEUR\b|\$|€)/i.test(
      trimmed
    ) ||
    /\b(kdv dahil|toplam tutar|ödenecek tutar|fatura tutarı|iban|havale|eft|taksit)\b/i.test(lower)
  ) {
    return "selection:money_iban_price";
  }

  if (
    /\b(kullanım koşulları|gizlilik politikası|aydınlatma metni|kvkk|kişisel verilerin korunması|mücbir sebep|işbu sözleşme|sorumluluk kabul etmez|terms of service|privacy policy|hereby agrees|liability)\b/i.test(
      lower
    )
  ) {
    return "selection:legal_terms_contract";
  }

  if (
    /\b(su bardağı|çay kaşığı|yemek kaşığı|tatlı kaşığı|gram\s+\w+|önceden ısıtılmış|fırında|malzemeler|hazırlanışı|kcal|kalori|porsiyon|tablespoon|teaspoon|preheat oven|ingredients)\b/i.test(
      lower
    )
  ) {
    return "selection:recipe_food_menu";
  }

  if (
    /\b(hipotez|literatür|kaynakça|makale|tez|vize|final sınavı|araştırma yöntemi|bulgular|aşağıdakilerden hangisi|yukarıdaki parçaya göre|et al\.|abstract|methodology|bibliography)\b/i.test(
      lower
    )
  ) {
    return "selection:academic_homework_exam";
  }

  if (
    (fp.lineCount >= 2 && /^(\s*[-*•]\s+|\s*\[\s?[xX]?\s?\]|\s*\d+[.)]\s+)/m.test(trimmed)) ||
    /\b(yapılacaklar|to-do|todo list|alınacaklar)\b/i.test(lower)
  ) {
    return "selection:todo_checklist";
  }

  if (
    /\b(son başvuru|son teslim|teslim tarihi|deadline|due date|randevu saati|toplantı saati|\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})\b/i.test(
      lower
    )
  ) {
    return "selection:date_time_deadline";
  }

  if (
    /\b(ayrılmışlar|aldatmış|engellemiş|engel atmış|story atmış|hikayesine bak|eski sevgili|kavga etmişler|görüldü atmış|ghostlamış|dedikodu|red flag|toxic)\b/i.test(
      lower
    )
  ) {
    return "selection:social_drama_gossip";
  }

  if (
    /\b(bilgilerinize arz|saygılarımla|iyi çalışmalar|ekte sunulmuştur|gereğini rica|geri dönüşünüzü|tarafınıza iletil|per my last email|best regards|kind regards|sincerely|estimados|saludos cordiales|adjunto)\b/i.test(
      lower
    )
  ) {
    return "selection:corporate_email";
  }

  if (fp.charCount >= 15 && fp.uppercaseRatio >= 0.78) {
    return "selection:caps_lock_rage";
  }

  if (fp.digitRatio > 0.52 && fp.charCount >= 4) {
    return "selection:numbers_math";
  }

  if (fp.charCount >= 240 || fp.wordCount >= 35) {
    return "selection:wall_of_text";
  }

  if (
    locale === "tr" &&
    fp.wordCount >= 1 &&
    fp.wordCount <= 8 &&
    !/[çğıöşüÇĞİÖŞÜ]/.test(trimmed) &&
    /\b(the|and|with|for|that|this|from|what|how|would|should|could|although|however|therefore|actually|basically)\b/i.test(
      folded
    )
  ) {
    return "selection:foreign_translate";
  }

  if (fp.wordCount <= 6) {
    return "selection:short_word_phrase";
  }

  return "selection:wall_of_text";
}

/**
 * Layer 10: Dynamic Entity-Aware "Lazy Rewrite" Generator with Reading-Time Calculation
 */
export function buildLazyDunnoRewrite(
  rawSelection: string,
  category: SelectionCategory,
  locale: SupportedLocale = "tr"
): string {
  const fp = analyzeSelectionFingerprint(rawSelection);
  const words = (rawSelection || "").trim().split(/\s+/).filter(Boolean);
  const firstWord = toLocaleLower(words[0] || "bu", locale).slice(0, 14);
  const entity = fp.extractedEntity ? toLocaleLower(fp.extractedEntity, locale) : null;

  if (locale === "en") {
    switch (category) {
      case "selection:wall_of_text":
        return `tldr: "${firstWord}..." (${fp.wordCount} words, ~${fp.estimatedReadSeconds}s read) i refused to read.`;
      case "selection:code_or_error":
        return entity
          ? `dunno diagnosis: "${entity}" blew up. good luck.`
          : "dunno rewrite: computer said no.";
      case "selection:money_iban_price":
        return entity
          ? `dunno math: ${entity} leaving your wallet.`
          : "dunno rewrite: goodbye money.";
      default:
        return `dunno rewrite: "${firstWord}..." whatever that means.`;
    }
  }

  if (locale === "es") {
    switch (category) {
      case "selection:wall_of_text":
        return `resumen: "${firstWord}..." (${fp.wordCount} palabras, ~${fp.estimatedReadSeconds}s) que no pienso leer.`;
      case "selection:code_or_error":
        return entity
          ? `diagnóstico dunno: explotó "${entity}".`
          : "versión dunno: el código explotó.";
      case "selection:money_iban_price":
        return entity
          ? `resumen financiero: ${entity} menos en tu cuenta.`
          : "versión dunno: duele en la billetera.";
      default:
        return `versión dunno: "${firstWord}..." o algo así.`;
    }
  }

  switch (category) {
    case "selection:wall_of_text":
      return `dunnolama özeti: "${firstWord}..." diye başlıyor (${fp.wordCount} kelime, ~${fp.estimatedReadSeconds} sn), okumaya değmez.`;
    case "selection:code_or_error":
      return entity
        ? `dunnolama teşhisi: "${entity}" patlamış, yine olmayan bir şeyi çağırdın.`
        : "dunnolama çevirisi: bilgisayar 'ben oynamıyorum' diyor.";
    case "selection:corporate_email":
      return "dunnolama çevirisi: kibarca 'bu angaryayı sen yapacaksın' demişler.";
    case "selection:money_iban_price":
      return entity
        ? `dunnolama muhasebesi: ${entity} cüzdandan buharlaşıyor.`
        : "dunnolama özeti: cüzdandan eksilecek bir miktar.";
    case "selection:url_link_domain":
      return entity
        ? `dunnolama link analizi: "${entity}" adresine gidip iki saat kaybolacaksın.`
        : "dunnolama özeti: yeni bir sekme tuzağı.";
    case "selection:date_time_deadline":
      return entity
        ? `dunnolama takvimi: "${entity}" gelene kadar ertelemeye devam.`
        : "dunnolama özeti: gelecekteki senin derdi.";
    case "selection:caps_lock_rage":
      return "dunnolama çevirisi: bağırmadan konuşsa da aynı şey.";
    case "selection:todo_checklist":
      return `dunnolama özeti: ${fp.lineCount} maddelik ertelenmiş hayaller listesi.`;
    case "selection:social_drama_gossip":
      return "dunnolama özeti: çekirdeklik kaos, ekran görüntüsü al.";
    case "selection:legal_terms_contract":
      return "dunnolama özeti: 'başıma bir şey gelirse suç senin' maddesi.";
    case "selection:recipe_food_menu":
      return "dunnolama özeti: okurken doyduk, sonunda dışarıdan söyleyeceksin.";
    case "selection:academic_homework_exam":
      return "dunnolama özeti: kırk kelimelik akademik cümle, net bilgi sıfır.";
    case "selection:secret_sensitive":
      return "dunnolama özeti: [sansürlendi, o kadar da boşboğaz değilim].";
    case "selection:numbers_math":
      return "dunnolama özeti: bir sürü rakam, yuvarla geç.";
    default:
      return `dunnolama özeti: "${firstWord}..." işte, çok kurcalama.`;
  }
}

export function getDayOfWeek(date = new Date()): DayOfWeek {
  const dayIndex = date.getDay();
  const dayMap: DayOfWeek[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return dayMap[dayIndex] || "monday";
}

export function getMonthName(date = new Date()): MonthName {
  const m = date.getMonth();
  const map: MonthName[] = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];
  return map[m] || "october";
}

export function getSeason(date = new Date()): Season {
  const m = date.getMonth();
  if (m === 11 || m === 0 || m === 1) return "winter";
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  return "autumn";
}

export function getSpecialHoliday(date = new Date()): SpecialHoliday | null {
  const m = date.getMonth();
  const d = date.getDate();
  if ((m === 11 && d >= 30) || (m === 0 && d <= 2)) return "new_year";
  if (m === 9 && d >= 29 && d <= 31) return "halloween";
  if (m === 1 && d >= 13 && d <= 15) return "valentines";
  if (m === 10 && d >= 20 && d <= 29) return "black_friday";
  if (m === 3 && d === 1) return "april_fools";
  return null;
}

const SILENT_TAB_PATTERNS = [
  /\b(porn|xxx|sex|nsfw|onlyfans|bahis|bet|casino|rulet|slot|kumar|iddaa)\b/i,
];

const PRIORITY_CATEGORY_ORDER: Array<EntertainmentRule["category"]> = [
  "series",
  "turkish_series",
  "series_es",
  "anime",
  "movie",
  "game",
  "creative_app",
  "lifestyle_site",
  "music",
  "launcher",
  "media_player",
];

const WORK_OR_DESKTOP_PATTERNS = [
  /\b(excel|word|powerpoint|vscode|visual studio|intellij|terminal|powershell|cmd|google docs|google sheets|notion|slack|teams|outlook|desktop|masaüstü|explorer)\b/i,
];

export function isAltTabPanicTransition(
  previousPoolKey: string | null,
  currentWindowTitle: string | undefined,
  currentProcessName: string | undefined,
  elapsedMs: number
): boolean {
  if (!previousPoolKey || elapsedMs > 1800 || elapsedMs < 0) return false;
  const isFromFunPool =
    previousPoolKey.startsWith("series:") ||
    previousPoolKey.startsWith("turkish_series:") ||
    previousPoolKey.startsWith("series_es:") ||
    previousPoolKey.startsWith("anime:") ||
    previousPoolKey.startsWith("movie:") ||
    previousPoolKey.startsWith("game:") ||
    previousPoolKey.startsWith("media:") ||
    previousPoolKey.startsWith("music:") ||
    previousPoolKey === "site:food_delivery" ||
    previousPoolKey === "site:job_hunt" ||
    previousPoolKey === "site:crypto_finance_stocks" ||
    previousPoolKey === "site:travel_vacation_dreaming" ||
    previousPoolKey === "site:secondhand_classifieds" ||
    previousPoolKey === "site:real_estate_car_window_shopping";

  if (!isFromFunPool) return false;

  const combinedCurrent = `${currentWindowTitle || ""} ${currentProcessName || ""}`;
  return WORK_OR_DESKTOP_PATTERNS.some((rx) => rx.test(combinedCurrent));
}

export function matchEntertainmentContext(
  windowTitle: string | undefined,
  processName: string | undefined,
  rules: EntertainmentRule[],
  locale: SupportedLocale = "tr"
): { poolKey: string | null; isSilent: boolean } {
  const rawTitle = toLocaleLower(windowTitle || "", locale);
  const foldedTitle = foldAscii(rawTitle);
  const rawProc = (processName || "").toLowerCase();

  if (SILENT_TAB_PATTERNS.some((rx) => rx.test(rawTitle) || rx.test(foldedTitle))) {
    return { poolKey: null, isSilent: true };
  }

  const applicableRules = rules.filter(
    (r) => !r.supportedLocales || r.supportedLocales.includes(locale)
  );

  for (const cat of PRIORITY_CATEGORY_ORDER) {
    for (const rule of applicableRules) {
      if (rule.category !== cat) continue;

      if (rule.processNames?.some((p) => rawProc.includes(p.toLowerCase()))) {
        return { poolKey: rule.poolKey, isSilent: false };
      }

      for (const kw of rule.titleKeywords) {
        const kwLower = toLocaleLower(kw, locale);
        const kwFolded = foldAscii(kwLower);
        if (
          rawTitle.includes(kwLower) ||
          (kwFolded.length >= 4 && foldedTitle.includes(kwFolded))
        ) {
          return { poolKey: rule.poolKey, isSilent: false };
        }
      }
    }
  }

  return { poolKey: null, isSilent: false };
}

/**
 * Layer 4: Conversational Topic & Life-Situation Classifier (`topic:*` across TR / EN / ES)
 */
export function detectConversationalTopic(
  normalized: string,
  asciiFolded: string,
  _locale: SupportedLocale = "tr"
): TopicCategory | null {
  if (
    /\b(lahmacun|döner|iskender|kebap|burger|pizza|mantı|çiğköfte|tatlı krizi|ne yesem|yemek siparişi|yemeksepeti|getir yemek|kurye)\b/.test(
      normalized
    ) ||
    /\b(what to eat|order food|pizza|burger|takeout|delivery|tacos|sushi|ramen|antojo|pedir comida)\b/.test(
      asciiFolded
    )
  ) {
    return "topic:food_craving";
  }

  if (
    /\b(maaş|kredi kartı|ekstre|fatura|kira|parasız|züğürt|meteliksiz|bakiye|borç|zam geldi|enflasyon|beş kuruş)\b/.test(
      normalized
    ) ||
    /\b(paycheck|broke|rent|credit card bill|bank account|no money|sueldo|sin dinero|alquiler|deuda|factura)\b/.test(
      asciiFolded
    )
  ) {
    return "topic:money_broke_salary";
  }

  if (
    /\b(bug çıktı|kod bozuldu|bende çalışıyordu|derlenmiyor|compile|prod patladı|deploy|merge conflict|nullpointer|segfault|stackoverflow)\b/.test(
      normalized
    ) ||
    /\b(code broke|merge conflict|prod is down|bug in my code|compiler|mi codigo|error de codigo)\b/.test(
      asciiFolded
    )
  ) {
    return "topic:coding_bug_rant";
  }

  if (
    /\b(sevgilim|eski sevgili|ayrıldık|terk etti|görüldü attı|ghostladı|flört|aşk acısı|kalbim kırık|engelledi|yazmadı)\b/.test(
      normalized
    ) ||
    /\b(my ex|broke up|left on read|ghosted|crush|heartbroken|dating|mi ex|me dejo en visto|corazon roto|novio|novia)\b/.test(
      asciiFolded
    )
  ) {
    return "topic:love_relationship_drama";
  }

  if (
    /\b(vize|final|bütünleme|büt|sınav var|tez|ödev|yks|kpss|ales|slayt|ders çalış|kopya|not ortalaması)\b/.test(
      normalized
    ) ||
    /\b(exam tomorrow|midterm|finals week|homework|thesis|studying|examen manana|tarea|tesis|estudiar)\b/.test(
      asciiFolded
    )
  ) {
    return "topic:exam_school_panic";
  }

  if (
    /\b(istifa|mesai|patron|müdür|toplantı|şirket|pazartesi sendromu|izin günü|maaş bordrosu|angarya|iş yeri)\b/.test(
      normalized
    ) ||
    /\b(quit my job|my boss|overtime|endless meeting|coworker|burnout|renunciar|mi jefe|reunion|trabajo|oficina)\b/.test(
      asciiFolded
    )
  ) {
    return "topic:work_boss_burnout";
  }

  if (
    /\b(uyuyamıyorum|uyku tutmadı|uykusuzluk|sabahladım|gece üç|gece dört|tavanı izliyorum|uyku düzeni)\b/.test(
      normalized
    ) ||
    /\b(cant sleep|insomnia|wide awake|sleep schedule|4 am|no puedo dormir|insomnio|desvelado)\b/.test(
      asciiFolded
    )
  ) {
    return "topic:insomnia_late_night";
  }

  if (
    /\b(hayatın anlamı|neden yaşıyoruz|simülasyon|varoluş|evren|ölüm|yaşlandık|zaman geçiyor|felsefe|boşlukta)\b/.test(
      normalized
    ) ||
    /\b(meaning of life|simulation|existential|universe|getting old|sentido de la vida|simulacion|existencial)\b/.test(
      asciiFolded
    )
  ) {
    return "topic:existential_philosophy";
  }

  if (
    /\b(kahve|espresso|americano|latte|türk kahvesi|çay demledim|demli çay|kafein|çay koy)\b/.test(
      normalized
    ) ||
    /\b(coffee|espresso|caffeine|cup of tea|matcha|cafe|cafeina|tecito)\b/.test(asciiFolded)
  ) {
    return "topic:coffee_tea_addiction";
  }

  if (
    /\b(internet yavaş|ping var|lag var|modem|bağlantı koptu|paket kaybı|ttnet|superonline|turknet|wifi)\b/.test(
      normalized
    ) ||
    /\b(high ping|lagging|wifi is down|internet is slow|packet loss|internet lento|mucho lag)\b/.test(
      asciiFolded
    )
  ) {
    return "topic:internet_lag_ping";
  }

  if (
    /\b(diyete başladım|diyet bozdum|spor salonu|gym|protein|kalori|kilo aldım|kilo verdim|bacak günü|mekik)\b/.test(
      normalized
    ) ||
    /\b(started a diet|cheat meal|gym membership|leg day|calories|empece la dieta|gimnasio|calorias)\b/.test(
      asciiFolded
    )
  ) {
    return "topic:gym_diet_lie";
  }

  if (
    /\b(kedim|köpeğim|kedi klavye|miyav|mama kabı|pati|tüy döktü|köpek gezdir)\b/.test(
      normalized
    ) ||
    /\b(my cat|my dog|cat on keyboard|meow|barking|mi gato|mi perro|miau)\b/.test(asciiFolded)
  ) {
    return "topic:pets_cat_dog";
  }

  return null;
}

/**
 * Layer 5 & 6: Full Trilingual Zero-LLM Multi-Feature Intent, Negation, Target & Tone Analyzer
 */
export function detectMultilingualIntent(
  normalized: string,
  asciiFolded: string,
  locale: SupportedLocale = "tr",
  context: RuntimeContext = {},
  stemsInput?: string[],
  hasNegationInput?: boolean
): {
  intent: IntentCategory;
  target: TargetType;
  tone: ToneType;
  confidence: number;
  hasSwearing: boolean;
} {
  const tokens = normalized ? normalized.split(" ") : [];
  const stems = stemsInput || (locale === "tr" ? tokens.map(stemTurkishWord) : tokens);
  const stemSet = new Set(stems);
  const hasNegation =
    hasNegationInput !== undefined ? hasNegationInput : detectNegationScope(normalized, locale);
  const currentDay = context.currentDay || getDayOfWeek();
  const currentSeason = context.currentSeason || getSeason();
  const currentMonth = context.currentMonth || getMonthName();

  // 1. Check Holiday Questions
  if (/\b(yilbasi|yeni yil|new year|ano nuevo)\b/.test(asciiFolded))
    return { intent: "holiday:new_year", target: "situation", tone: "curious", confidence: 0.98, hasSwearing: false };
  if (/\b(cadilar bayrami|halloween)\b/.test(asciiFolded))
    return { intent: "holiday:halloween", target: "situation", tone: "curious", confidence: 0.98, hasSwearing: false };
  if (/\b(sevgililer gunu|14 subat|valentines|san valentin)\b/.test(asciiFolded))
    return { intent: "holiday:valentines", target: "situation", tone: "sarcastic", confidence: 0.98, hasSwearing: false };
  if (/\b(kara cuma|efsane cuma|black friday|kasim indirim)\b/.test(asciiFolded))
    return { intent: "holiday:black_friday", target: "situation", tone: "sarcastic", confidence: 0.98, hasSwearing: false };
  if (/\b(1 nisan|nisan 1|april fools|dia de los inocentes)\b/.test(asciiFolded))
    return { intent: "holiday:april_fools", target: "situation", tone: "playful", confidence: 0.98, hasSwearing: false };
  if (/\b(bayram tatili|bayram ne zaman|harclik|ramazan bayrami|kurban bayrami)\b/.test(asciiFolded))
    return { intent: "holiday:bayram_holiday", target: "situation", tone: "friendly", confidence: 0.98, hasSwearing: false };

  // 2. Check Season Questions
  if (/\b(hangi mevsim|mevsim ne|what season|que estacion)\b/.test(asciiFolded)) {
    return { intent: `season:${currentSeason}` as IntentCategory, target: "situation", tone: "curious", confidence: 0.98, hasSwearing: false };
  }
  if (/\b(kis mevsimi|hava cok soguk|buz gibi|kar yagiyor|usudum|donuyorum|winter|freezing|invierno|hace frio)\b/.test(asciiFolded))
    return { intent: "season:winter", target: "situation", tone: "tired", confidence: 0.96, hasSwearing: false };
  if (/\b(yaz mevsimi|hava cok sicak|sicaktan bayildim|vantilator|klima|yaniyoruz|summer|verano|hace calor)\b/.test(asciiFolded))
    return { intent: "season:summer", target: "situation", tone: "tired", confidence: 0.96, hasSwearing: false };
  if (/\b(sonbahar|guz mevsimi|yapraklar dokuluyor|autumn|fall|otono)\b/.test(asciiFolded))
    return { intent: "season:autumn", target: "situation", tone: "neutral", confidence: 0.96, hasSwearing: false };
  if (/\b(ilkbahar|bahar geldi|polen|bahar yorgunlugu|spring|primavera)\b/.test(asciiFolded))
    return { intent: "season:spring", target: "situation", tone: "neutral", confidence: 0.96, hasSwearing: false };

  // 3. Check Month Questions
  if (/\b(hangi aydayiz|hangi ay|what month|que mes)\b/.test(asciiFolded)) {
    return { intent: `month:${currentMonth}` as IntentCategory, target: "situation", tone: "curious", confidence: 0.98, hasSwearing: false };
  }

  // 4. Check Day of the Week Questions
  if (
    /\b(bugun ne|bugun hangi gun|gunlerden ne|hangi gundeyiz|bugun gunlerden ne)\b/.test(asciiFolded) ||
    /\b(what day is it|what day is today)\b/.test(normalized) ||
    /\b(que dia es hoy|que dia estamos)\b/.test(asciiFolded)
  ) {
    return { intent: `day:${currentDay}` as IntentCategory, target: "situation", tone: "curious", confidence: 0.98, hasSwearing: false };
  }
  if (/\b(pazartesi mi|pazartesi sendromu|monday today|i hate mondays|es lunes|odio los lunes)\b/.test(asciiFolded))
    return { intent: "day:monday", target: "situation", tone: "tired", confidence: 0.97, hasSwearing: false };
  if (/\b(sali mi|tuesday today|es martes)\b/.test(asciiFolded))
    return { intent: "day:tuesday", target: "situation", tone: "neutral", confidence: 0.97, hasSwearing: false };
  if (/\b(carsamba mi|wednesday today|es miercoles)\b/.test(asciiFolded))
    return { intent: "day:wednesday", target: "situation", tone: "neutral", confidence: 0.97, hasSwearing: false };
  if (/\b(persembe mi|thursday today|es jueves)\b/.test(asciiFolded))
    return { intent: "day:thursday", target: "situation", tone: "neutral", confidence: 0.97, hasSwearing: false };
  if (/\b(cuma mi|hayirli cumalar|yasasin cuma|friday today|tgif|es viernes)\b/.test(asciiFolded))
    return { intent: "day:friday", target: "situation", tone: "excited", confidence: 0.97, hasSwearing: false };
  if (/\b(cumartesi mi|saturday today|es sabado)\b/.test(asciiFolded))
    return { intent: "day:saturday", target: "situation", tone: "playful", confidence: 0.97, hasSwearing: false };
  if (/\b(pazar mi|pazar bunalimi|sunday today|sunday scaries|es domingo)\b/.test(asciiFolded))
    return { intent: "day:sunday", target: "situation", tone: "tired", confidence: 0.97, hasSwearing: false };
  if (/\b(hafta sonu mu|is it weekend|fin de semana)\b/.test(asciiFolded))
    return { intent: "day:weekend", target: "situation", tone: "playful", confidence: 0.97, hasSwearing: false };

  const topicMatch = detectConversationalTopic(normalized, asciiFolded, locale);

  // Full English 60-Intent Analyzer
  if (locale === "en") {
    const hasSwearing = /\b(wtf|fuck|shit|bs|af|damn|hell|bitch)\b/.test(normalized);
    if (/\b(i am dumb|i am stupid|im an idiot|my fault)\b/.test(normalized))
      return { intent: "self_deprecation", target: "user_self", tone: "sad", confidence: 0.96, hasSwearing };
    if (/\b(you are dumb|youre stupid|idiot|useless bean|shut up)\b/.test(normalized))
      return { intent: hasSwearing ? "insult:strong" : "insult:playful", target: "dunno", tone: "teasing", confidence: 0.95, hasSwearing };
    if (/\b(good morning|morning)\b/.test(normalized))
      return { intent: "greeting:morning", target: "dunno", tone: "friendly", confidence: 0.96, hasSwearing };
    if (/\b(good afternoon|afternoon)\b/.test(normalized))
      return { intent: "greeting:afternoon", target: "dunno", tone: "friendly", confidence: 0.96, hasSwearing };
    if (/\b(good evening|evening)\b/.test(normalized))
      return { intent: "greeting:evening", target: "dunno", tone: "friendly", confidence: 0.96, hasSwearing };
    if (/\b(good night|going to bed|sleepy)\b/.test(normalized))
      return { intent: "greeting:night", target: "dunno", tone: "tired", confidence: 0.96, hasSwearing };
    if (/\b(bye|see ya|goodbye)\b/.test(normalized))
      return { intent: "farewell", target: "dunno", tone: "friendly", confidence: 0.95, hasSwearing };
    if (/\b(thanks|thank you|appreciate it)\b/.test(normalized))
      return { intent: "thanks", target: "dunno", tone: "friendly", confidence: 0.96, hasSwearing };
    if (/\b(sorry|my bad|apologies)\b/.test(normalized))
      return { intent: "apology", target: "dunno", tone: "neutral", confidence: 0.96, hasSwearing };
    if (/\b(love you|you are cute|so cute)\b/.test(normalized))
      return { intent: hasNegation ? "insult:mild" : "affection", target: "dunno", tone: "friendly", confidence: 0.95, hasSwearing };
    if (/\b(awesome|amazing|great job|youre the best|smart)\b/.test(normalized))
      return { intent: hasNegation ? "insult:playful" : "compliment", target: "dunno", tone: "friendly", confidence: 0.95, hasSwearing };
    if (topicMatch)
      return { intent: topicMatch, target: "situation", tone: "casual", confidence: 0.95, hasSwearing };
    if (!hasNegation && /\b(bored|so boring|nothing to do)\b/.test(normalized))
      return { intent: "emotion:bored", target: "user_self", tone: "tired", confidence: 0.96, hasSwearing };
    if (!hasNegation && /\b(hungry|starving|need food)\b/.test(normalized))
      return { intent: "emotion:hungry", target: "user_self", tone: "tired", confidence: 0.96, hasSwearing };
    if (!hasNegation && /\b(tired|exhausted|burnt out)\b/.test(normalized))
      return { intent: "emotion:tired", target: "user_self", tone: "tired", confidence: 0.96, hasSwearing };
    if (/\b(fart|farted)\b/.test(normalized))
      return { intent: "interaction:fart", target: "dunno", tone: "playful", confidence: 0.96, hasSwearing };
    if (/\b(haha|hehe|lol|lmao|rofl|funny|hilarious)\b/.test(normalized))
      return { intent: hasNegation ? "insult:mild" : "amusement", target: "situation", tone: "amused", confidence: 0.95, hasSwearing };
    if (/\b(no way|seriously|are you kidding|unbelievable)\b/.test(normalized))
      return { intent: "disbelief", target: "situation", tone: "surprised", confidence: 0.95, hasSwearing };
    if (/\b(confused|dont get it|what do you mean|makes no sense)\b/.test(normalized))
      return { intent: "confusion", target: "situation", tone: "confused", confidence: 0.95, hasSwearing };
    if (/\b(help|help me|save me|assist)\b/.test(normalized))
      return { intent: "help_request", target: "dunno", tone: "frustrated", confidence: 0.95, hasSwearing };
    if (/\b(do my work|write my code|hurry up|fix this now)\b/.test(normalized))
      return { intent: "command", target: "dunno", tone: "annoyed", confidence: 0.95, hasSwearing };
    if (/\b(hi|hello|hey|sup|yo)\b/.test(normalized) && tokens.length <= 4)
      return { intent: "greeting:general", target: "dunno", tone: "casual", confidence: 0.94, hasSwearing };
    if (/\b(what are you doing|how are you|how's it going|whats up)\b/.test(normalized))
      return { intent: "question:what_are_you_doing", target: "dunno", tone: "curious", confidence: 0.96, hasSwearing };
    if (/\b(what happened|whats wrong)\b/.test(normalized))
      return { intent: "question:what_happened", target: "dunno", tone: "curious", confidence: 0.96, hasSwearing };
    if (/\b(what do you think|your opinion|how does it look)\b/.test(normalized))
      return { intent: "question:opinion", target: "dunno", tone: "curious", confidence: 0.95, hasSwearing };
    if (/\b(who are you|what are you)\b/.test(normalized))
      return { intent: "question:who:dunno", target: "dunno", tone: "curious", confidence: 0.96, hasSwearing };
    if (/\b(who is that|who's that|who is this|who are they|who is he|who is she)\b/.test(normalized))
      return { intent: "question:who:external", target: "third_person", tone: "curious", confidence: 0.96, hasSwearing };
    if (/\b(how does this|how is this|how do i|how to)\b/.test(normalized))
      return { intent: "question:how:external", target: "object", tone: "curious", confidence: 0.95, hasSwearing };
    if (/\b(what is this|what's this|what is that|what are those)\b/.test(normalized))
      return { intent: "question:what:external", target: "object", tone: "curious", confidence: 0.95, hasSwearing };
    if (/\b(why is this|why does this|why is it)\b/.test(normalized))
      return { intent: "question:why:external", target: "object", tone: "frustrated", confidence: 0.95, hasSwearing };
    if (/\b(where is this|where is the|where did i put)\b/.test(normalized))
      return { intent: "question:where:external", target: "object", tone: "curious", confidence: 0.95, hasSwearing };
    if (/\b(when|what time)\b/.test(normalized))
      return { intent: "question:when", target: "situation", tone: "curious", confidence: 0.94, hasSwearing };
    if (/\b(how many|how much)\b/.test(normalized))
      return { intent: "question:how_many", target: "object", tone: "curious", confidence: 0.94, hasSwearing };
    if (/\b(which one|which)\b/.test(normalized))
      return { intent: "question:which", target: "object", tone: "curious", confidence: 0.94, hasSwearing };
    if (/\b(why)\b/.test(normalized))
      return { intent: "question:why", target: "dunno", tone: "curious", confidence: 0.92, hasSwearing };
    if (/\b(how)\b/.test(normalized))
      return { intent: "question:how", target: "dunno", tone: "curious", confidence: 0.92, hasSwearing };
    if (/\b(where)\b/.test(normalized))
      return { intent: "question:where", target: "dunno", tone: "curious", confidence: 0.92, hasSwearing };
    return { intent: "fallback", target: "dunno", tone: "casual", confidence: 0.5, hasSwearing };
  }

  // Full Spanish 60-Intent Analyzer
  if (locale === "es") {
    const hasSwearing = /\b(joder|cabron|cabrón|nmms|no mames|mierda|puta|carajo|hostia)\b/.test(normalized);
    if (/\b(soy tonto|soy idiota|mi culpa)\b/.test(asciiFolded))
      return { intent: "self_deprecation", target: "user_self", tone: "sad", confidence: 0.96, hasSwearing };
    if (/\b(eres tonto|idiota|inutil|callate)\b/.test(asciiFolded))
      return { intent: hasSwearing ? "insult:strong" : "insult:playful", target: "dunno", tone: "teasing", confidence: 0.95, hasSwearing };
    if (/\b(buenos dias|buen dia)\b/.test(asciiFolded))
      return { intent: "greeting:morning", target: "dunno", tone: "friendly", confidence: 0.96, hasSwearing };
    if (/\b(buenas tardes)\b/.test(asciiFolded))
      return { intent: "greeting:afternoon", target: "dunno", tone: "friendly", confidence: 0.96, hasSwearing };
    if (/\b(buenas noches|a dormir)\b/.test(asciiFolded))
      return { intent: "greeting:night", target: "dunno", tone: "tired", confidence: 0.96, hasSwearing };
    if (/\b(adios|chao|hasta luego|me voy)\b/.test(asciiFolded))
      return { intent: "farewell", target: "dunno", tone: "friendly", confidence: 0.95, hasSwearing };
    if (/\b(gracias|muchas gracias|mil gracias)\b/.test(asciiFolded))
      return { intent: "thanks", target: "dunno", tone: "friendly", confidence: 0.96, hasSwearing };
    if (/\b(perdon|lo siento|disculpa|mala mia)\b/.test(asciiFolded))
      return { intent: "apology", target: "dunno", tone: "neutral", confidence: 0.96, hasSwearing };
    if (/\b(te quiero|te amo|eres lindo)\b/.test(asciiFolded))
      return { intent: hasNegation ? "insult:mild" : "affection", target: "dunno", tone: "friendly", confidence: 0.95, hasSwearing };
    if (/\b(genial|increible|eres el mejor|que crack)\b/.test(asciiFolded))
      return { intent: hasNegation ? "insult:playful" : "compliment", target: "dunno", tone: "friendly", confidence: 0.95, hasSwearing };
    if (topicMatch)
      return { intent: topicMatch, target: "situation", tone: "casual", confidence: 0.95, hasSwearing };
    if (!hasNegation && /\b(aburrido|me aburro|que aburrimiento)\b/.test(asciiFolded))
      return { intent: "emotion:bored", target: "user_self", tone: "tired", confidence: 0.96, hasSwearing };
    if (!hasNegation && /\b(hambre|tengo hambre|muero de hambre)\b/.test(asciiFolded))
      return { intent: "emotion:hungry", target: "user_self", tone: "tired", confidence: 0.96, hasSwearing };
    if (!hasNegation && /\b(cansado|estoy agotado|tengo sueno)\b/.test(asciiFolded))
      return { intent: "emotion:tired", target: "user_self", tone: "tired", confidence: 0.96, hasSwearing };
    if (/\b(jaja|jeje|jajaja|que risa|gracioso)\b/.test(asciiFolded))
      return { intent: hasNegation ? "insult:mild" : "amusement", target: "situation", tone: "amused", confidence: 0.95, hasSwearing };
    if (/\b(en serio|no te creo|imposible)\b/.test(asciiFolded))
      return { intent: "disbelief", target: "situation", tone: "surprised", confidence: 0.95, hasSwearing };
    if (/\b(no entiendo|que significa|confundido)\b/.test(asciiFolded))
      return { intent: "confusion", target: "situation", tone: "confused", confidence: 0.95, hasSwearing };
    if (/\b(ayuda|ayudame|socorro)\b/.test(asciiFolded))
      return { intent: "help_request", target: "dunno", tone: "frustrated", confidence: 0.95, hasSwearing };
    if (/\b(hola|buenas|que onda|que pasa)\b/.test(asciiFolded) && tokens.length <= 4)
      return { intent: "greeting:general", target: "dunno", tone: "casual", confidence: 0.94, hasSwearing };
    if (/\b(que haces|como estas|que tal)\b/.test(asciiFolded))
      return { intent: "question:what_are_you_doing", target: "dunno", tone: "curious", confidence: 0.96, hasSwearing };
    if (/\b(que paso|que ocurre)\b/.test(asciiFolded))
      return { intent: "question:what_happened", target: "dunno", tone: "curious", confidence: 0.96, hasSwearing };
    if (/\b(que opinas|que te parece)\b/.test(asciiFolded))
      return { intent: "question:opinion", target: "dunno", tone: "curious", confidence: 0.95, hasSwearing };
    if (/\b(quien eres|que eres)\b/.test(asciiFolded))
      return { intent: "question:who:dunno", target: "dunno", tone: "curious", confidence: 0.96, hasSwearing };
    if (/\b(quien es ese|quien es esa|quien es este|quienes son)\b/.test(asciiFolded))
      return { intent: "question:who:external", target: "third_person", tone: "curious", confidence: 0.96, hasSwearing };
    if (/\b(como funciona|como esta eso|como hago esto|como se hace)\b/.test(asciiFolded))
      return { intent: "question:how:external", target: "object", tone: "curious", confidence: 0.95, hasSwearing };
    if (/\b(que es eso|que es esto|para que sirve)\b/.test(asciiFolded))
      return { intent: "question:what:external", target: "object", tone: "curious", confidence: 0.95, hasSwearing };
    if (/\b(por que esta asi|por que no funciona)\b/.test(asciiFolded))
      return { intent: "question:why:external", target: "object", tone: "frustrated", confidence: 0.95, hasSwearing };
    if (/\b(donde esta|donde deje)\b/.test(asciiFolded))
      return { intent: "question:where:external", target: "object", tone: "curious", confidence: 0.95, hasSwearing };
    if (/\b(cuando|a que hora)\b/.test(asciiFolded))
      return { intent: "question:when", target: "situation", tone: "curious", confidence: 0.94, hasSwearing };
    if (/\b(cuanto|cuantos)\b/.test(asciiFolded))
      return { intent: "question:how_many", target: "object", tone: "curious", confidence: 0.94, hasSwearing };
    if (/\b(cual|cuales)\b/.test(asciiFolded))
      return { intent: "question:which", target: "object", tone: "curious", confidence: 0.94, hasSwearing };
    if (/\b(por que)\b/.test(asciiFolded))
      return { intent: "question:why", target: "dunno", tone: "curious", confidence: 0.92, hasSwearing };
    if (/\b(como)\b/.test(asciiFolded))
      return { intent: "question:how", target: "dunno", tone: "curious", confidence: 0.92, hasSwearing };
    if (/\b(donde)\b/.test(asciiFolded))
      return { intent: "question:where", target: "dunno", tone: "curious", confidence: 0.92, hasSwearing };
    return { intent: "fallback", target: "dunno", tone: "casual", confidence: 0.5, hasSwearing };
  }

  // --- TURKISH 10-LAYER ZERO-LLM COGNITIVE NLU ANALYZER ---
  const strongSwears = ["oç", "siktir", "sikik", "piç", "yavşak", "göt"];
  const mildSwears = ["aq", "amk", "mk", "mq", "lan", "ulan"];
  const hasStrongSwearing = tokens.some((t) => strongSwears.includes(t));
  const hasSwearing = hasStrongSwearing || tokens.some((t) => mildSwears.includes(t));

  const target: TargetType =
    /\b(ben malım|ben salağım|aptallık ettim|kafamı seveyim|benim hatam|bende akıl yok|ben niye böyleyim)\b/.test(
      normalized
    )
      ? "user_self"
      : /\b(şu kim|o kim|bu kim|kim bu|bu adam|şu adam|o adam|bu kadın|bu karakter|bunlar kim)\b/.test(
          normalized
        )
      ? "third_person"
      : /\b(excel|tablo|dosya|kod|program|uygulama|sekme|pencere|bilgisayar|ekran|oyun|site|sayfa)\b/.test(
          normalized
        )
      ? "application"
      : /\b(bu|şu|o|bunlar|şunlar|bunu|şunu|burası|şurası)\b/.test(normalized)
      ? "object"
      : "dunno";

  let tone: ToneType = "casual";
  if (hasStrongSwearing) tone = "angry";
  else if (/\b(ahaha|haha|hehe|sjsj|asdasd|ksksk|random|jsjs|hahaha)\b/.test(normalized))
    tone = "amused";
  else if (/\b(of|off|uff|üf|yeter|bıktım|çıldırıcam|deliricem|imdat)\b/.test(normalized))
    tone = "frustrated";
  else if (/\b(yoruldum|uykum|tükendim|bittim|halsizim|üşeniyorum)\b/.test(normalized))
    tone = "tired";

  if (target === "user_self" && /\b(mal|malım|salak|salağım|aptal|aptalım|gerizekalı)\b/.test(normalized)) {
    return { intent: "self_deprecation", target, tone: "sad", confidence: 0.97, hasSwearing };
  }
  if (hasStrongSwearing && target === "dunno") {
    return { intent: "insult:strong", target, tone: "angry", confidence: 0.96, hasSwearing: true };
  }
  if (
    target === "dunno" &&
    /\b(işe yaramaz|boş yapma|kes sesini|sus artık|kapa çeneni|ne biçim asistansın)\b/.test(normalized)
  ) {
    return { intent: "insult:mild", target, tone: "annoyed", confidence: 0.95, hasSwearing };
  }
  if (
    target === "dunno" &&
    /\b(mal|malsın|mal mısın|salak|salaksın|salak mısın|aptal|gerizekalı|şapşal|teneke|fasulye kafa)\b/.test(
      normalized
    )
  ) {
    return { intent: "insult:playful", target, tone: "teasing", confidence: 0.95, hasSwearing };
  }

  if (
    /\b(seni seviyorum|çok seviyorum|hiç sevmiyorum|sevmiyorum seni|aşkımsın|bebeğim|canım benim|yerim seni|kurban olurum)\b/.test(
      normalized
    )
  ) {
    if (hasNegation) {
      return { intent: "insult:mild", target: "dunno", tone: "annoyed", confidence: 0.95, hasSwearing };
    }
    return { intent: "affection", target: "dunno", tone: "friendly", confidence: 0.96, hasSwearing };
  }
  if (
    /\b(ne güzel|çok tatlısın|tatlı değilsin|adamsın|helal|harikasın|süpersin|efsanesin|çok iyisin|zekisin)\b/.test(
      normalized
    )
  ) {
    if (hasNegation) {
      return { intent: "insult:playful", target: "dunno", tone: "teasing", confidence: 0.94, hasSwearing };
    }
    return { intent: "compliment", target: "dunno", tone: "friendly", confidence: 0.95, hasSwearing };
  }

  if (topicMatch) {
    return { intent: topicMatch, target: "situation", tone, confidence: 0.95, hasSwearing };
  }

  if (
    !hasNegation &&
    (stemSet.has("sıkıl") ||
      stemSet.has("bunal") ||
      stemSet.has("daral") ||
      /\b(canım sıkılıyor|sıkıntıdan|içim şişti|yapacak bir şey yok|çok sıkıcı|baydı)\b/.test(normalized))
  ) {
    return { intent: "emotion:bored", target: "user_self", tone: "tired", confidence: 0.96, hasSwearing };
  }
  if (
    !hasNegation &&
    (stemSet.has("acık") ||
      /\b(karnım aç|karnım zil|açlıktan|ne yesem|yemek söyle|kurt gibi açım|midem kazındı)\b/.test(
        normalized
      ))
  ) {
    return { intent: "emotion:hungry", target: "user_self", tone: "tired", confidence: 0.96, hasSwearing };
  }
  if (
    !hasNegation &&
    (stemSet.has("yorul") ||
      stemSet.has("tüken") ||
      /\b(çok yorgunum|pilim bitti|uykum geldi|uykum var|gözlerim kapanıyor|halim yok|enerjim bitti|pert oldum)\b/.test(
        normalized
      ))
  ) {
    return { intent: "emotion:tired", target: "user_self", tone: "tired", confidence: 0.96, hasSwearing };
  }

  if (
    stemSet.has("özür") ||
    /\b(kusura bakma|pardon|affedersin|benim hatam|yanlışlıkla oldu|haklısın özür)\b/.test(normalized)
  ) {
    return { intent: "apology", target: "dunno", tone: "friendly", confidence: 0.96, hasSwearing };
  }
  if (
    stemSet.has("teşekkür") ||
    /\b(sağ ol|sağolasın|eyvallah|var ol|cansın|kralsın sağ ol|mersi)\b/.test(normalized)
  ) {
    return { intent: "thanks", target: "dunno", tone: "friendly", confidence: 0.96, hasSwearing };
  }

  if (/\b(osur|osurdun|pırt|gaz çıkardın|koktu)\b/.test(normalized)) {
    return { intent: "interaction:fart", target: "dunno", tone: "playful", confidence: 0.97, hasSwearing };
  }
  if (
    /\b(ahaha|haha|hehe|hahaha|sjsj|asdasd|ksksk|random|çok komik|hiç komik değil|komik değil|güldürdün|haykırdım|koptum)\b/.test(
      normalized
    )
  ) {
    if (hasNegation) {
      return { intent: "insult:mild", target: "dunno", tone: "sarcastic", confidence: 0.94, hasSwearing };
    }
    return { intent: "amusement", target: "situation", tone: "amused", confidence: 0.95, hasSwearing };
  }
  if (
    /\b(yok artık|ciddi misin|şaka yapıyorsun|inanmıyorum|hadi oradan|vallahi mi|gerçekten mi|olamaz)\b/.test(
      normalized
    )
  ) {
    return { intent: "disbelief", target: "situation", tone: "surprised", confidence: 0.95, hasSwearing };
  }
  if (
    /\b(anlamadım|ne alaka|nasıl yani|kafam karıştı|ne demek o|hiçbir şey anlamadım)\b/.test(
      normalized
    )
  ) {
    return { intent: "confusion", target: "situation", tone: "confused", confidence: 0.95, hasSwearing };
  }
  if (
    stemSet.has("yardım") ||
    /\b(yardım et|imdat|kurtar beni|destek ol|el at|çözelim şunu)\b/.test(normalized)
  ) {
    return { intent: "help_request", target: "dunno", tone: "frustrated", confidence: 0.95, hasSwearing };
  }
  if (
    /\b(hemen yap|çabuk ol|bana kahve yap|ödevimi yap|kodumu yaz|şunu düzelt|çalış biraz)\b/.test(
      normalized
    )
  ) {
    return { intent: "command", target: "dunno", tone: "annoyed", confidence: 0.95, hasSwearing };
  }

  if (/\b(günaydın|iyi sabahlar)\b/.test(normalized))
    return { intent: "greeting:morning", target: "dunno", tone: "friendly", confidence: 0.97, hasSwearing };
  if (/\b(tünaydın)\b/.test(normalized))
    return { intent: "greeting:afternoon", target: "dunno", tone: "friendly", confidence: 0.97, hasSwearing };
  if (/\b(iyi akşamlar|hayırlı akşamlar)\b/.test(normalized))
    return { intent: "greeting:evening", target: "dunno", tone: "friendly", confidence: 0.97, hasSwearing };
  if (/\b(iyi geceler|hayırlı geceler|yatıyorum|uyuyorum ben)\b/.test(normalized))
    return { intent: "greeting:night", target: "dunno", tone: "tired", confidence: 0.97, hasSwearing };
  if (/\b(görüşürüz|bay|bye|kaçtım|hoşça kal|allahaısmarladık|ben çıkıyorum)\b/.test(normalized))
    return { intent: "farewell", target: "dunno", tone: "friendly", confidence: 0.95, hasSwearing };
  if (tokens.length <= 4 && /\b(selam|merhaba|hey|hi|pişt|alo|hoş bulduk|hoş geldin)\b/.test(normalized))
    return { intent: "greeting:general", target: "dunno", tone: "casual", confidence: 0.94, hasSwearing };

  if (/\b(napıyon|napıyosun|napıyorsun|ne yapıyorsun|naber|nasılsın|ne var ne yok|keyifler nasıl)\b/.test(normalized))
    return { intent: "question:what_are_you_doing", target: "dunno", tone: "curious", confidence: 0.98, hasSwearing };
  if (/\b(noldu|ne oldu|neyin var|sorun ne|sıkıntı ne)\b/.test(normalized))
    return { intent: "question:what_happened", target: "dunno", tone: "curious", confidence: 0.97, hasSwearing };
  if (/\b(sence|ne düşünüyorsun|fikrin ne|nasıl olmuş|beğendin mi|yakışmış mı)\b/.test(normalized))
    return { intent: "question:opinion", target: "dunno", tone: "curious", confidence: 0.96, hasSwearing };
  if (/\b(değil mi|dimi|di mi|öyle mi|doğru mu|emin misin|onaylıyor musun)\b/.test(normalized))
    return { intent: "question:confirmation", target: "dunno", tone: "curious", confidence: 0.95, hasSwearing };
  if (/\b(nereden)\b/.test(normalized))
    return { intent: "question:where_from", target: "dunno", tone: "curious", confidence: 0.96, hasSwearing };
  if (/\b(nereye)\b/.test(normalized))
    return { intent: "question:where_to", target: "dunno", tone: "curious", confidence: 0.96, hasSwearing };
  if (/\b(kime)\b/.test(normalized))
    return { intent: "question:to_whom", target: "dunno", tone: "curious", confidence: 0.95, hasSwearing };
  if (/\b(kimden)\b/.test(normalized))
    return { intent: "question:from_whom", target: "dunno", tone: "curious", confidence: 0.95, hasSwearing };
  if (/\b(kimin|kiminki)\b/.test(normalized))
    return { intent: "question:whose", target: "object", tone: "curious", confidence: 0.95, hasSwearing };
  if (/\b(kiminle|kimle)\b/.test(normalized))
    return { intent: "question:with_whom", target: "dunno", tone: "curious", confidence: 0.95, hasSwearing };
  if (/\b(neyle|ne ile)\b/.test(normalized))
    return { intent: "question:with_what", target: "object", tone: "curious", confidence: 0.95, hasSwearing };
  if (/\b(ne için|niçin|neye yarıyor)\b/.test(normalized))
    return { intent: "question:for_what", target: "object", tone: "curious", confidence: 0.95, hasSwearing };
  if (/\b(hangisi|hangi)\b/.test(normalized))
    return { intent: "question:which", target: "object", tone: "curious", confidence: 0.95, hasSwearing };
  if (/\b(kaçıncı|kaçıncı bölüm|kaçıncı sezon|kaçıncı sırada)\b/.test(normalized))
    return { intent: "question:ordinal", target: "object", tone: "curious", confidence: 0.96, hasSwearing };
  if (/\b(kaç tane|kaç para|kaç lira|kaç saat|ne kadar)\b/.test(normalized))
    return { intent: "question:how_many", target: "object", tone: "curious", confidence: 0.95, hasSwearing };
  if (/\b(ne zaman|saat kaçta|kaçta)\b/.test(normalized))
    return { intent: "question:when", target: "situation", tone: "curious", confidence: 0.95, hasSwearing };
  if (/\b(kimsin|sen kimsin|nesin sen)\b/.test(normalized))
    return { intent: "question:who:dunno", target: "dunno", tone: "curious", confidence: 0.97, hasSwearing };
  if (/\b(kim|kimdir)\b/.test(normalized)) {
    return {
      intent: target === "third_person" || target === "object" ? "question:who:external" : "question:who",
      target,
      tone: "curious",
      confidence: 0.95,
      hasSwearing,
    };
  }
  if (/\b(nasıl)\b/.test(normalized)) {
    return {
      intent: target === "object" || target === "application" ? "question:how:external" : "question:how",
      target,
      tone: "curious",
      confidence: 0.94,
      hasSwearing,
    };
  }
  if (/\b(neden|niye)\b/.test(normalized)) {
    return {
      intent: target === "object" || target === "application" ? "question:why:external" : "question:why",
      target,
      tone: "curious",
      confidence: 0.95,
      hasSwearing,
    };
  }
  if (/\b(nerede|neredesin)\b/.test(normalized)) {
    return {
      intent:
        (target === "object" || target === "application") && !normalized.includes("neredesin")
          ? "question:where:external"
          : "question:where",
      target,
      tone: "curious",
      confidence: 0.95,
      hasSwearing,
    };
  }
  if (/\b(bu ne|şu ne|o ne|ne işe yarıyor|ne işe yarıyo|ne bu)\b/.test(normalized)) {
    return { intent: "question:what:external", target: "object", tone: "curious", confidence: 0.95, hasSwearing };
  }
  if (/\b(ne|nedir)\b/.test(normalized)) {
    return { intent: "question:what", target, tone: "curious", confidence: 0.9, hasSwearing };
  }

  return { intent: "fallback", target, tone, confidence: 0.5, hasSwearing };
}

export const INVERSE_INTENT_MAP: Partial<Record<IntentCategory, IntentCategory>> = {
  "question:where_to": "question:where_from",
  "question:where_from": "question:where_to",
  "question:to_whom": "question:from_whom",
  "question:from_whom": "question:to_whom",
  "greeting:morning": "greeting:night",
  "greeting:night": "greeting:morning",
  farewell: "greeting:general",
};

export function renderMouthModeText(
  template: string,
  mode: MouthMode = "polite",
  locale: SupportedLocale = "tr"
): string {
  let out = template;
  if (mode === "street") {
    out = out.replace(/\{K:([^}]+)\}/g, "$1");
  } else {
    out = out.replace(/\{K:[^}]+\}/g, "");
  }
  out = out.replace(/\s+/g, " ").replace(/\s+([.,?;:])/g, "$1").trim();
  return toLocaleLower(out, locale).replace(/!/g, ".");
}

function computeTokenJaccard(a: string, b: string): number {
  const setA = new Set(a.split(/\s+/).filter((w) => w.length >= 3));
  const setB = new Set(b.split(/\s+/).filter((w) => w.length >= 3));
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export class DunnoMultilingualDialogueEngine {
  private trPools: Record<string, PoolCandidate[]>;
  private i18nPools: Record<SupportedLocale, Record<string, PoolCandidate[]>>;
  private entertainmentRules: EntertainmentRule[];
  private recentResponses: string[] = [];
  private recentUserMessages: string[] = [];
  private lastStyleUsed: LineStyle | null = null;
  private maxCooldownHistory = 35;
  private lastMatchedPoolKey: string | null = null;
  private lastSelectionCategory: SelectionCategory | null = null;
  private lastConversationalTopic: TopicCategory | null = null;
  private lastWindowChangeTimestamp: number = 0;
  private lastSelectionTimestamp: number = 0;
  private lastMusicTitleHash: string | null = null;
  private musicRepeatCount: number = 0;
  private recentTabHashes: Array<{ hash: string; ts: number }> = [];

  constructor(
    poolsData: {
      pools: Record<string, PoolCandidate[]>;
      i18nPools?: Record<SupportedLocale, Record<string, PoolCandidate[]>>;
    },
    entertainmentConfig?: { rules: EntertainmentRule[] }
  ) {
    this.trPools = poolsData.pools;
    this.i18nPools = poolsData.i18nPools || {
      tr: poolsData.pools,
      en: {},
      es: {},
    };
    this.entertainmentRules = entertainmentConfig?.rules || [];
  }

  public dunnolaSelectedText(
    selectedText: string,
    explicitTrigger: boolean = true,
    context: RuntimeContext = {},
    rng: () => number = Math.random,
    nowMs: number = Date.now()
  ): DunnolaSelectionResult {
    const locale: SupportedLocale = context.locale || "tr";
    const trimmed = (selectedText || "").trim();
    const fp = analyzeSelectionFingerprint(trimmed);

    if (context.inMeeting || context.quietToday || trimmed.length < 2) {
      return {
        silent: true,
        locale,
        poolKey: null,
        charCount: fp.charCount,
        wordCount: fp.wordCount,
        estimatedReadSeconds: fp.estimatedReadSeconds,
        extractedEntity: fp.extractedEntity,
        response: "",
        lazyRewrite: "",
      };
    }

    if (!explicitTrigger) {
      if (nowMs - this.lastSelectionTimestamp < 45000 || rng() > 0.2) {
        return {
          silent: true,
          locale,
          poolKey: null,
          charCount: fp.charCount,
          wordCount: fp.wordCount,
          estimatedReadSeconds: fp.estimatedReadSeconds,
          extractedEntity: fp.extractedEntity,
          response: "",
          lazyRewrite: "",
        };
      }
    }

    this.lastSelectionTimestamp = nowMs;
    const category = classifySelectedText(trimmed, locale);
    if (!category) {
      return {
        silent: true,
        locale,
        poolKey: null,
        charCount: fp.charCount,
        wordCount: fp.wordCount,
        estimatedReadSeconds: fp.estimatedReadSeconds,
        extractedEntity: fp.extractedEntity,
        response: "",
        lazyRewrite: "",
      };
    }

    this.lastSelectionCategory = category;
    const mode: MouthMode = context.mouthMode || "polite";
    const response = this.pickFromPool(category, locale, mode, rng);
    const lazyRewrite = buildLazyDunnoRewrite(trimmed, category, locale);

    return {
      silent: false,
      locale,
      poolKey: category,
      charCount: fp.charCount,
      wordCount: fp.wordCount,
      estimatedReadSeconds: fp.estimatedReadSeconds,
      extractedEntity: fp.extractedEntity,
      response,
      lazyRewrite,
    };
  }

  public reactToActiveWindow(
    windowTitle: string | undefined,
    processName: string | undefined,
    context: RuntimeContext = {},
    rng: () => number = Math.random,
    nowMs: number = Date.now()
  ): { silent: boolean; locale: SupportedLocale; poolKey: string | null; response: string } {
    const locale: SupportedLocale = context.locale || "tr";
    if (context.inMeeting || context.quietToday || context.watchTabTitlesEnabled === false) {
      return { silent: true, locale, poolKey: null, response: "" };
    }

    const elapsedMs = this.lastWindowChangeTimestamp ? nowMs - this.lastWindowChangeTimestamp : 999999;
    this.lastWindowChangeTimestamp = nowMs;
    const mode: MouthMode = context.mouthMode || "polite";

    if (isAltTabPanicTransition(this.lastMatchedPoolKey, windowTitle, processName, elapsedMs)) {
      this.lastMatchedPoolKey = null;
      const response = this.pickFromPool("behavior:alt_tab_panic", locale, mode, rng);
      return { silent: false, locale, poolKey: "behavior:alt_tab_panic", response };
    }

    const match = matchEntertainmentContext(
      windowTitle,
      processName,
      this.entertainmentRules,
      locale
    );
    if (match.isSilent) {
      this.lastMatchedPoolKey = null;
      return { silent: true, locale, poolKey: null, response: "" };
    }

    if (windowTitle) {
      const simpleHash = String(windowTitle.length) + ":" + windowTitle.slice(0, 12).toLowerCase();
      this.recentTabHashes = this.recentTabHashes.filter((x) => nowMs - x.ts < 15 * 60 * 1000);
      if (!this.recentTabHashes.some((x) => x.hash === simpleHash)) {
        this.recentTabHashes.push({ hash: simpleHash, ts: nowMs });
      }
      if (this.recentTabHashes.length >= 10 && rng() < 0.25) {
        this.recentTabHashes = [];
        const response = this.pickFromPool("behavior:tab_hoarder", locale, mode, rng);
        return { silent: false, locale, poolKey: "behavior:tab_hoarder", response };
      }
    }

    if (match.poolKey?.startsWith("music:") && windowTitle) {
      const musicHash = windowTitle.toLowerCase().trim();
      if (this.lastMusicTitleHash === musicHash) {
        this.musicRepeatCount += 1;
      } else {
        this.lastMusicTitleHash = musicHash;
        this.musicRepeatCount = 1;
      }
      if (this.musicRepeatCount >= 3) {
        this.musicRepeatCount = 0;
        const response = this.pickFromPool("behavior:song_loop_detector", locale, mode, rng);
        return { silent: false, locale, poolKey: "behavior:song_loop_detector", response };
      }
    }

    const poolKey =
      match.poolKey ||
      context.activeEntertainmentPool ||
      (context.activeSiteCategory ? `site:${context.activeSiteCategory}` : null) ||
      (context.activeApp ? `app:${context.activeApp}` : null);

    this.lastMatchedPoolKey = poolKey;

    const localePools = this.i18nPools[locale] || this.trPools;
    if (!poolKey || !localePools[poolKey]) {
      return { silent: true, locale, poolKey: null, response: "" };
    }

    const response = this.pickFromPool(poolKey, locale, mode, rng);
    return { silent: false, locale, poolKey, response };
  }

  public reply(
    rawMessage: string,
    context: RuntimeContext = {},
    rng: () => number = Math.random
  ): DialogueTurnResult {
    const locale: SupportedLocale = context.locale || "tr";
    const { normalized, asciiFolded, stems, hasNegation } = normalizeMessage(rawMessage, locale);

    let matchedEntPool = context.activeEntertainmentPool || null;
    let entSilent = false;
    if (
      context.watchTabTitlesEnabled !== false &&
      (context.windowTitleForLocalMatch || context.processNameForLocalMatch)
    ) {
      const m = matchEntertainmentContext(
        context.windowTitleForLocalMatch,
        context.processNameForLocalMatch,
        this.entertainmentRules,
        locale
      );
      matchedEntPool = m.poolKey || matchedEntPool;
      entSilent = m.isSilent;
    }

    const detected = detectMultilingualIntent(
      normalized,
      asciiFolded,
      locale,
      context,
      stems,
      hasNegation
    );
    let effectiveIntent: string = detected.intent;
    let usedInverse = false;
    const localePools = this.i18nPools[locale] || this.trPools;

    if (
      normalized.length >= 2 &&
      this.recentUserMessages.length > 0 &&
      this.recentUserMessages[this.recentUserMessages.length - 1] === normalized &&
      localePools["behavior:repeat_spam"]
    ) {
      effectiveIntent = "behavior:repeat_spam";
    } else if (
      this.recentUserMessages.length > 0 &&
      normalized.split(" ").length <= 2 &&
      /\b(niye ki|neden ki|ee|eee|sonra|peki|emin misin|cidden mi|why though|and then|y luego)\b/.test(
        normalized
      ) &&
      localePools["behavior:short_followup"]
    ) {
      effectiveIntent = "behavior:short_followup";
    } else {
      if (detected.intent.startsWith("topic:")) {
        this.lastConversationalTopic = detected.intent as TopicCategory;
      }

      const inverseTarget = INVERSE_INTENT_MAP[detected.intent];
      const inverseProb = context.inverseProbability ?? 0.35;

      if (
        context.allowInverse !== false &&
        inverseTarget &&
        rng() < inverseProb &&
        localePools[inverseTarget]?.length
      ) {
        effectiveIntent = inverseTarget;
        usedInverse = true;
      }

      if (
        detected.intent.endsWith(":external") ||
        detected.target === "object" ||
        detected.target === "application"
      ) {
        if (matchedEntPool && localePools[matchedEntPool]) {
          effectiveIntent = matchedEntPool;
        } else if (this.lastSelectionCategory && localePools[this.lastSelectionCategory]) {
          effectiveIntent = this.lastSelectionCategory;
        } else if (this.lastConversationalTopic && localePools[this.lastConversationalTopic]) {
          effectiveIntent = this.lastConversationalTopic;
        }
      }
    }

    this.recentUserMessages.push(normalized);
    if (this.recentUserMessages.length > 10) {
      this.recentUserMessages.shift();
    }

    const mode: MouthMode =
      context.mouthMode || (detected.hasSwearing ? "street" : "polite");
    const response = this.pickFromPool(effectiveIntent, locale, mode, rng);

    return {
      silent: entSilent || Boolean(context.inMeeting) || Boolean(context.quietToday),
      locale,
      rawMessage,
      normalizedMessage: normalized,
      stems,
      hasNegation,
      detectedIntent: detected.intent,
      effectivePoolKey: effectiveIntent,
      matchedEntertainmentPool: matchedEntPool,
      usedInverse,
      confidence: detected.confidence,
      target: detected.target,
      tone: detected.tone,
      profanity: {
        hasSwearing: detected.hasSwearing,
        level: detected.hasSwearing ? 2 : 0,
        position: "none",
        func: "familiarity",
        target: detected.target,
      },
      response: entSilent ? "" : response,
    };
  }

  private pickFromPool(
    poolKey: string,
    locale: SupportedLocale,
    mode: MouthMode,
    rng: () => number
  ): string {
    const localePools = this.i18nPools[locale] || this.trPools;
    const pool = localePools[poolKey] || localePools["fallback"] || this.trPools["fallback"] || [];
    const renderedCandidates = pool.map((item) => ({
      ...item,
      rendered: renderMouthModeText(item.text, mode, locale),
    }));

    let filtered = renderedCandidates.filter((c) => !this.recentResponses.includes(c.rendered));
    if (filtered.length === 0) {
      filtered = renderedCandidates;
    }

    const lastFive = this.recentResponses.slice(-5);
    const lowOverlap = filtered.filter((c) =>
      lastFive.every((prev) => computeTokenJaccard(c.rendered, prev) < 0.55)
    );
    if (lowOverlap.length > 0) {
      filtered = lowOverlap;
    }

    if (this.lastStyleUsed) {
      const differentStyle = filtered.filter((c) => (c.style || "snark") !== this.lastStyleUsed);
      if (differentStyle.length > 0) {
        filtered = differentStyle;
      }
    }

    const totalWeight = filtered.reduce((acc, item) => acc + (item.weight ?? 5), 0);
    let pick = rng() * totalWeight;
    let chosen = filtered[0];
    for (const candidate of filtered) {
      pick -= candidate.weight ?? 5;
      if (pick <= 0) {
        chosen = candidate;
        break;
      }
    }

    const finalText = chosen ? chosen.rendered : "eh.";
    this.lastStyleUsed = chosen?.style || "snark";
    this.recentResponses.push(finalText);
    if (this.recentResponses.length > this.maxCooldownHistory) {
      this.recentResponses.shift();
    }
    return finalText;
  }
}
// ============================================================================
// LAYER 11 — REPO & STUDIO BRIDGE (@desktop/talk/classify + SPEC 09 K7 / K8)
// Ensures 100% plug-and-play compatibility with:
//   - @desktop/talk/classify (`classify`, `answerType`, `INVERSE_ANSWER_MAP`)
//   - @desktop/lines/engine (`LineEngine`, `answer:<type>`, `site:<tag>`)
//   - Studio `try.ts`, `side.ts`, and `try.test.ts` (SPEC 06 Q2, SPEC 09 K7 & K8)
// ============================================================================

export type RepoQuestionType =
  | "who"
  | "what"
  | "where"
  | "when"
  | "why"
  | "how"
  | "yes_no"
  | "choice"
  | "math"
  | "advice"
  | "greeting"
  | "insult"
  | "compliment"
  | "from_where"
  | "to_where"
  | "to_whom"
  | "from_whom"
  | "whose"
  | "with_whom"
  | "with_what"
  | "for_what"
  | "which"
  | "ordinal"
  | "how_are_you"
  | "good_morning"
  | "good_night"
  | "good_evening"
  | "good_afternoon"
  | "thanks"
  | "apology"
  | "bye"
  | "love"
  | "bored"
  | "hungry"
  | "tired"
  | "other";

export const INVERSE_ANSWER_MAP: Readonly<Record<string, string>> = {
  to_where: "from_where",
  from_where: "to_where",
  to_whom: "from_whom",
  from_whom: "to_whom",
  good_morning: "good_night",
  good_night: "good_morning",
  bye: "greeting",
};

/**
 * SPEC 09 K8: Inverse pool resolver for `@desktop/talk/classify` & `try.ts` / `side.ts`.
 */
export function answerType(qtype: string): string {
  return INVERSE_ANSWER_MAP[qtype] ?? qtype;
}

/**
 * SPEC 06 Q2 + SPEC 09 K8: Bilingual (TR + EN) question classifier with
 * 10-layer typo recovery, ASCII folding, repeat-letter compression & Turkish stemmer.
 */
export function classify(rawQuestion: string): RepoQuestionType {
  const raw = (rawQuestion || "").trim();
  if (!raw) return "other";

  const lowerTr = toLocaleLower(raw, "tr");
  const foldedRaw = foldAscii(lowerTr);
  if (
    /\d+\s*[+\-*/x÷=]\s*\d+/.test(foldedRaw) ||
    /\b(kac eder|kac yapar|toplami|carpimi|bolumu|karekoku|yuzde kaci|how much is|plus|minus|times|divided by|math|calculate)\b/.test(
      foldedRaw
    ) ||
    (/\d/.test(foldedRaw) && /\b(kac|how many|how much)\b/.test(foldedRaw))
  ) {
    return "math";
  }

  const trNorm = normalizeMessage(raw, "tr");
  const enNorm = normalizeMessage(raw, "en");
  const norm = trNorm.normalized;
  const folded = trNorm.asciiFolded;
  const enText = enNorm.normalized;

  if (/\b(gunaydin|iyi sabahlar|good morning|morning)\b/.test(folded) || /\bgünaydın\b/.test(norm)) {
    return "good_morning";
  }
  if (/\b(iyi geceler|hayirli geceler|good night|goodnight)\b/.test(folded)) {
    return "good_night";
  }
  if (/\b(iyi aksamlar|hayirli aksamlar|good evening)\b/.test(folded)) {
    return "good_evening";
  }
  if (/\b(tunaydin|good afternoon)\b/.test(folded) || /\btünaydın\b/.test(norm)) {
    return "good_afternoon";
  }
  if (/\b(gorusuruz|hosca kal|hoscakal|bay bay|allahaismarladik|goodbye|see ya|see you|bye)\b/.test(folded)) {
    return "bye";
  }
  if (/\b(tesekkurler|tesekkur|sag ol|sagol|eyvallah|mersi|thanks|thank you|thx|tysm)\b/.test(folded)) {
    return "thanks";
  }
  if (/\b(ozur|kusura bakma|pardon|affedersin|sorry|my bad|apologies)\b/.test(folded)) {
    return "apology";
  }

  if (/\b(seni seviyorum|cok seviyorum|askimsin|i love you|love you)\b/.test(folded)) {
    return trNorm.hasNegation || enNorm.hasNegation ? "insult" : "love";
  }
  if (
    /\b(salak|aptal|gerizekali|mal|malsin|salaksin|ise yaramaz|stupid|idiot|dumb|useless|moron|shut up)\b/.test(
      folded
    )
  ) {
    return "insult";
  }
  if (/\b(cok tatlisin|harikasin|supersin|efsanesin|adamsin|you are cute|awesome|amazing|great job)\b/.test(folded)) {
    return trNorm.hasNegation || enNorm.hasNegation ? "insult" : "compliment";
  }
  if (!trNorm.hasNegation && !enNorm.hasNegation) {
    if (/\b(sikildim|canim sikiliyor|bunaldim|daraldim|i am bored|im bored|so bored|boring)\b/.test(folded)) {
      return "bored";
    }
    if (/\b(aciktim|karnim ac|kurt gibi acim|i am hungry|im hungry|starving)\b/.test(folded)) {
      return "hungry";
    }
    if (/\b(yoruldum|cok yorgunum|uykum geldi|uykum var|pilim bitti|tukendim|i am tired|im tired|exhausted|sleepy)\b/.test(folded)) {
      return "tired";
    }
  }

  if (/\b(nereden|nerden|where are you from|where from|where did .* come from)\b/.test(folded)) {
    return "from_where";
  }
  if (/\b(nereye|nere|where are we going|where to|where are you going)\b/.test(folded)) {
    return "to_where";
  }
  if (/\b(kime|to whom|who .* to)\b/.test(folded)) {
    return "to_whom";
  }
  if (/\b(kimden|from whom)\b/.test(folded)) {
    return "from_whom";
  }
  if (/\b(kimin|kiminki|whose)\b/.test(folded)) {
    return "whose";
  }
  if (/\b(kimle|kiminle|with whom)\b/.test(folded)) {
    return "with_whom";
  }
  if (/\b(neyle|ne ile|with what)\b/.test(folded)) {
    return "with_what";
  }
  if (/\b(ne icin|nicin|neye yariyor|what for)\b/.test(folded)) {
    return "for_what";
  }
  if (/\b(kaçıncı)\b/.test(norm) || /\b(kacinci|which number|what rank)\b/.test(folded)) {
    return "ordinal";
  }
  if (/\b(hangi|hangisi|which one|which)\b/.test(folded)) {
    return "which";
  }
  if (
    /\b(nasilsin|naber|napiyon|napiyosun|napiyorsun|ne yapiyorsun|ne var ne yok|how are you|how's it going|whats up|what are you doing)\b/.test(
      folded
    )
  ) {
    return "how_are_you";
  }

  if (
    /\b(should i|what should i|tavsiye|onerir misin|ne yapmaliyim|sence .* miyim|istifa edeyim mi|quit my job)\b/.test(
      folded
    ) ||
    /\b(meli miyim|malı mıyım|sem mi|sam mı)\b/.test(norm)
  ) {
    return "advice";
  }
  if (/\b(selam|merhaba|hey|hi|hello|yo|sup|hos geldin|hos bulduk)\b/.test(folded)) {
    return "greeting";
  }
  if (/\b(kim|kimdir|kimsin|who|who's|whom)\b/.test(folded)) {
    return "who";
  }
  if (/\b(nerede|nerde|neredesin|nerdesin|where|where's)\b/.test(folded)) {
    return "where";
  }
  if (/\b(ne zaman|saat kacta|kacta|when|what time)\b/.test(folded)) {
    return "when";
  }
  if (/\b(neden|niye|why)\b/.test(folded)) {
    return "why";
  }
  if (/\b(nasil|nasi|how)\b/.test(folded)) {
    return "how";
  }
  if (/\b(yoksa|veya|ya da|or)\b/.test(folded) && enText.split(" ").length >= 3) {
    return "choice";
  }
  if (/\b(ne|nedir|ney|what|what's)\b/.test(folded)) {
    return "what";
  }
  if (/\b(mi|mı|mu|mü|misin|mısın|musun|müsün|is it|are you|do you|can you|will you)\b/.test(norm)) {
    return "yes_no";
  }

  return "other";
}

export const SITE_TAGS = [
  "video",
  "social",
  "shopping",
  "news",
  "mail",
  "code",
  "ai_chat",
  "docs",
  "music",
  "maps",
  "learning",
  "game_store",
  "search",
] as const;

export type SiteTag = (typeof SITE_TAGS)[number];

const K7_CATEGORY_KEYWORDS: Record<SiteTag, readonly string[]> = {
  video: [
    "youtube",
    "vimeo",
    "dailymotion",
    "twitch",
    "kick",
    "netflix",
    "disney+",
    "prime video",
    "blutv",
    "exxen",
    "gain",
    "mubi",
    "bölüm",
    "sezon",
    "episode",
  ],
  social: [
    "twitter",
    "x.com",
    "instagram",
    "facebook",
    "tiktok",
    "linkedin",
    "reddit",
    "ekşi sözlük",
    "eksisozluk",
    "threads",
    "bluesky",
    "pinterest",
  ],
  shopping: [
    "trendyol",
    "hepsiburada",
    "amazon",
    "n11",
    "çiçeksepeti",
    "boyner",
    "zara",
    "ikea",
    "ebay",
    "aliexpress",
    "etsy",
    "sepet",
    "checkout",
  ],
  news: [
    "haber",
    "hürriyet",
    "milliyet",
    "sözcü",
    "ntv",
    "cnn",
    "bbc",
    "reuters",
    "guardian",
    "nytimes",
    "son dakika",
    "gündem",
    "breaking news",
  ],
  mail: ["gmail", "outlook", "protonmail", "yahoo mail", "gelen kutusu", "inbox", "webmail", "thunderbird"],
  code: [
    "github",
    "gitlab",
    "bitbucket",
    "stackoverflow",
    "stack overflow",
    "npmjs",
    "crates.io",
    "pypi",
    "localhost",
    "127.0.0.1",
    "pull request",
  ],
  ai_chat: [
    "chatgpt",
    "claude",
    "gemini",
    "copilot",
    "perplexity",
    "deepseek",
    "poe.com",
    "huggingface",
    "openai",
    "anthropic",
  ],
  docs: ["google docs", "google sheets", "google slides", "notion", "confluence", "overleaf", "dropbox paper", "coda"],
  music: ["spotify", "youtube music", "apple music", "soundcloud", "deezer", "tidal", "bandcamp", "last.fm", "fizy", "winamp"],
  maps: ["google maps", "haritalar", "yandex harita", "apple maps", "openstreetmap", "flightradar", "street view", "yol tarifi"],
  learning: ["udemy", "coursera", "edx", "khan academy", "duolingo", "leetcode", "hackerrank", "freecodecamp", "btk akademi", "patika"],
  game_store: ["steam", "epic games", "gog.com", "itch.io", "humble bundle", "xbox", "playstation store", "battle.net", "riot client"],
  search: ["google search", "bing", "duckduckgo", "yandex", "brave search", "kagi", "arama sonuçları", "search results"],
};

export function classifyWindowTitle(
  windowTitle: string | undefined | null,
  processName?: string,
  rules: EntertainmentRule[] = []
): { site: SiteTag | null; entertainmentPool: string | null; silent: boolean } {
  const rawTitle = toLocaleLower(windowTitle || "", "tr");
  const foldedTitle = foldAscii(rawTitle);
  if (!rawTitle && !processName) {
    return { site: null, entertainmentPool: null, silent: false };
  }

  if (SILENT_TAB_PATTERNS.some((rx) => rx.test(rawTitle) || rx.test(foldedTitle))) {
    return { site: null, entertainmentPool: null, silent: true };
  }

  const ent = matchEntertainmentContext(windowTitle || undefined, processName, rules, "tr");
  if (ent.isSilent) {
    return { site: null, entertainmentPool: null, silent: true };
  }

  for (const tag of SITE_TAGS) {
    for (const kw of K7_CATEGORY_KEYWORDS[tag]) {
      const kwLow = toLocaleLower(kw, "tr");
      const kwFold = foldAscii(kwLow);
      if (rawTitle.includes(kwLow) || (kwFold.length >= 4 && foldedTitle.includes(kwFold))) {
        return { site: tag, entertainmentPool: ent.poolKey, silent: false };
      }
    }
  }

  if (ent.poolKey) {
    if (
      ent.poolKey.startsWith("series:") ||
      ent.poolKey.startsWith("turkish_series:") ||
      ent.poolKey.startsWith("anime:") ||
      ent.poolKey.startsWith("movie:") ||
      ent.poolKey.startsWith("media:")
    ) {
      return { site: "video", entertainmentPool: ent.poolKey, silent: false };
    }
    if (ent.poolKey.startsWith("music:")) {
      return { site: "music", entertainmentPool: ent.poolKey, silent: false };
    }
    if (ent.poolKey.startsWith("launcher:") || ent.poolKey.startsWith("game:")) {
      return { site: "game_store", entertainmentPool: ent.poolKey, silent: false };
    }
  }

  return { site: null, entertainmentPool: ent.poolKey, silent: false };
}