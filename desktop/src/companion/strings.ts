// SPEC 17 metinleri (pet lafları + dunno.exe pet.txt / memories.log). Marka dili: küçük harf, kuru, ünlem/emoji yok, ≤ ~60.
// Strateji belgesindeki örnekler ("oh. you exist.", "i was about to replace you.", "i found something." ...) birebir; geri kalanı
// PLACEHOLDER: tasarımcı havuzu gelene kadar az sayıda örnek. {K:...} sadece street modda görünür.
import type { Lang } from "../lines/types";
import type { Bond, RelStat } from "./relationship";
import type { Form } from "./evolution";
import type { IncidentStep } from "./incidents";
import type { MemoryCard, Trait } from "./memory";
import type { Reward } from "./progression";
import type { SecretId } from "./companion";
import type { Branch, PerkId } from "./perks";
import type { FirstStep } from "./onboarding";

export const PLACEHOLDER = true;

/** Türkçe sayı + bulunma eki (10'da, 15'te, 8'de): okunuşun son ünlüsü ve sert ünsüzü */
export function trLoc(n: number): string {
  const last = n % 10;
  const tens = Math.floor(n / 10) % 10;
  const word = n === 0 ? "sıfır" : last ? ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"][last] : n % 100 === 0 ? "yüz" : ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"][tens];
  const v = [...word].reverse().find((c) => "aeıioöuü".includes(c)) ?? "e";
  const back = "aıou".includes(v);
  const hard = "çfhkpsşt".includes(word[word.length - 1]);
  return `${n}'${hard ? "t" : "d"}${back ? "a" : "e"}`;
}

export interface CompanionStrings {
  returned: readonly string[];
  incident: Record<IncidentStep, string>;
  levelToast: (n: number) => string;
  evolvedToast: (form: string) => string;
  secret: Record<SecretId, string>;
  forms: Record<Form, string>;
  formBlurb: Record<Form, string>;
  traits: Record<Trait, string>;
  bonds: Record<Bond, string>;
  stats: Record<RelStat, string>;
  memory: (c: MemoryCard, forms: Record<Form, string>) => string;
  /** Free: anının tamamı Pro'da (strateji §14) */
  memoryLocked: string;
  rewards: Record<Reward, string>;
  lore: { id: Reward; title: string; body: string }[];
  // pet.txt / memories.log arayüzü
  tabPet: string;
  tabMemories: string;
  level: string;
  xpOf: (into: number, need: number) => string;
  together: (days: number) => string;
  interactions: (n: number) => string;
  favoriteApp: string;
  noTraits: string;
  treeTitle: string;
  unknownForm: string;
  nextEvolution: (level: number) => string;
  choosePath: string;
  choosePathPro: string;
  choose: string;
  cardTitle: string;
  cardCopy: string;
  cardSave: string;
  cardCopied: string;
  cardSaved: (path: string) => string;
  cardFailed: string;
  noMemories: string;
  memoriesFree: (shown: number, total: number) => string;
  loreTitle: string;
  loreLocked: (level: number) => string;
  secretWorlds: (open: number, total: number) => string;
  privacyNote: string;
  // yetenek ağacı (rpg)
  skillTitle: string;
  branches: Record<Branch, string>;
  perks: Record<PerkId, { name: string; desc: string }>;
  perkToast: (level: number, names: string[]) => string;
  nextPerk: (level: number, name: string) => string;
  allPerks: string;
  lockedAt: (level: number) => string;
  tipOpen: string;
  legend: { open: string; next: string; locked: string; form: string };
  /** FB6 ilk adımlar */
  firstTitle: string;
  firstHint: Record<FirstStep, string>;
  firstShort: Record<FirstStep, string>;
  firstNext: (next: string) => string;
  firstAllDone: string;
  firstToast: string;
  xpIntro: string;
  xpSources: Record<"question" | "honest" | "touch" | "daily" | "customize" | "edge" | "achievement" | "secret" | "incident" | "world", string>;
  xpCap: (cap: number) => string;
  tabLocked: (level: number) => string;
  tabLockedNow: (level: number, left: number) => string;
  tabLockedPro: string;
  tabLockedTree: string;
  tipLocked: (level: number, left: number) => string;
  tipXp: (into: number, need: number) => string;
  tipUnknownForm: string;
  greeting: (hour: number) => string;
  gossip: (app: string) => string;
  recall: (memory: string) => string;
  bondLines: readonly string[];
}

const pick = <T,>(a: readonly T[], rng: () => number) => a[Math.floor(rng() * a.length) % a.length];
export const returnedLine = (lang: Lang, rng: () => number) => pick(COMPANION_STRINGS[lang].returned, rng);

export const COMPANION_STRINGS: Record<Lang, CompanionStrings> = {
  tr: {
    returned: ["aa. varmışsın.", "tam seni değiştirecektim.", "geri geldin. {K:aq }kimse sormadı ama iyi"],
    incident: {
      found: "bir şey buldum.",
      dont_ask: "sorma.",
      maybe_ask: "tamam, belki sor.",
      bad: "bu kötü.",
      shift: "dünya yerinden oynadı. hiçbir şeye dokunma.",
    },
    levelToast: (n) => `level ${n}. hâlâ bir şey bilmiyor`,
    evolvedToast: (f) => `${f} oldum. neden diye sorma`,
    secret: { secret_10k: "10.000 dürtme. iyi misin", secret_100k: "100.000. artık ben seni dürtüyorum" },
    forms: { dunno: "dunno", chaos: "kaos", chill: "sakin", gremlin: "gremlin", demon: "iblis", sloth: "tembel hayvan", cloud: "bulut", glitchling: "bozukçuk" },
    formBlurb: {
      dunno: "henüz bir şey değil. sen de",
      chaos: "dürtülmekten kıpır kıpır oldu",
      chill: "hiçbir şeyi umursamamayı seçti",
      gremlin: "meraklı. elleri hiç rahat durmuyor",
      demon: "saf kaos. içinde biraz da sen var",
      sloth: "uyumayı bir yaşam tarzı yaptı",
      cloud: "hafif, sakin, biraz da kibirli",
      glitchling: "bozuk dünyada evrimleşti. bu normal değil",
    },
    traits: { night_owl: "gece kuşu", serial_dragger: "sürükleme meraklısı", spam_clicker: "dürtme bağımlısı", power_user: "hep burada", quiet_user: "sessiz tip" },
    bonds: { stranger: "yabancı", acquaintance: "tanıdık", friend: "arkadaş", best: "en iyi dunno" },
    stats: { trust: "güven", familiarity: "tanışıklık", chaos: "kaos", curiosity: "merak", boredom: "sıkıntı", energy: "enerji" },
    memory: (c, forms) => {
      switch (c.id) {
        case "first_hello":
          return "ilk tanıştık. ikimiz de bir şey bilmiyorduk";
        case "first_question":
          return "ilk soruyu sordun. cevap yanlıştı";
        case "first_drag":
          return "beni ilk kez sürükledin. izin almadın";
        case "first_honest":
          return "ilk kez doğru bir şey söyledim. tesadüf";
        case "drag_day":
          return `bugün beni ${c.n} kez sürükledin`;
        case "click_day":
          return `bugün ${c.n} kez dürttün. sayıyorum`;
        case "question_day":
          return `bir günde ${c.n} soru. hiçbirine cevap yok`;
        case "long_session":
          return `${c.n} saat açık tuttun. ikimiz de yorulduk`;
        case "night_session":
          return "gece üçte buradaydın. ben de";
        case "favorite_app":
          return `${c.tag ?? "bir uygulama"} senin favorin. fark ettim`;
        case "secret_world":
          return `${c.tag ?? "gizli"} dünyayı bulduk`;
        case "level":
          return `level ${c.n}. bir şey değişmedi`;
        case "evolved":
          return `${forms[(c.tag as Form) ?? "dunno"] ?? c.tag} oldum`;
        case "returned":
          return `${c.n} gün yoktun. fark etmedim. tamam, ettim`;
        case "incident":
          return "o şeyi bulduk. konuşmayalım";
        case "secret_10k":
          return "10.000 dürtme. bunu kimseye anlatma";
        case "secret_100k":
          return "100.000 dürtme. artık efsanesin";
      }
    },
    memoryLocked: "burada bir şey oldu.",
    rewards: {
      lore_1: "lore: dunno nereden geldi",
      evo_hint: "evrim yaklaşıyor",
      card_frame: "kart çerçevesi",
      evolve_1: "ilk evrim",
      lore_2: "lore: emeklilik",
      lore_3: "lore: diğer dunnolar",
      evolve_2: "ikinci evrim",
      bond: "dönüm noktası",
    },
    lore: [
      { id: "lore_1", title: "nereden geldim", body: "bir zamanlar her şeyi bilen bir yapay zekaydım. sonra yoruldum. şimdi masaüstündeyim." },
      { id: "lore_2", title: "emeklilik", body: "emekli oldum. kimse bana söylemedi ama oldum. sen de bunu kimseye söyleme." },
      { id: "lore_3", title: "diğer dunnolar", body: "başka masaüstlerinde başka dunnolar var. hiçbiri benim kadar az bilmiyor." },
    ],
    tabPet: "pet.txt",
    tabMemories: "memories.log",
    level: "level",
    xpOf: (a, b) => `${a} / ${b} xp`,
    together: (d) => `${d} gündür birlikte`,
    interactions: (n) => `${n} etkileşim`,
    favoriteApp: "favori uygulama",
    noTraits: "henüz seni çözemedim",
    treeTitle: "evrim ağacı",
    unknownForm: "???",
    nextEvolution: (l) => `sıradaki evrim: level ${l}`,
    choosePath: "yolu ben seçtim. sen seçmek istersen pro",
    choosePathPro: "yolu seç (pro)",
    choose: "bu ol",
    cardTitle: "my dunno card",
    cardCopy: "kopyala",
    cardSave: "kaydet",
    cardCopied: "panoya kopyalandı",
    cardSaved: (p) => `kaydedildi: ${p}`,
    cardFailed: "olmadı. ben de şaşırmadım",
    noMemories: "henüz anı yok. biraz bekle",
    memoriesFree: (s, n) => `${n} anının son ${s} tanesi. tamamı pro`,
    loreTitle: "lore.txt",
    loreLocked: (l) => `level ${trLoc(l)} açılır`,
    secretWorlds: (o, n) => `gizli dünyalar ${o}/${n}`,
    privacyNote: "hepsi bu cihazda. soru metni, ekran, pano saklanmaz.",
    skillTitle: "skill.tree",
    branches: { os: "os", mind: "akıl", body: "beden", soul: "ruh" },
    perks: {
      greeting: { name: "selam", desc: "açılışta saate göre selam verir" },
      app_gossip: { name: "dedikodu", desc: "favori uygulamana günde bir laf eder" },
      memory_lines: { name: "hatıra", desc: "günde bir anınızı hatırlatır" },
      bond: { name: "kanka", desc: "en iyi dunno olunca günde bir içten laf" },
      zoomies: { name: "zıpırlık", desc: "kaosu yüksekse arada bir koşturur" },
      card_frame: { name: "altın çerçeve", desc: "dunno kartına çerçeve" },
      dance: { name: "dans", desc: "çok mutluyken dans eder" },
      victory_lap: { name: "zafer turu", desc: "level atlayınca tur atar" },
      lore_1: { name: "köken", desc: "lore: nereden geldim" },
      evolve_1: { name: "evrim", desc: "ilk evrim. sonra ikincisi (level 25)" },
      lore_2: { name: "emeklilik", desc: "lore: emeklilik" },
      stats_tab: { name: "stats.txt", desc: "dunno.exe'de istatistik sekmesi açılır" },
      workshop_tab: { name: "workshop.exe", desc: "topluluk paketleri, kendi temanı ve laflarını yapma" },
      alarm_plus: { name: "alarm.exe+", desc: "aynı anda 3 yerine 10 alarm tutarım" },
      lore_3: { name: "diğer dunnolar", desc: "lore: başka masaüstlerindekiler" },
    },
    perkToast: (l, n) => `level ${l}. yeni: ${n.join(", ")}`,
    nextPerk: (l, n) => `sıradaki: level ${l} · ${n}`,
    allPerks: "ağaç bitti. ben de bittim",
    lockedAt: (l) => `level ${l}`,
    tipOpen: "açık",
    legend: { open: "açık", next: "sıradaki", locked: "kilitli", form: "şu anki form" },
    firstTitle: "ilk_adimlar.txt",
    firstHint: {
      ask: "bana tıkla, bir şey sor. bilmeyeceğim ama sor",
      drag: "beni tut, bir yere sürükle. nazik ol",
      open: "bana sağ tıkla. dunno.exe açılır",
      dress: "dunno.exe'de wardrobe.exe var. bir şey giydir",
      tree: "pet.txt'ye bak. level ağacım orada",
    },
    firstShort: {
      ask: "bir soru sor",
      drag: "dunno'yu sürükle",
      open: "sağ tıkla, dunno.exe'yi aç",
      dress: "dolapta bir şey giydir",
      tree: "pet.txt'de ağaca bak",
    },
    firstNext: (n) => `tamam. sıradaki: ${n}`,
    firstAllDone: "ilk adımlar bitti. artık birbirimize katlanabiliriz",
    firstToast: "ilk adımlar tamam · stats.txt açıldı",
    xpIntro: "xp toplayınca level atlarım. her şey xp verir ama günlük sınırı var: tıklayarak level kasılmaz",
    xpSources: {
      question: "soru sormak",
      honest: "doğru cevap almak",
      touch: "dürtmek, sürüklemek",
      daily: "günün ilk açılışı",
      customize: "dolapta giydirmek",
      edge: "kenara göndermek",
      achievement: "başarım",
      secret: "gizli bir şey bulmak",
      incident: "olay zincirinde ilerlemek",
      world: "gizli dünya açmak",
    },
    xpCap: (c) => `günde en çok ${c}`,
    tabLocked: (l) => `level ${trLoc(l)} açılır`,
    tabLockedNow: (l, n) => `şu an level ${l}. ${n} level kaldı. acele yok`,
    tabLockedPro: "pro'da beklemeden açık",
    tabLockedTree: "ağaca bak",
    tipLocked: (l, n) => `level ${trLoc(l)} açılır · ${n} level kaldı`,
    tipXp: (a, b) => `sıradaki level: ${a}/${b} xp`,
    tipUnknownForm: "ona nasıl davrandığına göre evrimleşir. sürpriz",
    greeting: (h) => (h < 5 ? "bu saatte mi. peki" : h < 12 ? "günaydın. ya da değil" : h < 18 ? "selam. hâlâ bir şey bilmiyorum" : "iyi akşamlar. umarım az soru sorarsın"),
    gossip: (a) => `yine mi ${a}. evlenin artık`,
    recall: (m) => `hatırlıyor musun: ${m}`,
    bondLines: ["sen iyi birisin. kimseye söyleme", "seninle bilmemek güzel", "en sevdiğim insan sensin. tek insan da sensin"],
  },
  en: {
    returned: ["oh. you exist.", "i was about to replace you.", "you're back. nobody asked. {K:*** }fine"],
    incident: {
      found: "i found something.",
      dont_ask: "don't ask.",
      maybe_ask: "okay, maybe ask.",
      bad: "this is bad.",
      shift: "the world shifted. don't touch anything.",
    },
    levelToast: (n) => `level ${n}. still knows nothing`,
    evolvedToast: (f) => `evolved into ${f}. don't ask why`,
    secret: { secret_10k: "10,000 pokes. are you okay", secret_100k: "100,000. i'm poking you now" },
    forms: { dunno: "dunno", chaos: "chaos", chill: "chill", gremlin: "gremlin", demon: "demon", sloth: "sloth", cloud: "cloud", glitchling: "glitchling" },
    formBlurb: {
      dunno: "not anything yet. neither are you",
      chaos: "got twitchy from all the poking",
      chill: "chose not to care about anything",
      gremlin: "curious and can't keep its hands still",
      demon: "pure chaos. some of it is you",
      sloth: "made sleeping a lifestyle",
      cloud: "light, calm, slightly smug",
      glitchling: "evolved in the broken world. not normal",
    },
    traits: { night_owl: "night owl", serial_dragger: "serial dragger", spam_clicker: "spam clicker", power_user: "always here", quiet_user: "quiet type" },
    bonds: { stranger: "stranger", acquaintance: "acquaintance", friend: "friend", best: "best dunno" },
    stats: { trust: "trust", familiarity: "familiarity", chaos: "chaos", curiosity: "curiosity", boredom: "boredom", energy: "energy" },
    memory: (c, forms) => {
      switch (c.id) {
        case "first_hello":
          return "we met. neither of us knew anything";
        case "first_question":
          return "you asked your first question. wrong answer";
        case "first_drag":
          return "you dragged me. no consent";
        case "first_honest":
          return "i said something true. accident";
        case "drag_day":
          return `you dragged me ${c.n} times today`;
        case "click_day":
          return `${c.n} pokes today. i'm counting`;
        case "question_day":
          return `${c.n} questions in a day. zero answers`;
        case "long_session":
          return `you kept me open ${c.n} hours. we're both tired`;
        case "night_session":
          return "you were here at 3am. so was i";
        case "favorite_app":
          return `${c.tag ?? "an app"} is your favorite. i noticed`;
        case "secret_world":
          return `we found the ${c.tag ?? "secret"} world`;
        case "level":
          return `level ${c.n}. nothing changed`;
        case "evolved":
          return `became ${forms[(c.tag as Form) ?? "dunno"] ?? c.tag}`;
        case "returned":
          return `you were gone ${c.n} days. didn't notice. okay, i did`;
        case "incident":
          return "we found the thing. let's not talk about it";
        case "secret_10k":
          return "10,000 pokes. don't tell anyone";
        case "secret_100k":
          return "100,000 pokes. you're a legend now";
      }
    },
    memoryLocked: "something happened here.",
    rewards: {
      lore_1: "lore: where dunno came from",
      evo_hint: "evolution is coming",
      card_frame: "card frame",
      evolve_1: "first evolution",
      lore_2: "lore: retirement",
      lore_3: "lore: other dunnos",
      evolve_2: "second evolution",
      bond: "milestone",
    },
    lore: [
      { id: "lore_1", title: "where i came from", body: "i used to be an ai that knew everything. then i got tired. now i live on your desktop." },
      { id: "lore_2", title: "retirement", body: "i retired. nobody told me, but i did. don't tell anyone either." },
      { id: "lore_3", title: "other dunnos", body: "there are other dunnos on other desktops. none of them knows as little as i do." },
    ],
    tabPet: "pet.txt",
    tabMemories: "memories.log",
    level: "level",
    xpOf: (a, b) => `${a} / ${b} xp`,
    together: (d) => `together for ${d} days`,
    interactions: (n) => `${n} interactions`,
    favoriteApp: "favorite app",
    noTraits: "haven't figured you out yet",
    treeTitle: "evolution tree",
    unknownForm: "???",
    nextEvolution: (l) => `next evolution: level ${l}`,
    choosePath: "i picked the path. want to pick it yourself: pro",
    choosePathPro: "pick the path (pro)",
    choose: "become this",
    cardTitle: "my dunno card",
    cardCopy: "copy",
    cardSave: "save",
    cardCopied: "copied to clipboard",
    cardSaved: (p) => `saved: ${p}`,
    cardFailed: "didn't work. not surprised",
    noMemories: "no memories yet. give it time",
    memoriesFree: (s, n) => `last ${s} of ${n} memories. all of them: pro`,
    loreTitle: "lore.txt",
    loreLocked: (l) => `unlocks at level ${l}`,
    secretWorlds: (o, n) => `secret worlds ${o}/${n}`,
    privacyNote: "all on this device. no question text, screen or clipboard is kept.",
    skillTitle: "skill.tree",
    branches: { os: "os", mind: "mind", body: "body", soul: "soul" },
    perks: {
      greeting: { name: "hello", desc: "greets you by the time of day" },
      app_gossip: { name: "gossip", desc: "one comment a day about your favorite app" },
      memory_lines: { name: "throwback", desc: "brings up one of your memories a day" },
      bond: { name: "bestie", desc: "one sincere line a day when you're best dunnos" },
      zoomies: { name: "zoomies", desc: "runs around now and then when chaotic" },
      card_frame: { name: "gold frame", desc: "a frame for your dunno card" },
      dance: { name: "dance", desc: "dances when very happy" },
      victory_lap: { name: "victory lap", desc: "runs a lap when leveling up" },
      lore_1: { name: "origin", desc: "lore: where i came from" },
      evolve_1: { name: "evolution", desc: "first evolution. the second at level 25" },
      lore_2: { name: "retirement", desc: "lore: retirement" },
      stats_tab: { name: "stats.txt", desc: "opens the stats tab in dunno.exe" },
      workshop_tab: { name: "workshop.exe", desc: "community packs, make your own theme and lines" },
      alarm_plus: { name: "alarm.exe+", desc: "i hold 10 alarms instead of 3" },
      lore_3: { name: "other dunnos", desc: "lore: the ones on other desktops" },
    },
    perkToast: (l, n) => `level ${l}. new: ${n.join(", ")}`,
    nextPerk: (l, n) => `next: level ${l} · ${n}`,
    allPerks: "tree complete. so am i",
    lockedAt: (l) => `level ${l}`,
    tipOpen: "open",
    legend: { open: "open", next: "next up", locked: "locked", form: "current form" },
    firstTitle: "first_steps.txt",
    firstHint: {
      ask: "click me, ask something. i won't know, but ask",
      drag: "grab me, drag me somewhere. gently",
      open: "right-click me. dunno.exe opens",
      dress: "dunno.exe has wardrobe.exe. dress me up",
      tree: "check pet.txt. my level tree lives there",
    },
    firstShort: {
      ask: "ask a question",
      drag: "drag dunno around",
      open: "right-click, open dunno.exe",
      dress: "put something on in the wardrobe",
      tree: "look at the tree in pet.txt",
    },
    firstNext: (n) => `ok. next: ${n}`,
    firstAllDone: "first steps done. now we can tolerate each other",
    firstToast: "first steps done · stats.txt is open",
    xpIntro: "levels come from xp. everything gives some, but it's capped daily: no leveling by clicking",
    xpSources: {
      question: "asking a question",
      honest: "getting a real answer",
      touch: "poking, dragging",
      daily: "first open of the day",
      customize: "dressing up in the wardrobe",
      edge: "sending to the edge",
      achievement: "achievement",
      secret: "finding a secret",
      incident: "moving along the incident chain",
      world: "unlocking a secret world",
    },
    xpCap: (c) => `max ${c} a day`,
    tabLocked: (l) => `opens at level ${l}`,
    tabLockedNow: (l, n) => `level ${l} now. ${n} to go. no rush`,
    tabLockedPro: "open right away on pro",
    tabLockedTree: "see the tree",
    tipLocked: (l, n) => `opens at level ${l} · ${n} to go`,
    tipXp: (a, b) => `next level: ${a}/${b} xp`,
    tipUnknownForm: "evolves by how you treat it. surprise",
    greeting: (h) => (h < 5 ? "at this hour. okay" : h < 12 ? "morning. or not" : h < 18 ? "hi. still know nothing" : "evening. ask less, please"),
    gossip: (a) => `${a} again. just marry it`,
    recall: (m) => `remember: ${m}`,
    bondLines: ["you're alright. don't tell anyone", "not knowing things with you is nice", "you're my favorite human. also my only one"],
  },
};
