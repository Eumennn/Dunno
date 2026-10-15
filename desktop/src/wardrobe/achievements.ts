// Tembel başarımlar motoru (saf, SPEC 05 W3 + SPEC 09 K9): (ilerleme, olay, şimdi) -> yeni ilerleme + yeni açılanlar.
// Sadece cihazda; ağ yok, soru metni yok (sadece sayaçlar ve soru TİPİ sayıları). Saat dışarıdan verilir.
// İlerleme düz JSON (store'a olduğu gibi yazılır). Tablo + metinler: orchestrator/notes/achievements-k9.md, achievements-k9.strings.ts.
import { localDay } from "../lines/engine";

export type Unlock = { kind: "theme"; id: string } | { kind: "accessory"; id: string } | { kind: "costume"; id: string };

/** Başlangıçta açık olanlar. */
export const STARTER: readonly Unlock[] = [
  { kind: "theme", id: "classic" },
  { kind: "accessory", id: "beanie" },
];

export type AchievementId =
  // SPEC 05 W3
  | "learned_nothing_7"
  | "poke_100"
  | "night_owl"
  | "out_of_questions_5"
  | "drag_50"
  | "meeting_survivor"
  | "spreadsheet_10"
  | "idle_hour"
  | "street_mode_day"
  // SPEC 09 K9: temalar
  | "sweet_tooth"
  | "early_bird"
  | "edge_dweller"
  | "two_weeks"
  | "thank_you_10"
  | "quiet_days"
  | "good_morning_10"
  | "good_night_10"
  | "questions_100"
  | "love_5"
  | "bored_10"
  // kostümler
  | "drag_200"
  | "too_fast_10"
  | "honest_15"
  | "ghost_hours"
  | "fossil_30"
  | "night_frog_20"
  | "meetings_50"
  | "hungry_25"
  // aksesuarlar
  | "drag_100"
  | "out_of_questions_15"
  | "fart_5"
  | "why_20"
  | "honest_3"
  | "sorry_10"
  | "what_30"
  | "math_20"
  | "streak_7"
  | "hello_20"
  | "bye_10"
  | "how_are_you_10"
  | "questions_50"
  | "app_lines_50"
  // SPEC 12 yaratıklar
  | "drag_500"
  | "poke_300"
  | "open_60"
  | "idle_24"
  | "quiet_10"
  | "questions_300"
  | "night_50"
  | "edge_100"
  | "hello_50"
  | "out_30"
  | "good_night_25"
  | "fart_20";

export type AchEvent =
  | { type: "open" }
  /** qtype: talk/classify.ts tipi (sadece tip; soru metni asla) */
  | { type: "question"; qtype?: string }
  | { type: "limit_reached" }
  | { type: "click" }
  | { type: "drag" }
  | { type: "meeting_guard" }
  | { type: "line"; app: string | null }
  | { type: "idle_hour" }
  | { type: "mode"; mode: "polite" | "street" }
  // SPEC 09 K9
  /** sunucu charged:true honest cevap */
  | { type: "honest" }
  /** soru temposu "yavaş" (interaction:too_fast) */
  | { type: "too_fast" }
  /** osurma (talk/fart.ts fire) */
  | { type: "fart" }
  /** yan kenarda durup baktı (peek) */
  | { type: "edge" }
  /** "bugün sus" açıldı */
  | { type: "mute" };

/** Sayılan soru tipleri (store'a sadece bunlar yazılır). */
export const COUNTED_QTYPES = [
  "hungry",
  "thanks",
  "sorry",
  "good_morning",
  "good_night",
  "love",
  "bored",
  "why",
  "what",
  "math",
  "greeting",
  "bye",
  "how_are_you",
] as const;
type CountedQType = (typeof COUNTED_QTYPES)[number];

export interface Progress {
  openDays: number;
  lastOpenDay: string | null;
  clicks: number;
  drags: number;
  nightQuestions: number;
  outDays: number;
  lastOutDay: string | null;
  meetingGuards: number;
  excelLines: number;
  idleHours: number;
  /** sokak moduna geçiş anı (ISO); polite'a dönünce null */
  streetSince: string | null;
  // SPEC 09 K9
  questions: number;
  /** 05:00-09:00 arası sorular */
  morningQuestions: number;
  honestAnswers: number;
  tooFast: number;
  farts: number;
  edges: number;
  muteDays: number;
  lastMuteDay: string | null;
  /** üst üste açılan gün (bugün dahil) ve en uzunu */
  streak: number;
  maxStreak: number;
  /** herhangi bir app:* bağlamında söylenen laf */
  appLines: number;
  /** soru tipi -> sayı (sadece COUNTED_QTYPES) */
  qtypes: Partial<Record<CountedQType, number>>;
  /** açılan başarım -> açılma zamanı (ISO) */
  unlocked: Partial<Record<AchievementId, string>>;
}

export const STREET_DAY_MS = 24 * 60 * 60 * 1000;

/** Sayaç alanları (başarım kaynağı olabilen). */
type CounterField = (typeof COUNTERS)[number];

/** Başarımın kaynağı: bir sayaç, bir soru tipi sayısı ya da kesintisiz sokak modu saati. */
type Source = { field: CounterField } | { qtype: CountedQType } | { streetHours: true };

interface Def {
  id: AchievementId;
  unlocks: Unlock;
  target: number;
  src: Source;
}

const f = (field: CounterField): Source => ({ field });
const theme = (id: string): Unlock => ({ kind: "theme", id });
const acc = (id: string): Unlock => ({ kind: "accessory", id });
const costume = (id: string): Unlock => ({ kind: "costume", id });

/** SPEC 05 W3 + SPEC 09 K9 tablosu (sıra = UI sırası). */
export const ACHIEVEMENTS: readonly Def[] = [
  { id: "learned_nothing_7", unlocks: acc("crown"), target: 7, src: f("openDays") },
  { id: "poke_100", unlocks: acc("party_hat"), target: 100, src: f("clicks") },
  { id: "night_owl", unlocks: acc("nightcap"), target: 1, src: f("nightQuestions") },
  { id: "out_of_questions_5", unlocks: acc("sunglasses"), target: 5, src: f("outDays") },
  { id: "drag_50", unlocks: acc("headphones"), target: 50, src: f("drags") },
  { id: "meeting_survivor", unlocks: theme("night"), target: 10, src: f("meetingGuards") },
  { id: "spreadsheet_10", unlocks: theme("burnt_toast"), target: 10, src: f("excelLines") },
  { id: "idle_hour", unlocks: theme("lavender"), target: 3, src: f("idleHours") },
  {
    id: "street_mode_day",
    unlocks: theme("mint"),
    target: 24,
    // saat cinsinden kesintisiz sokak modu
    src: { streetHours: true },
  },
  // SPEC 09 K9: yeni temalar
  { id: "sweet_tooth", unlocks: theme("strawberry"), target: 10, src: { qtype: "hungry" } },
  { id: "early_bird", unlocks: theme("lemon"), target: 5, src: f("morningQuestions") },
  { id: "edge_dweller", unlocks: theme("ocean"), target: 30, src: f("edges") },
  { id: "two_weeks", unlocks: theme("forest"), target: 14, src: f("maxStreak") },
  { id: "thank_you_10", unlocks: theme("peach"), target: 10, src: { qtype: "thanks" } },
  { id: "quiet_days", unlocks: theme("gray_cat"), target: 5, src: f("muteDays") },
  { id: "good_morning_10", unlocks: theme("coffee"), target: 10, src: { qtype: "good_morning" } },
  { id: "good_night_10", unlocks: theme("midnight"), target: 10, src: { qtype: "good_night" } },
  { id: "questions_100", unlocks: theme("retro_green"), target: 100, src: f("questions") },
  { id: "love_5", unlocks: theme("cotton_candy"), target: 5, src: { qtype: "love" } },
  { id: "bored_10", unlocks: theme("watermelon"), target: 10, src: { qtype: "bored" } },
  // kostümler
  { id: "drag_200", unlocks: costume("bug"), target: 200, src: f("drags") },
  { id: "too_fast_10", unlocks: costume("fly"), target: 10, src: f("tooFast") },
  { id: "honest_15", unlocks: costume("bee"), target: 15, src: f("honestAnswers") },
  { id: "ghost_hours", unlocks: costume("ghost"), target: 12, src: f("idleHours") },
  { id: "fossil_30", unlocks: costume("dino"), target: 30, src: f("openDays") },
  { id: "night_frog_20", unlocks: costume("frog"), target: 20, src: f("nightQuestions") },
  { id: "meetings_50", unlocks: costume("astronaut"), target: 50, src: f("meetingGuards") },
  { id: "hungry_25", unlocks: costume("pizza"), target: 25, src: { qtype: "hungry" } },
  // aksesuarlar (doğum günü şapkası parti şapkasıyla aynı: çıkarıldı)
  { id: "drag_100", unlocks: acc("cowboy_hat"), target: 100, src: f("drags") },
  { id: "out_of_questions_15", unlocks: acc("pirate_bandana"), target: 15, src: f("outDays") },
  { id: "fart_5", unlocks: acc("chef_hat"), target: 5, src: f("farts") },
  { id: "why_20", unlocks: acc("wizard_hat"), target: 20, src: { qtype: "why" } },
  { id: "honest_3", unlocks: acc("cape"), target: 3, src: f("honestAnswers") },
  { id: "sorry_10", unlocks: acc("bow_tie"), target: 10, src: { qtype: "sorry" } },
  { id: "what_30", unlocks: acc("monocle"), target: 30, src: { qtype: "what" } },
  { id: "math_20", unlocks: acc("nerd_glasses"), target: 20, src: { qtype: "math" } },
  { id: "streak_7", unlocks: acc("scarf"), target: 7, src: f("maxStreak") },
  { id: "hello_20", unlocks: acc("cat_ears"), target: 20, src: { qtype: "greeting" } },
  { id: "bye_10", unlocks: acc("ribbon"), target: 10, src: { qtype: "bye" } },
  { id: "how_are_you_10", unlocks: acc("flower"), target: 10, src: { qtype: "how_are_you" } },
  { id: "questions_50", unlocks: acc("grad_cap"), target: 50, src: f("questions") },
  { id: "app_lines_50", unlocks: acc("hard_hat"), target: 50, src: f("appLines") },
  // SPEC 12 yaratıklar (daha uzun yol: ilerleme hissi)
  { id: "drag_500", unlocks: costume("cockroach"), target: 500, src: f("drags") },
  { id: "poke_300", unlocks: costume("cat"), target: 300, src: f("clicks") },
  { id: "open_60", unlocks: costume("dog"), target: 60, src: f("openDays") },
  { id: "idle_24", unlocks: costume("slime"), target: 24, src: f("idleHours") },
  { id: "quiet_10", unlocks: costume("mushroom"), target: 10, src: f("muteDays") },
  { id: "questions_300", unlocks: costume("robot"), target: 300, src: f("questions") },
  { id: "night_50", unlocks: costume("alien"), target: 50, src: f("nightQuestions") },
  { id: "edge_100", unlocks: costume("fish"), target: 100, src: f("edges") },
  { id: "hello_50", unlocks: costume("duck"), target: 50, src: { qtype: "greeting" } },
  { id: "out_30", unlocks: costume("skeleton"), target: 30, src: f("outDays") },
  { id: "good_night_25", unlocks: costume("vampire"), target: 25, src: { qtype: "good_night" } },
  { id: "fart_20", unlocks: costume("mini_monster"), target: 20, src: f("farts") },
];

export function initialProgress(): Progress {
  return {
    openDays: 0,
    lastOpenDay: null,
    clicks: 0,
    drags: 0,
    nightQuestions: 0,
    outDays: 0,
    lastOutDay: null,
    meetingGuards: 0,
    excelLines: 0,
    idleHours: 0,
    streetSince: null,
    questions: 0,
    morningQuestions: 0,
    honestAnswers: 0,
    tooFast: 0,
    farts: 0,
    edges: 0,
    muteDays: 0,
    lastMuteDay: null,
    streak: 0,
    maxStreak: 0,
    appLines: 0,
    qtypes: {},
    unlocked: {},
  };
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
const str = (v: unknown) => (typeof v === "string" ? v : null);
const IDS = new Set<string>(ACHIEVEMENTS.map((a) => a.id));
const COUNTED = new Set<string>(COUNTED_QTYPES);
const COUNTERS = [
  "openDays",
  "clicks",
  "drags",
  "nightQuestions",
  "outDays",
  "meetingGuards",
  "excelLines",
  "idleHours",
  "questions",
  "morningQuestions",
  "honestAnswers",
  "tooFast",
  "farts",
  "edges",
  "muteDays",
  "streak",
  "maxStreak",
  "appLines",
] as const;

/** Store'dan gelen bozuk/eksik değer güvenle normallenir (eski SPEC 05 kaydı yeni alanları 0 alır). */
export function cleanProgress(raw: unknown): Progress {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const unlocked: Progress["unlocked"] = {};
  if (typeof r.unlocked === "object" && r.unlocked !== null) {
    for (const [k, v] of Object.entries(r.unlocked as Record<string, unknown>)) {
      if (IDS.has(k) && typeof v === "string") unlocked[k as AchievementId] = v;
    }
  }
  const qtypes: Progress["qtypes"] = {};
  if (typeof r.qtypes === "object" && r.qtypes !== null) {
    for (const [k, v] of Object.entries(r.qtypes as Record<string, unknown>)) {
      if (COUNTED.has(k) && num(v) > 0) qtypes[k as CountedQType] = num(v);
    }
  }
  const p = initialProgress();
  for (const k of COUNTERS) p[k] = num(r[k]);
  p.lastOpenDay = str(r.lastOpenDay);
  p.lastOutDay = str(r.lastOutDay);
  p.lastMuteDay = str(r.lastMuteDay);
  p.streetSince = str(r.streetSince);
  p.maxStreak = Math.max(p.maxStreak, p.streak);
  p.qtypes = qtypes;
  p.unlocked = unlocked;
  return p;
}

/** Bir önceki yerel gün (YYYY-MM-DD); saat değişiminden etkilenmez. */
function yesterday(now: Date): string {
  return localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12));
}

/** Bir olayı işler. Saf: girdiyi değiştirmez. Yeni açılanlar tablo sırasıyla. */
export function step(progress: Progress, ev: AchEvent, now: Date): { progress: Progress; unlocked: Def[] } {
  const p: Progress = { ...progress, qtypes: { ...progress.qtypes }, unlocked: { ...progress.unlocked } };
  const day = localDay(now);
  // olay geldiyse uygulama o gün açıktır; dün de açıksa seri sürer
  if (p.lastOpenDay !== day) {
    p.streak = p.lastOpenDay === yesterday(now) ? p.streak + 1 : 1;
    p.maxStreak = Math.max(p.maxStreak, p.streak);
    p.openDays += 1;
    p.lastOpenDay = day;
  }
  switch (ev.type) {
    case "question": {
      p.questions += 1;
      const h = now.getHours();
      if (h < 5) p.nightQuestions += 1;
      else if (h < 9) p.morningQuestions += 1;
      if (ev.qtype && COUNTED.has(ev.qtype)) {
        const t = ev.qtype as CountedQType;
        p.qtypes[t] = (p.qtypes[t] ?? 0) + 1;
      }
      break;
    }
    case "limit_reached":
      if (p.lastOutDay !== day) {
        p.outDays += 1;
        p.lastOutDay = day;
      }
      break;
    case "click":
      p.clicks += 1;
      break;
    case "drag":
      p.drags += 1;
      break;
    case "meeting_guard":
      p.meetingGuards += 1;
      break;
    case "line":
      if (ev.app === "excel") p.excelLines += 1;
      if (ev.app) p.appLines += 1;
      break;
    case "idle_hour":
      p.idleHours += 1;
      break;
    case "mode":
      if (ev.mode === "street") p.streetSince ??= now.toISOString();
      else p.streetSince = null;
      break;
    case "honest":
      p.honestAnswers += 1;
      break;
    case "too_fast":
      p.tooFast += 1;
      break;
    case "fart":
      p.farts += 1;
      break;
    case "edge":
      p.edges += 1;
      break;
    case "mute":
      if (p.lastMuteDay !== day) {
        p.muteDays += 1;
        p.lastMuteDay = day;
      }
      break;
  }
  const unlocked: Def[] = [];
  for (const a of ACHIEVEMENTS) {
    if (p.unlocked[a.id]) continue;
    if (valueOf(a, p, now) >= a.target) {
      p.unlocked[a.id] = now.toISOString();
      unlocked.push(a);
    }
  }
  return { progress: p, unlocked };
}

/** UI ilerlemesi (ör. "37 / 100"). */
export function progressOf(p: Progress, id: AchievementId, now: Date): { value: number; target: number; done: boolean } {
  const a = ACHIEVEMENTS.find((x) => x.id === id)!;
  const done = Boolean(p.unlocked[id]);
  return { value: done ? a.target : Math.min(valueOf(a, p, now), a.target), target: a.target, done };
}

/** Açık parçalar: başlangıç + açılan başarımların parçaları. */
export function unlockedItems(p: Progress): Unlock[] {
  return [...STARTER, ...ACHIEVEMENTS.filter((a) => p.unlocked[a.id]).map((a) => a.unlocks)];
}

/** Başarımın şu anki değeri (kaynağından). */
export function valueOf(a: Def, p: Progress, now: Date): number {
  if ("field" in a.src) return p[a.src.field];
  if ("qtype" in a.src) return p.qtypes[a.src.qtype] ?? 0;
  return p.streetSince ? Math.floor((now.getTime() - Date.parse(p.streetSince)) / 3_600_000) : 0;
}

/**
 * Test modu "başarım tetikle" (devmode/testmode.ts): kaynağı hedefe getiren ilerleme (gerçek sayaç, kalıcı).
 * Zaten hedefteyse değişmez. Sonrasında step() çağrılınca normal yoldan açılır.
 */
export function fillTo(id: AchievementId, p: Progress, now: Date): Progress {
  const a = ACHIEVEMENTS.find((x) => x.id === id)!;
  if (valueOf(a, p, now) >= a.target) return p;
  if ("field" in a.src) {
    const next = { ...p, [a.src.field]: a.target };
    return next;
  }
  if ("qtype" in a.src) return { ...p, qtypes: { ...p.qtypes, [a.src.qtype]: a.target } };
  return { ...p, streetSince: new Date(now.getTime() - a.target * 3_600_000).toISOString() };
}
