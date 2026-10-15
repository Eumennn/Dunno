// Companion cephesi (SPEC 17 R1, saf çekirdek): olayı sırayla memory -> relationship -> progression -> evolution -> incidents'e
// uygular, etkileri (level, evrim, anı, dönüş, olay, gizli eşik) döner. Modüller birbirini çağırmaz. Store/talker bağlamı main'de
// (companion/runtime.ts). Durum sadece sayı, enum, şablon id ve uygulama etiketi taşır (gizlilik testi: companion.test.ts).
import type { CompanionEvent } from "./events";
import { cleanEvolution, evolve, formOf, initialEvolution, stageOf, type EvolutionState, type Form } from "./evolution";
import { cleanIncidents, incidentTick, initialIncidents, type IncidentState, type IncidentStep } from "./incidents";
import { cleanMemory, initialMemory, memoryOnEvent, remember, traitsOf, type MemoryCard, type MemoryState } from "./memory";
import { cleanProgress, grant, initialProgress, MILESTONES, progressOnEvent, type ProgressState, type Reward } from "./progression";
import { bondOf, cleanRelationship, initialRelationship, relationshipOnEvent, type RelationshipState } from "./relationship";
import { hasPerk, perksBetween, type PerkId } from "./perks";
import { localDay } from "../lines/engine";
import { cleanOnboard, initialOnboard, nextStep, onboardOnEvent, type FirstStep, type OnboardState } from "./onboarding";

export const COMPANION_KEY = "companion";

/** gizli dürtme eşikleri (strateji §5; 100/1000 dünyaları SPEC 14'te) */
export const SECRET_CLICKS = { secret_10k: 10_000, secret_100k: 100_000 } as const;
export type SecretId = keyof typeof SECRET_CLICKS;

export interface CompanionState {
  memory: MemoryState;
  rel: RelationshipState;
  progress: ProgressState;
  evo: EvolutionState;
  incidents: IncidentState;
  secrets: SecretId[];
  /** perk etkilerinin son günü (günde bir kez olanlar) */
  daily: Partial<Record<PerkId, string>>;
  /** FB6 ilk 10 dakika */
  onboard: OnboardState;
}

export const initialCompanion = (): CompanionState => ({
  memory: initialMemory(),
  rel: initialRelationship(),
  progress: initialProgress(),
  evo: initialEvolution(),
  incidents: initialIncidents(),
  secrets: [],
  daily: {},
  onboard: initialOnboard(),
});

export function cleanCompanion(raw: unknown): CompanionState {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    memory: cleanMemory(r.memory),
    rel: cleanRelationship(r.rel),
    progress: cleanProgress(r.progress),
    evo: cleanEvolution(r.evo),
    incidents: cleanIncidents(r.incidents),
    secrets: Array.isArray(r.secrets) ? r.secrets.filter((x): x is SecretId => typeof x === "string" && x in SECRET_CLICKS) : [],
    daily: cleanDaily(r.daily),
    onboard: cleanOnboard(r.onboard),
  };
}

function cleanDaily(raw: unknown): Partial<Record<PerkId, string>> {
  const out: Partial<Record<PerkId, string>> = {};
  if (typeof raw !== "object" || raw === null) return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>))
    if (["greeting", "app_gossip", "memory_lines", "bond"].includes(k) && typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) out[k as PerkId] = v;
  return out;
}

/** dakikalık kalp atışında koşturma aralığı (kaos yüksekse) ve günün anı hatırlatma dakikası */
export const ZOOMIES_EVERY_MIN = 45;
export const MEMORY_LINE_MINUTE = 30;

export type Effect =
  | { kind: "memory"; card: MemoryCard }
  | { kind: "level"; level: number; rewards: Reward[] }
  | { kind: "evolved"; form: Form; stage: number }
  | { kind: "returned"; days: number }
  | { kind: "incident"; step: IncidentStep }
  | { kind: "secret"; id: SecretId }
  /** olay zinciri sonu: gizli dünya hediyesi (açık değilse main açar) */
  | { kind: "world_gift" }
  /** yetenek ağacı: level atlayınca açılan düğümler */
  | { kind: "perk_unlocked"; perks: PerkId[] }
  /** perk lafı: greeting (saat), app_gossip (uygulama), memory_lines (anı), bond */
  | { kind: "perk_say"; perk: "greeting" | "app_gossip" | "memory_lines" | "bond"; hour?: number; tag?: string; card?: MemoryCard }
  /** pet alt kenarda bir koşu atar (zoomies / zafer turu) */
  | { kind: "zoomies" }
  /** FB6 ilk adımlar: biten adım (+ sıradaki), hatırlatma, hepsi bitti */
  | { kind: "first_step"; step: FirstStep; next: FirstStep | null }
  | { kind: "first_hint"; step: FirstStep }
  | { kind: "first_done" };

export interface ApplyContext {
  /** o an etkin gizli dünya */
  world: string;
}

export interface ApplyResult {
  state: CompanionState;
  effects: Effect[];
}

/** levellerin anı olarak kaydedildiği eşikler (her level değil) */
const LEVEL_MEMORY = (l: number) => l === 2 || l % 5 === 0;

/** olay zinciri tetikleyen etkileşimli olaylar */
const INCIDENT_EVENTS = new Set<CompanionEvent["type"]>(["session_start", "click", "drag", "question"]);

export function applyEvent(prev: CompanionState, ev: CompanionEvent, now: Date, ctx: ApplyContext): ApplyResult {
  const effects: Effect[] = [];
  let memory = prev.memory;
  const remembered = (r: { state: MemoryState; added: MemoryCard[] }) => {
    memory = r.state;
    for (const card of r.added) effects.push({ kind: "memory", card });
  };

  remembered(memoryOnEvent(memory, ev, now));

  const rr = relationshipOnEvent(prev.rel, ev, now);
  const rel = rr.state;
  if (rr.returned !== undefined && ev.type === "session_start") {
    effects.push({ kind: "returned", days: rr.returned });
    remembered(remember(memory, { id: "returned", n: rr.returned }, now));
  }

  let pr = progressOnEvent(prev.progress, ev, now);
  let progress = pr.state;
  const levelUps: number[] = [...pr.levelUps];

  // FB6 ilk adımlar
  const ob = onboardOnEvent(prev.onboard, ev, now);
  const onboard = ob.state;
  if (ob.completed) {
    if (ob.reward) {
      pr = grant(progress, "onboarding", now);
      progress = pr.state;
      levelUps.push(...pr.levelUps);
    }
    effects.push(ob.finished ? { kind: "first_done" } : { kind: "first_step", step: ob.completed, next: nextStep(onboard) });
  }
  if (ob.hint) effects.push({ kind: "first_hint", step: ob.hint });

  // gizli eşikler
  let secrets = prev.secrets;
  if (ev.type === "click" && typeof ev.total === "number") {
    for (const [id, at] of Object.entries(SECRET_CLICKS) as [SecretId, number][]) {
      if (ev.total >= at && !secrets.includes(id)) {
        secrets = [...secrets, id];
        effects.push({ kind: "secret", id });
        remembered(remember(memory, { id, n: at }, now, id));
        pr = grant(progress, "secret", now);
        progress = pr.state;
        levelUps.push(...pr.levelUps);
      }
    }
  }

  // olay zinciri (günde en fazla bir adım)
  let incidents = prev.incidents;
  if (INCIDENT_EVENTS.has(ev.type)) {
    const it = incidentTick(incidents, now);
    incidents = it.state;
    if (it.step) {
      effects.push({ kind: "incident", step: it.step });
      if (it.step === "shift") {
        effects.push({ kind: "world_gift" });
        remembered(remember(memory, { id: "incident", tag: incidents.chain }, now, `incident_${incidents.chain}`));
        pr = grant(progress, "incident", now);
        progress = pr.state;
        levelUps.push(...pr.levelUps);
      }
    }
  }

  if (levelUps.length) {
    const unlocked = perksBetween(prev.progress.level, Math.max(...levelUps)).map((p) => p.id);
    if (unlocked.length) effects.push({ kind: "perk_unlocked", perks: unlocked });
    if (hasPerk(Math.max(...levelUps), "victory_lap")) effects.push({ kind: "zoomies" });
  }
  for (const level of levelUps) {
    effects.push({ kind: "level", level, rewards: MILESTONES.filter((m) => m.level === level).map((m) => m.reward) });
    if (LEVEL_MEMORY(level)) remembered(remember(memory, { id: "level", n: level }, now, `level_${level}`));
  }

  // evrim: level eşiği geçildiyse (bir olayda en fazla bir aşama)
  let evo = prev.evo;
  const next = evolve(evo, progress.level, { rel, traits: traitsOf(memory).traits, world: ctx.world });
  if (next) {
    evo = next;
    effects.push({ kind: "evolved", form: formOf(evo), stage: stageOf(evo) });
    remembered(remember(memory, { id: "evolved", tag: formOf(evo) }, now, `evolved_${stageOf(evo)}`));
  }

  // yetenek ağacı etkileri (günde bir kez olanlar daily'de)
  const daily = { ...prev.daily };
  const day = localDay(now);
  const lv = progress.level;
  const once = (perk: "greeting" | "app_gossip" | "memory_lines" | "bond") => {
    if (!hasPerk(lv, perk) || daily[perk] === day) return false;
    daily[perk] = day;
    return true;
  };
  if (ev.type === "session_start") {
    if (once("greeting")) effects.push({ kind: "perk_say", perk: "greeting", hour: now.getHours() });
    if (bondOf(rel) === "best" && once("bond")) effects.push({ kind: "perk_say", perk: "bond" });
  }
  if (ev.type === "line" && ev.app && ev.app === traitsOf(memory).favoriteApp && once("app_gossip")) effects.push({ kind: "perk_say", perk: "app_gossip", tag: ev.app });
  if (ev.type === "heartbeat") {
    const minutes = memory.days[day]?.minutes ?? 0;
    const shown = memory.memories.filter((c) => c.id !== "first_hello");
    if (minutes === MEMORY_LINE_MINUTE && shown.length && once("memory_lines")) {
      // günün anısı: güne göre sabit seçim (rastgelelik yok, test edilebilir)
      const pick = shown[[...day].reduce((a, c) => a + c.charCodeAt(0), 0) % shown.length];
      effects.push({ kind: "perk_say", perk: "memory_lines", card: pick });
    }
    if (hasPerk(lv, "zoomies") && minutes > 0 && minutes % ZOOMIES_EVERY_MIN === 0 && rel.chaos >= 50 && !ev.idle) effects.push({ kind: "zoomies" });
  }

  return { state: { memory, rel, progress, evo, incidents, secrets, daily, onboard }, effects };
}
