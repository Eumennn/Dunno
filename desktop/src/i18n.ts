// Arayüz metinleri tek yerde. Hepsi PLACEHOLDER: tasarımcının metinleri gelince bu dosya değişir, kod değişmez.
// Marka sesi: küçük harf, kuru, kısa, ünlem ve emoji yok. EN metinlerin bir kısmı landing'den birebir (kök index.html).
import type { Lang } from "./settings";
import { K9_ACHIEVEMENT_TEXT } from "./wardrobe/achievements-k9.strings";
import { SPEC12_ACHIEVEMENT_TEXT } from "./wardrobe/achievements-spec12.strings";

export const PLACEHOLDER = true;

export type PetStateName =
  | "idle"
  | "shrug"
  | "walk"
  | "talk"
  | "sleep"
  | "run_away"
  | "sulk"
  | "peek"
  | "shh"
  | "dragged";

export interface UiStrings {
  // ---- setup.exe (ilk açılış)
  setupQuestion: string;
  /** setup.exe alt açıklama satırı (landing) */
  setupBlurb: string;
  setupLang: string;
  setupMode: string;
  modePolite: string;
  modeStreet: string;
  setupYes: string;
  setupDunno: string;
  /** "dunno" seçilince kısa toast */
  setupDunnoToast: string;
  firstRunDone: string;

  // ---- ask.exe (soru kutusu)
  askPlaceholder: string;
  askSend: string;
  heartsLabel: (remaining: number) => string;
  /** "dunno <thinkingVerb>..." */
  thinkingVerb: string;
  /** düşünürken dönen metinler; havuz interaction:thinking gelene kadar placeholder (SPEC 06 Q5) */
  thinkingVerbs: readonly string[];
  /** uyuyakalma akışı (landing ask.exe) */
  dozeAsleep: string;
  dozeWake: string;
  /** tempo kilidi (SPEC 06 Q4): kum saati + "biraz bekle" + kalan saniye */
  waitTitle: string;
  waitSeconds: (n: number) => string;
  /** havuz interaction:too_fast yoksa (placeholder) */
  tooFastFallback: string;
  /** honest denendi ama anahtar yok / hata: günde bir kez ima (havuz interaction:brain_off yoksa placeholder) */
  brainOffFallback: string;
  /** today.txt: hak bitince ne olur */
  homeAfterLimit: string;
  fallbackAnswer: string;

  // ---- error.exe (limit, bugün sus)
  limitTitle: string;
  limitFallback: string;
  mutedTitle: string;
  mutedBody: string;
  ok: string;

  // ---- dunno.exe
  tabHome: string;
  /** "3 / 3 doğru cevap hakkı" */
  homeQuestionsLeft: (left: number, total: number) => string;
  homeNow: string;
  homeMode: string;
  homeLang: string;
  homeMuteToday: string;
  homeMeeting: string;
  homeSummon: string;
  homeSendToEdge: string;
  /** anahtarların altındaki açıklama satırları */
  homeMuteHint: string;
  homeMeetingHint: string;
  todayResets: string;
  /** bugün atılan laf; sayı yoksa null */
  todayLines: (n: number | null) => string;
  settingsAutostartHint: string;
  settingsFrequencyHint: string;
  homeInMeeting: string;
  /** now.txt: toplantıda pet saklanırken (SPEC 07 FB4) */
  homeHiding: string;
  /** settings.exe balon süresi (SPEC 07 FB5) */
  settingsBubble: string;
  /** SPEC 17 karanlık mod */
  settingsDark: string;
  darkModes: Record<"off" | "on" | "system", string>;
  /** settings.exe pet boyutu (SPEC 08); seçenek adları size/size.ts SIZE_LABELS */
  settingsSize: string;
  /** settings.exe osuruk anahtarı (SPEC 09 K3); placeholder */
  settingsFart: string;
  settingsFartHint: string;
  settingsTabTitles: string;
  settingsTabTitlesHint: string;
  /** FB8 müziğe tepki */
  settingsMusic: string;
  settingsMusicHint: string;
  /** SPEC 19 M4: macOS Erişilebilirlik izni satırı */
  settingsMacAx: string;
  settingsMacAxHint: string;
  settingsMacAxGrant: string;
  settingsMacAxOn: string;
  settingsTelemetry: string;
  settingsTelemetryHint: string;
  /** SPEC 11 */
  settingsVoice: string;
  settingsVoiceHint: string;
  settingsVoiceVolume: string;
  voiceVolumes: Record<"low" | "medium" | "high", string>;
  /** test modu: osuruğu hemen göster (SPEC 09 K3c, manuel test) */
  testFart: string;
  /** test modu: boyutlar arası hızlı geçiş düğmesi */
  sizeNext: (current: string) => string;
  bubbleShort: string;
  bubbleNormal: string;
  bubbleLong: string;
  on: string;
  off: string;
  stateNames: Record<PetStateName, string>;

  settingsMode: string;
  settingsLang: string;
  settingsFrequency: string;
  freqLow: string;
  freqNormal: string;
  freqHigh: string;
  settingsAutostart: string;
  /** SPEC 19 macOS'ta aynı ayarın adı */
  settingsAutostartMac: string;
  settingsMuteToday: string;

  statsAskedToday: string;
  statsQuestionsTotal: string;
  statsPokes: string;
  statsDrags: string;
  statsSleep: string;
  statsTopApp: string;
  /** FB4-6 */
  statsPokesToday: string;
  statsLinesToday: string;
  statsHonest: string;
  statsFarts: string;
  statsTogether: string;
  statsDays: (days: number, active: number) => string;
  statsWeekHint: string;
  /** pazar = 0 */
  weekdays: string[];
  statsNone: string;
  statsReset: string;
  statsPrivacy: string;
  minutes: (m: number) => string;

  // ---- wardrobe.exe / başarımlar (SPEC 05; tasarımcı onayı bekliyor)
  accessoryNames: Record<string, string>;
  /** SPEC 09 K2 kostüm adları */
  costumeNames: Record<string, string>;
  /** SPEC 09 K6 slot adları ve ipuçları */
  wrSlots: Record<"head" | "eyes" | "neck" | "body" | "side", string>;
  wrSlotHint: (max: number) => string;
  wrBlocked: string;
  /** açılım toast'u: "açıldı: taç" */
  unlockToast: (item: string) => string;
  achievements: Record<string, { title: string; goal: (target: number) => string }>;
  wrNone: string;
  wrLocked: string;
  wrPreview: Record<"idle" | "walk" | "sleep" | "peek", string>;
  wrUnlockedOn: (day: string) => string;
  wrCandidate: string;
  /** UX-01 dolap */
  wrCats: Record<"start" | "themes" | "costumes" | "accessories", string>;
  /** SPEC 15 başla sekmesi */
  wrPresets: string;
  presetNames: Record<"starter" | "cozy" | "office" | "party" | "buzz" | "spooky", string>;
  wrPresetOpen: (open: number, total: number) => string;
  wrNext: string;
  wrProgress: (done: number, total: number) => string;
  /** FB5: achievements.txt aç/kapat düğmesi */
  wrAchShow: string;
  wrAchHide: string;
  packNames: Record<"bugs" | "animals" | "spooky" | "odd" | "other", string>;
  wrOnlyOpen: string;
  wrHiddenLocked: string;
  wrThemeNow: string;
  wrNothingWorn: string;
  wrTakeOff: (item: string) => string;
  settingsGroups: Record<"behavior" | "look" | "bubble" | "sound" | "privacy" | "system" | "mods" | "secret" | "pro" | "personal", string>;
  /** FB6 settings.exe soldaki menü: ad + ne var */
  setCats: Record<"general" | "look" | "sound" | "privacy" | "pro" | "mods", { name: string; hint: string }>;
  /** SPEC 16 kişisel dunno */
  personalWhat: string[];
  personalProOnly: string;
  personalConsent: string;
  personalOn: string;
  personalSince: (date: string) => string;
  personalFields: Record<"preferred_name" | "inside_jokes" | "recurring_topics" | "common_workflows" | "explicit_preferences", string>;
  personalListHint: string;
  personalSliders: Record<"calm_chaotic" | "sweet_teasing" | "polite_roast" | "quiet_chatty" | "robotic_absurd", [string, string]>;
  personalSave: string;
  personalSaved: string;
  personalForget: string;
  personalRejected: Record<"secret" | "sensitive" | "too_long" | "empty", string>;
  /** SPEC 15 Free / başarım / Pro */
  settingsBubbleStyle: string;
  settingsVoiceStyle: string;
  bubbleStyles: Record<"classic" | "mint" | "night" | "cotton" | "ink", string>;
  voiceStyles: Record<"classic" | "tiny" | "robot" | "deep", string>;
  /** sıradaki ilerleme ödülü: "{ad}: {n} başarımda (şu an {m})" */
  progressNext: (reward: string, at: number, done: number) => string;
  progressAll: string;
  rewardMonster: string;
  proStatus: string;
  proFree: string;
  proOn: (tail: string) => string;
  proSim: string;
  proWhat: string;
  proDisabled: string;
  proKeyLabel: string;
  proActivate: string;
  /** ödeme -> lisans (sipariş no + e-posta) */
  proClaimTitle: string;
  proOrder: string;
  proEmail: string;
  proClaim: string;
  proClaimFail: Record<"notFound" | "tooMany" | "offline" | "closed", string>;
  proUntil: (date: string) => string;
  proExpired: string;
  proRemove: string;
  proErrors: Record<"format" | "signature" | "payload" | "disabled", string>;
  proActivated: string;
  settingsPersonality: string;
  personalities: Record<"balanced" | "calm" | "chatty" | "chaotic", string>;
  personalityHint: string;
  proOnly: string;
  modsProKinds: (kinds: string) => string;
  modsLimit: (n: number) => string;
  /** SPEC 14 gizli dünyalar */
  eggWorld: string;
  eggWorldHint: string;
  eggWorldNames: Record<"normal" | "paper" | "glitch", string>;
  eggMonster: string;
  eggMonsterHint: string;
  eggWorldToast: (name: string) => string;
  /** SPEC 12 B modlar */
  modsHint: string;
  modsEmpty: string;
  modsInvalid: string;
  modsOpen: string;
  modsRestart: string;
  modsPending: string;
  modsBy: (author: string, description: string) => string;

  aboutVersion: string;
  aboutPrivacyTitle: string;
  aboutPrivacy: string[];
  aboutSite: string;
  aboutContact: string;
  /** SPEC 10 CL4 */
  aboutWelcome: string;
  /** FB6 ilk adımları baştan göster */
  aboutFirstSteps: string;
  /** FB6 haftalık sayaç izni (home kartı) */
  telemetryAskText: string;
  telemetryAskYes: string;
  telemetryAskNo: string;
  /** SPEC 10 CL1 */
  updateToast: string;
  aboutUpdateCheck: string;
  aboutUpdateBusy: string;
  aboutUpdateAvailable: (version: string) => string;
  aboutUpdateInstall: string;
  aboutUpdateNone: string;
  /** FB12: kontrol/kurulum olmadı (ardından teknik hata metni) */
  aboutUpdateError: string;
  welcomeLine: string;
}

/** setup.exe ilk satırı: dil henüz bilinmiyor, iki dilde. */
export const PICK_LANG = "dil / language";
export const LANG_NAMES: Record<Lang, string> = { tr: "türkçe", en: "english" };
/** about.txt: landing adresi henüz yok (worker CORS'ta da yer tutucu). */
export const SITE_URL = "[site link]";
export const CONTACT = "dunnothebean@gmail.com";

export const STRINGS: Record<Lang, UiStrings> = {
  tr: {
    setupQuestion: "dunno masaüstüne kurulsun mu?",
    setupBlurb: "ekranının bir köşesini ve sabrının neredeyse tamamını kaplar. hiçbir şey yapmaz. özelliği bu.",
    setupLang: "dil",
    setupMode: "ağız",
    modePolite: "terbiyeli",
    modeStreet: "sokak ***",
    setupYes: "[ evet ]",
    setupDunno: "[ bilmiyorum ]",
    setupDunnoToast: "harika cevap. seninle gurur duyuyor. yine de kuruluyor.",
    firstRunDone: "tamam. yine de bir şey bilmiyorum",

    askPlaceholder: "sor, cevaplamam",
    askSend: "sor",
    heartsLabel: (n) => `bugün ${n} doğru cevap hakkı kaldı`,
    thinkingVerb: "düşünüyor",
    thinkingVerbs: ["düşünüyor", "çok düşünüyor", "düşünüyormuş gibi yapıyor", "neredeyse"],
    dozeAsleep: "zzz… (düşünürken uyuyakaldı)",
    dozeWake: "hı. ne. ha. ",
    waitTitle: "biraz bekle",
    waitSeconds: (n) => `${n} sn`,
    tooFastFallback: "yavaş biraz. bir dakika ver",
    brainOffFallback: "bugün beynim kapalı. bunlar yedekten",
    homeAfterLimit: "sonrası: işe yaramaz cevaplar",
    fallbackAnswer: "bilmiyorum",

    limitTitle: "429: soru hakkı bitti",
    limitFallback: "mesai bitti. sonsuza dek.",
    mutedTitle: "503: bugün kapalı",
    mutedBody: "bugün kapalıyım. yarın da belki.",
    ok: "[ tamam ]",

    tabHome: "home",
    homeQuestionsLeft: (l, t) => `${l} / ${t} doğru cevap hakkı`,
    homeNow: "şu an",
    homeMode: "ağız",
    homeLang: "dil",
    homeMuteToday: "bugün sus",
    homeMeeting: "toplantıdayım",
    homeSummon: "dunno'yu çağır",
    homeSendToEdge: "kenara gönder",
    homeMuteHint: "yarın sabaha kadar uyur. laf atmaz, soru almaz.",
    homeMeetingHint: "toplantı bitene ya da sen kapatana kadar saklanır.",
    todayResets: "yarın 00:00'da yenilenir",
    todayLines: (n) => `bugün atılan laf: ${n ?? "-"}`,
    settingsAutostartHint: "oturum açınca sadece pet gelir, bu pencere açılmaz.",
    settingsFrequencyHint: "kendiliğinden laf atma sıklığı. sorulara etkisi yok.",
    homeInMeeting: "toplantı var. sus modundayım.",
    homeHiding: "toplantıda, saklanıyor",
    settingsBubble: "balon süresi",
    settingsDark: "karanlık mod",
    darkModes: { off: "kapalı", on: "açık", system: "sistem" },
    settingsSize: "boyut",
    settingsFart: "osuruk",
    settingsFartHint: "arada bir, yemekten sonra biraz daha sık. toplantıda asla.",
    settingsTabTitles: "sekme adlarına bak",
    settingsTabTitlesHint: "başlığı okur, unutur. hiçbir yere göndermez.",
    settingsMusic: "müziğe tepki",
    settingsMusicHint: "çalan şarkının sadece özetini bilir: aynı şarkı mı, atladın mı, ne kadar sürdü. şarkı ve sanatçı adını söylemez, saklamaz, göndermez. spotify, youtube, her şey.",
    settingsMacAx: "erişilebilirlik izni",
    settingsMacAxHint: "mac sekme adı için bunu ister. sadece öndeki pencerenin başlığı, okur, unutur. sistem ayarlarından geri alınır.",
    settingsMacAxGrant: "izin ver",
    settingsMacAxOn: "verildi",
    settingsVoice: "dunno sesi",
    settingsVoiceHint: "anlamsız robot mırıltısı. ne dediğini okumaz, zaten bir şey demiyor. toplantıda susar.",
    settingsVoiceVolume: "ses düzeyi",
    voiceVolumes: { low: "kısık", medium: "orta", high: "yüksek" },
    settingsTelemetry: "kullanım sayılarını gönder",
    settingsTelemetryHint: "sadece sayı: açıldı, soru soruldu, başarım açıldı. soru, başlık, kimlik asla. kapalıyken hiçbir şey gitmez.",
    testFart: "osur",
    sizeNext: (n) => `boyut değiştir (şu an ${n})`,
    bubbleShort: "kısa",
    bubbleNormal: "normal",
    bubbleLong: "uzun",
    on: "açık",
    off: "kapalı",
    stateNames: {
      idle: "boş boş duruyor",
      shrug: "omuz silkiyor",
      walk: "yürüyor",
      talk: "konuşuyor",
      sleep: "uyuyor",
      run_away: "kaçıyor",
      sulk: "küs",
      peek: "dikizliyor",
      shh: "susuyor",
      dragged: "taşınıyor",
    },

    settingsMode: "ağız",
    settingsLang: "dil",
    settingsFrequency: "konuşma sıklığı",
    freqLow: "az",
    freqNormal: "normal",
    freqHigh: "çok",
    settingsAutostart: "windows ile başlat",
    settingsAutostartMac: "mac açılınca başlat",
    settingsMuteToday: "bugün sus",

    statsAskedToday: "bugün sorulan",
    statsQuestionsTotal: "toplam soru",
    statsPokes: "dürtme",
    statsDrags: "sürükleme",
    statsSleep: "uyku",
    statsTopApp: "en çok laf attığı yer",
    statsPokesToday: "bugün dürtme",
    statsLinesToday: "bugün attığı laf",
    statsHonest: "doğru cevap",
    statsFarts: "osuruk",
    statsTogether: "birlikteyiz",
    statsDays: (d, a) => `${d} gün (${a} gün aktif)`,
    statsWeekHint: "son 7 gün: soru + dürtme + laf. yükselen çubuk = boşa geçen zaman",
    weekdays: ["pz", "pt", "sa", "ça", "pe", "cu", "ct"],
    statsNone: "yok",
    statsReset: "sıfırla",
    statsPrivacy: "hepsi bu bilgisayarda. hiçbiri bir yere gitmez.",
    minutes: (m) => `${m} dk`,

    accessoryNames: {
      beanie: "bere",
      crown: "taç",
      party_hat: "parti şapkası",
      sunglasses: "güneş gözlüğü",
      nightcap: "gece başlığı",
      headphones: "kulaklık",
      cowboy_hat: "kovboy şapkası",
      pirate_bandana: "korsan bandanası",
      chef_hat: "aşçı şapkası",
      wizard_hat: "sihirbaz şapkası",
      grad_cap: "mezuniyet kepi",
      hard_hat: "inşaat kaskı",
      cat_ears: "kedi kulakları",
      monocle: "monokl",
      nerd_glasses: "nerd gözlüğü",
      bow_tie: "papyon",
      scarf: "atkı",
      cape: "pelerin",
      ribbon: "kurdele",
      flower: "çiçek",
    },
    costumeNames: {
      bug: "böcek",
      fly: "sinek",
      bee: "arı",
      ghost: "hayalet",
      dino: "dinozor",
      frog: "kurbağa",
      astronaut: "astronot",
      pizza: "pizza dilimi",
      cockroach: "hamamböceği",
      cat: "kedi",
      dog: "köpek",
      slime: "slime",
      mushroom: "mantar",
      robot: "robot",
      alien: "uzaylı",
      fish: "balık",
      duck: "ördek",
      skeleton: "iskelet",
      vampire: "vampir",
      mini_monster: "mini canavar",
    },
    wrSlots: { head: "kafa", eyes: "göz", neck: "boyun", body: "gövde", side: "yan" },
    wrSlotHint: (n) => `her yere bir tane. en fazla ${n} parça. fazlası moda değil`,
    wrBlocked: "kostüm kapatıyor",
    unlockToast: (item) => `açıldı: ${item}. kimse bu kadarını beklemiyordu`,
    wrNone: "hiçbiri",
    wrLocked: "kilitli",
    wrPreview: { idle: "boş", walk: "yürü", sleep: "uyu", peek: "kenar" },
    wrUnlockedOn: (d) => `açıldı · ${d}`,
    wrCandidate: "renkler onay bekliyor",
    wrCats: { start: "başla", themes: "temalar", costumes: "kostümler", accessories: "aksesuarlar" },
    wrPresets: "hazır görünümler",
    presetNames: { starter: "ilk gün", cozy: "battaniye", office: "ofis", party: "parti", buzz: "vız", spooky: "gece yarısı" },
    wrPresetOpen: (o, n) => `${o}/${n} parça açık`,
    wrNext: "sıradaki",
    wrProgress: (d, n) => `${d}/${n} başarım. acele yok`,
    wrAchShow: "hepsini göster",
    wrAchHide: "kapat",
    packNames: { bugs: "böcekler", animals: "hayvanlar", spooky: "gece", odd: "tuhaflar", other: "diğer" },
    wrOnlyOpen: "sadece açıklar",
    wrHiddenLocked: "kilitliler gizli. hepsini görmek için filtreyi kapat",
    wrThemeNow: "tema",
    wrNothingWorn: "çıplak. kimse şikayetçi değil",
    wrTakeOff: (item) => `çıkar: ${item}`,
    settingsGroups: { behavior: "davranış", look: "görünüm", bubble: "konuşma balonu", sound: "ses", privacy: "gizlilik", system: "sistem", mods: "modlar", secret: "gizli", pro: "pro", personal: "kişisel dunno" },
    setCats: {
      general: { name: "genel", hint: "ağız, dil, sıklık, açılış" },
      look: { name: "görünüm", hint: "boyut, karanlık mod, balon" },
      sound: { name: "ses", hint: "dunno sesi, düzey, osuruk" },
      privacy: { name: "gizlilik", hint: "sekme adları, sayılar, kişisel" },
      pro: { name: "pro", hint: "lisans, kişilik" },
      mods: { name: "modlar", hint: "modlar, gizli dünyalar" },
    },
    personalWhat: [
      "varsayılan kapalı. açarsan sadece bu bilgisayarda kalır, internete, yapay zekâya, istatistiğe gitmez.",
      "kullandığı: aşağıya bilerek yazdıkların + hangi uygulamadasın (excel gibi, pencere adı değil).",
      "kullanmadığı: soruların, sohbetlerin, mesajların, pencere başlıkların. şifre, e-posta, link ve hassas konular kabul edilmez.",
      "istediğin zaman görür, düzeltir, tek tuşla silersin. kapatınca da silinir.",
    ],
    personalProOnly: "kişisel dunno pro'da. free'de dunno seni tanımaz, genel laflarla takılır.",
    personalConsent: "okudum, kişisel dunno'yu açıyorum",
    personalOn: "aç",
    personalSince: (d) => `açık · rıza: ${d}`,
    personalFields: {
      preferred_name: "sana ne diyeyim",
      inside_jokes: "aramızdaki şakalar",
      recurring_topics: "sık konuştuğumuz konular",
      common_workflows: "rutinlerin",
      explicit_preferences: "bilmemi istediklerin",
    },
    personalListHint: "virgülle ayır. en fazla 8, her biri en fazla 40 karakter.",
    personalSliders: {
      calm_chaotic: ["sakin", "kaotik"],
      sweet_teasing: ["tatlı", "takılan"],
      polite_roast: ["kibar", "giydiren"],
      quiet_chatty: ["sessiz", "geveze"],
      robotic_absurd: ["robotik", "absürt"],
    },
    personalSave: "kaydet",
    personalSaved: "kaydedildi. sadece burada",
    personalForget: "hepsini sil ve kapat",
    personalRejected: { secret: "şifre, e-posta, link ya da uzun sayı gibi. alınmadı", sensitive: "hassas konu. alınmadı", too_long: "çok uzun. alınmadı", empty: "boş" },
    settingsBubbleStyle: "balon stili",
    settingsVoiceStyle: "ses tonu",
    bubbleStyles: { classic: "klasik", mint: "nane", night: "gece", cotton: "pamuk", ink: "mürekkep" },
    voiceStyles: { classic: "klasik", tiny: "minik", robot: "robot", deep: "kalın" },
    progressNext: (r, at, done) => `sıradaki: ${r}, ${at} başarımda (şu an ${done})`,
    progressAll: "ilerleme ödüllerinin hepsi açık. boşuna uğraştın",
    rewardMonster: "canavar modu",
    proStatus: "dunno pro",
    proFree: "free. dunno'nun hepsi burada, pro sadece derinlik",
    proOn: (tail) => `pro · …${tail}`,
    proSim: "pro (test simülasyonu)",
    proWhat: "pro: daha derin uygulama lafları, nadir laflar, 5 aksesuar yeri, kişilik, gelişmiş modlar. kostüm satılmaz.",
    proDisabled: "pro henüz satışta değil. bu sürümde lisans kapalı.",
    proKeyLabel: "lisans anahtarı",
    proActivate: "etkinleştir",
    proClaimTitle: "satın aldıysan: sipariş numarası ve e-postayla lisansı getir",
    proOrder: "sipariş no",
    proEmail: "e-posta (sadece eşleştirmek için, saklanmaz)",
    proClaim: "lisansı getir",
    proClaimFail: {
      notFound: "bu sipariş ve e-postayla ödenmiş bir şey bulamadım",
      tooMany: "bugünlük yeter. yarın tekrar dene",
      offline: "sunucuya ulaşamadım. internet var mı",
      closed: "satış henüz açılmadı",
    },
    proUntil: (d) => `abonelik ${d} tarihine kadar. kendiliğinden yenilenir`,
    proExpired: "abonelik bitti. yenilenince kendiliğinden açılır",
    proRemove: "bu bilgisayardan kaldır",
    proErrors: { format: "bu bir dunno anahtarına benzemiyor", signature: "anahtar geçersiz", payload: "anahtar bozuk", disabled: "bu sürümde lisans kapalı" },
    proActivated: "pro açık. dunno yine bir şey bilmiyor ama daha derinden",
    settingsPersonality: "kişilik",
    personalities: { balanced: "dengeli", calm: "sakin", chatty: "geveze", chaotic: "kaotik" },
    personalityHint: "ne kadar konuşur, ne kadar dolaşır.",
    proOnly: "pro",
    modsProKinds: (k) => `free'de atlandı: ${k} (pro)`,
    modsLimit: (n) => `free'de en fazla ${n} mod. bu yüklenmedi`,
    eggWorld: "dünya",
    eggWorldHint: "dürterek açtın. istersen normale dön.",
    eggWorldNames: { normal: "normal", paper: "kağıt", glitch: "glitch" },
    eggMonster: "canavar modu",
    eggMonsterHint: "nasıl açtığını biliyorsun. aynı şekilde kapanır.",
    eggWorldToast: (name) => `${name} dünya açıldı. settings.exe > gizli`,
    modsHint: "modlar sadece veri: tema, aksesuar, laf, balon (pro: kostüm, ses, davranış). kod yok, internet yok, sorularını görmez.",
    modsEmpty: "mod yok. klasöre bir mod klasörü koy.",
    modsInvalid: "yüklenmedi",
    modsOpen: "klasörü aç",
    modsRestart: "yeniden başlat",
    modsPending: "değişiklik yeniden başlatınca geçerli.",
    modsBy: (a, d) => (d ? `${a} · ${d}` : a),
    achievements: {
      // SPEC 09 K9 + SPEC 12 metinleri (eskiden bağlanmamıştı: dolapta id görünüyordu)
      ...K9_ACHIEVEMENT_TEXT.tr,
      ...SPEC12_ACHIEVEMENT_TEXT.tr,
      learned_nothing_7: { title: "hiçbir şey öğrenmedim", goal: (n) => `${n} farklı gün aç` },
      poke_100: { title: "dürtülmeye alıştım", goal: (n) => `${n} kez dürt` },
      night_owl: { title: "gece kuşu", goal: () => "gece 00:00-05:00 arası soru sor" },
      out_of_questions_5: { title: "soru biriktirmiyorum", goal: (n) => `${n} farklı gün tüm hakları bitir` },
      drag_50: { title: "taşınmaya alıştım", goal: (n) => `${n} kez sürükle` },
      meeting_survivor: { title: "toplantıdan sağ çıktım", goal: (n) => `toplantı koruması ${n} kez devreye girsin` },
      spreadsheet_10: { title: "tablolardan bıktım", goal: (n) => `excel öndeyken ${n} laf` },
      idle_hour: { title: "ikimiz de boştaydık", goal: (n) => `${n} kez 60 dk boşta kal` },
      street_mode_day: { title: "sokakta bir gün", goal: (n) => `sokak modunda ${n} saat kal` },
    },

    aboutVersion: "sürüm",
    aboutPrivacyTitle: "gizlilik",
    aboutPrivacy: [
      "ekranını göremem. gözlerim zaten çoğu zaman kapalı.",
      "klavyeni dinlemem. sorduğun şey saklanmaz, çünkü dinlemiyordum.",
      "sadece hangi uygulamada olduğunu bilirim. o da bu bilgisayardan çıkmaz.",
      "sekme adına bir bakarım, türünü anlarım, unuturum. ayarlardan kapatılır.",
      "istatistik göndermem. sen açarsan sadece sayı gönderirim, soru ya da başlık asla.",
    ],
    aboutSite: "site",
    aboutContact: "iletişim",
    aboutWelcome: "karşılamayı tekrar oynat",
    aboutFirstSteps: "ilk adımları yeniden göster",
    telemetryAskText: "bir haftadır buradayım. birkaç sayı gönderebilir miyim: kaç kez açıldım, kaç soru, kaç gün. soru metni, başlık, kim olduğun asla. istemezsen hiçbir şey gitmez, bir daha da sormam.",
    telemetryAskYes: "sayıları gönder",
    telemetryAskNo: "gönderme",
    updateToast: "yeni sürüm. kurmak zorunda değilsin. ama kur",
    aboutUpdateCheck: "güncellemeleri kontrol et",
    aboutUpdateBusy: "bakıyorum",
    aboutUpdateAvailable: (v) => `yeni sürüm: ${v}`,
    aboutUpdateInstall: "kur",
    aboutUpdateNone: "en yenisi bu. yani bu kadar",
    aboutUpdateError: "bakamadım",
    // placeholder: tasarımcı onayı bekliyor
    welcomeLine: "merhaba. ben dunno. hiçbir şey bilmem. köşede uyuyorum",
  },
  en: {
    setupQuestion: "install dunno on your desktop?",
    setupBlurb: "he'll take up one corner of your screen and roughly all of your patience. he doesn't do anything. that's the feature.",
    setupLang: "language",
    setupMode: "mouth",
    modePolite: "polite",
    modeStreet: "street ***",
    setupYes: "[ yes ]",
    setupDunno: "[ dunno ]",
    setupDunnoToast: "great answer. he's proud of you. installing anyway.",
    firstRunDone: "fine. still know nothing",

    askPlaceholder: "ask away (i won't answer)",
    askSend: "ask",
    heartsLabel: (n) => `${n} of 3 right answers left today`,
    thinkingVerb: "is thinking",
    thinkingVerbs: ["is thinking", "is thinking hard", "is pretending to think", "almost"],
    dozeAsleep: "zzz… (he fell asleep while thinking)",
    dozeWake: "huh. what. oh. ",
    waitTitle: "wait a bit",
    waitSeconds: (n) => `${n} s`,
    tooFastFallback: "slow down. give me a minute",
    brainOffFallback: "brain's off today. these are reruns",
    homeAfterLimit: "after that: useless answers",
    fallbackAnswer: "no idea",

    limitTitle: "429: out of questions",
    limitFallback: "office hours are over. forever.",
    mutedTitle: "503: closed today",
    mutedBody: "closed today. maybe tomorrow too.",
    ok: "[ ok ]",

    tabHome: "home",
    homeQuestionsLeft: (l, t) => `${l} / ${t} right answers left`,
    homeNow: "right now",
    homeMode: "mouth",
    homeLang: "language",
    homeMuteToday: "quiet today",
    homeMeeting: "in a meeting",
    homeSummon: "summon dunno",
    homeSendToEdge: "send to the side",
    homeMuteHint: "sleeps until tomorrow morning. no lines, no questions.",
    homeMeetingHint: "hides until the meeting is over. or until you turn this off.",
    todayResets: "refills tomorrow at 00:00",
    todayLines: (n) => `lines said today: ${n ?? "-"}`,
    settingsAutostartHint: "at login only the pet shows up, not this window.",
    settingsFrequencyHint: "how often he talks on his own. questions are not affected.",
    homeInMeeting: "meeting in progress. keeping quiet.",
    homeHiding: "in a meeting, hiding",
    settingsBubble: "bubble time",
    settingsDark: "dark mode",
    darkModes: { off: "off", on: "on", system: "system" },
    settingsSize: "size",
    settingsFart: "farts",
    settingsFartHint: "now and then, a bit more after meals. never in meetings.",
    settingsTabTitles: "look at tab names",
    settingsTabTitlesHint: "reads the title, forgets it. sends it nowhere.",
    settingsMusic: "react to music",
    settingsMusicHint: "only knows a summary of what's playing: same song, skipped, how long. never says, keeps or sends song or artist names. spotify, youtube, anything.",
    settingsMacAx: "accessibility access",
    settingsMacAxHint: "mac wants this for tab names. only the front window's title, read and forgotten. revoke it in system settings.",
    settingsMacAxGrant: "allow",
    settingsMacAxOn: "allowed",
    settingsVoice: "dunno voice",
    settingsVoiceHint: "meaningless robot mumbling. it never reads what he says. he isn't saying anything anyway. silent in meetings.",
    settingsVoiceVolume: "volume",
    voiceVolumes: { low: "low", medium: "medium", high: "high" },
    settingsTelemetry: "send usage counts",
    settingsTelemetryHint: "just numbers: opened, asked, unlocked. never the question, a title or who you are. off means nothing leaves.",
    testFart: "fart now",
    sizeNext: (n) => `cycle size (now ${n})`,
    bubbleShort: "short",
    bubbleNormal: "normal",
    bubbleLong: "long",
    on: "on",
    off: "off",
    stateNames: {
      idle: "doing nothing",
      shrug: "shrugging",
      walk: "walking",
      talk: "talking",
      sleep: "asleep",
      run_away: "running away",
      sulk: "sulking",
      peek: "peeking",
      shh: "keeping quiet",
      dragged: "being carried",
    },

    settingsMode: "mouth",
    settingsLang: "language",
    settingsFrequency: "chattiness",
    freqLow: "a little",
    freqNormal: "normal",
    freqHigh: "a lot",
    settingsAutostart: "start with windows",
    settingsAutostartMac: "start when the mac starts",
    settingsMuteToday: "quiet today",

    statsAskedToday: "asked today",
    statsQuestionsTotal: "questions total",
    statsPokes: "pokes",
    statsDrags: "drags",
    statsSleep: "time asleep",
    statsTopApp: "most talked about",
    statsPokesToday: "pokes today",
    statsLinesToday: "lines today",
    statsHonest: "right answers",
    statsFarts: "farts",
    statsTogether: "together for",
    statsDays: (d, a) => `${d} days (${a} active)`,
    statsWeekHint: "last 7 days: questions + pokes + lines. taller bar = more time wasted",
    weekdays: ["su", "mo", "tu", "we", "th", "fr", "sa"],
    statsNone: "none",
    statsReset: "reset",
    statsPrivacy: "all of it stays on this computer. none of it goes anywhere.",
    minutes: (m) => `${m} min`,

    accessoryNames: {
      beanie: "beanie",
      crown: "crown",
      party_hat: "party hat",
      sunglasses: "sunglasses",
      nightcap: "nightcap",
      headphones: "headphones",
      cowboy_hat: "cowboy hat",
      pirate_bandana: "pirate bandana",
      chef_hat: "chef hat",
      wizard_hat: "wizard hat",
      grad_cap: "graduation cap",
      hard_hat: "hard hat",
      cat_ears: "cat ears",
      monocle: "monocle",
      nerd_glasses: "nerd glasses",
      bow_tie: "bow tie",
      scarf: "scarf",
      cape: "cape",
      ribbon: "ribbon",
      flower: "flower",
    },
    costumeNames: {
      bug: "bug",
      fly: "fly",
      bee: "bee",
      ghost: "ghost",
      dino: "dino",
      frog: "frog",
      astronaut: "astronaut",
      pizza: "pizza slice",
      cockroach: "cockroach",
      cat: "cat",
      dog: "dog",
      slime: "slime",
      mushroom: "mushroom",
      robot: "robot",
      alien: "alien",
      fish: "fish",
      duck: "duck",
      skeleton: "skeleton",
      vampire: "vampire",
      mini_monster: "mini monster",
    },
    wrSlots: { head: "head", eyes: "eyes", neck: "neck", body: "body", side: "side" },
    wrSlotHint: (n) => `one per spot. ${n} pieces max. more is not fashion`,
    wrBlocked: "costume covers it",
    unlockToast: (item) => `unlocked: ${item}. nobody expected this much`,
    wrNone: "none",
    wrLocked: "locked",
    wrPreview: { idle: "idle", walk: "walk", sleep: "sleep", peek: "peek" },
    wrUnlockedOn: (d) => `unlocked · ${d}`,
    wrCandidate: "colors pending approval",
    wrCats: { start: "start", themes: "themes", costumes: "costumes", accessories: "accessories" },
    wrPresets: "ready-made looks",
    presetNames: { starter: "day one", cozy: "blanket", office: "office", party: "party", buzz: "buzz", spooky: "midnight" },
    wrPresetOpen: (o, n) => `${o}/${n} pieces unlocked`,
    wrNext: "next up",
    wrProgress: (d, n) => `${d}/${n} achievements. no rush`,
    wrAchShow: "show all",
    wrAchHide: "hide",
    packNames: { bugs: "bugs", animals: "animals", spooky: "night", odd: "odd ones", other: "other" },
    wrOnlyOpen: "unlocked only",
    wrHiddenLocked: "locked ones are hidden. turn the filter off to see them",
    wrThemeNow: "theme",
    wrNothingWorn: "naked. nobody complained",
    wrTakeOff: (item) => `take off: ${item}`,
    settingsGroups: { behavior: "behavior", look: "look", bubble: "speech bubble", sound: "sound", privacy: "privacy", system: "system", mods: "mods", secret: "secret", pro: "pro", personal: "personal dunno" },
    setCats: {
      general: { name: "general", hint: "mouth, language, frequency, startup" },
      look: { name: "look", hint: "size, dark mode, bubble" },
      sound: { name: "sound", hint: "dunno voice, volume, farts" },
      privacy: { name: "privacy", hint: "tab titles, counts, personal" },
      pro: { name: "pro", hint: "license, personality" },
      mods: { name: "mods", hint: "mods, secret worlds" },
    },
    personalWhat: [
      "off by default. if you turn it on it stays on this computer only, never goes to the internet, an ai or stats.",
      "uses: what you deliberately type below + which app you're in (like excel, not the window title).",
      "doesn't use: your questions, chats, messages, window titles. passwords, emails, links and sensitive topics are refused.",
      "see it, fix it, delete it with one button anytime. turning it off deletes it too.",
    ],
    personalProOnly: "personal dunno is pro. in free, dunno doesn't know you and sticks to general lines.",
    personalConsent: "i read this, turn on personal dunno",
    personalOn: "turn on",
    personalSince: (d) => `on · consent: ${d}`,
    personalFields: {
      preferred_name: "what should i call you",
      inside_jokes: "our inside jokes",
      recurring_topics: "things we talk about",
      common_workflows: "your routines",
      explicit_preferences: "things i should know",
    },
    personalListHint: "comma separated. up to 8, 40 characters each.",
    personalSliders: {
      calm_chaotic: ["calm", "chaotic"],
      sweet_teasing: ["sweet", "teasing"],
      polite_roast: ["polite", "roast"],
      quiet_chatty: ["quiet", "chatty"],
      robotic_absurd: ["robotic", "absurd"],
    },
    personalSave: "save",
    personalSaved: "saved. only here",
    personalForget: "delete all and turn off",
    personalRejected: { secret: "looks like a password, email, link or long number. not saved", sensitive: "sensitive topic. not saved", too_long: "too long. not saved", empty: "empty" },
    settingsBubbleStyle: "bubble style",
    settingsVoiceStyle: "voice tone",
    bubbleStyles: { classic: "classic", mint: "mint", night: "night", cotton: "cotton", ink: "ink" },
    voiceStyles: { classic: "classic", tiny: "tiny", robot: "robot", deep: "deep" },
    progressNext: (r, at, done) => `next: ${r}, at ${at} achievements (now ${done})`,
    progressAll: "all progress rewards unlocked. you tried too hard",
    rewardMonster: "monster mode",
    proStatus: "dunno pro",
    proFree: "free. all of dunno is here, pro is just depth",
    proOn: (tail) => `pro · …${tail}`,
    proSim: "pro (test simulation)",
    proWhat: "pro: deeper app lines, rare lines, 5 accessory spots, personality, advanced mods. costumes are never sold.",
    proDisabled: "pro is not on sale yet. licenses are off in this version.",
    proKeyLabel: "license key",
    proActivate: "activate",
    proClaimTitle: "if you bought it: get your license with the order number and email",
    proOrder: "order no",
    proEmail: "email (only to match, never stored)",
    proClaim: "get license",
    proClaimFail: {
      notFound: "no paid order with that number and email",
      tooMany: "enough for today. try again tomorrow",
      offline: "can't reach the server. is your internet on",
      closed: "sales aren't open yet",
    },
    proUntil: (d) => `subscription until ${d}. renews by itself`,
    proExpired: "subscription ended. turns back on when it renews",
    proRemove: "remove from this computer",
    proErrors: { format: "that doesn't look like a dunno key", signature: "invalid key", payload: "broken key", disabled: "licenses are off in this version" },
    proActivated: "pro is on. dunno still knows nothing, just deeper",
    settingsPersonality: "personality",
    personalities: { balanced: "balanced", calm: "calm", chatty: "chatty", chaotic: "chaotic" },
    personalityHint: "how much it talks, how much it wanders.",
    proOnly: "pro",
    modsProKinds: (k) => `skipped in free: ${k} (pro)`,
    modsLimit: (n) => `free allows up to ${n} mods. this one didn't load`,
    eggWorld: "world",
    eggWorldHint: "you poked your way here. go back to normal anytime.",
    eggWorldNames: { normal: "normal", paper: "paper", glitch: "glitch" },
    eggMonster: "monster mode",
    eggMonsterHint: "you know how you turned it on. same way off.",
    eggWorldToast: (name) => `${name} world unlocked. settings.exe > secret`,
    modsHint: "mods are data only: themes, accessories, lines, bubbles (pro: costumes, sounds, behavior). no code, no internet, never sees your questions.",
    modsEmpty: "no mods. drop a mod folder in there.",
    modsInvalid: "not loaded",
    modsOpen: "open folder",
    modsRestart: "restart",
    modsPending: "changes apply after a restart.",
    modsBy: (a, d) => (d ? `${a} · ${d}` : a),
    achievements: {
      // SPEC 09 K9 + SPEC 12 metinleri (eskiden bağlanmamıştı: dolapta id görünüyordu)
      ...K9_ACHIEVEMENT_TEXT.en,
      ...SPEC12_ACHIEVEMENT_TEXT.en,
      learned_nothing_7: { title: "learned nothing", goal: (n) => `open on ${n} different days` },
      poke_100: { title: "used to being poked", goal: (n) => `poke him ${n} times` },
      night_owl: { title: "night owl", goal: () => "ask something between 00:00 and 05:00" },
      out_of_questions_5: { title: "no questions saved", goal: (n) => `use up all questions on ${n} days` },
      drag_50: { title: "used to being carried", goal: (n) => `drag him ${n} times` },
      meeting_survivor: { title: "meeting survivor", goal: (n) => `let meeting guard kick in ${n} times` },
      spreadsheet_10: { title: "tired of tables", goal: (n) => `${n} lines while excel is in front` },
      idle_hour: { title: "we were both idle", goal: (n) => `stay idle for 60 min ${n} times` },
      street_mode_day: { title: "a day on the street", goal: (n) => `stay in street mode for ${n} hours` },
    },

    aboutVersion: "version",
    aboutPrivacyTitle: "privacy",
    aboutPrivacy: [
      "dunno can't see your screen. his eyes are mostly closed.",
      "nothing you say is stored, because he wasn't listening.",
      "he only knows which app you're in. that never leaves this computer.",
      "he glances at the tab name, guesses its kind, forgets it. you can turn this off.",
      "no stats leave. if you turn them on, only counts go, never a question or a title.",
    ],
    aboutSite: "site",
    aboutContact: "contact",
    aboutWelcome: "replay the welcome",
    aboutFirstSteps: "show the first steps again",
    telemetryAskText: "i've been here a week. can i send a few numbers: how often i'm opened, how many questions, how many days. never the question text, a title or who you are. say no and nothing leaves, and i won't ask again.",
    telemetryAskYes: "send the numbers",
    telemetryAskNo: "don't send",
    updateToast: "new version. you don't have to install it. but do",
    aboutUpdateCheck: "check for updates",
    aboutUpdateBusy: "looking",
    aboutUpdateAvailable: (v) => `new version: ${v}`,
    aboutUpdateInstall: "install",
    aboutUpdateNone: "this is the latest. so this is it",
    aboutUpdateError: "couldn't check",
    // placeholder: awaiting designer approval
    welcomeLine: "hi. i'm dunno. i know nothing. i'll be asleep in the corner",
  },
};

/** SPEC 19: macOS'ta mı (webview kullanıcı aracısı; sadece metin seçimi için) */
export const isMac = (): boolean => typeof navigator !== "undefined" && /Macintosh|Mac OS X/.test(navigator.userAgent);
