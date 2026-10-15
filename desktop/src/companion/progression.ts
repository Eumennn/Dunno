// Level ve XP (SPEC 17 R4, strateji §3, saf). XP her şeyden gelir ama dokunma (tıklama/sürükleme) günlük tavanlıdır:
// spam ile level kasılmaz. Milestone'lar gerçek içerik açar (lore, kart çerçevesi, evrim, ilişki dönüm noktası).
import { localDay } from "../lines/engine";
import type { CompanionEvent } from "./events";

export interface ProgressState {
  xp: number;
  level: number;
  /** günlük tavanlar: gün + kaynak başına kazanılan */
  day: string | null;
  earned: Record<string, number>;
}

export const initialProgress = (): ProgressState => ({ xp: 0, level: 1, day: null, earned: {} });

/** Kaynak -> [olay başına XP, günlük tavan] */
export const XP_TABLE: Readonly<Record<string, readonly [number, number]>> = {
  touch: [1, 60],
  question: [5, 100],
  honest: [10, 30],
  daily: [15, 15],
  customize: [5, 30],
  edge: [2, 10],
  achievement: [40, Infinity],
  secret: [60, Infinity],
  incident: [50, Infinity],
  world: [40, Infinity],
  /** FB6 ilk adımlar: adım başına bir kez (5 adım = 80 = level 3) */
  onboarding: [16, Infinity],
};

export const MAX_LEVEL = 99;

/** level n için gereken toplam XP: 25 * (n-1)^1.6 (L10 ~ bir hafta, L25 ~ bir ay olağan kullanım) */
export const xpFor = (level: number): number => Math.round(25 * Math.pow(Math.max(0, level - 1), 1.6));

export function levelOf(xp: number): number {
  let l = 1;
  while (l < MAX_LEVEL && xp >= xpFor(l + 1)) l++;
  return l;
}

/** arayüz: bu leveldeki ilerleme 0..1 */
export function levelProgress(xp: number): { level: number; into: number; need: number; ratio: number } {
  const level = levelOf(xp);
  const lo = xpFor(level);
  const hi = xpFor(level + 1);
  const into = xp - lo;
  const need = hi - lo;
  return { level, into, need, ratio: level >= MAX_LEVEL ? 1 : Math.min(1, into / Math.max(1, need)) };
}

export const MILESTONES = [
  { level: 3, reward: "lore_1" },
  { level: 5, reward: "evo_hint" },
  { level: 8, reward: "card_frame" },
  { level: 10, reward: "evolve_1" },
  { level: 15, reward: "lore_2" },
  { level: 20, reward: "lore_3" },
  { level: 25, reward: "evolve_2" },
  { level: 30, reward: "bond" },
] as const;
export type Reward = (typeof MILESTONES)[number]["reward"];

export const rewardsUpTo = (level: number): Reward[] => MILESTONES.filter((m) => m.level <= level).map((m) => m.reward);

export function cleanProgress(raw: unknown): ProgressState {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const p = initialProgress();
  if (typeof r.xp === "number" && Number.isFinite(r.xp) && r.xp >= 0) p.xp = Math.floor(r.xp);
  p.level = levelOf(p.xp);
  if (typeof r.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.day)) p.day = r.day;
  if (typeof r.earned === "object" && r.earned !== null)
    for (const [k, v] of Object.entries(r.earned as Record<string, unknown>)) if (k in XP_TABLE && typeof v === "number" && v >= 0) p.earned[k] = Math.floor(v);
  return p;
}

/** Olay -> XP kaynağı (yoksa XP yok) */
function sourceOf(ev: CompanionEvent): string | null {
  switch (ev.type) {
    case "click":
    case "drag":
      return "touch";
    case "question":
      return "question";
    case "honest":
      return "honest";
    case "session_start":
      return "daily";
    case "customize":
      return "customize";
    case "edge":
      return "edge";
    case "achievement":
      return "achievement";
    case "world_change":
      return ev.unlocked ? "world" : null;
    default:
      return null;
  }
}

export interface ProgressResult {
  state: ProgressState;
  gained: number;
  /** atlanan leveller (birden çok olabilir) */
  levelUps: number[];
}

/** Doğrudan XP (gizli eşik, olay zinciri): kaynak tavanına uyar. */
export function grant(prev: ProgressState, source: keyof typeof XP_TABLE, now: Date, times = 1): ProgressResult {
  const day = localDay(now);
  const s: ProgressState = { ...prev, earned: prev.day === day ? { ...prev.earned } : {}, day };
  const [each, cap] = XP_TABLE[source];
  const room = cap - (s.earned[source] ?? 0);
  const gained = Math.max(0, Math.min(each * times, room));
  if (!gained) return { state: s, gained: 0, levelUps: [] };
  s.earned[source] = (s.earned[source] ?? 0) + gained;
  s.xp += gained;
  const before = s.level;
  s.level = levelOf(s.xp);
  const levelUps: number[] = [];
  for (let l = before + 1; l <= s.level; l++) levelUps.push(l);
  return { state: s, gained, levelUps };
}

export function progressOnEvent(prev: ProgressState, ev: CompanionEvent, now: Date): ProgressResult {
  const src = sourceOf(ev);
  if (!src) {
    const day = localDay(now);
    return { state: prev.day === day ? prev : { ...prev, day, earned: {} }, gained: 0, levelUps: [] };
  }
  return grant(prev, src, now);
}
