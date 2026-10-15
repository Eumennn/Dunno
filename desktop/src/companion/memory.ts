// Dunno Memory (SPEC 17 R2, strateji §1, saf): Dunno kullanıcıyı zamanla tanır ama sadece davranış ÖZETLERİYLE.
// Saklanan: son 7 günün sayıları, uygulama ETİKETİ sayıları, anı kartları (şablon id + sayı/etiket). Soru metni, pano, ekran,
// klavye, dosya içeriği asla. Trait'ler kayan pencereden hesaplanır ve geri dönebilir (bir haftalık davranış seni etiketlemez).
import { localDay } from "../lines/engine";
import { INTERACTIONS, type CompanionEvent } from "./events";

export const WINDOW_DAYS = 7;
export const MAX_MEMORIES = 60;
/** uygulama etiketi tablosu sınırı (en az kullanılan düşer) */
export const MAX_APPS = 20;

export interface DayAgg {
  clicks: number;
  drags: number;
  questions: number;
  lines: number;
  /** 00:00-04:59 arası etkileşim */
  night: number;
  /** açık kalınan dakika */
  minutes: number;
}

export const MEMORY_IDS = [
  "first_hello",
  "first_question",
  "first_drag",
  "first_honest",
  "drag_day",
  "click_day",
  "question_day",
  "long_session",
  "night_session",
  "favorite_app",
  "secret_world",
  "level",
  "evolved",
  "returned",
  "incident",
  "secret_10k",
  "secret_100k",
] as const;
export type MemoryId = (typeof MEMORY_IDS)[number];

/** Anı kartı: şablon id + en fazla bir sayı ve bir etiket (uygulama / form / dünya; hepsi sabit kümelerden) */
export interface MemoryCard {
  id: MemoryId;
  at: string;
  n?: number;
  tag?: string;
}

export interface MemoryState {
  days: Record<string, DayAgg>;
  apps: Record<string, number>;
  memories: MemoryCard[];
  /** bir kez olan anılar (first_*) ve gün başına bir kez olanlar "id@gün" */
  fired: string[];
  /** bu oturumun başı (long_session) */
  sessionStart: string | null;
}

export const initialMemory = (): MemoryState => ({ days: {}, apps: {}, memories: [], fired: [], sessionStart: null });

const emptyDay = (): DayAgg => ({ clicks: 0, drags: 0, questions: 0, lines: 0, night: 0, minutes: 0 });

/** Etiket güvenliği: sadece küçük harf/rakam/alt çizgi, ≤ 24 (uygulama etiketi biçimi; başlık sızamaz) */
export const safeTag = (t: unknown): string | null => (typeof t === "string" && /^[a-z0-9_]{1,24}$/.test(t) ? t : null);

const nonNeg = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);

/** Store'dan gelen hafıza: bozuk alanlar atılır, bilinmeyen anı id'si ve güvensiz etiket girmez. */
export function cleanMemory(raw: unknown): MemoryState {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Partial<Record<keyof MemoryState, unknown>>;
  const m = initialMemory();
  if (typeof r.days === "object" && r.days !== null) {
    for (const [day, v] of Object.entries(r.days as Record<string, unknown>)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || typeof v !== "object" || v === null) continue;
      const d = v as Record<string, unknown>;
      m.days[day] = { clicks: nonNeg(d.clicks), drags: nonNeg(d.drags), questions: nonNeg(d.questions), lines: nonNeg(d.lines), night: nonNeg(d.night), minutes: nonNeg(d.minutes) };
    }
  }
  if (typeof r.apps === "object" && r.apps !== null) {
    for (const [k, v] of Object.entries(r.apps as Record<string, unknown>)) if (safeTag(k)) m.apps[k] = nonNeg(v);
  }
  if (Array.isArray(r.memories)) {
    for (const c of r.memories) {
      if (typeof c !== "object" || c === null) continue;
      const x = c as Record<string, unknown>;
      if (!(MEMORY_IDS as readonly unknown[]).includes(x.id) || typeof x.at !== "string" || Number.isNaN(Date.parse(x.at))) continue;
      const card: MemoryCard = { id: x.id as MemoryId, at: x.at };
      if (typeof x.n === "number" && Number.isFinite(x.n)) card.n = Math.floor(x.n);
      const tag = safeTag(x.tag);
      if (tag) card.tag = tag;
      m.memories.push(card);
    }
    m.memories = m.memories.slice(-MAX_MEMORIES);
  }
  if (Array.isArray(r.fired)) m.fired = r.fired.filter((x): x is string => typeof x === "string" && /^[a-z0-9_@-]{1,40}$/.test(x)).slice(-400);
  if (typeof r.sessionStart === "string" && !Number.isNaN(Date.parse(r.sessionStart))) m.sessionStart = r.sessionStart;
  return m;
}

/** Pencere dışına düşen günler silinir (sadece son WINDOW_DAYS gün tutulur). */
function prune(m: MemoryState, now: Date): void {
  const keep = new Set<string>();
  for (let i = 0; i < WINDOW_DAYS; i++) keep.add(localDay(new Date(now.getTime() - i * 86_400_000)));
  for (const d of Object.keys(m.days)) if (!keep.has(d)) delete m.days[d];
  // bugünün dışındaki gün-başı anahtarlar da gider
  const today = localDay(now);
  m.fired = m.fired.filter((f) => !f.includes("@") || f.endsWith(`@${today}`));
}

/** Eşikler (bugün): bu sayıya ulaşınca bir anı kartı (strateji örneği "you dragged me 17 times.") */
export const DAY_MARKS = { drag_day: 17, click_day: 100, question_day: 20 } as const;
/** uzun oturum: saat */
export const LONG_SESSION_H = 4;

export interface MemoryResult {
  state: MemoryState;
  /** bu olayla eklenen anılar */
  added: MemoryCard[];
}

/** Dışarıdan anı ekleme (level, evrim, gizli dünya, dönüş, olay). key verilirse bir kez. */
export function remember(m: MemoryState, card: Omit<MemoryCard, "at">, now: Date, onceKey?: string): MemoryResult {
  if (onceKey && m.fired.includes(onceKey)) return { state: m, added: [] };
  const c: MemoryCard = { ...card, at: now.toISOString() };
  const tag = card.tag === undefined ? undefined : safeTag(card.tag);
  if (card.tag !== undefined && !tag) delete c.tag;
  const state: MemoryState = {
    ...m,
    memories: [...m.memories, c].slice(-MAX_MEMORIES),
    fired: onceKey ? [...m.fired, onceKey] : m.fired,
  };
  return { state, added: [c] };
}

/** Olayı hafızaya işler (saf). */
export function memoryOnEvent(prev: MemoryState, ev: CompanionEvent, now: Date): MemoryResult {
  const m: MemoryState = { ...prev, days: { ...prev.days }, apps: { ...prev.apps }, fired: [...prev.fired], memories: prev.memories };
  prune(m, now);
  const day = localDay(now);
  const d = (m.days[day] = { ...(m.days[day] ?? emptyDay()) });
  let added: MemoryCard[] = [];
  const add = (card: Omit<MemoryCard, "at">, key: string) => {
    const r = remember(m, card, now, key);
    m.memories = r.state.memories;
    m.fired = r.state.fired;
    added = added.concat(r.added);
  };
  const hour = now.getHours();
  if (INTERACTIONS.has(ev.type) && hour < 5) d.night++;
  switch (ev.type) {
    case "session_start":
      m.sessionStart = now.toISOString();
      add({ id: "first_hello" }, "first_hello");
      break;
    case "heartbeat": {
      d.minutes++;
      if (m.sessionStart) {
        const h = Math.floor((now.getTime() - Date.parse(m.sessionStart)) / 3_600_000);
        if (h >= LONG_SESSION_H) add({ id: "long_session", n: h }, `long_session@${day}`);
      }
      break;
    }
    case "click":
      d.clicks++;
      if (d.clicks === DAY_MARKS.click_day) add({ id: "click_day", n: d.clicks }, `click_day@${day}`);
      if (hour >= 3 && hour < 5) add({ id: "night_session" }, `night_session@${day}`);
      break;
    case "drag":
      d.drags++;
      add({ id: "first_drag" }, "first_drag");
      if (d.drags === DAY_MARKS.drag_day) add({ id: "drag_day", n: d.drags }, `drag_day@${day}`);
      break;
    case "question":
      d.questions++;
      add({ id: "first_question" }, "first_question");
      if (d.questions === DAY_MARKS.question_day) add({ id: "question_day", n: d.questions }, `question_day@${day}`);
      if (hour >= 3 && hour < 5) add({ id: "night_session" }, `night_session@${day}`);
      break;
    case "honest":
      add({ id: "first_honest" }, "first_honest");
      break;
    case "line": {
      d.lines++;
      const tag = safeTag(ev.app);
      if (tag) {
        m.apps[tag] = (m.apps[tag] ?? 0) + 1;
        const keys = Object.keys(m.apps);
        if (keys.length > MAX_APPS) {
          const least = keys.sort((a, b) => m.apps[a] - m.apps[b])[0];
          delete m.apps[least];
        }
        // favori uygulama anısı: 25. lafta, uygulama başına bir kez
        if (m.apps[tag] === 25) add({ id: "favorite_app", tag }, `favorite_app_${tag}`);
      }
      break;
    }
    case "world_change":
      if (ev.unlocked) add({ id: "secret_world", tag: ev.world }, `secret_world_${safeTag(ev.world) ?? "x"}`);
      break;
    default:
      break;
  }
  return { state: m, added };
}

export const TRAITS = ["night_owl", "serial_dragger", "spam_clicker", "power_user", "quiet_user"] as const;
export type Trait = (typeof TRAITS)[number];

export interface Traits {
  traits: Trait[];
  favoriteApp: string | null;
  /** penceredeki toplamlar (kart/ekran için) */
  week: DayAgg;
  activeDays: number;
}

/** Son 7 günden davranış özetleri (saf, eşikli). */
export function traitsOf(m: MemoryState): Traits {
  const week = emptyDay();
  let activeDays = 0;
  for (const d of Object.values(m.days)) {
    for (const k of Object.keys(week) as (keyof DayAgg)[]) week[k] += d[k];
    if (d.clicks + d.drags + d.questions + d.minutes > 0) activeDays++;
  }
  const inter = week.clicks + week.drags + week.questions;
  const out: Trait[] = [];
  if (week.night >= 15 && week.night >= inter * 0.25) out.push("night_owl");
  if (week.drags >= 30) out.push("serial_dragger");
  if (week.clicks >= 150) out.push("spam_clicker");
  if (inter >= 300 || (activeDays >= 5 && inter >= activeDays * 40)) out.push("power_user");
  if (activeDays >= 3 && inter < 20) out.push("quiet_user");
  const apps = Object.entries(m.apps).filter(([, n]) => n >= 10).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  return { traits: out, favoriteApp: apps[0]?.[0] ?? null, week, activeDays };
}
