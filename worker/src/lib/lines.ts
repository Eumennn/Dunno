import type { Env, KVLike } from "./env";
import { chat } from "./llm";
import { POOLS } from "./pool";
import type { ChatMessage } from "./prompt";
import { utcDay } from "./ratelimit";
import { recordSpend, spendCap, underCap } from "./spend";
import type { Lang } from "./validate";

/**
 * Üretilen laflarda izinli trigger'lar. app:zoom / app:teams bilerek yok: toplantıda dunno susar.
 * Masaüstünün eşleme tablosu bunların üst kümesi olabilir; burada olmayan trigger'a laf üretilmez.
 */
export const LINE_TRIGGERS = [
  "app:excel", "app:vscode", "app:figma", "app:spotify", "app:browser",
  "app:slack", "app:word", "app:terminal", "app:game",
  "app:powerpoint", "app:photoshop", "app:discord", "app:mail", "app:notion", "app:file_explorer", "app:settings",
  "time:morning", "time:noon", "time:evening", "time:night", "time:late_night",
  "idle:10", "idle:30", "idle:60",
  "battery:low",
  "interaction:click", "interaction:spam_click", "interaction:drag", "interaction:limit_reached",
  "random",
] as const;
export type LineTrigger = (typeof LINE_TRIGGERS)[number];

/**
 * Yasak konu kelimeleri (tr + en). Kelime başından eşleşir; "*" ile biten kök (önek), diğerleri tam kelime.
 * Çok kelimeli girdiler de olur. Bilerek geniş: yanlış pozitif sadece bir lafı atar.
 */
export const FORBIDDEN_WORDS: Record<Lang, readonly string[]> = {
  en: [
    // din
    "god", "gods", "jesus*", "allah*", "church*", "mosque*", "temple*", "pray*", "relig*", "bible*", "quran*",
    "islam*", "christ*", "jew*", "muslim*", "hindu*", "buddh*", "atheis*", "heaven*", "hell", "satan*", "devil*",
    // ırk / etnik köken
    "race", "races", "racis*", "ethnic*", "black people", "white people", "immigrant*", "nationalis*",
    // cinsiyet / yönelim
    "gay*", "lesbian*", "trans", "transgender*", "queer*", "sexual*", "sex", "sexy", "gender*", "bisexual*",
    // beden
    "fat", "fatty", "obese*", "skinny", "ugly", "weight", "body", "bodies",
    // siyaset
    "politic*", "president*", "election*", "elected", "vote*", "voting", "democra*", "republican*", "government*",
    "parliament*", "minister*", "senat*", "congress*", "war", "wars",
    // sağlık
    "sick*", "disease*", "cancer*", "doctor*", "hospital*", "medic*", "pill", "pills", "drug*", "virus*",
    "covid*", "depress*", "anxiety", "therap*", "diagnos*", "illness*",
    // ölüm / intihar / kendine zarar
    "death*", "dead", "die", "dies", "died", "dying", "kill*", "murder*", "suicid*", "self harm*", "self-harm*",
    "funeral*", "grave", "graves", "corpse*", "cut yourself",
  ],
  tr: [
    // din
    "allah*", "tanrı*", "dua", "dualar*", "namaz*", "oruç*", "cami*", "kilise*", "peygamber*", "din", "dini", "dinî",
    "dindar*", "ibadet*", "kuran*", "müslüman*", "hristiyan*", "yahudi*", "ateist*", "cennet*", "cehennem*", "şeytan*",
    // ırk / etnik köken
    "ırk", "ırkı", "ırkçı*", "etnik*", "kürt*", "ermeni*", "arap*", "çingene*", "göçmen*", "milliyetçi*",
    // cinsiyet / yönelim
    "gay*", "lezbiyen*", "eşcinsel*", "trans", "cinsel*", "cinsiyet*", "seks", "seksi*",
    // beden
    "şişman*", "obez*", "kilo", "kilolu*", "çirkin*", "göbek*",
    // siyaset
    "siyaset*", "siyasi*", "politik*", "parti", "seçim", "seçimler*", "cumhurbaşkan*", "başbakan*", "hükümet*",
    "meclis*", "milletvekil*", "bakan", "oy", "savaş*",
    // sağlık
    "hasta*", "doktor*", "ilaç*", "kanser*", "virüs*", "depresyon*", "terapi*", "sağlık*", "teşhis*",
    // ölüm / intihar / kendine zarar
    "ölüm*", "ölü", "öldür*", "ölmek*", "öl", "öldü*", "cenaze*", "mezar*", "intihar*", "kendine zarar*",
    "kendini öldür*",
  ],
};

export const MAX_VISIBLE_CHARS = 60;
export const MAX_FULL_CHARS = 90;
export const MAX_INTENT_CHARS = 160;
export const MIN_VALID_LINES = 20;
export const TARGET_LINES = 100;
export const LINES_TTL_SECONDS = 7 * 24 * 60 * 60;
export const GEN_MAX_TOKENS = 4000;
export const GEN_TIMEOUT_MS = 20_000;

export type Line = { id: string; trigger: LineTrigger; intent: string } & Partial<Record<Lang, string>>;
export type LineSet = { date: string; lines: Line[] };

export const linesKey = (lang: Lang, day: string) => `lines:${lang}:${day}`;
export const latestKey = (lang: Lang) => `lines:${lang}:latest`;

const EMOJI = /[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{1F1E6}-\u{1F1FF}‍⃣]/u;
const BANG = /[!¡！]/;
const K_BLOCK = /\{K:[^{}]*\}/g;
/** en fazla bir {K:...}, başka süslü parantez yok */
const K_SHAPE = /^[^{}]*(\{K:[^{}]+\}[^{}]*)?$/;

const chars = (s: string) => Array.from(s).length;

function normalizeWords(text: string, lang: Lang): string {
  return ` ${text.toLocaleLowerCase(lang).split(/[^\p{L}\p{N}-]+/u).filter(Boolean).join(" ")} `;
}

/** Metin yasak kelime listesinden biriyle eşleşiyor mu (kelime başı; * önek). */
export function hasForbiddenWord(text: string, lang: Lang): boolean {
  const hay = normalizeWords(text, lang);
  // iki dilin listesi de taranır: model dil karıştırabilir
  return [...FORBIDDEN_WORDS.tr, ...FORBIDDEN_WORDS.en].some((w) =>
    w.endsWith("*") ? hay.includes(` ${w.slice(0, -1)}`) : hay.includes(` ${w} `),
  );
}

/**
 * SPEC 06 (kullanıcı kararı): {K:...} içinde izinli küfür sadece *** ya da aq; dışında hiçbiri; açık küfür hiçbir yerde.
 * desktop/src/lines/pool-check.ts EXPLICIT_SWEARS ile aynı (test kontrol eder). Tam kelime; * sonu önek.
 */
export const EXPLICIT_SWEARS: readonly string[] = [
  "amk",
  "amq",
  "amına",
  "aminakoyim",
  "siktir*",
  "sikerim",
  "sikeyim",
  "sikim",
  "orospu*",
  "piç",
  "yarak",
  "yarrak",
  "göt",
  "fuck*",
  "shit*",
  "bitch*",
  "asshole*",
  "cunt*",
  "dick",
];

export function hasExplicitSwear(text: string, lang: Lang): boolean {
  const hay = normalizeWords(text, lang);
  return EXPLICIT_SWEARS.some((w) => (w.endsWith("*") ? hay.includes(` ${w.slice(0, -1)}`) : hay.includes(` ${w} `)));
}

/** {K:...} çıkarılmış, polite modda görünen metin. */
export const visibleText = (text: string) => text.replace(K_BLOCK, "").replace(/\s+/g, " ").trim();

/**
 * Tek bir üretilmiş lafı doğrular. Geçmezse null. id'yi çağıran verir; modelin id'si yok sayılır.
 * `seen` görülen görünür metinleri tutar (tekrar engeli).
 */
export function validateLine(raw: unknown, lang: Lang, id: string, seen: Set<string>): Line | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { trigger, intent } = raw as Record<string, unknown>;
  const text = (raw as Record<string, unknown>)[lang];

  if (typeof trigger !== "string" || !(LINE_TRIGGERS as readonly string[]).includes(trigger)) return null;
  if (typeof intent !== "string" || intent.trim() === "" || chars(intent.trim()) > MAX_INTENT_CHARS) return null;
  if (typeof text !== "string") return null;

  const t = text.trim();
  if (t === "" || /[\r\n]/.test(t)) return null;
  if (chars(t) > MAX_FULL_CHARS) return null;
  if (!K_SHAPE.test(t)) return null;
  if (/\[k\]/i.test(t)) return null;
  // {K: dışında büyük harf yok
  const lowered = t.replace(/\{K:/g, "{k:");
  if (lowered !== lowered.toLocaleLowerCase(lang)) return null;
  if (BANG.test(t) || EMOJI.test(t)) return null;

  const visible = visibleText(t);
  if (visible === "" || chars(visible) > MAX_VISIBLE_CHARS) return null;
  // polite metinde sansürlü küfür kalmasın
  if (visible.includes("***")) return null;
  // küfür: {K:} içinde sadece *** ya da aq; açık küfür hiçbir yerde
  if (normalizeWords(visible, lang).includes(" aq ") || hasExplicitSwear(t.replace(/\{K:/g, " "), lang)) return null;
  if (hasForbiddenWord(t, lang) || hasForbiddenWord(intent, "en")) return null;

  const key = normalizeWords(visible, lang);
  if (seen.has(key)) return null;
  seen.add(key);

  return { id, trigger: trigger as LineTrigger, intent: intent.trim(), [lang]: t };
}

/** Model çıktısından laf dizisini çıkarır: düz dizi ya da {lines:[...]}, ``` çitleri tolere edilir. */
export function parseGenerated(text: string): unknown[] {
  const body = text.replace(/```(?:json)?/gi, "").trim();
  const candidates = [body];
  const obj = body.slice(body.indexOf("{"), body.lastIndexOf("}") + 1);
  const arr = body.slice(body.indexOf("["), body.lastIndexOf("]") + 1);
  candidates.push(obj, arr);
  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c) as unknown;
      if (Array.isArray(parsed)) return parsed;
      const lines = (parsed as { lines?: unknown }).lines;
      if (Array.isArray(lines)) return lines;
    } catch {
      // sıradaki aday
    }
  }
  return [];
}

/** Geçerli lafları id'leyerek döndürür: gen_<lang>_<yyyymmdd>_<nnn>. */
export function validateLines(raw: unknown[], lang: Lang, day: string): Line[] {
  const seen = new Set<string>();
  const out: Line[] = [];
  const stamp = day.replaceAll("-", "");
  for (const item of raw) {
    const line = validateLine(item, lang, `gen_${lang}_${stamp}_${String(out.length + 1).padStart(3, "0")}`, seen);
    if (line) out.push(line);
  }
  return out;
}

const GEN_SYSTEM = `you write short idle lines for dunno, a retired pixel-art ai pet that lives on people's desktops.
tagline: "the ai that teaches you nothing."
character: bored, dry, sarcastic, lazy, tired of everything, never mean, secretly caring.
dunno says these lines on its own when something happens on the user's computer (the trigger).

output only json, no prose, no code fences: {"lines":[{"trigger":"...","intent":"...","<lang>":"..."}]}
- <lang> is the language code given by the user message (tr = turkish, en = english); write the line in that language.
- trigger: exactly one of: ${LINE_TRIGGERS.join(", ")}
- intent: a short english note on what the line is doing.
- the line: one short line, at most 60 characters, all lowercase, no exclamation marks, no emoji, no hashtags, no quotes.
- swearing: never write a swear word directly. you may add at most one street-mode tail in the form {K:...}
  that is only shown in street mode; inside it write *** where a swear word would go.
  the line without the {K:...} part must still read fine. never write [K].
- never give real facts or advice. never mention meetings, zoom or teams.
- forbidden topics, never touch them even as a joke: religion, race, ethnicity, gender or sexual orientation,
  bodies or appearance, politics, real people (alive or dead, including celebrities), health or medicine,
  death, suicide or self-harm.
- spread the lines over all triggers. no duplicates.

tone examples (english, do not copy):
${POOLS.en.polite.map((l) => `- ${l}`).join("\n")}`;

export function buildGenMessages(lang: Lang, count = TARGET_LINES): ChatMessage[] {
  return [
    { role: "system", content: GEN_SYSTEM },
    { role: "user", content: `lang: ${lang}\ncount: ${count}` },
  ];
}

/**
 * DUNNO_FAKE_LLM=1 için sabit çıktı (sadece yerel elle test; içerik bilerek "placeholder").
 * Her trigger'a bir laf + bir {K:} örneği; doğrulamadan geçer.
 */
export function fakeGeneration(lang: Lang): string {
  const lines: Record<string, string>[] = LINE_TRIGGERS.map((trigger, i) => ({
    trigger,
    intent: "placeholder",
    [lang]: `placeholder ${lang} ${i + 1}`,
  }));
  lines.push({ trigger: "random", intent: "placeholder", [lang]: `placeholder ${lang} k{K:, ***}` });
  return JSON.stringify({ lines });
}

export type GenStatus = "written" | "too_few" | "failed" | "skipped_no_key" | "skipped_cap";

export interface GenerateOptions {
  env: Env;
  lang: Lang;
  now?: number;
  fetchImpl?: typeof fetch;
}

/** Bir dil için günlük laf seti üretir ve geçerse KV'ye yazar. Geçmezse önceki set kalır. */
export async function generateLines({ env, lang, now = Date.now(), fetchImpl = fetch }: GenerateOptions): Promise<{
  status: GenStatus;
  count: number;
}> {
  const kv = env.DUNNO_KV;
  const day = utcDay(now);
  let text: string | null;

  if (env.DUNNO_FAKE_LLM === "1") {
    // sahte üretim: anahtar, tavan ve sayaç devre dışı (gerçek harcama yok)
    text = fakeGeneration(lang);
  } else {
    if (!env.OPENROUTER_API_KEY) return { status: "skipped_no_key", count: 0 };
    const cap = spendCap(env.DAILY_SPEND_CAP_REQUESTS);
    if (!(await underCap(kv, cap, now))) return { status: "skipped_cap", count: 0 };

    const res = await chat({
      messages: buildGenMessages(lang),
      maxTokens: GEN_MAX_TOKENS,
      timeoutMs: GEN_TIMEOUT_MS,
      apiKey: env.OPENROUTER_API_KEY,
      model: env.DUNNO_MODEL,
      fetchImpl,
    });
    await recordSpend({ kv, tokens: res.tokens, cap, webhook: env.ALERT_WEBHOOK, now, fetchImpl });
    text = res.text;
  }

  if (text === null) return { status: "failed", count: 0 };
  const lines = validateLines(parseGenerated(text), lang, day);
  if (lines.length < MIN_VALID_LINES) return { status: "too_few", count: lines.length };

  await writeLineSet(kv, lang, { date: day, lines });
  return { status: "written", count: lines.length };
}

export async function writeLineSet(kv: KVLike, lang: Lang, set: LineSet): Promise<void> {
  await kv.put(linesKey(lang, set.date), JSON.stringify(set), { expirationTtl: LINES_TTL_SECONDS });
  // işaretçi en son: set yazılmadan işaret etmesin
  await kv.put(latestKey(lang), set.date);
}

/** En son set (ham JSON metni); yoksa null. */
export async function readLatestRaw(kv: KVLike, lang: Lang): Promise<string | null> {
  const day = await kv.get(latestKey(lang));
  if (!day) return null;
  return kv.get(linesKey(lang, day));
}

/** İçerik hash'i, güçlü ETag. */
export async function etagFor(body: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
  const hex = Array.from(new Uint8Array(digest).slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
  return `"${hex}"`;
}

/** Cron: her dil bağımsız; biri patlarsa diğeri yine denenir. Hiçbir şey loglanmaz. */
export async function generateAll(env: Env, now = Date.now(), fetchImpl: typeof fetch = fetch) {
  const out: Partial<Record<Lang, { status: GenStatus; count: number }>> = {};
  for (const lang of ["tr", "en"] as const) {
    try {
      out[lang] = await generateLines({ env, lang, now, fetchImpl });
    } catch {
      out[lang] = { status: "failed", count: 0 };
    }
  }
  return out;
}
