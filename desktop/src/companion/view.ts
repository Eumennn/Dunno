// dunno.exe için companion görünümü (SPEC 17 R8, saf): pet.txt + memories.log + kart verisi. Pet penceresi hesaplar, durumla yollar.
// Free: son 3 anı ve geri kalanı "something happened here." (strateji §14); Pro: tam zaman çizelgesi + evrim yolu seçimi.
import type { Tier } from "../pro/entitlements";
import type { CompanionState } from "./companion";
import { choices, formOf, STAGE_LEVELS, stageOf, treeView, type Form } from "./evolution";
import { traitsOf, type MemoryCard, type Trait } from "./memory";
import { levelProgress, MILESTONES, type Reward } from "./progression";
import { bondOf, STATS, type Bond, type RelStat } from "./relationship";
import { PERKS, type PerkId } from "./perks";
import { FIRST_STEPS, type FirstStep } from "./onboarding";

/** Free'de tam görünen son anı sayısı */
export const FREE_MEMORIES = 3;

export interface CompanionView {
  level: number;
  xp: { into: number; need: number; ratio: number };
  form: Form;
  stage: number;
  /** sıradaki evrim leveli; yoksa null */
  nextEvolution: number | null;
  tree: { form: Form; known: boolean; current: boolean; depth: number }[];
  /** Pro seçim dalları (Free'de boş) */
  choices: Form[];
  chosen: boolean;
  stats: Record<RelStat, number>;
  bond: Bond;
  traits: Trait[];
  favoriteApp: string | null;
  daysTogether: number;
  interactions: number;
  /** yeniden eskiye; locked: Free'de içerik gizli */
  memories: (MemoryCard & { locked?: boolean })[];
  memoriesTotal: number;
  rewards: { reward: Reward; level: number; open: boolean }[];
  /** yetenek ağacı düğümleri (level ile açılır) */
  perks: { id: PerkId; level: number; open: boolean }[];
  /** FB6 ilk adımlar; bittiyse null */
  firstSteps: { step: FirstStep; done: boolean }[] | null;
}

export function companionView(s: CompanionState, tier: Tier): CompanionView {
  const lp = levelProgress(s.progress.xp);
  const stage = stageOf(s.evo);
  const t = traitsOf(s.memory);
  const all = [...s.memory.memories].reverse();
  const memories = tier === "pro" ? all : all.map((m, i) => (i < FREE_MEMORIES ? m : { id: m.id, at: m.at, locked: true }));
  return {
    level: lp.level,
    xp: { into: lp.into, need: lp.need, ratio: Math.round(lp.ratio * 1000) / 1000 },
    form: formOf(s.evo),
    stage,
    nextEvolution: stage < STAGE_LEVELS.length ? STAGE_LEVELS[stage] : null,
    tree: treeView(s.evo),
    choices: tier === "pro" ? choices(s.evo) : [],
    chosen: s.evo.chosen,
    stats: Object.fromEntries(STATS.map((k) => [k, Math.round(s.rel[k])])) as Record<RelStat, number>,
    bond: bondOf(s.rel),
    traits: t.traits,
    favoriteApp: t.favoriteApp,
    daysTogether: s.rel.daysTogether,
    interactions: s.rel.interactions,
    memories,
    memoriesTotal: all.length,
    rewards: MILESTONES.map((m) => ({ reward: m.reward, level: m.level, open: lp.level >= m.level })),
    perks: PERKS.map((p) => ({ id: p.id, level: p.level, open: lp.level >= p.level })),
    firstSteps: s.onboard.finished ? null : FIRST_STEPS.map((step) => ({ step, done: s.onboard.done.includes(step) })),
  };
}
