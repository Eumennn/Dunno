// Günlük olaylar (SPEC 17 R7, strateji §8, saf): zorunlu görev değil, Dunno'nun başına gelen kısa zincirler.
// AKTİF güne göre ilerler (takvim değil): kullanıcı bir hafta gelmese de zincir bekler, kaçırılan gün ceza değildir.
// Zincirin son adımı bir "world shift": gizli dünya hediye (açık değilse) ya da XP + anı.
import { localDay } from "../lines/engine";

export const CHAINS = {
  /** strateji §8 örneği birebir */
  the_thing: ["found", "dont_ask", "maybe_ask", "bad", "shift"],
} as const;
export type ChainId = keyof typeof CHAINS;
export type IncidentStep = (typeof CHAINS)[ChainId][number];

/** zincir ilk açılıştan bu kadar aktif gün sonra başlar (ilk gün sadece tanışma) */
export const START_AFTER_DAYS = 2;

export interface IncidentState {
  chain: ChainId;
  /** sıradaki adım; adım sayısına eşitse zincir bitti */
  step: number;
  /** son adımın verildiği aktif gün */
  lastDay: string | null;
  /** görülen aktif gün sayısı */
  activeDays: number;
  /** son sayılan aktif gün */
  seenDay: string | null;
}

export const initialIncidents = (): IncidentState => ({ chain: "the_thing", step: 0, lastDay: null, activeDays: 0, seenDay: null });

export function cleanIncidents(raw: unknown): IncidentState {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const s = initialIncidents();
  if (typeof r.chain === "string" && r.chain in CHAINS) s.chain = r.chain as ChainId;
  const len = CHAINS[s.chain].length;
  if (typeof r.step === "number" && Number.isInteger(r.step) && r.step >= 0 && r.step <= len) s.step = r.step;
  for (const k of ["lastDay", "seenDay"] as const) if (typeof r[k] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r[k] as string)) s[k] = r[k] as string;
  if (typeof r.activeDays === "number" && Number.isInteger(r.activeDays) && r.activeDays >= 0) s.activeDays = r.activeDays;
  return s;
}

/**
 * Etkileşimli bir an (soru/dürtme/oturum): yeni aktif günse sayılır; günde en fazla bir adım. Adım varsa döner.
 * Laf talker'dan (incident:<adım> tetikleyicisi); shift adımı ayrıca dünya/XP/anı.
 */
export function incidentTick(prev: IncidentState, now: Date): { state: IncidentState; step: IncidentStep | null } {
  const day = localDay(now);
  const s: IncidentState = { ...prev };
  if (s.seenDay !== day) {
    s.seenDay = day;
    s.activeDays++;
  }
  const steps = CHAINS[s.chain];
  if (s.step >= steps.length || s.lastDay === day || s.activeDays <= START_AFTER_DAYS - 1) return { state: s, step: null };
  const step = steps[s.step];
  s.step++;
  s.lastDay = day;
  return { state: s, step };
}
