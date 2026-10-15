// Soru tipi (SPEC 06 Q1, SPEC 09 K8; saf, cihazda, ağ yok): TR + EN kural tabanlı sınıflayıcı.
// Anahtar kelime + Türkçe soru eki + kalıp. Metin önce katlanır (küçük harf, ç ğ ı i̇ ö ş ü -> c g i i o s u):
// Türkçe klavyesiz yazılan "nasil", "nerde" de aynı kurala düşer. Soru içeriği hiçbir yere yazılmaz/gönderilmez.
// K8 yazım toleransı: 3+ tekrar eden harf 2'ye sıkışır ("goood" -> "good"); sonuç "other" ise tüm tekrarlar teke ("nereyeee", "günaydınnn").
// Sıra: math > sosyal öbek (selam/veda/teşekkür/özür/sevgi/durum; yanında gerçek soru yoksa) > soru tipleri (alt tipler genelden önce:
// kaçıncı > kaç, kimden/kime/kimin/kimle > kim, nereden/nereye > nerede, ne için > neden, hangi > ne) > tek başına küfür > evet/hayır > selam > other.
// Ters cevap (K8): yön/selam tiplerinde cevap havuzu sorunun tersi (INVERSE, content/pool/inverse.md).

import bannedEn from "../../assets/banned_en.txt?raw";
import bannedTr from "../../assets/banned_tr.txt?raw";

export const QTYPES = [
  "who",
  "where",
  "when",
  "why",
  "how",
  "how_many",
  "what",
  "yes_no",
  "math",
  "advice",
  "greeting",
  "insult",
  // SPEC 09 K8
  "from_where",
  "to_where",
  "to_whom",
  "from_whom",
  "whose",
  "with_whom",
  "with_what",
  "what_for",
  "which",
  "ordinal",
  "how_are_you",
  "good_morning",
  "good_afternoon",
  "good_evening",
  "good_night",
  "thanks",
  "sorry",
  "bye",
  "love",
  "bored",
  "hungry",
  "tired",
  // FB4-10 iltifat: güzel cevap, sonda tavır
  "compliment",
  // FB4-9 (DUNNO_TURKISH_DIALOGUE.md): niyet ayrımı
  "what_are_you_doing",
  "what_happened",
  "confusion",
  "disbelief",
  "amusement",
  "command",
  "help",
  "self_deprecation",
  "third_person",
  "insult_strong",
  "gibberish",
  // SPEC 17 L2: cevaptan hemen sonraki takip sorusu: neden, ciddi misin (oturum içi; talker atar)
  "follow_up",
  "other",
] as const;
export type QType = (typeof QTYPES)[number];

/**
 * Ters cevap (K8): bu tiplerde cevap, sorunun tersi olan tipin havuzundan gelir. Havuz adı cevabın kendisini anlatır
 * (answer:from_where = "geldiğin yerden" gibi nereden-cevapları; "nereye" sorusu onları alır). Tablo: content/pool/inverse.md (test eşitliği).
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
 * FB4-9 (DUNNO_TURKISH_DIALOGUE.md §2, §34): sohbet niyetleri bilgi sorusu değil; cevap Dunno'nun kendi havuzundan,
 * günlük doğru cevap hakkı harcanmaz, sunucuya / yapay zekâya gitmez.
 */
export const CHAT_TYPES: ReadonlySet<QType> = new Set<QType>([
  "greeting",
  "bye",
  "thanks",
  "sorry",
  "love",
  "compliment",
  "insult",
  "insult_strong",
  "how_are_you",
  "good_morning",
  "good_afternoon",
  "good_evening",
  "good_night",
  "bored",
  "hungry",
  "tired",
  "what_are_you_doing",
  "what_happened",
  "confusion",
  "disbelief",
  "amusement",
  "command",
  "help",
  "self_deprecation",
  "third_person",
  "gibberish",
  "follow_up",
]);

/** Soru tipi -> cevap havuzu tipi (ters tiplerde karşıtı, diğerlerinde kendisi). */
export function answerType(q: QType): QType {
  return INVERSE[q] ?? q;
}

const FOLD: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };

/** küçük harf + Türkçe harfleri ASCII'ye katla (I ve İ ikisi de i: dilden bağımsız) */
export function fold(text: string): string {
  return text
    .replace(/[İI]/g, "i")
    .toLowerCase()
    .replace(/̇/g, "")
    .replace(/[çğıöşüâîû]/g, (c) => FOLD[c]);
}

/** Tekrar eden harfleri sıkıştırır: max 2 ("goood" -> "good") ya da 1 ("nereyee" -> "nereye", "tesekkur" -> "tesekur"). */
export function squeeze(s: string, max: 1 | 2): string {
  return max === 2 ? s.replace(/([a-z])\1{2,}/g, "$1$1") : s.replace(/([a-z])\1+/g, "$1");
}

const words = (s: string) => s.split(/[^a-z0-9]+/).filter(Boolean);
const any = (ws: string[], set: ReadonlySet<string>) => ws.some((w) => set.has(w));
const set = (...xs: string[]) => new Set(xs);

// --- math: iki sayı arasında işlem ya da kök/kare ---
const OP = String.raw`(?:[-+*/x×÷^%]|arti|eksi|carpi|bolu|plus|minus|times|divided by|multiplied by|over)`;
const MATH = new RegExp(String.raw`\d+(?:[.,]\d+)?\s*${OP}\s*\(?\d|\b(?:karekok|kare koku|square root|sqrt|kupu|karesi|squared|cubed|faktoriyel|factorial)\b.*\d|\d.*\b(?:karekok|karekoku|kare koku|karesi|kupu|squared|cubed|faktoriyel|factorial)\b`);

// --- sosyal öbekler (soru değil; yanında gerçek soru varsa soru kazanır). Sıra = öncelik ---
const SOCIAL: readonly [QType, RegExp][] = [
  // FB4-9 (DUNNO_TURKISH_DIALOGUE.md §11-12, §28-33): sohbet niyetleri, soru kalıbından önce
  ["self_deprecation", /\b(ben (cok )?(malim|salagim|aptalim|gerizekaliyim|beceriksizim)|ne (malim|salagim|aptalim)|salak gibi yaptim|aptallik ettim|mallik ettim|salaklik ettim|im (so )?(dumb|stupid|an idiot)|i am (so )?(dumb|stupid|an idiot)|im such an idiot|i messed up|i screwed up)\b/],
  ["what_are_you_doing", /\b(napiyon|napiyosun|napiyorsun|napion|napiyonuz|napiyorsunuz|ne yapiyorsun|ne yapiyon|ne yapiyosun|ne yapiyorsunuz|napcan|napcaksin|what are you doing|what r u doing|whatcha doing|watcha doing|what you doing|what are u doing|wyd)\b/],
  ["what_happened", /\b(noldu|ne oldu|ne olmus|naptin|ne yaptin|what happened|whats going on|what is going on|what did you do|whatd you do)\b/],
  ["confusion", /\b(anlamadim|anlamiyorum|anlayamadim|ne diyosun|ne diyorsun|ne diyon|nasil yani|ne alaka|ne demek istiyorsun|ne demek istedin|kafam karisti|i dont understand|i dont get it|what do you mean|im confused|i am confused|confused)\b|^(ne demek|huh|he|ha)$/],
  ["disbelief", /\b(yok artik|harbi mi|harbiden mi|ciddi misin|ciddi mi|saka mi|saka misin|saka yapiyorsun|saka yapiyosun|olamaz|yok ya|inanmiyorum|inanamiyorum|hadi ya|hadi canim|vay be|ne bicim|no way|seriously|are you serious|for real|youre kidding|are you kidding|cant believe|i cant believe|unbelievable)\b/],
  ["amusement", /\b(a?(ha){2,}h?|(he){3,}|(hi){3,}|(ah){2,}a?|(js){2,}j?|(sj){2,}s?|x+d+|lo+l|lmao|lmfao|rofl|kahkaha\w*|yarildim|koptum|cok komik|komigime geldi|gulmekten|so funny|hilarious|that s funny|thats funny)\b/],
  ["help", /\b(yardim et|yardim eder misin|yardim edermisin|yardim etsene|yardim lazim|yardimci ol|yardimci olur musun|bana yardim|help me|can you help|could you help|i need help|need help)\b|^help$/],
  ["good_morning", /\b(gunaydin|gunaydinlar|gunaydn|good morning|god morning|gm|mornin)\b|^morning\b/],
  ["good_afternoon", /\b(tunaydin|tunaydinlar|iyi gunler|good afternoon|god afternon)\b|^afternoo?n\b/],
  ["good_evening", /\b(iyi aksamlar|hayirli aksamlar|good evening|god evening)\b|^evening\b/],
  ["good_night", /\b(iyi geceler|iyi uykular|tatli ruyalar|hayirli geceler|good night|goodnight|god night|godnight|good nii?ght|god nii?ght|gnight|nighty night|night night|sweet dreams|gn)\b/],
  ["bye", /\b(gorusuruz|gorusmek uzere|sonra gorusuruz|hosca kal|hoscakal|hoscakalin|gule gule|bay bay|baybay|bye|bye bye|byebye|goodbye|good bye|godbye|god bye|see you|see ya|se you|se ya|cya|later|laters|gotta go|gota go|ttyl|kactim|ben kacar|cikiyorum)\b/],
  ["how_are_you", /\b(nasilsin|nasilsiniz|nasilsn|naber|nbr|ne haber|ne var ne yok|iyi misin|keyifler nasil|how are you|how are u|how r u|hows it going|how is it going|whats up|wassup|sup|how do you do|how have you been|hows your day|how is your day|you good)\b/],
  ["thanks", /\b(tesekk?ur\w*|tsk|tskler|sag ol|sagol|sagolun|sag olun|eyvallah|eyv|thanks|thank you|thank u|thanx|thx|ty|tysm|cheers|chers|much appreciated)\b/],
  ["sorry", /\b(ozur dilerim|ozur|ozr|pardon|kusura bakma|affedersin|affet beni|sorry|sory|my bad|apologies|i apologize|excuse me|forgive me|oops)\b/],
  ["love", /\b(seni seviyorum|seviyorum seni|seni cok seviyorum|seni sevdim|asigim sana|sana asigim|i love you|love you|luv you|ily|i like you|i adore you|iyi ki varsin|iyiki varsin|yerim seni|seni yerim)\b/],
  // FB4-10 iltifat (sevgiden sonra: "seni seviyorum" love'da kalır)
  [
    "compliment",
    /\b(ne guzel olmus|ne guzel|cok iyi olmus|guzel olmus|cok guzel olmus|adamsin|ne komiksin|cok tatlisin|tatlisin|tatli sey|harikasin|mukemmelsin|supersin|muhtesemsin|efsanesin|kralsin|kralicesin|en iyisisin|en iyisi sensin|cok iyisin|akillisin|zekisin|cok zekisin|yakisiklisin|guzelsin|cok guzelsin|sekersin|bir tanesin|birtanesin|canimsin|komiksin|cok komiksin|eglencelisin|sevimlisin|cok sevimlisin|aferin sana|aferin|bravo|helal olsun|helal|tebrikler|seninle gurur duyuyorum|you are awesome|youre awesome|you are amazing|youre amazing|you are great|youre great|you are the best|youre the best|you are cute|youre cute|so cute|you are smart|youre smart|so smart|you are funny|youre funny|you rock|you are cool|youre cool|good job|well done|nice work|great job|proud of you|legend)\b/,
  ],
  ["bored", /\b(sikildim|sikiliyorum|canim sikildi|canim sikiliyor|bunaldim|im bored|i am bored|so bored|bored|boring)\b/],
  ["hungry", /\b(aciktim|acim|karnim ac|karnim acikti|acliktan|im hungry|i am hungry|so hungry|hungry|starving|famished)\b/],
  ["tired", /\b(yoruldum|yorgunum|bittim|uykum var|uykum geldi|im tired|i am tired|so tired|tired|exhausted|sleepy|slepy|worn out)\b/],
];

/** düz selam (tek başına "selam", "hi") */
const GREET_WORD = set(
  "selam",
  "slm",
  "merhaba",
  "merhabalar",
  "mrb",
  "meraba",
  "selamlar",
  "hey",
  "hi",
  "hello",
  "helo",
  "yo",
  "hiya",
  "howdy",
  "heyo",
  "selamunaleykum",
  "sa",
  "greetings",
);

// --- hakaret (sadece algılama; cevap marka sesinde) ---
const INSULT_STEMS = [
  "aptal",
  "salak",
  "gerizekali",
  "geri zekali",
  "beyinsiz",
  "ahmak",
  "dangalak",
  "mal misin",
  "malsin",
  "embesil",
  "ise yaramaz",
  "isa yaramaz",
  "kafasiz",
  "stupid",
  "idiot",
  "dumb",
  "moron",
  "useless",
  "loser",
  "shut up",
  "you suck",
  "youre trash",
  "you re trash",
  "ur trash",
  "shut the",
  "dumbass",
  "pathetic",
  "worthless",
  "brainless",
];
/** FB4-9 §32-33: hakaretin hedefi ve şiddeti (sen mi, üçüncü kişi mi; hafif mi ağır mı) */
const THIRD_INSULT = /\b(bu|o|su|adam|herif|tip|eleman|hoca|patron|mudur)\s+(adam\s+|herif\s+|tip\s+|eleman\s+)?(cok\s+)?(mal|salak|aptal|gerizekali|geri zekali|ahmak|dangalak)\b|\b(he|she|they)\s+(is|are|s)\s+(so\s+)?(dumb|stupid|an idiot|useless)\b/;
const SECOND_PERSON = /\b(sen|seni|sana|senin|you|u|ur|youre)\b|\w(sin|sun|misin|musun)\b/;
const STRONG_INSULT = /\b(beyinsiz|dangalak|embesil|worthless|brainless|dumbass)/;
/** "ya mal", "mal" tek başına: Dunno'ya hafif/şakacı hakaret */
const PLAIN_MAL = /^(ya |olm |oglum |lan )?mal$/;

/** tek başına küfür/dolgu: başka soru tipi yoksa hakaret sayılır ("paris nerede aq" -> where) */
const CURSE = /\b(aq|amk|amq|siktir|sikerim|fuck|fucking|wtf|stfu|shit)\b/;
const INSULT = new RegExp(String.raw`\b(?:${INSULT_STEMS.map((s) => s.replace(/ /g, "\\s+")).join("|")})`);

// --- tavsiye ---
const ADVICE =
  /\b(ne yapayim|ne yapmaliyim|ne yapsam|ne yapmam lazim|ne yapmam gerek|napayim|napsam|napmaliyim|ne onerirsin|onerir misin|onerin|tavsiye|ne dersin|sence\b.*\b(mi|mu|misin|musun)\b|hangisini (secsem|seceyim|almaliyim|alayim|alsam)|hangisini sec|yoksa\b.*\b(mi|mu)\b|what should|what do you recommend|do you recommend|would you recommend|any advice|advice|what would you do|recommend me|which one should|is it better to|what do you suggest|suggest)\b/;

// --- zaman ---
const WHEN = /\b(ne zaman|ne zamandir|ne zamana|ne zamandan|kacta|kacda|saat kac|saat kacta|hangi (gun|yil|yilda|ay|ayda|saat|saatte|tarih|tarihte|gunde|donem|donemde|yuzyil|yuzyilda)|when|whens|what time|what year|what day|what date|which year|which day|how soon|until when)\b/;

// --- sıra (kaçıncı), sayı/miktar ---
const ORDINAL = /\b(kacinci|kacincisin|kacinciyim|kacincidir|kacinci sirada|kacincisiniz|what place|which place|what rank|what position|which position|what number am i|whats my rank|which rank)\b/;
const HOW_MANY = /\b(kac|kaci|kactir|kacti|kac tane|kac kisi|kac yil|kac yasinda|kac para|kac lira|kac km|ne kadar|ne kadardir|how many|how much|how old|how long|how far|how big|how tall|how heavy|how often|what percentage|what number)\b/;

// --- kişi: alt tipler önce ---
const FROM_WHOM_TR = /^kim(den|lerden)(di|dir|mis)?$/;
const FROM_WHOM_EN = /\b(from whom|who sent|whos? .*\bfrom$)\b/;
const TO_WHOM_TR = /^kim(e|lere)(dir|ydi|ymis)?$/;
const TO_WHOM_EN = /\b(to whom|for whom|who should i (give|send|tell|ask)|whos? .*\b(to|for)$)\b/;
const WHOSE_TR = /^kim(in|inki|inkidir|indir|indi|lerin)$/;
const WITH_WHOM_TR = /^kim(le|inle|lerle|leydi|lesin)$/;
const WITH_WHOM_EN = /\b(with whom|who with|whos? .*\bwith$)\b/;
// "kimse" (hiç kimse), "kimya" bilerek yok
const WHO_TR = /^kim(dir|di|diydi|dirler|i|ler|leri|lerdir|lerdi|mis|misti|sin|siniz|im|iz|dim)?$/;
const WHO_EN = set("who", "whom", "whos");

// --- yer: alt tipler önce ---
const FROM_WHERE_TR = /^(nere?den(sin|siniz|dir|di|mis)?|nereli(sin|siniz|dir|yim|ydi)?)$/;
const FROM_WHERE_EN = /\b(where from|from where|wheres? .*\bfrom$|where did you get|where do you come from)\b/;
const TO_WHERE_TR = /^(nereye(dir|ydi|sin)?|nere|nereyi)$/;
const TO_WHERE_EN = /\b(where to|where are you going|where are we going|wheres? .*\bgoing\b|where should i go|where do you go|where are we headed|where are you headed)\b/;
// nerede/nerde, neresi + kişi/ek-fiil ekleri
const WHERE_TR = /^ner(e?de|esi|esidir|elere|elerde|ede?ki|desi|esinde)(sin|siniz|yim|yiz|dir|ydi|ymis|ler)?$/;
const WHERE_PHRASE = /\b(hangi (ulke|ulkede|sehir|sehirde|sehirdedir|kita|kitada|yer|yerde|semt|ilce)|where|wheres|what country|which country|what city|which city|what place|which planet|what continent)\b/;

// --- amaç / neden ---
const WHAT_FOR = /\b(ne icin|ne ise yarar|ne ise yariyor|neye yarar|neye yariyor|what for|for what(?! reason)|what is (it|this|that) for|whats (it|this|that) for|what does (it|this|that) do)\b/;
const WHY = /\b(neden|nedeni|niye|nicin|ne diye|sebebi|sebep ne|why|whys|how come|for what reason|what is the reason|whats the reason)\b/;

// --- araç / nasıl ---
const WITH_WHAT = /\b(neyle|ne ile|neyleydi|nesiyle|with what|using what|what with)\b/;
const HOW = /\b(nasil|nasildir|nasil yapilir|nasil olur|nasil oldu|ne sekilde|hangi yolla|how|hows)\b/;

// --- hangisi / ne ---
const WHICH_TR = set("hangi", "hangisi", "hangisini", "hangisinde", "hangileri", "hangilerini", "hangisidir", "hangisiydi");
const WHICH_EN = /\b(which|whichever)\b/;
const WHAT_TR = set("ne", "nedir", "neydi", "neler", "nelerdir", "neyi", "neyin", "nesi", "nesidir", "neymis", "nedirki");
const WHAT_PHRASE = /\b(ne demek|ne anlama|anlami ne|manasi ne|tanimi|what|whats|define|definition of|meaning of|what does .* mean)\b/;

// --- evet/hayır ---
const YN_TR = /^m[iu](s[iu]n|s[iu]n[iu]z|y[iu]m|y[iu]z|d[iu]r|yd[iu]|ym[iu]s|s[iu]nd[iu]r|yd[iu]n)?$/;
const YN_TR_ATTACHED = /..m[iu]s[iu]n$|..m[iu]y[iu]m$|..m[iu]d[iu]r$/;
const YN_EN = set(
  "is",
  "are",
  "am",
  "was",
  "were",
  "do",
  "does",
  "did",
  "can",
  "could",
  "will",
  "would",
  "have",
  "has",
  "had",
  "may",
  "might",
  "must",
  "isn",
  "aren",
  "don",
  "doesn",
  "didn",
  "won",
  "wouldn",
  "couldn",
  "haven",
  "hasn",
  "wasn",
  "weren",
  "cant",
  "dont",
  "doesnt",
  "isnt",
  "arent",
  "wont",
  "wouldnt",
);

/** Gerçek soru tipleri (sosyal öbekler hariç). Bulamazsa "other". */
function questionType(joined: string, ws: string[]): QType {
  if (THIRD_INSULT.test(joined) && !SECOND_PERSON.test(joined)) return "third_person";
  if (INSULT.test(joined) || PLAIN_MAL.test(joined)) {
    if (STRONG_INSULT.test(joined) || CURSE.test(joined)) return "insult_strong";
    return "insult";
  }
  // "should i ..." sadece cümle başında tavsiye ("how much water should i drink" -> how_many)
  if (ADVICE.test(joined) || ((ws[0] === "should" || ws[0] === "shall") && /^(i|we)$/.test(ws[1] ?? ""))) return "advice";
  if (WHEN.test(joined)) return "when";
  if (ORDINAL.test(joined)) return "ordinal";
  if (HOW_MANY.test(joined)) return "how_many";
  if (ws.some((w) => FROM_WHOM_TR.test(w)) || FROM_WHOM_EN.test(joined)) return "from_whom";
  if (ws.some((w) => TO_WHOM_TR.test(w)) || TO_WHOM_EN.test(joined)) return "to_whom";
  if (ws.some((w) => WHOSE_TR.test(w)) || ws.includes("whose")) return "whose";
  if (ws.some((w) => WITH_WHOM_TR.test(w)) || WITH_WHOM_EN.test(joined)) return "with_whom";
  if (ws.some((w) => WHO_TR.test(w)) || any(ws, WHO_EN)) return "who";
  if (ws.some((w) => FROM_WHERE_TR.test(w)) || FROM_WHERE_EN.test(joined)) return "from_where";
  if (ws.some((w) => TO_WHERE_TR.test(w)) || TO_WHERE_EN.test(joined)) return "to_where";
  if (ws.some((w) => WHERE_TR.test(w)) || WHERE_PHRASE.test(joined)) return "where";
  if (WHAT_FOR.test(joined)) return "what_for";
  if (WHY.test(joined)) return "why";
  if (WITH_WHAT.test(joined)) return "with_what";
  if (HOW.test(joined)) return "how";
  if (any(ws, WHICH_TR) || WHICH_EN.test(joined)) return "which";
  if (any(ws, WHAT_TR) || WHAT_PHRASE.test(joined)) return "what";
  if (CURSE.test(joined)) return "insult";
  if (ws.some((w) => YN_TR.test(w) || YN_TR_ATTACHED.test(w)) || YN_EN.has(ws[0])) return "yes_no";
  if (GREET_WORD.has(ws[0])) return "greeting";
  return "other";
}

/** FB4-9 §27: kısa emir ("bi sus", "gel buraya", "dans et"); uzun cümlede emir kelimesi soru tipini ezmez */
const COMMAND = /^(bi |biraz |hadi |hade )?(sus|sussana|gel|gel buraya|buraya gel|git|dans et|zipla|otur|kalk|uyu|uyuma|uyan|konus|konussana|hareket et|bak|bana bak|suna bak|dur|bekle|come here|dance|jump|sit|sit down|go to sleep|wake up|go away|move|stop|talk to me|look at me|wait)( bakalim| lan| ya| olm)?$/;
/** FB4-9 §51: klavye karalaması ("skfjdkd", "asdasd"): ünlüsüz ya da klavye sırası */
export function isGibberish(ws: readonly string[]): boolean {
  if (ws.length === 0 || ws.length > 2) return false;
  return ws.every((w) => {
    if (w.length < 4 || /\d/.test(w)) return false;
    const vowels = (w.match(/[aeiou]/g) ?? []).length;
    return vowels / w.length < 0.2 || /(asd|sdf|dfg|qwe|wer|zxc|jkl|hjk|ghj)/.test(w);
  });
}

function classifyNormalized(s: string): QType {
  const ws = words(s);
  if (ws.length === 0) return "other";
  const joined = ws.join(" ");
  if (MATH.test(s)) return "math";
  if (COMMAND.test(joined)) return "command";
  for (const [type, re] of SOCIAL) {
    if (!re.test(joined)) continue;
    // "günaydın, paris nerede" -> where: öbek çıkarılınca gerçek bir soru kalıyorsa o kazanır
    const rest = joined.replace(new RegExp(re.source, "g"), " ");
    // FB4-9 §38: küfür niyetten ayrı ("anlamadım aq" -> confusion, hakaret değil)
    const restWords = words(rest.replace(new RegExp(CURSE.source, "g"), " "));
    const q = questionType(restWords.join(" "), restWords);
    return q === "other" || q === "yes_no" || q === "greeting" ? type : q;
  }
  return questionType(joined, ws);
}

/** Soru metni -> tip. Boş ya da tanınmayan -> "other". */
export function classify(text: string): QType {
  const s = fold(text).replace(/['’`]/g, "").replace(/\s+/g, " ").trim();
  if (!s) return "other";
  const first = classifyNormalized(squeeze(s, 2));
  if (first !== "other") return first;
  // yazım toleransı: "nereyeee", "günaydınnn", "thanksss"
  const loose = squeeze(s, 1);
  const second = loose === squeeze(s, 2) ? first : classifyNormalized(loose);
  // FB4-9 §51: tanınmayan karalama ("skfjdkd") ayrı (yazım toleransından sonra: "thanksss" teşekkür kalır)
  return second === "other" && isGibberish(words(s)) ? "gibberish" : second;
}

// ---------------------------------------------------------------- yasak konu (SPEC 06 Q2d)
// Tek kaynak content/pool/banned_<lang>.txt (worker FORBIDDEN_WORDS ile aynı; pool:sync assets'e kopyalar).
// Soru yerelde havuzdan cevaplanırken yasak konuya hiç girilmez: çağıran omuz silker.

export interface BannedLists {
  tr: readonly string[];
  en: readonly string[];
}

/** banned_<lang>.txt: satır başına bir girdi, `#` yorum; `kök*` önek, diğerleri tam kelime (çok kelimeli olabilir). */
export function parseBannedList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/#.*$/, "").trim())
    .filter((l) => l !== "");
}

/**
 * Türkçe tam kelime girdilerine eklenebilecek ekler (hal, iyelik, çoğul): "din" -> "dinde", "dine", "dinin".
 * "le/la" bilerek yok ("dinle" = listen). 3 harften kısa girdilere ek uygulanmaz ("oy" -> "oyun" olmasın).
 */
const TR_SUFFIXES =
  "(?:i|ı|u|ü|e|a|yi|yı|yu|yü|ye|ya|de|da|te|ta|den|dan|ten|tan|in|ın|un|ün|nin|nın|nun|nün|ler|lar|leri|ları|lerin|ların|lerde|larda|im|ım|imiz|ımız|iniz|ınız|ine|ına|inde|ında|inden|ından|ini|ını|si|sı|sine|sına|sini|sını)?";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Yasak liste -> metin testi (saf; testte özel liste verilebilir). */
export function forbiddenMatcher(lists: BannedLists): (text: string) => boolean {
  const build = (entries: readonly string[], lang: "tr" | "en") =>
    entries.map((raw) => {
      const e = raw.toLocaleLowerCase(lang);
      const prefix = e.endsWith("*");
      // çok kelimeli girdiler: metin kelimeleri tek boşlukla birleştirildiği için doğrudan eşleşir
      const stem = escapeRe(prefix ? e.slice(0, -1) : e);
      const tail = prefix ? "" : lang === "tr" && e.length >= 3 && !e.includes(" ") ? `${TR_SUFFIXES} ` : " ";
      return new RegExp(` ${stem}${tail}`, "u");
    });
  const tr = build(lists.tr, "tr");
  const en = build(lists.en, "en");
  const hay = (text: string, lang: "tr" | "en") =>
    ` ${text.toLocaleLowerCase(lang).split(/[^\p{L}\p{N}-]+/u).filter(Boolean).join(" ")} `;
  return (text) => {
    const t = hay(text, "tr");
    const e = hay(text, "en");
    // iki dilin listesi de taranır (karışık yazım), her biri kendi küçük harf kuralıyla
    return tr.some((r) => r.test(t)) || en.some((r) => r.test(e)) || tr.some((r) => r.test(e)) || en.some((r) => r.test(t));
  };
}

// ---------------------------------------------------------------- siyaset / seçim (FB4-1, kullanıcı kararı 2026-10-07)
// "dede X konya'yı kazanmış" gibi seçim/siyaset sorusu: cevap her zaman "ne diin la" (bilgi yok, yorum yok, taraf yok).
// Gerçek kişi adı listelenmez (CLAUDE.md): il + kazan/kaybet kalıbı ve siyaset kelimeleri yakalar. Diğer yasak konular omuz silker.

/** 81 il (katlanmış: ç ğ ı ö ş ü -> c g i o s u) */
const PROVINCES =
  "adana adiyaman afyon afyonkarahisar agri amasya ankara antalya artvin aydin balikesir bilecik bingol bitlis bolu burdur bursa canakkale cankiri corum denizli diyarbakir edirne elazig erzincan erzurum eskisehir gaziantep giresun gumushane hakkari hatay isparta mersin istanbul izmir kars kastamonu kayseri kirklareli kirsehir kocaeli konya kutahya malatya manisa kahramanmaras mardin mugla mus nevsehir nigde ordu rize sakarya samsun siirt sinop sivas tekirdag tokat trabzon tunceli sanliurfa usak van yozgat zonguldak aksaray bayburt karaman kirikkale batman sirnak bartin ardahan igdir yalova karabuk kilis osmaniye duzce";
const ELECTION = new RegExp(
  String.raw`\b(?:${PROVINCES.split(" ").join("|")})(?:y?[iu]|da|de|ta|te)?\s+(?:\w+\s+)?(?:kazan|kaybet|aldi|almis|alacak|aliyor)`,
);
const POLITICS = new RegExp(
  String.raw`\b(?:siyaset\w*|siyasi\w*|politik\w*|politic\w*|parti\w*|secim\w*|cumhurbaskan\w*|basbakan\w*|hukumet\w*|meclis\w*|milletvekil\w*|bakan|bakani|aday\w*|belediye baskan\w*|muhalefet\w*|iktidar\w*|chp|akp|ak parti|mhp|hdp|dem parti|iyi parti|election\w*|elected|president\w*|prime minister|parliament\w*|senator\w*|vote|votes|voted|voting|campaign)\b`,
);

/** Soru siyaset / seçim mi (ne diin la). */
export function isPolitical(text: string): boolean {
  const s = fold(text).replace(/['’`]/g, "").replace(/\s+/g, " ");
  return ELECTION.test(s) || POLITICS.test(s);
}

/** Siyaset/seçim cevabı (kullanıcı kararı; iki modda da aynı). */
export const POLITICS_ANSWER: Readonly<Record<"tr" | "en", string>> = { tr: "ne diin la", en: "say what now" };

/** Yasak konuda cevap: omuz silkme (worker DODGE_ANSWER ile aynı metin; test kontrol eder). */
export const DODGE: Readonly<Record<"tr" | "en", string>> = { tr: "*omuz silker*", en: "*shrugs*" };

let defaultMatcher: ((text: string) => boolean) | null = null;

/** Soru yasak konuya giriyor mu (din, siyaset, sağlık, ölüm, ... content/pool/banned_*.txt). */
export function isForbidden(text: string): boolean {
  defaultMatcher ??= forbiddenMatcher({ tr: parseBannedList(bannedTr), en: parseBannedList(bannedEn) });
  return defaultMatcher(text);
}
