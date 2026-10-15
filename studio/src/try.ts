// S3 "şu durumda ne der" + K7 sekme farkındalığı + S4 kaynak/tip notu + Dunnolama önizlemesi (saf).
// Masaüstünün GERÇEK motoru ve saat tablosu kullanılır, kopya yok.
import { LineEngine, renderText } from "@desktop/lines/engine";
import { MEETING_APPS } from "@desktop/lines/pool-check";
import { hourSlot } from "@desktop/talk/triggers";
import type { Lang } from "./model";

export type Mode = "polite" | "street";
export type IdleMinutes = 0 | 10 | 30 | 60;

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

export interface TryInput {
  /** app etiketi (excel, browser, zoom ...) ya da null */
  app: string | null;
  /** SPEC 09 K7: site kategorisi (video, shopping, code ...) ya da null */
  site?: string | null;
  /** SPEC 09 K7: simüle edilen aktif pencere/sekme başlığı (sadece bellekte kategoriye çevrilir) */
  windowTitle?: string;
  /** yerel saat 0-23 */
  hour: number;
  idle: IdleMinutes;
  batteryLow: boolean;
  /** click | spam_click | drag | limit_reached | fart ya da null */
  interaction: string | null;
  mode: Mode;
  lang: Lang;
}

export interface TryResult {
  /** motora verilen aktif trigger listesi */
  active: string[];
  /** toplantı uygulaması önde: dunno susar (shh) */
  meeting: boolean;
  /** SPEC 09 K7: adult/kumar sekmesi önde: dunno susar (laf atmaz) */
  silentSite?: boolean;
  /** kazanan trigger (öncelik site > app > time > idle > battery > interaction > random); susuyorsa null */
  winner: string | null;
  /** kazanan trigger'daki adaylar (bu dilde, bu modda render edilmiş) */
  candidates: { id: string; text: string }[];
  /** art arda çekilişler (son 20'yi tekrar etmeme kuralıyla) */
  draws: string[];
}

const SILENT_TAB_RX =
  /\b(porn|xxx|sex|nsfw|onlyfans|xvideos|pornhub|bahis|bet|casino|rulet|slot|kumar|iddaa|poker)\b/i;

const SITE_KEYWORDS: Record<SiteTag, readonly string[]> = {
  video: ["youtube", "vimeo", "twitch", "kick", "netflix", "disney+", "prime video", "blutv", "exxen", "gain", "mubi", "bölüm", "episode"],
  social: ["twitter", "x.com", "instagram", "facebook", "tiktok", "linkedin", "reddit", "ekşi sözlük", "eksisozluk", "threads", "bluesky"],
  shopping: ["trendyol", "hepsiburada", "amazon", "n11", "çiçeksepeti", "zara", "ikea", "ebay", "aliexpress", "etsy", "sepet", "checkout"],
  news: ["haber", "hürriyet", "milliyet", "sözcü", "ntv", "cnn", "bbc", "reuters", "guardian", "son dakika", "gündem", "breaking news"],
  mail: ["gmail", "outlook", "protonmail", "yahoo mail", "gelen kutusu", "inbox", "webmail", "thunderbird"],
  code: ["github", "gitlab", "bitbucket", "stackoverflow", "stack overflow", "npmjs", "crates.io", "localhost", "127.0.0.1", "pull request"],
  ai_chat: ["chatgpt", "claude", "gemini", "copilot", "perplexity", "deepseek", "poe.com", "huggingface", "openai", "anthropic"],
  docs: ["google docs", "google sheets", "google slides", "notion", "confluence", "overleaf", "dropbox paper", "coda"],
  music: ["spotify", "youtube music", "apple music", "soundcloud", "deezer", "tidal", "bandcamp", "last.fm", "fizy", "winamp"],
  maps: ["google maps", "haritalar", "yandex harita", "apple maps", "openstreetmap", "flightradar", "street view", "yol tarifi"],
  learning: ["udemy", "coursera", "edx", "khan academy", "duolingo", "leetcode", "hackerrank", "freecodecamp", "btk akademi", "patika"],
  game_store: ["steam", "epic games", "gog.com", "itch.io", "humble bundle", "xbox", "playstation store", "battle.net", "riot client"],
  search: ["google search", "bing", "duckduckgo", "yandex", "brave search", "kagi", "arama sonuçları", "search results"],
};

/**
 * SPEC 09 K7: Sekme/pencere başlığını sadece bellekte kategoriye çevirir (saklamaz, loglamaz).
 * Adult/kumar başlıklarında `silent: true` döner.
 */
export function matchWindowSite(windowTitle?: string | null): { site: SiteTag | null; silent: boolean } {
  const raw = (windowTitle ?? "").trim().toLocaleLowerCase("tr");
  if (!raw) return { site: null, silent: false };
  if (SILENT_TAB_RX.test(raw)) return { site: null, silent: true };
  for (const tag of SITE_TAGS) {
    for (const kw of SITE_KEYWORDS[tag]) {
      if (raw.includes(kw.toLocaleLowerCase("tr"))) {
        return { site: tag, silent: false };
      }
    }
  }
  return { site: null, silent: false };
}

/**
 * Uygulamanın yaptığı gibi: bağlam = site (K7) + app (toplantı değilse) + saat dilimi (Rust tablosu) + boşta kalma + pil.
 * Etkileşim seçiliyse talker o lafı tek başına söyler (interaction:* tek aktif trigger).
 */
export function activeFor(input: TryInput): string[] {
  if (input.interaction) return [`interaction:${input.interaction}`];
  const meeting = isMeeting(input.app);
  const matched = matchWindowSite(input.windowTitle);
  const effectiveSite = input.site || matched.site;
  return [
    effectiveSite && !meeting && !matched.silent ? `site:${effectiveSite}` : null,
    input.app && !meeting ? `app:${input.app}` : null,
    hourSlot(input.hour),
    input.idle ? `idle:${input.idle}` : null,
    input.batteryLow ? "battery:low" : null,
  ].filter((t): t is string => t !== null);
}

export function isMeeting(app: string | null): boolean {
  return app !== null && (MEETING_APPS as readonly string[]).includes(app);
}

export function tryContext(input: TryInput, lines: readonly unknown[], rng: () => number = Math.random, draws = 10): TryResult {
  const active = activeFor(input);
  const meeting = isMeeting(input.app);
  const matched = matchWindowSite(input.windowTitle);
  const silentSite = matched.silent;
  const suppressed = meeting || silentSite;
  const engine = (r: () => number) => {
    const e = new LineEngine({ lines, rng: r });
    if (suppressed) e.setSuppressed("meeting", true);
    return e;
  };
  const first = engine(() => 0).pick(active, input.lang, input.mode);
  const winner = first?.trigger ?? null;
  const candidates = winner ? candidatesOf(lines, winner, input) : [];
  const drawer = engine(rng);
  const out: string[] = [];
  for (let i = 0; i < draws; i++) {
    const text = drawer.say(active, input.lang, input.mode);
    if (text === null) break;
    out.push(text);
  }
  return { active, meeting, silentSite, winner, candidates, draws: out };
}

function candidatesOf(lines: readonly unknown[], trigger: string, input: TryInput): { id: string; text: string }[] {
  const out: { id: string; text: string }[] = [];
  for (const raw of lines) {
    const l = raw as Record<string, unknown>;
    const t = l[input.lang];
    if (l.trigger !== trigger || typeof t !== "string") continue;
    const text = renderText(t, input.mode);
    if (text !== "") out.push({ id: String(l.id), text });
  }
  return out;
}

export type AskSource = "llm" | "pool" | "offline" | "limit" | "error";

/** S4: worker cevabının nereden geldiği, açıkça. */
export function askNote(source: AskSource): string {
  switch (source) {
    case "llm":
      return "llm cevabı (worker'da anahtar var)";
    case "pool":
      return "worker'da llm anahtarı yok: llm'e gitmedi, worker kendi havuzundan döndü";
    case "offline":
      return "worker kapalı ya da ulaşılamıyor (yerel 127.0.0.1:8787)";
    case "limit":
      return "worker kotası doldu (429): uygulama bu durumda kendi havuzuna düşer";
    case "error":
      return "worker hata döndü";
  }
}

/** SPEC 06 Q2: ask.exe'de soru tipi ve cevabın hangi havuzdan geldiği. hasExact: answer:<qtype> bu dilde dolu mu. */
export function qtypeNote(qtype: string, hasExact: boolean, answer: string = qtype): string {
  if (qtype === "other") return "tip: other · answer:generic havuzundan";
  // SPEC 09 K8: ters tiplerde cevap karşıt havuzdan
  const head = answer === qtype ? `tip: ${qtype}` : `tip: ${qtype} · ters: ${answer}`;
  return hasExact ? `${head} · answer:${answer} havuzundan` : `${head} · answer:${answer} boş, answer:generic yedeği`;
}

/** Yazarken canlı gösterim: tip ve varsa ters eşleşme. */
export function qtypeLive(qtype: string, answer: string): string {
  return answer === qtype ? `tip: ${qtype}` : `tip: ${qtype} · ters: ${answer}`;
}

export interface DunnolaPreview {
  category: string;
  wordCount: number;
  readSeconds: number;
  response: string;
  lazyRewrite: string;
}

/**
 * Sol tık metin seçimi ("Dunnolama") yapısal parmak izi ve tembel özet önizleyicisi.
 */
export function dunnolaPreview(rawSelection: string, mode: Mode = "polite", lang: Lang = "tr"): DunnolaPreview | null {
  const trimmed = (rawSelection || "").trim();
  if (trimmed.length < 2) return null;
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const readSeconds = Math.max(1, Math.round((wordCount / 200) * 60));
  const lower = trimmed.toLocaleLowerCase("tr");
  const firstWord = (words[0] || "bu").toLocaleLowerCase("tr").slice(0, 14);

  let category = "selection:short_word_phrase";
  if (/\b(sk-[a-z0-9]{12,}|password|parola|şifre|api_key|secret_key)\b/i.test(trimmed)) {
    category = "selection:secret_sensitive";
  } else if (/^https?:\/\/\S+$/i.test(trimmed) || /\bhttps?:\/\/[^\s]+/i.test(trimmed)) {
    category = "selection:url_link_domain";
  } else if (/\b(typeerror|referenceerror|syntaxerror|nullpointer|exception|traceback|console\.log|function\s*\(|const\s+\w+\s*=)\b/i.test(trimmed)) {
    category = "selection:code_or_error";
  } else if (/\bTR\d{2}\s?\d{4}/i.test(trimmed) || /(₺|\bTL\b|\bUSD\b|\bEUR\b|\$|€)\s*\d+|\d+\s*(₺|\bTL\b|\bUSD\b|\bEUR\b|\$|€)/i.test(trimmed)) {
    category = "selection:money_iban_price";
  } else if (/\b(bilgilerinize arz|saygılarımla|iyi çalışmalar|ekte sunulmuştur|per my last email|best regards|kind regards)\b/i.test(lower)) {
    category = "selection:corporate_email";
  } else if (trimmed.length >= 200 || wordCount >= 30) {
    category = "selection:wall_of_text";
  }

  const trReactions: Record<string, string> = {
    "selection:secret_sensitive": "bunu seçme, şifre falan var içinde{K: ***}",
    "selection:url_link_domain": "o linke tıklarsan iki saat kaybolursun{K: aq}",
    "selection:code_or_error": "yine kırmızı hata metni seçmişsin, geçmiş olsun{K: ***}",
    "selection:money_iban_price": "rakamlara bakınca cüzdanım sızladı{K:, ***}",
    "selection:corporate_email": "kurumsal kibarcada 'bu işi sen yap' yazıyor{K: ***}",
    "selection:wall_of_text": "bunu okuyacağıma köşede üç kere uyurum{K: aq}",
    "selection:short_word_phrase": "iki kelime seçtin, onu da mı ben açıklayayım{K: ***}",
  };
  const enReactions: Record<string, string> = {
    "selection:secret_sensitive": "do not copy-paste secrets around me{K: ***}",
    "selection:url_link_domain": "that link leads straight to procrastination{K:, ***}",
    "selection:code_or_error": "highlighting the error won't make it compile{K: ***}",
    "selection:money_iban_price": "numbers that hurt the wallet{K:, ***}",
    "selection:corporate_email": "corporate translation: do this by friday{K: ***}",
    "selection:wall_of_text": "i am not reading that wall of text{K:, ***}",
    "selection:short_word_phrase": "highlighted two words like i'm a dictionary{K: ***}",
  };

  const rawResp = (lang === "en" ? enReactions[category] : trReactions[category]) ?? trReactions["selection:short_word_phrase"];
  const response = renderText(rawResp, mode);
  const lazyRewrite =
    lang === "en"
      ? `tldr: "${firstWord}..." (${wordCount} words, ~${readSeconds}s) i refused to read`
      : `dunnolama özeti: "${firstWord}..." (${wordCount} kelime, ~${readSeconds} sn), okumaya değmez`;

  return { category, wordCount, readSeconds, response, lazyRewrite };
}
