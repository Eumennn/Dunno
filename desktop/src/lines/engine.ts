// Laf motoru: havuz birleştirme, trigger seçimi, {K:}/[K] işleme, sıklık, bastırma, günlük soru limiti.
// Saf TS: DOM/Node API yok; zaman ve rastgelelik enjekte edilir. Soru metni burada hiç işlenmez.
import type {
  AskDecision,
  Category,
  Frequency,
  Lang,
  Line,
  Mode,
  QuestionState,
  SuppressReason,
} from "./types";

/** seçim önceliği: en spesifik önce */
export const LINE_PRIORITY: readonly Category[] = ["site", "app", "time", "idle", "battery", "interaction", "answer", "random"];
export const HISTORY_SIZE = 20;
export const DAILY_QUESTIONS = 3;
/** SPEC 06 Q2d: street cevapta {K:...} kuyruklu laf seçilme olasılığı (grupta iki tür de varsa) */
export const STREET_TAIL_WEIGHT = 0.7;
/** SPEC 13: `rare: true` laflar seçilen grupta bu olasılıkla gelir (yoksa nadir olmayanlardan); grupta nadir yoksa zar atılmaz */
export const RARE_CHANCE = 0.1;

/** dakika cinsinden [min, max] */
export const FREQUENCY_MINUTES: Record<Frequency, readonly [number, number]> = {
  low: [20, 40],
  normal: [8, 15],
  high: [3, 6],
};

const CATEGORIES: readonly Category[] = ["site", "app", "time", "idle", "battery", "interaction", "answer", "random", "egg"];

export function categoryOf(trigger: string): Category | null {
  const head = trigger.split(":")[0] as Category;
  return CATEGORIES.includes(head) ? head : null;
}

// ---------------------------------------------------------------- metin

const K_BLOCK = /\{K:([^{}]*)\}/g;
const CURSE = /\[k\]/gi;

/**
 * Lafı moda göre gösterilecek metne çevirir.
 * - `{K:...}`: polite'ta tamamen silinir, street'te parantezsiz gösterilir.
 * - `[K]` (LLM/sunucu cevabı): street `***`, polite boş.
 * Sonra fazla boşluk ve noktalama temizlenir.
 */
export function renderText(text: string, mode: Mode): string {
  const s =
    mode === "street"
      ? text.replace(K_BLOCK, "$1").replace(CURSE, "***")
      : text.replace(K_BLOCK, "").replace(CURSE, "");
  return tidy(s);
}

function tidy(s: string): string {
  return s
    .replace(/\s+/g, " ")
    .replace(/\s+([.,!?;:])/g, "$1") // noktalamadan önce boşluk yok
    .replace(/([,;:])(?:\s*[,;:])+/g, "$1") // ", ," -> ","
    .replace(/[,;:]\s*([.?])/g, "$1") // ", ." -> "."
    .replace(/^[\s.,;:]+/, "")
    .replace(/[\s,;:]+$/, "")
    .trim();
}

// ---------------------------------------------------------------- havuz

/** Bilinmeyen girdiyi Line'a çevirir; id/trigger yoksa ya da hiç metin yoksa null. */
export function normalizeLine(raw: unknown): Line | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || r.id === "" || typeof r.trigger !== "string" || !categoryOf(r.trigger)) return null;
  const line: Line = { id: r.id, trigger: r.trigger };
  if (typeof r.intent === "string") line.intent = r.intent;
  if (r.rare === true) line.rare = true;
  if (r.pro === true) line.pro = true;
  if (typeof r.tr === "string" && r.tr.trim() !== "") line.tr = r.tr.trim();
  if (typeof r.en === "string" && r.en.trim() !== "") line.en = r.en.trim();
  return line.tr || line.en ? line : null;
}

/**
 * Birden çok kaynağı (pool_tr, pool_en, /v1/lines) birleştirir; id ile tekil.
 * Aynı id'de alanlar birleşir (tr'li ve en'li kayıt tek laf olur), çakışan alanda sonraki kaynak kazanır.
 */
export function mergeLines(...sources: ReadonlyArray<readonly unknown[]>): Line[] {
  const byId = new Map<string, Line>();
  for (const source of sources) {
    for (const raw of source) {
      const line = normalizeLine(raw);
      if (line) byId.set(line.id, { ...byId.get(line.id), ...line });
    }
  }
  return [...byId.values()];
}

// ---------------------------------------------------------------- seçim

export interface EngineOptions {
  lines?: readonly unknown[];
  rng?: () => number;
  /** önceki oturumdan son söylenen id'ler (eskiden yeniye) */
  history?: readonly string[];
}

export class LineEngine {
  private lines: Line[] = [];
  private history: string[];
  private readonly suppressed = new Set<SuppressReason>();
  private readonly rng: () => number;

  constructor({ lines = [], rng = Math.random, history = [] }: EngineOptions = {}) {
    this.rng = rng;
    this.history = history.slice(-HISTORY_SIZE);
    this.setLines(lines);
  }

  /** Havuzu değiştirir (ör. /v1/lines gelince mergeLines(pool, remote) ile). */
  setLines(lines: readonly unknown[]): void {
    this.lines = mergeLines(lines);
  }

  get size(): number {
    return this.lines.length;
  }

  /** Son söylenen id'ler (kalıcı saklamak için). */
  get recent(): readonly string[] {
    return [...this.history];
  }

  /** "bugün sus" ya da toplantı açıkken her şey bastırılır. */
  setSuppressed(reason: SuppressReason, on: boolean): void {
    if (on) this.suppressed.add(reason);
    else this.suppressed.delete(reason);
  }

  get isSuppressed(): boolean {
    return this.suppressed.size > 0;
  }

  /**
   * Aktif trigger'lara göre laf seçer (ör. ["app:excel", "time:night", "interaction:click"]).
   * Öncelik site > app > time > idle > battery > interaction > answer > random; son 20 laf tekrar edilmez.
   * Bastırılmışsa ya da uygun laf yoksa null.
   */
  pick(active: readonly string[], lang: Lang, mode: Mode): Line | null {
    if (this.isSuppressed) return null;
    const activeSet = new Set(active);
    return this.choose(
      LINE_PRIORITY.map(
        (category) => (l: Line) => categoryOf(l.trigger) === category && (category === "random" || activeSet.has(l.trigger)),
      ),
      lang,
      mode,
    );
  }

  /** pick + renderText; söylenecek metin ya da null. */
  say(active: readonly string[], lang: Lang, mode: Mode): string | null {
    const line = this.pick(active, lang, mode);
    return line ? renderText(line[lang]!, mode) : null;
  }

  /**
   * Havuzdan soru cevabı (SPEC 06 Q2). qtype verilirse (talk/classify.ts QType, ör. "who") önce tam answer:<qtype>,
   * yoksa answer:generic, yoksa diğer answer:*, en son random. Bastırılmışsa null.
   * Street modda (Q2d) seçilen grubun taze lafları içinde {K:...} kuyruklular STREET_TAIL_WEIGHT olasılıkla seçilir
   * (grupta hem kuyruklu hem kuyruksuz taze laf varsa); polite seçimi değişmez.
   */
  answer(lang: Lang, mode: Mode, qtype?: string): string | null {
    if (this.isSuppressed) return null;
    const exact = qtype ? `answer:${qtype}` : null;
    const line = this.choose(
      [
        (l) => exact !== null && l.trigger === exact,
        (l) => l.trigger === "answer:generic",
        (l) => categoryOf(l.trigger) === "answer",
        (l) => categoryOf(l.trigger) === "random",
      ],
      lang,
      mode,
      mode === "street" ? (l) => l[lang]!.includes("{K:") : undefined,
    );
    return line ? renderText(line[lang]!, mode) : null;
  }

  /**
   * Sadece verilen trigger'lardan (sıra = öncelik) laf; random yedeği YOK. Uygun laf yoksa ya da bastırılmışsa null.
   * Ör. sayExact(["interaction:thinking"], ...): düşünme balonu metni; havuzda yoksa çağıran kendi varsayılanını kullanır.
   */
  sayExact(triggers: readonly string[], lang: Lang, mode: Mode): string | null {
    if (this.isSuppressed) return null;
    const line = this.choose(
      triggers.map((t) => (l: Line) => l.trigger === t),
      lang,
      mode,
    );
    return line ? renderText(line[lang]!, mode) : null;
  }

  /** Sadece verilen trigger'lardan Line (random yedeği yok; SPEC 13 uygulama tepkisi). Bastırılmışsa null. */
  pickExact(triggers: readonly string[], lang: Lang, mode: Mode): Line | null {
    if (this.isSuppressed) return null;
    return this.choose(
      triggers.map((t) => (l: Line) => l.trigger === t),
      lang,
      mode,
    );
  }

  /** Bu dilde, bu trigger'da en az bir laf var mı (bastırmadan bağımsız). */
  hasTrigger(trigger: string, lang: Lang): boolean {
    return this.lines.some((l) => l.trigger === trigger && !!l[lang]);
  }

  /**
   * Gruplar öncelik sırasında: bu dilde metni olan, modda boş kalmayan ve son 20'de olmayan
   * ilk gruptan rastgele seçer. Hiçbir grupta taze laf yoksa (küçük havuz) en öncelikli dolu gruptan
   * en son söyleneni hariç tutup en eski kullanılanı seçer: sonsuz sessizlik olmasın.
   */
  private choose(
    groups: readonly ((l: Line) => boolean)[],
    lang: Lang,
    mode: Mode,
    prefer?: (l: Line) => boolean,
  ): Line | null {
    const pools = groups.map((g) => this.lines.filter((l) => g(l) && l[lang] && renderText(l[lang]!, mode) !== ""));
    let chosen: Line | undefined;
    for (const pool of pools) {
      let fresh = pool.filter((l) => !this.history.includes(l.id));
      // SPEC 13 nadir laflar: grupta ikisi de varsa RARE_CHANCE ile nadirlerden, yoksa sıradanlardan
      const rare = fresh.filter((l) => l.rare);
      if (rare.length > 0 && rare.length < fresh.length) fresh = this.rng() < RARE_CHANCE ? rare : fresh.filter((l) => !l.rare);
      if (fresh.length > 0) {
        let from = fresh;
        if (prefer) {
          const yes = fresh.filter(prefer);
          const no = fresh.filter((l) => !prefer(l));
          // ikisi de varsa: STREET_TAIL_WEIGHT olasılıkla tercih edilenlerden (rng bir kez daha çekilir; polite'ta çekilmez)
          if (yes.length > 0 && no.length > 0) from = this.rng() < STREET_TAIL_WEIGHT ? yes : no;
        }
        chosen = from[Math.floor(this.rng() * from.length) % from.length];
        break;
      }
    }
    if (!chosen) {
      const pool = pools.find((p) => p.length > 0);
      if (!pool) return null;
      const last = this.history[this.history.length - 1];
      const candidates = pool.length > 1 ? pool.filter((l) => l.id !== last) : pool;
      chosen = candidates.reduce((a, b) => (this.history.indexOf(a.id) <= this.history.indexOf(b.id) ? a : b));
    }
    this.remember(chosen.id);
    return chosen;
  }

  private remember(id: string): void {
    this.history = [...this.history.filter((h) => h !== id), id].slice(-HISTORY_SIZE);
  }
}

// ---------------------------------------------------------------- sıklık

/** Bir sonraki kendiliğinden lafa kadar bekleme (ms), seçilen aralıkta rastgele. */
export function nextDelayMs(frequency: Frequency, rng: () => number = Math.random): number {
  const [min, max] = FREQUENCY_MINUTES[frequency];
  return Math.round((min + rng() * (max - min)) * 60_000);
}

// ---------------------------------------------------------------- günlük soru limiti

/** Yerel gün "YYYY-MM-DD" (UTC değil: kullanıcının günü). */
export function localDay(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export interface LimiterOptions {
  now?: () => Date;
  rng?: () => number;
  limit?: number;
  /** kalıcı durum (önceki oturum); yoksa sıfırdan */
  state?: QuestionState | null;
}

/**
 * Günlük 3 soru; yerel gün değişince sıfırlanır.
 * LLM kararı sayaç tabanlı: her `gap` sorudan biri (gap 3 ya da 4, rng ile) LLM'e gider.
 * Aynı rng ile deterministiktir; durum `state` ile saklanıp geri yüklenir.
 */
export class QuestionLimiter {
  private readonly now: () => Date;
  private readonly rng: () => number;
  private readonly limit: number;
  private s: QuestionState;

  constructor({ now = () => new Date(), rng = Math.random, limit = DAILY_QUESTIONS, state = null }: LimiterOptions = {}) {
    this.now = now;
    this.rng = rng;
    this.limit = limit;
    this.s = isState(state) ? { ...state } : { day: localDay(now()), used: 0, sinceLlm: 0, gap: this.rollGap() };
  }

  /** Kaydedilecek durum (kopya). */
  get state(): QuestionState {
    this.sync();
    return { ...this.s };
  }

  remaining(): number {
    this.sync();
    return Math.max(0, this.limit - this.s.used);
  }

  canAsk(): boolean {
    return this.remaining() > 0;
  }

  /** Bir soru harcar. Hak yoksa allowed:false (sulk), hiçbir sayaç değişmez. */
  ask(): AskDecision {
    this.sync();
    if (this.s.used >= this.limit) return { allowed: false, useLlm: false, remaining: 0 };
    this.s.used += 1;
    let useLlm = false;
    if (this.s.sinceLlm + 1 >= this.s.gap) {
      useLlm = true;
      this.s.sinceLlm = 0;
      this.s.gap = this.rollGap();
    } else {
      this.s.sinceLlm += 1;
    }
    return { allowed: true, useLlm, remaining: this.limit - this.s.used };
  }

  private sync(): void {
    const today = localDay(this.now());
    if (this.s.day !== today) this.s = { ...this.s, day: today, used: 0 };
  }

  private rollGap(): number {
    return this.rng() < 0.5 ? 3 : 4;
  }
}

function isState(v: unknown): v is QuestionState {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.day === "string" &&
    [s.used, s.sinceLlm, s.gap].every((n) => typeof n === "number" && Number.isInteger(n) && n >= 0) &&
    (s.gap === 3 || s.gap === 4)
  );
}
