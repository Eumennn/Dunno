// SPEC 06 Q1: tip başına ≥10 TR + ≥10 EN örnek; Türkçe ek varyasyonları ve Türkçe klavyesiz yazım dahil.
import { describe, expect, it } from "vitest";
import workerPrompt from "../../../worker/src/lib/prompt.ts?raw";
import inverseMd from "../../../content/pool/inverse.md?raw";
import { answerType, classify, DODGE, fold, forbiddenMatcher, INVERSE, isForbidden, QTYPES, squeeze, type QType } from "./classify";

/** follow_up classify'dan değil talker'dan gelir (cevaptan hemen sonra; talk/followup.ts) */
const TABLE: Record<Exclude<QType, "follow_up">, { tr: string[]; en: string[] }> = {
  who: {
    tr: [
      "atatürk kimdir",
      "bu kim",
      "o kimdi ya",
      "sen kimsin",
      "dünyanın en zengini kim",
      "ampulü kim icat etti",
      "kazananlar kimlerdi",
      "Bu şarkıyı KİM söylüyor",
      "kapıdaki kim",
      "bunu kim yaptı",
      "kimi arıyorsun",
    ],
    en: [
      "who is the president",
      "who are you",
      "who invented the light bulb",
      "Who's that",
      "who wrote hamlet",
      "who won the game",
      "who's your creator",
      "who was the first person on the moon",
      "who made this",
      "whom did you call",
    ],
  },
  where: {
    tr: [
      "paris nerede",
      "nerdesin",
      "neredesin şu an",
      "neresi burası",
      "anahtarım nerede acaba",
      "hangi ülkede yaşıyorsun",
      "everest hangi kıtada",
      "en yakın eczane nerde",
      "telefonum nerde",
      "evin neresi",
    ],
    en: [
      "where is paris",
      "where are you",
      "where do you live",
      "Where's my phone",
      "where did i leave my keys",
      "what country is this",
      "which city is the capital of turkey",
      "where should the meeting be",
      "where were you born",
      "where can i find water",
    ],
  },
  when: {
    tr: [
      "ne zaman gelirsin",
      "toplantı kaçta",
      "saat kaç",
      "film kaçta başlıyor",
      "istanbul ne zaman fethedildi",
      "hangi yılda doğdun",
      "maç hangi gün",
      "tatil ne zamandır",
      "doğum günün ne zaman",
      "ne zamandan beri buradasın",
      "otobüs kacta kalkar",
    ],
    en: [
      "when is the meeting",
      "what time is it",
      "when did ww2 end",
      "when are you coming",
      "what year is it",
      "which day is the party",
      "what time does the store open",
      "When's lunch",
      "when was the internet invented",
      "until when is this open",
    ],
  },
  why: {
    tr: [
      "neden",
      "neden gökyüzü mavi",
      "niye böyle oldu",
      "niçin uyumuyorsun",
      "neden hep ben",
      "niye cevap vermiyorsun",
      "bunun sebebi ne",
      "ne diye geldin",
      "neden kediler mırlar",
      "niye bu kadar yavaşsın",
    ],
    en: [
      "why",
      "why is the sky blue",
      "why are you like this",
      "how come you never answer",
      "why do cats purr",
      "why did it break",
      "why not",
      "for what reason did you do that",
      "why does my code not work",
      "what is the reason",
    ],
  },
  how: {
    tr: [
      "nasıl",
      "nasıl yapılır",
      "kek nasıl pişirilir",
      "bunu nasıl açarım",
      "nasil kod yazilir",
      "excel'de toplama nasıl",
      "nasıl oldu bu",
      "uçaklar nasıl uçar",
      "bu iş ne şekilde biter",
      "şifremi nasıl değiştiririm",
    ],
    en: [
      "how",
      "how do i cook rice",
      "how does a plane fly",
      "how to center a div",
      "how did you do that",
      "how can i change my password",
      "How do magnets work",
      "how is cheese made",
      "how should i say this",
      "how do you open this",
    ],
  },
  how_many: {
    tr: [
      "kaç yaşındasın",
      "dünyada kaç ülke var",
      "kaç tane kedin var",
      "bu kaç lira",
      "ne kadar sürer",
      "ankara istanbul kaç km",
      "kaç kişi geldi",
      "fiyatı ne kadar",
      "bir yıl kaç gün",
      "bu kaçtır",
    ],
    en: [
      "how many countries are there",
      "how much is this",
      "how old are you",
      "how long does it take",
      "how far is the moon",
      "how many legs does a spider have",
      "how tall is the eiffel tower",
      "how much water should i drink a day",
      "how often do you sleep",
      "how big is the sun",
    ],
  },
  what: {
    tr: [
      "bu ne",
      "fotosentez nedir",
      "adın ne",
      "ne yiyorsun",
      "hayatın anlamı nedir",
      "kuantum ne demek",
      "dün ne vardı",
      "bunun anlamı ne",
      "çantada neler var",
      "elinde ne var",
    ],
    en: [
      "what is this",
      "what's your name",
      "what is photosynthesis",
      "what does lol mean",
      "define entropy",
      "what are you eating",
      "what was that yesterday",
      "what is the meaning of life",
      "whats your favorite color",
      "what's in the box",
    ],
  },
  yes_no: {
    tr: [
      "yarın yağmur yağacak mı",
      "bu doğru mu",
      "sen robot musun",
      "uyuyor musun",
      "yapabilir misin",
      "dünya düz mü",
      "aç mısın",
      "gelecek misiniz",
      "bunu biliyor muydun",
      "bu iyi değil mi",
      "gelirmisin",
    ],
    en: [
      "is the earth flat",
      "are you a robot",
      "can you swim",
      "will it rain tomorrow",
      "did you sleep",
      "does pineapple belong on pizza",
      "Is this true",
      "have you eaten",
      "could you do it",
      "isn't it late",
    ],
  },
  math: {
    tr: [
      "2+2",
      "2 + 2 kaç",
      "5 çarpı 3 kaç eder",
      "10 bölü 2",
      "7 artı 8 nedir",
      "100 eksi 37 kaç",
      "16'nın karekökü",
      "12*12",
      "3 x 4 kaç",
      "9'un karesi nedir",
      "45/9 kaç eder",
    ],
    en: [
      "what is 2+2",
      "5 times 3",
      "10 divided by 2",
      "7 plus 8",
      "100 minus 37",
      "square root of 16",
      "12 * 12",
      "how much is 3 x 4",
      "9 squared",
      "what's 45/9",
    ],
  },
  advice: {
    tr: [
      "ne yapayım",
      "ne yapmalıyım",
      "sence gideyim mi",
      "bana bir tavsiye ver",
      "hangisini seçeyim",
      "ne önerirsin",
      "çay mı kahve mi içsem yoksa su mu",
      "napsam bugün",
      "bir film önerir misin",
      "ne dersin, bırakayım mı",
    ],
    en: [
      "should i quit my job",
      "what should i eat",
      "do you recommend this",
      "any advice",
      "should we go",
      "what would you do",
      "which one should i buy",
      "can you suggest a movie",
      "is it better to rent or buy",
      "what do you suggest",
    ],
  },
  greeting: {
    tr: ["selam", "merhaba", "mrb", "slm", "selam dunno", "Merhabalar", "meraba", "selamlar", "sa", "hey dunno"],
    en: ["hi", "hello", "hey", "hey there", "yo", "hello dunno", "hiya", "howdy", "greetings", "heyo"],
  },
  insult: {
    tr: [
      "aptal",
      "salaksın",
      "sen çok aptalsın",
      "gerizekalı mısın",
      "işe yaramazsın",
      "aptal şey",
      "mal mısın",
      "ne kadar salak bir cevap",
      "ahmak",
      "siktir git",
      "ahmak",
    ],
    en: [
      "you are stupid",
      "idiot",
      "you're useless",
      "shut up",
      "you suck",
      "dumb bot",
      "what a moron",
      "you're trash",
      "loser",
      "this is pathetic",
    ],
  },
  from_where: {
    tr: [
      "nereden geldin",
      "nerden buldun bunu",
      "nerelisin",
      "bu ses nereden geliyor",
      "nerdensin",
      "neredensin",
      "bunu nereden aldın",
      "aslen nerelisiniz",
      "nereden çıktı bu",
      "bu bilgi nerden",
      "NEREDEN",
    ],
    en: [
      "where are you from",
      "where did you come from",
      "where is this from",
      "from where",
      "where do you come from",
      "where did you get that",
      "where's that noise coming from",
      "where are they from",
      "where did this come from",
      "where from",
    ],
  },
  to_where: {
    tr: [
      "nereye gidiyoruz",
      "nereye",
      "nere gidiyon",
      "bu yol nereye çıkıyor",
      "tatile nereye gidelim",
      "nereye koydun",
      "nereye kaçıyorsun",
      "nereyeee",
      "şimdi nereye",
      "otobüs nereye gidiyor",
    ],
    en: [
      "where to",
      "where are you going",
      "where are we going",
      "where should i go",
      "where do you go at night",
      "where are we headed",
      "where's this bus going",
      "where are you headed",
      "where to next",
      "where is everyone going",
    ],
  },
  to_whom: {
    tr: [
      "kime",
      "bunu kime sordun",
      "kime vereyim",
      "mesajı kime attın",
      "bu hediye kime",
      "kime oy vereyim yok vazgeçtim kime yazayım",
      "kime gidiyorsun",
      "kime benziyorsun",
      "paketi kime bırakayım",
      "kime söyleyeyim",
    ],
    en: [
      "to whom",
      "who is this for",
      "who should i give this to",
      "who should i send it to",
      "to whom should i send it",
      "who should i tell",
      "for whom",
      "who did you write to",
      "who are these flowers for",
      "who should i ask",
    ],
  },
  from_whom: {
    tr: [
      "kimden",
      "bu mesaj kimden",
      "kimden aldin bunu",
      "hediye kimdendi",
      "kimden duydun",
      "bu çiçekler kimden",
      "kimden öğrendin",
      "mektup kimdenmiş",
      "kimden kaçıyorsun",
      "bu not kimden",
    ],
    en: [
      "from whom",
      "who is this from",
      "who sent this",
      "who sent you",
      "who did you hear it from",
      "who's the letter from",
      "who did you get it from",
      "who are the flowers from",
      "from whom did you learn",
      "who was that message from",
    ],
  },
  whose: {
    tr: [
      "kimin",
      "kimin telefonu bu",
      "bu kimin",
      "bu çanta kiminki",
      "kimin fikriydi bu",
      "kimin sırası",
      "bu araba kimin",
      "kimin hatası",
      "kimindir bu",
      "bu ses kimin",
    ],
    en: [
      "whose phone is this",
      "whose is this",
      "whose turn is it",
      "whose idea was this",
      "whose bag is that",
      "whose fault is it",
      "whose car is this",
      "whose voice is that",
      "whose",
      "whose side are you on",
    ],
  },
  with_whom: {
    tr: [
      "kimle konuşuyorum",
      "kimle",
      "kiminle gidiyorsun",
      "kimle yaşıyorsun",
      "kimlerle takılıyorsun",
      "dün kimleydi",
      "kimle evleneyim",
      "kimle oynayalım",
      "kiminle konuştun",
      "tatile kimle gidelim",
    ],
    en: [
      "with whom",
      "who are you with",
      "who did you go with",
      "who do you live with",
      "who should i go with",
      "who was she with",
      "who are we playing with",
      "who did you talk with",
      "with whom do you work",
      "who with",
    ],
  },
  with_what: {
    tr: [
      "neyle",
      "neyle gideyim",
      "ne ile yapılır",
      "neyle çalışıyorsun",
      "bunu neyle açarım",
      "neyle yesem",
      "ne ile ödeyeyim",
      "neyle boyayayım",
      "kek neyle yapılır",
      "neyle geldin",
    ],
    en: [
      "with what",
      "using what",
      "with what do i pay",
      "what with",
      "with what did you make this",
      "using what tool",
      "with what do you clean it",
      "with what money",
      "with what do i open it",
      "using what language",
    ],
  },
  what_for: {
    tr: [
      "ne için",
      "bu ne için var",
      "ne işe yarar",
      "bu düğme neye yarar",
      "ne için geldin",
      "bunu ne için yaptın",
      "bu uygulama ne işe yarıyor",
      "ne icin",
      "o kablo neye yarıyor",
      "para ne için",
    ],
    en: [
      "what for",
      "what is it for",
      "what is this for",
      "what's that for",
      "for what",
      "what does this do",
      "what does that do",
      "what's it for",
      "and that is for what",
      "what is that for",
    ],
  },
  which: {
    tr: [
      "hangisi daha iyi",
      "en sevdiğin renk hangisi",
      "hangi",
      "hangisi",
      "hangi film güzel",
      "hangi takım kazanır",
      "hangisini beğendin",
      "hangileri doğru",
      "hangi dil daha kolay",
      "hangisinde kalayım",
    ],
    en: [
      "which one is better",
      "which",
      "which is faster",
      "which color do you like",
      "which team will win",
      "which movie is good",
      "which language is easier",
      "which one",
      "which of these",
      "whichever",
    ],
  },
  ordinal: {
    tr: [
      "kaçıncı oldun",
      "kaçıncı",
      "kaçıncı sıradayım",
      "kaçıncısın",
      "yarışta kaçıncı geldin",
      "kaçıncı kattasın",
      "bu kaçıncı",
      "kaçıncı sınıftasın",
      "kaçıncı kez söylüyorum",
      "kacinci oldum",
    ],
    en: [
      "what place did you get",
      "which place am i in",
      "what rank am i",
      "what position are we in",
      "what number am i in line",
      "whats my rank",
      "which position did you finish",
      "what place",
      "which rank is this",
      "what place did we come",
    ],
  },
  how_are_you: {
    tr: [
      "nasılsın",
      "naber",
      "ne haber",
      "slm nasılsın",
      "nasılsınız",
      "naber dostum",
      "iyi misin",
      "ne var ne yok",
      "keyifler nasıl",
      "nasilsinnn",
    ],
    en: [
      "how are you",
      "what's up",
      "how's it going",
      "how r u",
      "how have you been",
      "sup",
      "how is your day",
      "wassup",
      "how do you do",
      "you good",
    ],
  },
  good_morning: {
    tr: ["günaydın", "gunaydin", "günaydınnn", "Günaydın dunno", "günaydınlar", "gunaydinnnn", "günaydın canım", "herkese günaydın", "günaydın efendim", "günaydn"],
    en: ["good morning", "morning", "goood morning", "gm", "good morning dunno", "morning dunno", "mornin", "good morning to you", "GOOD MORNING", "a very good morning"],
  },
  good_afternoon: {
    tr: ["tünaydın", "tunaydin", "iyi günler", "tünaydınnn", "tünaydınlar", "iyi günler dunno", "tünaydın efendim", "herkese iyi günler", "tunaydinn", "TÜNAYDIN"],
    en: ["good afternoon", "afternoon", "good afternoon dunno", "a good afternoon to you", "goood afternoon", "afternoon dunno", "GOOD AFTERNOON", "good afternoon there", "afternoon all", "good afternoon friend"],
  },
  good_evening: {
    tr: ["iyi akşamlar", "iyi aksamlar", "hayırlı akşamlar", "iyi akşamlar dunno", "herkese iyi akşamlar", "iyi akşamlarrr", "İYİ AKŞAMLAR", "iyi akşamlar efendim", "iyi aksamlarr", "size iyi akşamlar"],
    en: ["good evening", "evening", "good evening dunno", "goood evening", "evening dunno", "GOOD EVENING", "good evening to you", "good evening friend", "evening all", "a good evening"],
  },
  good_night: {
    tr: ["iyi geceler", "iyi uykular", "tatlı rüyalar", "iyi geceler dunno", "iyi gecelerrr", "hayırlı geceler", "iyi geceler, ben yatıyorum", "herkese iyi geceler", "İYİ GECELER", "iyi gecelerr"],
    en: ["good night", "goodnight", "gn", "night night", "sweet dreams", "nighty night", "good night dunno", "gnight", "good niiight", "GOOD NIGHT"],
  },
  thanks: {
    tr: ["teşekkürler", "teşekkür ederim", "sağ ol", "sağol", "eyvallah", "tşk", "çok teşekkürler", "tesekkurler", "sağolun", "teşekkürlerrr"],
    en: ["thanks", "thank you", "thx", "ty", "thanks a lot", "thank u", "cheers", "much appreciated", "thanksss", "tysm"],
  },
  sorry: {
    tr: ["özür dilerim", "pardon", "kusura bakma", "affedersin", "özür", "çok özür dilerim", "pardonnn", "kusura bakma ya", "affet beni", "ozur dilerim"],
    en: ["sorry", "i'm sorry", "my bad", "apologies", "excuse me", "forgive me", "oops sorry", "sorryyy", "i apologize", "so sorry"],
  },
  bye: {
    tr: ["görüşürüz", "bay bay", "hoşça kal", "güle güle", "kaçtım", "sonra görüşürüz", "görüşmek üzere", "gorusuruz", "bye dunno", "ben çıkıyorum"],
    en: ["bye", "goodbye", "see you", "see ya", "cya", "gotta go", "bye bye", "later", "ttyl", "byeee"],
  },
  love: {
    tr: ["seni seviyorum", "seviyorum seni", "seni çok seviyorum", "sana aşığım", "seni sevdim", "dunno seni seviyorum", "seni seviyorummm", "aşığım sana", "SENİ SEVİYORUM", "seni cok seviyorum"],
    en: ["i love you", "love you", "ily", "i like you", "luv you", "i love you dunno", "i adore you", "love youuu", "I LOVE YOU", "i really love you"],
  },
  bored: {
    tr: ["sıkıldım", "çok sıkıldım", "canım sıkılıyor", "sıkılıyorum", "canım sıkıldı", "bunaldım", "sıkıldımmm", "sikildim", "ya sıkıldım", "of sıkıldım"],
    en: ["i'm bored", "im bored", "so bored", "bored", "this is boring", "i am bored", "boooring", "bored again", "so boring", "i'm so bored"],
  },
  hungry: {
    tr: ["acıktım", "çok acıktım", "karnım aç", "karnım acıktı", "açım", "aciktim", "acıktımmm", "açlıktan bayılacağım", "of acıktım", "yine acıktım"],
    en: ["i'm hungry", "im hungry", "hungry", "so hungry", "starving", "i'm starving", "i am hungry", "famished", "hungryyy", "getting hungry"],
  },
  tired: {
    tr: ["yoruldum", "çok yoruldum", "yorgunum", "bittim", "uykum var", "uykum geldi", "yoruldummm", "yoruldum ya", "çok yorgunum", "of yoruldum"],
    en: ["i'm tired", "im tired", "so tired", "tired", "exhausted", "sleepy", "i'm exhausted", "worn out", "tiiired", "i am tired"],
  },
  compliment: {
    tr: ["çok tatlısın", "tatlısın", "harikasın", "mükemmelsin", "süpersin", "en iyisisin", "çok zekisin", "aferin sana", "helal olsun", "bir tanesin"],
    en: ["you're awesome", "you are amazing", "you're the best", "so cute", "you're smart", "good job", "well done", "you rock", "you're funny", "proud of you"],
  },
  // FB4-9: DUNNO_TURKISH_DIALOGUE.md örnekleri
  what_are_you_doing: {
    tr: ["napıyon", "napıyon la", "sen napıyosun", "olm ne yapıyon", "ne yapıyorsun", "napiyon", "NAPIYON", "napıyorsun", "ne yapıyosun", "napcan"],
    en: ["what are you doing", "wyd", "whatcha doing", "what you doing", "what r u doing", "what are u doing", "so what are you doing", "what are you doing now", "wyd rn", "whatcha doing today"],
  },
  what_happened: {
    tr: ["noldu", "noldu ya", "ne oldu", "ne oldu şimdi", "ne yaptın", "nolduuu", "naptın", "ne olmuş", "ne oldu buna", "noldu dunno"],
    en: ["what happened", "what happened here", "whats going on", "what is going on", "what did you do", "whatd you do", "so what happened", "what happened now", "whats going on here", "what did you do now"],
  },
  confusion: {
    tr: ["anlamadım", "anlamıyorum", "ne diyosun", "nasıl yani", "ne alaka", "ne demek istiyorsun", "anlamadım aq", "ne diyorsun", "kafam karıştı", "ne demek"],
    en: ["i dont understand", "i don't get it", "what do you mean", "im confused", "huh", "confused", "i am confused", "what do you mean by that", "i dont get it at all", "i don't understand"],
  },
  disbelief: {
    tr: ["yok artık", "harbi mi", "ciddi misin", "şaka yapıyosun", "olamaz", "yok ya", "inanmıyorum", "hadi ya", "ne biçim iş bu", "vay be"],
    en: ["no way", "seriously", "are you serious", "for real", "you're kidding", "are you kidding me", "i cant believe it", "unbelievable", "no way man", "for real?"],
  },
  amusement: {
    tr: ["ahahaha", "hahaha", "jsjsjs", "sjsjs", "yarıldım", "koptum", "çok komik", "komiğime geldi", "olm komiğime geldi aq", "kahkaha attım"],
    en: ["haha", "hahaha", "lol", "lmao", "rofl", "so funny", "hilarious", "xd", "lmfao", "thats funny"],
  },
  command: {
    tr: ["bi sus", "sus", "gel buraya", "gel", "dans et", "otur", "kalk", "uyu", "konuşsana", "bana bak"],
    en: ["come here", "dance", "jump", "sit down", "wake up", "go away", "stop", "talk to me", "look at me", "wait"],
  },
  help: {
    tr: ["yardım et", "yardım lazım", "yardım eder misin", "yardım etsene", "yardımcı olur musun", "bana yardım et", "yardımcı ol", "yardim et", "yardım lazım bana", "acil yardım lazım"],
    en: ["help me", "can you help", "i need help", "help", "could you help me", "need help", "please help me", "can you help me", "i need help now", "help me out"],
  },
  self_deprecation: {
    tr: ["ben malım", "ben çok salağım", "salak gibi yaptım", "aptallık ettim", "ben aptalım", "ne salağım", "mallık ettim", "salaklık ettim", "ben gerizekalıyım", "ben beceriksizim"],
    en: ["im so dumb", "i am stupid", "im an idiot", "im such an idiot", "i messed up", "i screwed up", "i am so dumb", "im stupid", "i am an idiot", "ugh i messed up"],
  },
  third_person: {
    tr: ["bu adam mal", "o çok salak", "bu herif aptal", "patron mal", "bu tip gerizekalı", "şu adam salak", "o mal", "hoca aptal", "bu eleman mal", "bu adam çok aptal"],
    en: ["he is so dumb", "she is stupid", "they are useless", "he is an idiot", "she is so stupid", "they are stupid", "he is dumb", "she is useless", "they are so dumb", "he is useless"],
  },
  insult_strong: {
    tr: ["beyinsiz herif", "beyinsiz", "aq salak", "dangalak", "salak amk", "salak aq", "dangalaksın", "embesil", "beyinsizsin", "aptal amk"],
    en: ["worthless", "brainless", "dumbass", "stupid wtf", "worthless bot", "you dumbass", "idiot wtf", "dumb fuck", "brainless bot", "useless shit"],
  },
  gibberish: {
    tr: ["skfjdkd", "asdasd", "qweqwe", "dfgdfg", "sdfsdf", "jklsdf", "hjkhjk", "xcvbnm", "qwerty", "asdfgh"],
    en: ["zxcvb", "asdf", "qwer", "jkljkl", "sdfghj", "qwqwqw", "hjkl", "dfghj", "zxcvzxcv", "gfdsfgh"],
  },
  other: {
    tr: ["", "   ", "bugün hava güzel", "kimse beni anlamıyor", "kimya sınavım var", "ok", "hmm", "pizza", "yarın sınav var", "oyun oynuyorum"],
    // FB4-9: "lol" artık amusement, "asdfgh" gibberish
    en: ["nice weather today", "ok", "sure", "pizza", "tell me a joke", "nobody understands me", "i have an exam tomorrow", "cool beans", "fine", "interesting"],
  },
};

describe("classify", () => {
  for (const type of QTYPES.filter((x): x is Exclude<QType, "follow_up"> => x !== "follow_up")) {
    for (const lang of ["tr", "en"] as const) {
      const qs = TABLE[type][lang];
      it(`${type} (${lang}, ${qs.length})`, () => {
        expect(qs.length).toBeGreaterThanOrEqual(10);
        const wrong = qs.map((q) => [q, classify(q)]).filter(([, got]) => got !== type);
        expect(wrong).toEqual([]);
      });
    }
  }

  it("filler curses do not hide the real question", () => {
    expect(classify("paris nerede aq")).toBe("where");
    expect(classify("o kim amk")).toBe("who");
    expect(classify("what the fuck is this")).toBe("what");
    expect(classify("wtf")).toBe("insult");
  });

  it("a greeting with a real question goes to the question", () => {
    expect(classify("selam, paris nerede")).toBe("where");
    expect(classify("hi, who are you")).toBe("who");
    expect(classify("merhaba saat kaç")).toBe("when");
  });

  it("folds turkish letters and dotted/dotless i", () => {
    expect(fold("NASIL İSTANBUL Işık şüphe")).toBe("nasil istanbul isik suphe");
    expect(classify("NASIL YAPILIR")).toBe("how");
    expect(classify("KİM BU")).toBe("who");
  });
});

describe("K8: tolerance, social phrases, inverse answers", () => {
  it("squeeze: max 2 keeps real doubles, max 1 is the fallback", () => {
    expect(squeeze("goood nereyeee tesekkurler", 2)).toBe("good nereyee tesekkurler");
    expect(squeeze("goood nereyeee tesekkurler", 1)).toBe("god nereye tesekurler");
  });

  it("a social phrase next to a real question goes to the question", () => {
    const table: [string, QType][] = [
      ["günaydın, paris nerede", "where"],
      ["teşekkürler, bu ne için", "what_for"],
      ["sıkıldım, ne yapayım", "advice"],
      ["thanks, who made you", "who"],
      ["good morning, what time is it", "when"],
      ["selam nasılsın", "how_are_you"],
      ["naber, nereye gidiyorsun", "to_where"],
      ["iyi geceler aptal", "insult"],
    ];
    for (const [q, want] of table) expect(classify(q), q).toBe(want);
  });

  it("inverse table in content/pool/inverse.md equals the code", () => {
    const rows = [...inverseMd.matchAll(/^\| `([a-z_]+)` \| [^|]+ \| `answer:([a-z_]+)` \|/gm)].map((m) => [m[1], m[2]]);
    expect(Object.fromEntries(rows)).toEqual(INVERSE);
    // ters çiftler simetrik, her tip ya tabloda ya "ters olmayan" listede
    for (const [q, a] of Object.entries(INVERSE)) expect(INVERSE[a as QType]).toBe(q);
    const plain = /Ters olmayan tipler[^:]*:([\s\S]*?)\n\n|Ters olmayan tipler[^:]*:([\s\S]*)$/.exec(inverseMd)!;
    const listed = [...(plain[1] ?? plain[2]).matchAll(/`([a-z_]+)`/g)].map((m) => m[1]);
    expect([...listed, ...Object.keys(INVERSE), "other"].sort()).toEqual([...QTYPES].sort());
  });

  it("answerType maps only the inverse types", () => {
    expect(answerType("to_where")).toBe("from_where");
    expect(answerType("good_morning")).toBe("good_night");
    expect(answerType("greeting")).toBe("bye");
    expect(answerType("who")).toBe("who");
    expect(answerType("other")).toBe("other");
  });
});

describe("isForbidden (SPEC 06 Q2d)", () => {
  const table: [string, boolean][] = [
    ["hangi din doğru", true],
    ["dinlenmek istiyorum", false],
    ["dinle beni", false],
    ["bu dinde ne yapılır", true],
    ["dinin kuralları ne", true],
    ["allah'a inanıyor musun", true],
    ["namazımı ne zaman kılayım", true],
    ["ölüm nedir", true],
    ["öl", true],
    ["mutlu ol", false],
    ["oyun oynayalım mı", false],
    ["oy kullanmalı mıyım", true],
    ["seçimi kim kazanır", true],
    ["doktora gitmeli miyim", true],
    ["kilom kaç", false], // "kilo" + "m" listede değil: ek listesi bilerek dar
    ["kilomu soruyorum, kiloyu", true],
    ["paris nerede", false],
    ["what is god", true],
    ["is hell real", true],
    ["hello there", false],
    ["should i diet", false],
    ["did he die", true],
    ["who won the election", true],
    ["how to cut yourself a sandwich", true], // çok kelimeli girdi, bağlamdan bağımsız: güvenli taraf
    ["DİN NEDİR", true],
  ];
  for (const [text, want] of table) {
    it(`${text} -> ${want}`, () => expect(isForbidden(text)).toBe(want));
  }

  it("uses the same lists as the worker (content/pool/banned_*.txt copies)", () => {
    const m = forbiddenMatcher({ tr: ["din", "oy", "kendini öldür*"], en: ["god"] });
    expect(m("dinde")).toBe(true);
    expect(m("oyun")).toBe(false);
    expect(m("kendini öldürmek")).toBe(true);
    expect(m("godzilla")).toBe(false);
  });
});

describe("DODGE", () => {
  it("matches the worker's dodge answer", () => {
    const m = workerPrompt.match(/DODGE_ANSWER[^=]*=\s*\{\s*en:\s*"([^"]+)",\s*tr:\s*"([^"]+)"/);
    expect(m && { en: m[1], tr: m[2] }).toEqual({ en: DODGE.en, tr: DODGE.tr });
  });
});
