// İlişki sistemi (SPEC 17 R3, strateji §2, saf): trust, familiarity, chaos, curiosity, boredom, energy (0..100).
// Sayılar davranışa döner (konuşma sıklığı, dinlenme, uyku, laf tonu). Ceza ve suçluluk yok: hakaret güveni biraz düşürür ama
// zamanla geri gelir; günlerce açılmamak hiçbir değeri sıfırlamaz, dönüşte sadece kuru bir "oh. you exist." olur.
import { localDay } from "../lines/engine";
import type { CompanionEvent, Tone } from "./events";

export const STATS = ["trust", "familiarity", "chaos", "curiosity", "boredom", "energy"] as const;
export type RelStat = (typeof STATS)[number];

export interface RelationshipState {
  trust: number;
  familiarity: number;
  chaos: number;
  curiosity: number;
  boredom: number;
  energy: number;
  /** son günlük dönüşün uygulandığı gün */
  lastDay: string | null;
  /** son görülme (kalp atışı) */
  lastSeen: string | null;
  /** son etkileşim (boşta kalma) */
  lastTouch: string | null;
  /** birlikte geçen (açılan) gün sayısı */
  daysTogether: number;
  /** toplam etkileşim */
  interactions: number;
}

/** başlangıç ve günlük dönüşün hedefi */
export const BASELINE: Readonly<Record<RelStat, number>> = { trust: 30, familiarity: 0, chaos: 30, curiosity: 40, boredom: 20, energy: 70 };
/** günlük dönüş oranı (orta değere doğru); familiarity hiç düşmez, trust yavaş */
const DRIFT: Readonly<Record<RelStat, number>> = { trust: 0.03, familiarity: 0, chaos: 0.15, curiosity: 0.1, boredom: 0.25, energy: 0.3 };
/** bu kadar gün sonra dönüş lafı */
export const RETURN_DAYS = 3;
/** son etkileşimden bu kadar dakika sonra sıkılmaya başlar */
export const BORED_AFTER_MIN = 10;

export const initialRelationship = (): RelationshipState => ({ ...BASELINE, lastDay: null, lastSeen: null, lastTouch: null, daysTogether: 0, interactions: 0 });

const clamp = (v: number) => Math.min(100, Math.max(0, Math.round(v * 10) / 10));
const isoOrNull = (v: unknown) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : null);

export function cleanRelationship(raw: unknown): RelationshipState {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const s = initialRelationship();
  for (const k of STATS) if (typeof r[k] === "number" && Number.isFinite(r[k])) s[k] = clamp(r[k] as number);
  s.lastDay = typeof r.lastDay === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.lastDay) ? r.lastDay : null;
  s.lastSeen = isoOrNull(r.lastSeen);
  s.lastTouch = isoOrNull(r.lastTouch);
  for (const k of ["daysTogether", "interactions"] as const) if (typeof r[k] === "number" && Number.isFinite(r[k]) && (r[k] as number) >= 0) s[k] = Math.floor(r[k] as number);
  return s;
}

/** Tonun güvene etkisi (L1) */
const TONE_TRUST: Readonly<Record<Tone, number>> = { neutral: 0, kind: 3, joking: 1, sad: 1, angry: -4 };
/** Soru tiplerinin etkisi: iltifat/teşekkür güven, hakaret biraz eksi (kalıcı değil) */
const QTYPE: Readonly<Record<string, Partial<Record<RelStat, number>>>> = {
  compliment: { trust: 3 },
  love: { trust: 2 },
  thanks: { trust: 2 },
  sorry: { trust: 2 },
  insult: { trust: -2, chaos: 2 },
  insult_strong: { trust: -4, chaos: 3 },
  bored: { boredom: 4 },
  good_night: { energy: -5 },
  good_morning: { energy: 5 },
  tired: { energy: -3 },
  amusement: { chaos: 1, trust: 1 },
  how_are_you: { trust: 1 },
};

export interface RelResult {
  state: RelationshipState;
  /** RETURN_DAYS+ gün sonra ilk açılış: gün sayısı */
  returned?: number;
}

/** Gün dönümü: her geçen gün için orta değere doğru yumuşak dönüş. */
function driftDays(s: RelationshipState, days: number): void {
  for (const k of STATS) {
    const rate = 1 - Math.pow(1 - DRIFT[k], Math.min(days, 30));
    s[k] = clamp(s[k] + (BASELINE[k] - s[k]) * rate);
  }
}

const add = (s: RelationshipState, d: Partial<Record<RelStat, number>>) => {
  for (const [k, v] of Object.entries(d) as [RelStat, number][]) s[k] = clamp(s[k] + v);
};

export function relationshipOnEvent(prev: RelationshipState, ev: CompanionEvent, now: Date): RelResult {
  const s: RelationshipState = { ...prev };
  const day = localDay(now);
  let returned: number | undefined;
  if (s.lastDay !== day) {
    if (s.lastDay) {
      const gap = Math.round((Date.parse(`${day}T00:00:00`) - Date.parse(`${s.lastDay}T00:00:00`)) / 86_400_000);
      if (gap > 0) driftDays(s, gap);
      if (gap >= RETURN_DAYS) returned = gap;
    }
    s.lastDay = day;
    s.daysTogether++;
    // her yeni gün biraz daha tanıdık
    add(s, { familiarity: 2 });
  }
  const touch = () => {
    s.lastTouch = now.toISOString();
    s.interactions++;
  };
  switch (ev.type) {
    case "session_start":
      add(s, { boredom: -5 });
      break;
    case "heartbeat": {
      s.lastSeen = now.toISOString();
      const since = s.lastTouch ? (now.getTime() - Date.parse(s.lastTouch)) / 60_000 : Infinity;
      if (ev.idle || since >= BORED_AFTER_MIN) add(s, { boredom: 0.5 });
      add(s, { energy: -0.1 });
      break;
    }
    case "click":
      touch();
      add(s, { chaos: 0.4, boredom: -1, familiarity: 0.05 });
      break;
    case "drag":
      touch();
      add(s, { chaos: 0.8, boredom: -1, energy: -0.3, familiarity: 0.05 });
      break;
    case "question": {
      touch();
      add(s, { curiosity: 1, boredom: -2, familiarity: 0.2 });
      if (ev.qtype && QTYPE[ev.qtype]) add(s, QTYPE[ev.qtype]);
      if (ev.tone) add(s, { trust: TONE_TRUST[ev.tone] });
      break;
    }
    case "honest":
      add(s, { trust: 1 });
      break;
    case "customize":
      touch();
      add(s, { trust: 0.5, familiarity: 0.3 });
      break;
    case "sleep":
      add(s, { energy: Math.min(30, ev.minutes * 0.5) });
      break;
    case "idle_hour":
      add(s, { boredom: 10 });
      break;
    case "world_change":
      add(s, { curiosity: 5, chaos: 3 });
      break;
    default:
      break;
  }
  return { state: s, returned };
}

/** ilişki seviyesi (laf/kart/arayüz): tanışıklık + güven */
export type Bond = "stranger" | "acquaintance" | "friend" | "best";
export function bondOf(s: RelationshipState): Bond {
  const v = (s.familiarity + s.trust) / 2;
  return v >= 75 ? "best" : v >= 50 ? "friend" : v >= 25 ? "acquaintance" : "stranger";
}

/**
 * Davranış çarpanları (mevcut kişilik/mod çarpanlarıyla çarpılır): sıkılınca daha çok laf atar (strateji: high boredom ->
 * kendiliğinden etkileşim), kaos yüksekse az dinlenir, enerji düşükse çok dinlenir. Sınır 0.75..1.35 (davranış dengeli kalır).
 */
export function relBehavior(s: RelationshipState): { chattiness: number; restScale: number; absurd: number } {
  const lim = (v: number) => Math.round(Math.min(1.35, Math.max(0.75, v)) * 100) / 100;
  const chattiness = lim(1 + (s.boredom - 30) / 140);
  const restScale = lim(1 - (s.chaos - 30) / 200 + (50 - s.energy) / 160);
  // absürt laf payı (0..0.3): yüksek kaos
  const absurd = Math.round(Math.max(0, Math.min(0.3, (s.chaos - 50) / 170)) * 100) / 100;
  return { chattiness, restScale, absurd };
}
