// dunno.exe stats.txt çekirdeği (saf): sadece cihazda tutulan sayaçlar. Ağa hiçbir şey gitmez.
// Soru METNİ asla saklanmaz: olaylar sadece tür ve sayı taşır; bilinmeyen alanlar okunmaz bile.
// Store, ayarlarla aynı soyutlama (settings.ts Backend): gerçekte tauri-plugin-store, testte bellek.
import { localDay } from "../lines/engine";
import type { Backend } from "../settings";

export const STATS_KEY = "stats";

/** Kaydedilen olaylar. `at` verilmezse createStats'in saati kullanılır. */
export type StatsEvent =
  /** bir soru soruldu (metin YOK) */
  | { type: "question"; at?: Date }
  /** pet'e tıklandı (dürtme) */
  | { type: "click"; at?: Date }
  /** pet sürüklendi */
  | { type: "drag"; at?: Date }
  /** pet uyudu; süre milisaniye */
  | { type: "sleep"; ms: number; at?: Date }
  /** kendiliğinden laf attı; o an öndeki uygulama etiketi (excel, browser ...) ya da null */
  | { type: "line"; app: string | null; at?: Date }
  /** FB4-6: günün doğru cevabı verildi / osurdu (sadece sayı) */
  | { type: "honest"; at?: Date }
  | { type: "fart"; at?: Date };

export interface Counters {
  questions: number;
  clicks: number;
  drags: number;
  /** uyuma süresi, tam dakika */
  sleepMinutes: number;
  /** kendiliğinden atılan laf sayısı (app null olsa da sayılır) */
  lines: number;
  /** en çok laf attığı uygulama etiketi; hiç yoksa null (eşitlikte alfabetik ilk) */
  topApp: string | null;
  /** FB4-6: en çok laf attığı 3 uygulama (etiket + sayı) */
  apps: { app: string; n: number }[];
  honest: number;
  farts: number;
}

/** FB4-6: son günlerin özeti (stats.txt çubukları) */
export interface DayRow {
  day: string;
  questions: number;
  clicks: number;
  lines: number;
}
/** saklanan gün geçmişi */
export const HISTORY_DAYS = 7;

export interface StatsSnapshot {
  /** yerel gün YYYY-MM-DD */
  day: string;
  today: Counters;
  total: Counters;
  /** FB4-6: son HISTORY_DAYS gün (eskiden yeniye, bugün dahil; olmayan gün 0) */
  week: DayRow[];
  /** ilk kayıt günü (birlikte geçen süre); hiç yoksa bugün */
  since: string;
  /** en az bir şey olan gün sayısı */
  activeDays: number;
}

export interface Stats {
  record(ev: StatsEvent): Promise<void>;
  snapshot(now?: Date): Promise<StatsSnapshot>;
  reset(): Promise<void>;
}

/** Saklanan biçim (sadece sayılar ve uygulama etiketleri). */
interface Bucket {
  questions: number;
  clicks: number;
  drags: number;
  sleepMs: number;
  lines: number;
  apps: Record<string, number>;
  honest: number;
  farts: number;
}
interface Stored {
  day: string;
  today: Bucket;
  total: Bucket;
  /** FB4-6: geçmiş günler (sadece sayılar) */
  history: DayRow[];
  since: string;
  activeDays: number;
}

const APP_TAG = /^[a-z0-9_]{1,32}$/;
const emptyBucket = (): Bucket => ({ questions: 0, clicks: 0, drags: 0, sleepMs: 0, lines: 0, apps: {}, honest: 0, farts: 0 });
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

const count = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);

function cleanBucket(raw: unknown): Bucket {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const apps: Record<string, number> = {};
  if (typeof r.apps === "object" && r.apps !== null) {
    for (const [k, v] of Object.entries(r.apps as Record<string, unknown>)) {
      if (APP_TAG.test(k) && count(v) > 0) apps[k] = count(v);
    }
  }
  // eski kayıtta `lines` yok: 0'dan başlar
  return {
    questions: count(r.questions),
    clicks: count(r.clicks),
    drags: count(r.drags),
    sleepMs: count(r.sleepMs),
    lines: count(r.lines),
    apps,
    honest: count(r.honest),
    farts: count(r.farts),
  };
}

/** Bozuk/eksik saklanan değer sıfıra döner. */
function clean(raw: unknown, day: string): Stored {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const history = (Array.isArray(r.history) ? r.history : [])
    .map((x) => x as Record<string, unknown>)
    .filter((x) => typeof x?.day === "string" && DAY_RE.test(x.day as string))
    .map((x) => ({ day: x.day as string, questions: count(x.questions), clicks: count(x.clicks), lines: count(x.lines) }))
    .slice(-HISTORY_DAYS);
  const d = typeof r.day === "string" ? r.day : day;
  return {
    day: d,
    today: cleanBucket(r.today),
    total: cleanBucket(r.total),
    history,
    since: typeof r.since === "string" && DAY_RE.test(r.since) ? r.since : (history[0]?.day ?? d),
    activeDays: count(r.activeDays),
  };
}

function topApp(apps: Record<string, number>): string | null {
  let best: string | null = null;
  for (const [k, v] of Object.entries(apps)) {
    if (best === null || v > apps[best] || (v === apps[best] && k < best)) best = k;
  }
  return best;
}

function topApps(apps: Record<string, number>, n = 3): { app: string; n: number }[] {
  return Object.entries(apps)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, n)
    .map(([app, k]) => ({ app, n: k }));
}

function counters(b: Bucket): Counters {
  return {
    apps: topApps(b.apps),
    honest: b.honest,
    farts: b.farts,
    questions: b.questions,
    clicks: b.clicks,
    drags: b.drags,
    sleepMinutes: Math.floor(b.sleepMs / 60_000),
    lines: b.lines,
    topApp: topApp(b.apps),
  };
}

function apply(b: Bucket, ev: StatsEvent): void {
  switch (ev.type) {
    case "question":
      b.questions += 1;
      break;
    case "click":
      b.clicks += 1;
      break;
    case "drag":
      b.drags += 1;
      break;
    case "sleep":
      b.sleepMs += count(ev.ms);
      break;
    case "honest":
      b.honest += 1;
      break;
    case "fart":
      b.farts += 1;
      break;
    case "line":
      b.lines += 1;
      if (typeof ev.app === "string" && APP_TAG.test(ev.app)) b.apps[ev.app] = (b.apps[ev.app] ?? 0) + 1;
      break;
  }
}

export interface StatsOptions {
  now?: () => Date;
}

/**
 * Sayaçları store'dan (anahtar "stats") yükler; her kayıtta günceller ve kaydeder.
 * Yerel gün değişince "bugün" sıfırlanır, "toplam" sürer. Yazmalar sıraya alınır (eşzamanlı kayıt kaybolmaz).
 */
export function createStats(store: Backend, { now = () => new Date() }: StatsOptions = {}): Stats {
  let state: Stored | null = null;
  let queue: Promise<unknown> = Promise.resolve();

  const load = async (): Promise<Stored> => {
    if (!state) {
      let raw: unknown;
      try {
        raw = await store.get(STATS_KEY);
      } catch {
        raw = undefined;
      }
      state = clean(raw, localDay(now()));
    }
    return state;
  };

  const busy = (b: Bucket) => b.questions + b.clicks + b.drags + b.lines > 0;
  const roll = (s: Stored, day: string) => {
    if (s.day !== day) {
      // biten günü geçmişe yaz (sadece sayılar)
      if (busy(s.today)) {
        s.history = [...s.history.filter((h) => h.day !== s.day), { day: s.day, questions: s.today.questions, clicks: s.today.clicks, lines: s.today.lines }].slice(-HISTORY_DAYS);
      }
      s.day = day;
      s.today = emptyBucket();
    }
  };

  const persist = async (s: Stored) => {
    await store.set(STATS_KEY, s);
    await store.save();
  };

  /** Sıradaki işe ekler; bir iş patlasa da sıra devam eder. */
  const enqueue = <T>(fn: () => Promise<T>): Promise<T> => {
    const next = queue.then(fn, fn);
    queue = next.catch(() => undefined);
    return next;
  };

  return {
    record(ev) {
      return enqueue(async () => {
        const s = await load();
        roll(s, localDay(ev.at ?? now()));
        // sadece tür ve sayı okunur; olayda başka alan (ör. bir soru metni) olsa da kullanılmaz
        const safe = { type: ev.type, ms: (ev as { ms?: unknown }).ms, app: (ev as { app?: unknown }).app } as StatsEvent;
        if (!busy(s.today) && safe.type !== "sleep") s.activeDays += 1; // günün ilk olayı
        apply(s.today, safe);
        apply(s.total, safe);
        await persist(s);
      });
    },

    snapshot(at) {
      return enqueue(async () => {
        const s = await load();
        const day = localDay(at ?? now());
        const todayB = s.day === day ? s.today : emptyBucket();
        // son 7 gün: geçmiş + bugün, boş günler 0
        const rows = new Map(s.history.map((h) => [h.day, h]));
        if (s.day === day) rows.set(day, { day, questions: todayB.questions, clicks: todayB.clicks, lines: todayB.lines });
        const week: DayRow[] = [];
        const base = new Date(`${day}T12:00:00`);
        for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
          const d = localDay(new Date(base.getTime() - i * 86_400_000));
          week.push(rows.get(d) ?? { day: d, questions: 0, clicks: 0, lines: 0 });
        }
        return { day, today: counters(todayB), total: counters(s.total), week, since: s.since <= day ? s.since : day, activeDays: s.activeDays };
      });
    },

    reset() {
      return enqueue(async () => {
        const d = localDay(now());
        state = { day: d, today: emptyBucket(), total: emptyBucket(), history: [], since: d, activeDays: 0 };
        await persist(state);
      });
    },
  };
}
