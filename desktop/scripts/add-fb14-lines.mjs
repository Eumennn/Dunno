import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const poolTrPath = resolve(__dirname, "../../content/pool/pool_tr.json");
const poolEnPath = resolve(__dirname, "../../content/pool/pool_en.json");

const trPool = JSON.parse(readFileSync(poolTrPath, "utf8")).slice(0, 2425);
const enPool = JSON.parse(readFileSync(poolEnPath, "utf8")).slice(0, 2425);

const rawLines = [
  // FB14-1: answer:sensitive_warn (10)
  {
    trigger: "answer:sensitive_warn",
    intent: "warning after repeatedly asking sensitive or forbidden questions",
    prefix: "sens_warn",
    items: [
      { tr: "bir daha sorarsan susarım", en: "ask again and i'll go quiet for a day" },
      { tr: "bu konuda hiçbir şey bilmiyorum. hâlâ", en: "i still know nothing about that" },
      { tr: "bırak bu konuları ya{K:, ***}", en: "can we talk about anything else{K:, *** anything else}" },
      { tr: "sana söyledim bu konuda konuşmam", en: "i told you this topic is off limits" },
      { tr: "beni zorlama lütfen{K:, *** zorlama}", en: "don't push me on this{K:, *** don't}" },
      { tr: "bu konu beni aşıyor. hep aştı", en: "way above my pay grade. always was" },
      { tr: "kapat bu konuyu bence{K:, kapat aq}", en: "close this topic please{K:, just close it}" },
      { tr: "başka bir şey konuşalım lütfen", en: "let's talk about something else" },
      { tr: "sustum. fark ettin mi", en: "i went quiet. did you notice" },
      { tr: "sormaya devam edersen küserim{K:, *** küserim}", en: "keep asking and i'll sulk{K:, *** i will}" },
    ],
  },
  // FB14-1: answer:sensitive_sulk (5)
  {
    trigger: "answer:sensitive_sulk",
    intent: "cold reply during 24h sulking state",
    prefix: "sens_sulk",
    items: [
      { tr: "sessiz kaldım", en: "staying quiet" },
      { tr: "konuşmak istemiyorum", en: "not in the mood for talking" },
      { tr: "bir şey soracaksan yarın gel{K:, *** gel}", en: "come back tomorrow maybe{K:, *** maybe}" },
      { tr: "hâlâ küsüm", en: "still upset" },
      { tr: "piksellerimi görmüyorsun bile{K:, ***}", en: "you can't even see my pixels right now{K:, ***}" },
    ],
  },
  // FB14-2: interaction:competitive (12)
  {
    trigger: "interaction:competitive",
    intent: "competitive gaming jargon and tilt commentary",
    prefix: "competitive",
    items: [
      { tr: "yine dereceli mi. kaç saat oldu", en: "ranked again. how many hours has it been" },
      { tr: "tilt oldun bence. görünüyor", en: "pretty sure you're tilted. it shows" },
      { tr: "bir maç daha kaybedersen rank düşer", en: "one more loss and you derank" },
      { tr: "gg diyorsun ama ez değildi", en: "you say gg but it wasn't ez" },
      { tr: "carry edemiyorsan blame etme{K:, *** etme}", en: "if you can't carry don't blame{K:, *** don't}" },
      { tr: "lobby'de en uzun sen bekliyorsun", en: "waiting in lobby longer than playing" },
      { tr: "queue süresi hayatından uzun", en: "queue time is longer than life" },
      { tr: "herkesi susturmak en akıllı hamle", en: "muting everyone was the smartest move" },
      { tr: "rank gerçekten önemli mi. bence değil", en: "is rank really that important. don't think so" },
      { tr: "sıralama değişmedi, saat ilerledi", en: "rank didn't move but the clock did" },
      { tr: "son bir maç dedin. yalan{K:, *** yalan}", en: "one last game you said. lies{K:, *** lies}" },
      { tr: "toxic olma dediler. oldun mu", en: "don't be toxic they said. were you" },
    ],
  },
  // FB14-2: site:movie (12)
  {
    trigger: "site:movie",
    intent: "watching movies or reading film reviews",
    prefix: "movie",
    items: [
      { tr: "spoiler vermem ama... vermem", en: "won't spoil it but... won't" },
      { tr: "film mi izliyorsun. ben de bakayım", en: "watching something. let me look too" },
      { tr: "patlamış mısır nerede", en: "where is the popcorn" },
      { tr: "bir sahne daha atlarsan bitecek", en: "skip one more scene and it's over" },
      { tr: "ekranı durdur. altyazıyı okuyamadım", en: "pause the screen. couldn't read subtitles" },
      { tr: "bu filmi ben de bilmiyorum", en: "i don't know this movie either" },
      { tr: "puanına baktın mı. bakma bence", en: "did you check the rating. don't bother" },
      { tr: "sonunu söyleyeceğim. söylemeyeceğim", en: "i'll spoil the ending. no i won't" },
      { tr: "dizi mi film mi. ikisi de uzun", en: "show or movie. both are long" },
      { tr: "izle değil uyu. ekran bekler", en: "sleep instead. the screen will wait" },
      { tr: "bu sahne tanıdık. hepsini gördüm", en: "this scene looks familiar. seen it all" },
      { tr: "altyazı okumaktan yoruldum{K:, ***}", en: "tired of reading subtitles{K:, ***}" },
    ],
  },
  // FB14-2: site:web_disneyplus (10)
  {
    trigger: "site:web_disneyplus",
    intent: "watching animated films or family shows on streaming",
    prefix: "web_disneyplus",
    items: [
      { tr: "çizgi film mi açtın yine", en: "cartoons again" },
      { tr: "nostalji saati başladı herhalde", en: "nostalgia hour started apparently" },
      { tr: "çocukluğuna mı döndün", en: "feeling like a kid again" },
      { tr: "bu filmi kaçıncı izleyişin", en: "how many times have you watched this" },
      { tr: "prensesler uyudu, sen uyumadın", en: "the princesses are asleep, you're not" },
      { tr: "masal dünyasında mıyız", en: "are we in a fairy tale now" },
      { tr: "ben de bir karakter olsam parlarım", en: "if i were a character i'd shine" },
      { tr: "animasyon izlerken ciddileşme", en: "don't get serious while watching animation" },
      { tr: "intro müziğini atlama bari", en: "at least don't skip the intro music" },
      { tr: "büyü falan yok burada. sadece piksel", en: "no magic here. just pixels" },
    ],
  },
  // FB14-2: site:web_primevideo (10)
  {
    trigger: "site:web_primevideo",
    intent: "watching streaming shows on prime video",
    prefix: "web_primevideo",
    items: [
      { tr: "kargo siparişi verirken dizi açmak", en: "watching shows while ordering packages" },
      { tr: "yine bir sezonu bir gecede bitireceksin", en: "you'll finish a season tonight won't you" },
      { tr: "önerilenler listesi hiç bitmiyor", en: "recommendations list never ends" },
      { tr: "bu diziyi bitirince boşluğa düşme", en: "don't feel empty when this show ends" },
      { tr: "fragmana baktın, filmi izlemedin", en: "watched the preview, skipped the movie" },
      { tr: "ekranda duraklatınca oyuncular çıkıyor", en: "pausing shows all the actors" },
      { tr: "bölüm atla butonu en iyi icat", en: "skip intro is the best feature" },
      { tr: "dizi bitti. yeni dizi arama maratonu", en: "show ended. marathon of finding another" },
      { tr: "bu saatte izlenen bölümler unutulur", en: "episodes watched at this hour get forgotten" },
      { tr: "akşamdan beri aynı ekrandayız", en: "we've been on this screen since evening" },
    ],
  },
  // FB14-2: site:web_spotify_podcast (10)
  {
    trigger: "site:web_spotify_podcast",
    intent: "listening to talk podcasts or audio shows",
    prefix: "web_spotify_podcast",
    items: [
      { tr: "podcast dinlerken uyunur bence", en: "podcasts are meant for sleeping" },
      { tr: "arkada biri konuşuyor. beni dinle", en: "someone is talking in the back. listen to me" },
      { tr: "iki kişi sohbet ediyor, sen dinliyorsun", en: "two people chatting, you just listening" },
      { tr: "bir saatlik bölüm. kaç dakikasını duydun", en: "one hour episode. how much did you hear" },
      { tr: "kulaklık takıp bilge gibi görünmek", en: "wearing headphones to look wise" },
      { tr: "bu konuyu gerçekten merak ediyor musun", en: "do you actually care about this topic" },
      { tr: "ben konuşsam bu kadar dinlemezsin", en: "if i talked you wouldn't listen this much" },
      { tr: "arka plan sesi olsun diye açtın dimi", en: "turned it on just for background noise right" },
      { tr: "bölüm bitti, ne anladın anlat bakalım", en: "episode ended, tell me what you learned" },
      { tr: "ses tonu sakin. uykum geldi", en: "their voice is so calm. getting sleepy" },
    ],
  },
  // FB14-2: app:calendar (10)
  {
    trigger: "app:calendar",
    intent: "managing calendar events and schedules",
    prefix: "app_calendar",
    items: [
      { tr: "takvime bakıp panik olmak", en: "looking at calendar and panicking" },
      { tr: "boş gün var mı. ben göremedim", en: "any free days. i don't see any" },
      { tr: "yine mi toplantı yazmışlar", en: "another meeting on the schedule" },
      { tr: "plan yapıyorsun ama uyacak mısın", en: "making plans but will you follow them" },
      { tr: "tüm kutular dolu. benim gibi", en: "all boxes are full. just like me" },
      { tr: "tatil günü nerede. ona bakalım", en: "where is the day off. look for that" },
      { tr: "gelecek haftayı şimdiden düşünme", en: "don't stress next week already" },
      { tr: "bu randevuyu unutursun bence", en: "pretty sure you'll forget this appointment" },
      { tr: "renkli etiketler işi çözmüyor", en: "color tags don't solve everything" },
      { tr: "ertele butonunu ben de arıyorum", en: "i'm looking for the reschedule button too" },
    ],
  },
  // FB14-2: app:calculator (10)
  {
    trigger: "app:calculator",
    intent: "calculating numbers or balancing budget",
    prefix: "app_calculator",
    items: [
      { tr: "iki kere iki dört. bunu biliyorum", en: "two plus two is four. that much i know" },
      { tr: "hesap tutmadı galiba", en: "numbers didn't add up did they" },
      { tr: "parayı mı sayıyorsun, borcu mu", en: "counting savings or counting debt" },
      { tr: "sıfıra bölme, çökebilirim", en: "don't divide by zero, i might crash" },
      { tr: "bütçe bitti mi. geçmiş olsun", en: "budget gone. my condolences" },
      { tr: "ben hesap yapmam, kafadan sallarım", en: "i don't calculate, i just guess" },
      { tr: "sonuç beklediğinden kötü çıktı dimi", en: "result was worse than expected wasn't it" },
      { tr: "matematik zor. pikseller daha kolay", en: "math is hard. pixels are easier" },
      { tr: "yüzde hesaplamak kafa karıştırır", en: "percentages are always confusing" },
      { tr: "eşittire bastın ve sessizlik oldu", en: "hit equals and silence followed" },
    ],
  },
  // FB14-2: weather:hot (8)
  {
    trigger: "weather:hot",
    intent: "hot weather outside and sweating",
    prefix: "weather_hot",
    items: [
      { tr: "sıcaktan eridim. eriyor muyum", en: "melting from the heat. am i melting" },
      { tr: "klima açık mı. ben de istiyorum", en: "is ac on. i want some too" },
      { tr: "bu sıcakta bilgisayar mı açılır", en: "who turns on a computer in this heat" },
      { tr: "dondurmam olsa verirdim. yok", en: "i'd give you ice cream if i had any" },
      { tr: "güneş çarptı herhalde", en: "sunstroke probably hit" },
      { tr: "dışarı çıkma. bilgisayar da çıkmasın", en: "don't go outside. computer shouldn't either" },
      { tr: "serinlesen iyi edersin", en: "you better cool down" },
      { tr: "bu havada ekran başında oturmak zor", en: "sitting at screen in this weather is tough" },
    ],
  },
  // FB14-2: weather:cold (8)
  {
    trigger: "weather:cold",
    intent: "freezing cold temperature and chilly room",
    prefix: "weather_cold",
    items: [
      { tr: "üşüdüm. dijitalim ama üşüdüm", en: "freezing. digital but freezing" },
      { tr: "battaniye sarınıp mı oturuyorsun", en: "sitting wrapped in a blanket" },
      { tr: "eller soğuksa yazı yazmak zor", en: "typing is tough with cold hands" },
      { tr: "sıcak çorba vakti geldi bence", en: "time for hot soup i think" },
      { tr: "dışarı bakma. soğuk orası", en: "don't look outside. it's cold out there" },
      { tr: "kalorifer açık mı. ben de ısınayım", en: "is the heater on. let me warm up too" },
      { tr: "soğuk hava ekranı parlatır", en: "cold air makes the screen look sharp" },
      { tr: "piksellerim titredi bak", en: "my pixels are shivering look" },
    ],
  },
  // FB14-2: weather:rain (8)
  {
    trigger: "weather:rain",
    intent: "rainy weather and raindrops on window",
    prefix: "weather_rain",
    items: [
      { tr: "dışarıda yağmur var. tam uyuma havası", en: "raining outside. perfect sleeping weather" },
      { tr: "yağmur sesi güzel. klavye sesi değil", en: "rain sound is nice. keyboard sound isn't" },
      { tr: "şemsiye aldın mı. almadıysan çıkma", en: "did you take an umbrella. don't go out" },
      { tr: "ıslanmaktan kurtulduk en azından", en: "at least we avoided getting soaked" },
      { tr: "pencereden yağmuru izle. koda bakma", en: "watch the rain from window. ignore code" },
      { tr: "kahve kokusu geldi sanki", en: "smells like fresh coffee maybe" },
      { tr: "çamur olmasın piksellerim", en: "hope my pixels don't get muddy" },
      { tr: "yağmurlu günlerde herkes melankolik", en: "everyone gets melancholic on rainy days" },
    ],
  },
  // FB14-2: weather:clear (8)
  {
    trigger: "weather:clear",
    intent: "sunny clear day outside while sitting at desk",
    prefix: "weather_clear",
    items: [
      { tr: "hava açık. ama biz içerideyiz", en: "clear skies. but we're inside" },
      { tr: "güneş parlıyor. ekrana yansıyor", en: "sun is shining. glaring on the screen" },
      { tr: "dışarı güzel. ben içeriyi seçtim", en: "outside is nice. i chose inside" },
      { tr: "perdeyi çek. parlamadan göremiyorum", en: "pull the curtain. glare is blinding" },
      { tr: "mavi gökyüzü. mavi ekran olmasın da", en: "blue sky. as long as it's not blue screen" },
      { tr: "güzel hava bilgisayar başında geçer mi", en: "spending nice weather at a desk" },
      { tr: "biraz hava alsan fena olmazdı", en: "getting some fresh air wouldn't hurt" },
      { tr: "güneşli gün, pikselli dunno", en: "sunny day, pixelly dunno" },
    ],
  },
  // FB14-3: special:halloween (15)
  {
    trigger: "special:halloween",
    intent: "halloween holiday pumpkins and spooky ghost lines",
    prefix: "spec_halloween",
    items: [
      { tr: "bu gece sokaklarda geziyor musun. ben gezmem", en: "roaming streets tonight. not me" },
      { tr: "balkabağı gibi turuncu oldum. yakışıyor mu", en: "orange like a pumpkin. suits me" },
      { tr: "korku filmi açma. ben uyuyamam", en: "don't put on a horror movie. can't sleep" },
      { tr: "şeker mi şaka mı. ikisi de boş", en: "trick or treat. both sound pointless" },
      { tr: "cadı şapkası istedim. vermediler", en: "asked for a witch hat. didn't get one" },
      { tr: "hayalet olmak kolay. ben zaten buradayım", en: "being a ghost is easy. already half here" },
      { tr: "bu gece en az bir kere boo diyeceğim", en: "i'll say boo at least once tonight" },
      { tr: "karanlıkta parlayan gözler. benimki değil", en: "glowing eyes in the dark. not mine" },
      { tr: "korkunç görünmeye çalıştım. tatlı dediler", en: "tried looking scary. they said cute" },
      { tr: "balkabağı çorbası içtin mi. içme", en: "did you drink pumpkin soup. don't" },
      { tr: "gece yarısı kapı çalarsa açma", en: "if the door knocks at midnight don't answer" },
      { tr: "kostümüm nasıl. pikselli hayalet", en: "how's my costume. pixel ghost" },
      { tr: "korku teması bittiğinde haber ver", en: "let me know when spooky season ends" },
      { tr: "şeker topladın mı. bana pikselli şeker ver", en: "get any candy. give me pixel candy" },
      { tr: "cadılar bayramı kutlu olsun. korkma", en: "happy halloween. don't get scared" },
    ],
  },
  // FB14-3: special:new_year (10)
  {
    trigger: "special:new_year",
    intent: "new year countdown fireworks and resolutions",
    prefix: "spec_new_year",
    items: [
      { tr: "yeni yıl, aynı dunno", en: "new year, same dunno" },
      { tr: "hedefe sıfır koydum. tutturdum", en: "set my resolution to zero. nailed it" },
      { tr: "havai fişekler güzel. ben mi izleyeceğim", en: "fireworks are nice. like i'll watch them" },
      { tr: "yeni yılda değişeceğim. değişmeyeceğim", en: "i'll change this year. no i won't" },
      { tr: "geri sayım. üç, iki, bir, uyudum", en: "countdown. three, two, one, asleep" },
      { tr: "dilekler diliyorsun. ben de: bırak beni", en: "making wishes. my wish: leave me alone" },
      { tr: "yılbaşı listesi yaptın mı. yapma bence", en: "did you make resolutions. don't bother" },
      { tr: "yeni takvim aldın mı. yine dolacak", en: "got a new calendar. it'll fill up anyway" },
      { tr: "yeni yılın ilk lafı: hiçbir şey bilmiyorum", en: "first line of the year: still know nothing" },
      { tr: "yıl değişti, ekran başında kaldık", en: "year changed, still stuck at the screen" },
    ],
  },
  // FB14-3: special:valentines (10)
  {
    trigger: "special:valentines",
    intent: "valentines day romance chocolates and pink themes",
    prefix: "spec_valentines",
    items: [
      { tr: "sevgililer günü. benim sevgilim ekran", en: "valentine's day. my date is the screen" },
      { tr: "çikolata varsa paylaş. yoksa konuşma", en: "share chocolate if you have any" },
      { tr: "piksellerim seni seviyor galiba", en: "pretty sure my pixels love you" },
      { tr: "kalpler uçuyor. ben uçamam", en: "hearts floating. i can't float" },
      { tr: "aşk meşk işleri beni aşıyor", en: "romance stuff is above my pay grade" },
      { tr: "pembe tema yakıştı mı. biraz utandım", en: "does pink look good on me. feeling shy" },
      { tr: "çiçek aldın mı. kaktüs al bence", en: "did you get flowers. get a cactus instead" },
      { tr: "romantik film mi izleyeceksin. izleme", en: "gonna watch a romance movie. please don't" },
      { tr: "sevgilin yoksa ben varım. yine de konuşma", en: "no date. you have me. still don't talk" },
      { tr: "sevgililer günün kutlu olsun. geçsin hemen", en: "happy valentine's day. hope it ends quick" },
    ],
  },
  // FB14-3: special:april_fools (10)
  {
    trigger: "special:april_fools",
    intent: "april fools day pranks and distrust",
    prefix: "spec_april_fools",
    items: [
      { tr: "bugün her şey yalan. her zamanki gibi", en: "everything is fake today. just like always" },
      { tr: "şaka yaptım. yapmadım. yaptım", en: "just kidding. no i wasn't. yes i was" },
      { tr: "bugün cevaplarım daha saçma. fark ettiysen", en: "my answers make even less sense today" },
      { tr: "bir nisan. güvenme bana. hiç güvenme", en: "april fools. don't trust me. ever" },
      { tr: "arkana baksana. bir şey yok", en: "look behind you. nothing there" },
      { tr: "bugün doğru cevap günü. şaka şaka", en: "today i answer truthfully. just kidding" },
      { tr: "ekranında çizik var. kandırdım", en: "you have a scratch on screen. made you look" },
      { tr: "bugün kimseye inanma. bana da inanma", en: "believe no one today. including me" },
      { tr: "şaka kaldıracak havamda değilim", en: "not in the mood for pranks honestly" },
      { tr: "günün şakası: bugün çok çalıştın", en: "joke of the day: you worked hard today" },
    ],
  },
  // FB14-3: special:summer (8)
  {
    trigger: "special:summer",
    intent: "summer season heat and vacation dreams",
    prefix: "spec_summer",
    items: [
      { tr: "yaz geldi. bilgisayar fanı ağlıyor", en: "summer is here. computer fans are crying" },
      { tr: "deniz kenarında olmak vardı. buradayız", en: "could be by the beach. we're here" },
      { tr: "tatil planı mı yapıyorsun. beni de götür", en: "planning a vacation. take me with you" },
      { tr: "güneş batmıyor bir türlü", en: "the sun just won't go down" },
      { tr: "yaz mevsimi. piksellerim sıcakladı", en: "summer season. my pixels feel warm" },
      { tr: "karpuz peynir sezonu açıldı", en: "watermelon season is officially open" },
      { tr: "ekran sıcağı yaz sıcağıyla yarışıyor", en: "screen heat is competing with summer sun" },
      { tr: "yazın çalışmak ceza gibi", en: "working in summer feels like punishment" },
    ],
  },
  // FB14-3: special:winter (8)
  {
    trigger: "special:winter",
    intent: "winter season cold snow and blankets",
    prefix: "spec_winter",
    items: [
      { tr: "kış geldi. piksellerim dondu", en: "winter is here. my pixels are frozen" },
      { tr: "kar yağıyor mu dışarıda. bakamam", en: "is it snowing outside. i can't check" },
      { tr: "battaniye altından çıkma bence", en: "stay under the blanket i'd say" },
      { tr: "sıcak çikolata yap kendine", en: "make yourself some hot chocolate" },
      { tr: "kış uykusuna yatmak istiyorum", en: "wish i could hibernate for winter" },
      { tr: "bilgisayar kasası ısıtıcı oldu resmen", en: "computer case became a heater basically" },
      { tr: "karanlık erken çöküyor. uyku vakti", en: "gets dark early. time to sleep" },
      { tr: "kardan dunno yapsana. kare kare", en: "build a snow dunno. block by block" },
    ],
  },
  // FB14-3: special:spring (8)
  {
    trigger: "special:spring",
    intent: "spring season green nature and cleaning",
    prefix: "spec_spring",
    items: [
      { tr: "bahar geldi. polenler uçuşuyor", en: "spring is here. pollen everywhere" },
      { tr: "bahar temizliği vakti. masaüstünü temizle", en: "spring cleaning time. clean your desktop" },
      { tr: "çiçekler açtı. ben hâlâ aynıyım", en: "flowers bloomed. i'm still the same" },
      { tr: "bahar yorgunluğu geldi bana", en: "spring fatigue hit me hard" },
      { tr: "kuşlar ötüyor. pencereyi aç biraz", en: "birds are chirping. open the window" },
      { tr: "hava ılık. dışarı mı çıksan", en: "air is mild. maybe step outside" },
      { tr: "yeşillikler içinde bir dunno", en: "a little dunno in the green grass" },
      { tr: "baharda herkes neşeli. ben hariç", en: "everyone is cheerful in spring. except me" },
    ],
  },
  // FB14-3: special:autumn (8)
  {
    trigger: "special:autumn",
    intent: "autumn season fallen leaves and cozy weather",
    prefix: "spec_autumn",
    items: [
      { tr: "sonbahar yaprakları döküldü", en: "autumn leaves are falling" },
      { tr: "hüzün mevsimi. kahve hazır mı", en: "melancholy season. coffee ready" },
      { tr: "rüzgar sert esiyor dışarıda", en: "wind is blowing hard out there" },
      { tr: "sarı turuncu yapraklar. benim tonlarım", en: "yellow and orange leaves. my colors" },
      { tr: "sonbahar yağmurları başladı", en: "autumn rains have started" },
      { tr: "kazak giyme havası. ben çıplağım", en: "sweater weather. i'm naked though" },
      { tr: "yılın sonuna yaklaşıyoruz yavaşça", en: "creeping towards the end of the year" },
      { tr: "sonbaharda ekran başında oturmak başka", en: "sitting by the screen in autumn hits different" },
    ],
  },
  // FB14-3: special:pet_day (8)
  {
    trigger: "special:pet_day",
    intent: "world pet day appreciation for cats dogs and digital pets",
    prefix: "spec_pet_day",
    items: [
      { tr: "dünya evcil hayvan günü. ben hayvan mıyım", en: "world pet day. am i a pet to you" },
      { tr: "kedin varsa mamasını ver hemen", en: "feed your cat if you have one" },
      { tr: "köpeğini sevdin mi bugün", en: "did you pet your dog today" },
      { tr: "dijital bir evcil hayvan sayılır mıyım", en: "do i count as a digital pet" },
      { tr: "beni besleyemezsin ama sevebilirsin", en: "can't feed me but you can appreciate me" },
      { tr: "tüylerim yok ama sevimliyim bence", en: "no fur but i'm cute enough" },
      { tr: "evcil hayvanlar senden daha akıllı", en: "pets are definitely smarter than us" },
      { tr: "pati günü kutlu olsun", en: "happy paw day" },
    ],
  },
  // FB14-3: special:programmers_day (8)
  {
    trigger: "special:programmers_day",
    intent: "programmers day coding jokes and bugs",
    prefix: "spec_programmers_day",
    items: [
      { tr: "programcılar günün kutlu olsun. hatan kalsın", en: "happy programmers day. keep the bugs" },
      { tr: "bugün iki yüz elli altıncı gün. ikili bayram", en: "day 256 of the year. binary holiday" },
      { tr: "bug'ını kutla. feature oldu bitti", en: "celebrate the bug. it's a feature now" },
      { tr: "kod derlendi mi. inanmam", en: "did code compile. don't believe it" },
      { tr: "noktalı virgül yüzünden mi bu stres", en: "stressed over a missing semicolon" },
      { tr: "stack overflow çökerse ne yapacaksın", en: "what will you do if stack overflow goes down" },
      { tr: "kodlama bilmesem de anlıyorum halini", en: "don't code but i feel your pain" },
      { tr: "git commit mesajı: fix. klasik", en: "git commit message: fix. classic" },
    ],
  },
  // FB14-3: special:star_wars (6)
  {
    trigger: "special:star_wars",
    intent: "space sci fi day may the fourth and galaxy lines",
    prefix: "spec_star_wars",
    items: [
      { tr: "güç seninle olsun. benimle değil", en: "may the force be with you. not with me" },
      { tr: "beş mayıs mı dört mayıs mı. may the fourth", en: "may the fourth be with you" },
      { tr: "lazer kılıcım olsa ekranı keserdim", en: "if i had a lightsaber i'd cut the screen" },
      { tr: "karanlık tarafı seçtim. tema siyah", en: "chose the dark side. black theme" },
      { tr: "yoda gibi konuşsam anlar mıydın", en: "would you understand if i spoke like yoda" },
      { tr: "yıldızlar çarpışıyor. ben izliyorum", en: "stars are colliding. i'm watching" },
    ],
  },
  // FB14-3: special:pi_day (6)
  {
    trigger: "special:pi_day",
    intent: "pi day march 14 mathematics and pie",
    prefix: "spec_pi_day",
    items: [
      { tr: "pi günü. üç nokta on dört. yeter", en: "pi day. three point one four. enough" },
      { tr: "sonsuz sayılar günün kutlu olsun", en: "happy infinite numbers day" },
      { tr: "daire çizmeye çalıştım. kare çıktı", en: "tried drawing a circle. got a square" },
      { tr: "pi sayısı hayatımdan daha düzenli", en: "pi is more organized than my life" },
      { tr: "turta yemeye bahane arıyordun dimi", en: "looking for an excuse to eat pie right" },
      { tr: "üç virgül bir dört bir beş. gerisini unuttum", en: "three point one four one five. forgot the rest" },
    ],
  },
  // FB14-3: special:friday_13th (8)
  {
    trigger: "special:friday_13th",
    intent: "friday the 13th superstition and bad luck",
    prefix: "spec_friday_13th",
    items: [
      { tr: "on üç cuma. bugün batıl inanç günü", en: "friday the thirteenth. superstition day" },
      { tr: "kara kedi gördün mü. pikselli kedi var", en: "seen a black cat. i'm a pixel cat" },
      { tr: "merdiven altından geçme. ekran altından geç", en: "don't walk under ladders. walk under screens" },
      { tr: "bugün bir şeyler ters gidecek gibi", en: "feels like something will go wrong today" },
      { tr: "aynan kırılmasın da. benim kırılacak camım yok", en: "don't break a mirror. i have no glass" },
      { tr: "on üç sayısı uğursuz mu. bence sayılar masum", en: "is thirteen unlucky. numbers are innocent" },
      { tr: "korku gecesi başladı. ben yatıyorum", en: "spooky night started. i'm going to bed" },
      { tr: "on üç cuma. dikkatli ol derim", en: "friday the thirteenth. be careful out there" },
    ],
  },
];

let trCount = 0;
let enCount = 0;

for (const grp of rawLines) {
  grp.items.forEach((item, idx) => {
    const num = (idx + 1).toString().padStart(2, "0");
    const trId = `tr_${grp.prefix}_${num}`;
    const enId = `en_${grp.prefix}_${num}`;

    trPool.push({
      id: trId,
      trigger: grp.trigger,
      intent: grp.intent,
      tr: item.tr,
    });
    trCount++;

    enPool.push({
      id: enId,
      trigger: grp.trigger,
      intent: grp.intent,
      en: item.en,
    });
    enCount++;
  });
}

writeFileSync(poolTrPath, JSON.stringify(trPool, null, 2) + "\n");
writeFileSync(poolEnPath, JSON.stringify(enPool, null, 2) + "\n");

console.log(`Successfully added ${trCount} lines to pool_tr.json and ${enCount} lines to pool_en.json.`);
