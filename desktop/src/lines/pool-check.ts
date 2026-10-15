// Laf havuzu doğrulayıcı (saf TS, Node/DOM yok): `npm run pool:check`, CI testi ve Dunno Studio (S2) aynı kodu kullanır.
// Kurallar: SPEC 03 P3 + CLAUDE.md marka kuralları. Kaynak dosyalar content/pool/pool_<lang>.json.
import { renderText } from "./engine";
import type { Lang, Mode } from "./types";

/** Laf yazılan app etiketleri (Rust context/apps.rs eşlemesiyle aynı; toplantı uygulamaları yok, onlar shh). */
export const APP_TAGS = [
  "excel",
  "word",
  "powerpoint",
  "vscode",
  "terminal",
  "figma",
  "photoshop",
  "spotify",
  "browser",
  "slack",
  "discord",
  "mail",
  "notion",
  "game",
  "file_explorer",
  "settings",
  // SPEC 13
  "steam",
  "blender",
  "ide",
  "study",
] as const;

/**
 * SPEC 13 derin uygulamalar: Plan v2 listesi (excel, tarayıcı, discord, spotify, kod, figma, terminal, word, powerpoint, photoshop,
 * steam, blender, ide, ders) + video/kod siteleri. Hedef dil başına 20 (diğer uygulamalar 10), en az RARE_MIN nadir laf.
 */
export const DEEP_TRIGGERS = [
  "app:excel",
  "app:browser",
  "app:discord",
  "app:spotify",
  "app:vscode",
  "app:figma",
  "app:terminal",
  "app:word",
  "app:powerpoint",
  "app:photoshop",
  "app:steam",
  "app:blender",
  "app:ide",
  "app:study",
  "site:video",
  "site:code",
] as const;
export const DEEP_TARGET = 20;
export const RARE_MIN = 2;

export const MEETING_APPS = ["zoom", "teams", "webex"] as const;

/**
 * Cevap havuzu olan soru tipleri: talk/classify.ts QTYPES ("other" hariç; o answer:generic'e düşer). Burada ayrı liste:
 * pool-check studio sunucusunda da çalışır, classify'ın ?raw importlarını çekmesin. Eşitliği pool-check.test denetler.
 */
export const ANSWER_TYPES = [
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
  "follow_up",
] as const;

/** Laf yazılan site kategorileri (content/context/sites.json, sessiz "adult" hariç; eşitliği test denetler). */
export const SITE_CATEGORIES = ["video", "social", "shopping", "news", "mail", "code", "ai_chat", "docs", "music", "maps", "learning", "game_store", "search",
  // SPEC 17: en çok oynanan oyunlar ve popüler siteler (laflarda marka adı yok)
  "game_lol", "game_valorant", "game_cs2", "game_minecraft", "game_fortnite", "game_roblox", "game_gta", "game_dota", "game_apex", "game_pubg", "game_overwatch", "game_rocket", "game_fc", "game_genshin", "game_wow", "game_cod", "game_marvel", "web_youtube", "web_netflix", "web_twitch", "web_instagram", "web_tiktok", "web_x", "web_reddit", "web_linkedin", "web_whatsapp", "web_wikipedia"] as const;

/** Trigger başına dil başına hedef laf sayısı (SPEC 03 P1). */
export const POOL_TARGETS: Readonly<Record<string, number>> = {
  ...Object.fromEntries(APP_TAGS.map((a) => [`app:${a}`, 10])),
  "time:morning": 10,
  "time:noon": 10,
  "time:evening": 10,
  "time:night": 10,
  "time:late_night": 10,
  "idle:10": 10,
  "idle:30": 10,
  "idle:60": 10,
  "battery:low": 8,
  "interaction:click": 10,
  "interaction:spam_click": 10,
  "interaction:drag": 10,
  "interaction:limit_reached": 10,
  // SPEC 05 W3: başarım açılınca
  "interaction:unlock": 10,
  // SPEC 06 Q4/Q5: soru temposu uyarısı, düşünme balonu metni
  "interaction:too_fast": 10,
  "interaction:thinking": 10,
  // SPEC 06 Q3: honest cevap verilemedi (anahtar yok/hata), bir kez "bugün beynim kapalı" imâsı
  "interaction:brain_off": 10,
  // SPEC 09 K3: osurma animasyonundan sonra (talk/fart.ts tetik); polite modda da uygun
  "interaction:fart": 20,
  // SPEC 17 eğlenceli animasyonlardan sonra (bazen)
  "interaction:sneeze": 10,
  "interaction:yawn": 10,
  "interaction:dance": 10,
  // FB8 müzik tepkileri (music/tracker.ts; isteğe bağlı, şarkı/sanatçı adı yok)
  "interaction:music_repeat": 10,
  "interaction:music_skip": 10,
  "interaction:music_marathon": 10,
  "interaction:music_night": 10,
  // SPEC 09 K7: sekme başlığı kategorileri (talk/sites.ts, content/context/sites.json; adult sessiz, laf yok)
  ...Object.fromEntries(SITE_CATEGORIES.map((c) => [`site:${c}`, 10])),
  // SPEC 13: derin uygulama/site havuzları
  ...Object.fromEntries(DEEP_TRIGGERS.map((t) => [t, DEEP_TARGET])),
  // SPEC 14 gizli dünyalar + canavar modu (sadece o dünyadayken, kendiliğinden lafın bir kısmı)
  "egg:paper": 15,
  "egg:glitch": 15,
  "egg:monster": 20,
  random: 40,
  "answer:generic": 60,
  // SPEC 06 Q2 + SPEC 09 K8: soru tipine göre cevap, tip başına 25 (talk/classify.ts QType, "other" -> answer:generic).
  // Ters tiplerde havuz adı cevabın kendisi (content/pool/inverse.md).
  ...Object.fromEntries(ANSWER_TYPES.map((t) => [`answer:${t}`, 25])),
};

export function isKnownTrigger(trigger: string): boolean {
  if (trigger in POOL_TARGETS || trigger === "random") return true;
  const validPrefixes = [
    "series:",
    "turkish_series:",
    "movie:",
    "game:",
    "day:",
    "season:",
    "holiday:",
    "anime:",
    "topic:",
    "launcher:",
    "platform:",
    "lifestyle:",
    "site:",
    "app:",
    "time:",
    "idle:",
    "battery:",
    "interaction:",
    "egg:",
    "answer:",
    "selection:",
  ];
  return validPrefixes.some((p) => trigger.startsWith(p));
}

/**
 * SPEC 06 Q2c: street cevaplar polite'ın aynısı olmasın. Bu trigger'larda dil başına en az hedefin üçte biri kadar lafta
 * {K:...} kuyruğu olmalı (15'te 5, 25'te 9; pool:check ve CI'da hata, kapsam açığı değil).
 */
export const STREET_TAIL_MIN: Readonly<Record<string, number>> = Object.fromEntries(
  Object.keys(POOL_TARGETS)
    .filter((t) => t.startsWith("answer:") && t !== "answer:generic")
    .map((t) => [t, Math.ceil(POOL_TARGETS[t] / 3)]),
);

/** STREET_TAIL_MIN altında kalan trigger'lar (dil başına, error). */
export function streetTailIssues(tr: unknown, en: unknown): Issue[] {
  const out: Issue[] = [];
  for (const [lang, entries] of [["tr", tr], ["en", en]] as [Lang, unknown][]) {
    if (!Array.isArray(entries)) continue;
    for (const [trigger, min] of Object.entries(STREET_TAIL_MIN)) {
      const n = entries.filter((raw) => {
        const e = raw as Record<string, unknown>;
        return e?.trigger === trigger && typeof e[lang] === "string" && (e[lang] as string).includes("{K:");
      }).length;
      if (n < min) out.push({ severity: "error", lang, index: -1, message: `${trigger}: ${n}/${min} lines have a street {K:...} tail` });
    }
  }
  return out;
}

/** SPEC 13: derin trigger'larda dil başına en az RARE_MIN nadir laf (error). */
export function rareIssues(tr: unknown, en: unknown): Issue[] {
  const out: Issue[] = [];
  for (const [lang, entries] of [["tr", tr], ["en", en]] as [Lang, unknown][]) {
    if (!Array.isArray(entries)) continue;
    for (const trigger of DEEP_TRIGGERS) {
      const n = entries.filter((raw) => {
        const e = raw as Record<string, unknown>;
        return e?.trigger === trigger && e.rare === true && typeof e[lang] === "string";
      }).length;
      if (n < RARE_MIN) out.push({ severity: "error", lang, index: -1, message: `${trigger}: ${n}/${RARE_MIN} rare lines` });
    }
  }
  return out;
}

/** SPEC 15: Free tam kalır. Derin trigger'larda dil başına en az FREE_MIN Pro olmayan laf; answer/interaction gibi temel havuzlarda Pro yok. */
export const FREE_MIN = 10;
export function freeIssues(tr: unknown, en: unknown): Issue[] {
  const out: Issue[] = [];
  for (const [lang, entries] of [["tr", tr], ["en", en]] as [Lang, unknown][]) {
    if (!Array.isArray(entries)) continue;
    const list = entries as Record<string, unknown>[];
    for (const trigger of DEEP_TRIGGERS) {
      const n = list.filter((e) => e?.trigger === trigger && e.pro !== true && typeof e[lang] === "string").length;
      if (n < FREE_MIN) out.push({ severity: "error", lang, index: -1, message: `${trigger}: ${n}/${FREE_MIN} free lines` });
    }
    list.forEach((e, i) => {
      if (e?.pro === true && !(DEEP_TRIGGERS as readonly unknown[]).includes(e.trigger)) {
        out.push({ severity: "error", lang, index: i, id: e.id as string, message: `pro only on deep app/site triggers (${String(e.trigger)} stays free)` });
      }
    });
  }
  return out;
}

export const MAX_RENDERED_CHARS = 60;
export const MAX_INTENT_CHARS = 120;
const ID_RE = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const K_BLOCK = /\{K:[^{}]*\}/g;
/** en fazla bir {K:...}, içi boş değil, başka süslü parantez yok */
const K_SHAPE = /^[^{}]*(\{K:[^{}]+\}[^{}]*)?$/;
/**
 * SPEC 06 (kullanıcı kararı): {K:...} içinde izinli küfür sadece `***` ya da `aq` kısaltması; {K:} dışında hiçbiri.
 * Açık küfür hiçbir yerde yok. Tam kelime; `*` sonu önek. worker/src/lib/lines.ts EXPLICIT_SWEARS ile aynı.
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

/** Metindeki ilk açık küfür (yoksa null). */
export function findExplicitSwear(text: string, lang: Lang): string | null {
  const hay = words(text, lang);
  for (const w of EXPLICIT_SWEARS) {
    const hit = w.endsWith("*") ? hay.includes(` ${w.slice(0, -1)}`) : hay.includes(` ${w} `);
    if (hit) return w;
  }
  return null;
}

const EMOJI = /[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{1F1E6}-\u{1F1FF}‍⃣]/u;
const BANG = /[!¡！]/;

export type Severity = "error" | "gap";

/** error: kural ihlali (CI kırar) · gap: henüz tamamlanmamış (placeholder, kapsam açığı; pool:check kırar) */
export interface Issue {
  severity: Severity;
  lang: Lang;
  /** dosyadaki sıra (0 tabanlı); kapsam açıklarında -1 */
  index: number;
  id?: string;
  message: string;
}

export interface BannedLists {
  tr: readonly string[];
  en: readonly string[];
}

/** banned_<lang>.txt: satır başına bir girdi, `#` yorum, boş satır yok sayılır. `kök*` önek, diğerleri tam kelime. */
export function parseBanned(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/#.*$/, "").trim().toLowerCase())
    .filter((l) => l !== "");
}

const words = (text: string, lang: Lang) =>
  ` ${text.toLocaleLowerCase(lang).split(/[^\p{L}\p{N}-]+/u).filter(Boolean).join(" ")} `;

/** Metinde yasak kelime var mı; varsa ilk eşleşen girdi. İki dilin listesi de taranır (karışık yazım). */
export function findBanned(text: string, lang: Lang, banned: BannedLists): string | null {
  const hay = words(text, lang);
  for (const w of [...banned.tr, ...banned.en]) {
    const hit = w.endsWith("*") ? hay.includes(` ${w.slice(0, -1)}`) : hay.includes(` ${w} `);
    if (hit) return w;
  }
  return null;
}

const visibleKey = (text: string, lang: Lang) => words(renderText(text, "polite"), lang).trim();

/** Tek bir dil dosyasını doğrular. `other` verilirse aynı id'nin iki dilde aynı trigger'da olduğu da kontrol edilir. */
export function checkPool(lang: Lang, entries: unknown, banned: BannedLists, other?: unknown): Issue[] {
  const issues: Issue[] = [];
  const add = (severity: Severity, index: number, message: string, id?: string) =>
    issues.push({ severity, lang, index, id, message });

  if (!Array.isArray(entries)) {
    add("error", -1, "file must be a json array");
    return issues;
  }
  const otherLang: Lang = lang === "tr" ? "en" : "tr";
  const otherTriggers = new Map<string, string>();
  if (Array.isArray(other)) {
    for (const o of other) {
      const r = o as Record<string, unknown>;
      if (typeof r?.id === "string" && typeof r.trigger === "string") otherTriggers.set(r.id, r.trigger);
    }
  }

  const ids = new Set<string>();
  const seenText = new Map<string, string>();
  entries.forEach((raw, i) => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return add("error", i, "entry must be an object");
    const e = raw as Record<string, unknown>;
    const id = typeof e.id === "string" ? e.id : undefined;
    const err = (m: string) => add("error", i, m, id);

    const allowed = new Set(["id", "trigger", "intent", "rare", "pro", lang]);
    for (const k of Object.keys(e)) if (!allowed.has(k)) err(`unexpected field "${k}" (only id, trigger, intent, rare, pro, ${lang})`);
    if ("rare" in e && e.rare !== true) err('rare must be true when present (SPEC 13)');
    if ("pro" in e && e.pro !== true) err("pro must be true when present (SPEC 15)");

    if (!id || !ID_RE.test(id)) err("id must be lowercase snake_case (a-z, 0-9, _)");
    else if (ids.has(id)) err(`duplicate id "${id}"`);
    else ids.add(id);

    const trigger = e.trigger;
    if (typeof trigger !== "string" || !isKnownTrigger(trigger)) {
      err(`unknown trigger ${JSON.stringify(trigger)}`);
    } else if (id && otherTriggers.has(id) && otherTriggers.get(id) !== trigger) {
      err(`id "${id}" has trigger ${trigger} here but ${otherTriggers.get(id)} in pool_${otherLang}`);
    }

    const intent = e.intent;
    if (typeof intent !== "string" || intent.trim() === "") err("intent is required");
    else if (intent.trim().toLowerCase() === "placeholder") add("gap", i, "intent is still placeholder", id);
    else if (Array.from(intent).length > MAX_INTENT_CHARS) err(`intent longer than ${MAX_INTENT_CHARS} chars`);
    else if (findBanned(intent, "en", banned)) err(`intent uses a banned word "${findBanned(intent, "en", banned)}"`);

    const text = e[lang];
    if (typeof text !== "string" || text.trim() === "") return err(`"${lang}" text is required`);
    if (text !== text.trim()) err("text has leading/trailing spaces");
    if (/[\r\n\t]/.test(text)) err("text must be a single line");
    if (!K_SHAPE.test(text)) err("{K:...} must appear at most once, be closed and not empty; no other braces");
    if (/\[k\]/i.test(text)) err("use {K:...} in pool lines, not [K]");
    const lowered = text.replace(/\{K:/g, "{k:");
    if (lowered !== lowered.toLocaleLowerCase(lang)) err("text must be lowercase");
    if (BANG.test(text)) err("no exclamation marks");
    if (EMOJI.test(text)) err("no emoji");
    if (text.replace(K_BLOCK, "").includes("***")) err("*** only inside {K:...} (polite must stay clean)");
    if (words(text.replace(K_BLOCK, " "), lang).includes(" aq ")) err("aq only inside {K:...} (polite must stay clean)");
    const swear = findExplicitSwear(text.replace(/\{K:/g, " "), lang);
    if (swear) err(`explicit swear "${swear}": only *** or aq, inside {K:...}`);

    for (const mode of ["polite", "street"] as Mode[]) {
      const rendered = renderText(text, mode);
      if (rendered === "") err(`renders empty in ${mode}`);
      else if (Array.from(rendered).length > MAX_RENDERED_CHARS) {
        err(`${mode} render is ${Array.from(rendered).length} chars (max ${MAX_RENDERED_CHARS})`);
      }
    }
    const bannedHit = findBanned(text.replace(/\{K:/g, " "), lang, banned);
    if (bannedHit) err(`banned word "${bannedHit}"`);

    const key = visibleKey(text, lang);
    if (key !== "" && seenText.has(key)) err(`same text as "${seenText.get(key)}"`);
    else if (key !== "") seenText.set(key, id ?? `#${i}`);
  });
  return issues;
}

export interface CoverageRow {
  trigger: string;
  target: number;
  tr: number;
  en: number;
  es?: number;
}

/** Trigger başına dil başına laf sayısı (placeholder intent'li laflar sayılmaz). */
export function coverage(tr: unknown, en: unknown): CoverageRow[] {
  const count = (entries: unknown) => {
    const m = new Map<string, number>();
    if (!Array.isArray(entries)) return m;
    for (const raw of entries) {
      const e = raw as Record<string, unknown>;
      if (typeof e?.trigger !== "string") continue;
      if (typeof e.intent === "string" && e.intent.trim().toLowerCase() === "placeholder") continue;
      m.set(e.trigger, (m.get(e.trigger) ?? 0) + 1);
    }
    return m;
  };
  const t = count(tr);
  const n = count(en);
  return Object.entries(POOL_TARGETS).map(([trigger, target]) => ({
    trigger,
    target,
    tr: t.get(trigger) ?? 0,
    en: n.get(trigger) ?? 0,
  }));
}

export function coverageGaps(rows: readonly CoverageRow[]): Issue[] {
  const out: Issue[] = [];
  for (const r of rows) {
    for (const lang of ["tr", "en"] as const) {
      if (r[lang] < r.target) {
        out.push({ severity: "gap", lang, index: -1, message: `${r.trigger}: ${r[lang]}/${r.target}` });
      }
    }
  }
  return out;
}

/** COVERAGE.md içeriği (tablo + toplamlar). */
export function coverageMarkdown(rows: readonly CoverageRow[]): string {
  const mark = (n: number, target: number) => (n >= target ? `${n}` : `**${n}**`);
  const sum = (k: "target" | "tr" | "en") => rows.reduce((a, r) => a + (k === "target" ? r.target : Math.min(r[k], r.target)), 0);
  const lines = [
    "# Laf havuzu kapsamı",
    "",
    "Üretilir: `cd desktop; npm run pool:coverage` (elle düzenleme). Hedefler: `desktop/src/lines/pool-check.ts` `POOL_TARGETS` (SPEC 03 P1).",
    "Sayılar dil başına; `intent: \"placeholder\"` laflar sayılmaz. **Kalın** = hedefin altında.",
    "Toplantı uygulamaları (zoom, teams, webex) için laf yazılmaz: toplantıda dunno susar.",
    "",
    "| trigger | hedef | tr | en |",
    "|---|---|---|---|",
    ...rows.map((r) => `| \`${r.trigger}\` | ${r.target} | ${mark(r.tr, r.target)} | ${mark(r.en, r.target)} |`),
    `| **toplam (hedefe sayılan)** | ${sum("target")} | ${sum("tr")} | ${sum("en")} |`,
    "",
  ];
  return lines.join("\n");
}
