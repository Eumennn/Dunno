// Companion çalışma zamanı (SPEC 17): store + olay yolu + laf kuyruğu. main.ts sadece emit eder ve birkaç kanca verir.
// Laflar (dönüş, olay zinciri, level, evrim, gizli eşik) talker meşgul/sessiz/toplantıdayken kuyrukta bekler; kuyruk bellekte
// (kapanınca kaybolması sorun değil: hepsi zaten anı olarak memories.log'da).
import type { Backend } from "../settings";
import type { Lang } from "../lines/types";
import { applyEvent, cleanCompanion, COMPANION_KEY, type CompanionState, type Effect } from "./companion";
import { EventBus, type CompanionEvent } from "./events";
import { choosePath, formOf, type Form } from "./evolution";
import { relBehavior } from "./relationship";
import { COMPANION_STRINGS, returnedLine } from "./strings";

export interface Say {
  kind: "speech" | "toast";
  text: string;
  /** FB6: ilk adım lafları; yenisi gelince eskisi kuyruktan düşer (bayat ipucu birikmez, başka lafları itmez) */
  first?: boolean;
}

export interface RuntimeDeps {
  store: Backend;
  /** söylenemeyen lafın yeniden deneme aralığı (ms); 0 = sadece dışarıdan flush */
  retryMs?: number;
  /** o an etkin gizli dünya */
  world: () => string;
  lang: () => Lang;
  /** uygulama etiketinin görünen adı (dedikodu lafı) */
  appName?: (lang: Lang, tag: string) => string | null;
  /** konuşma balonu / toast; gösterilemezse false (sonra tekrar) */
  say: (s: Say) => Promise<boolean>;
  /** laf dışı etkiler (evrim görünümü, dünya hediyesi, arayüz durumu) */
  onEffects?: (effects: Effect[], state: CompanionState) => void;
  now?: () => Date;
  rng?: () => number;
  /** yazma gecikmesi (ms); testte 0 */
  saveDelayMs?: number;
}

/** Kuyrukta en fazla bu kadar laf (eskiler düşer: bir günlük birikim balon yağmuruna dönmesin) */
export const MAX_QUEUE = 4;

const returnedFrom = (a: readonly string[], rng: () => number) => a[Math.floor(rng() * a.length) % a.length];

export class CompanionRuntime {
  readonly bus = new EventBus();
  private queue: Say[] = [];
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private flushing: Promise<void> | null = null;
  /** FB6: söylenemeyen laf (Dunno meşgul / karşılama) birkaç saniye sonra yeniden denenir (dakikalık tiki beklemez) */
  private retry: ReturnType<typeof setTimeout> | null = null;

  private constructor(
    private s: CompanionState,
    private readonly d: RuntimeDeps,
  ) {
    this.bus.on((ev, at) => this.apply(ev, at));
  }

  static async load(d: RuntimeDeps): Promise<CompanionRuntime> {
    const raw = await d.store.get(COMPANION_KEY).catch(() => undefined);
    return new CompanionRuntime(cleanCompanion(raw), d);
  }

  get state(): CompanionState {
    return this.s;
  }

  emit(ev: CompanionEvent): void {
    this.bus.emit(ev, this.d.now?.() ?? new Date());
  }

  /** davranış çarpanları (talker/controller mevcut çarpanlarla çarpar) */
  behavior(): { chattiness: number; restScale: number; absurd: number } {
    return relBehavior(this.s.rel);
  }

  get form(): Form {
    return formOf(this.s.evo);
  }

  /** FB6: ilk adımları baştan göster (about.txt). XP adım başına yine bir kez verilir. */
  restartFirstSteps(): void {
    this.s = { ...this.s, onboard: { ...this.s.onboard, done: [], hints: 0, lastHint: null, finished: false } };
    this.save();
    this.apply({ type: "heartbeat" }, this.d.now?.() ?? new Date());
  }

  /** Pro: evrim yolunu seç (kardeş dal). Çağıran Pro'yu denetler. */
  choose(form: Form): boolean {
    const next = choosePath(this.s.evo, form);
    if (!next) return false;
    this.s = { ...this.s, evo: next };
    this.save();
    this.d.onEffects?.([{ kind: "evolved", form, stage: next.path.length - 1 }], this.s);
    return true;
  }

  /** Bekleyen lafları sırayla dener (talker boşalınca / dakikalık tik). Süren deneme varsa bitince bir tur daha. */
  async flush(): Promise<void> {
    if (this.flushing) {
      await this.flushing;
      return this.flush();
    }
    this.flushing = (async () => {
      while (this.queue.length) {
        const ok = await this.d.say(this.queue[0]).catch(() => false);
        if (!ok) {
          if (!this.retry && (this.d.retryMs ?? 4_000) > 0)
            this.retry = setTimeout(() => {
              this.retry = null;
              void this.flush();
            }, this.d.retryMs ?? 4_000);
          break;
        }
        this.queue.shift();
      }
    })();
    try {
      await this.flushing;
    } finally {
      this.flushing = null;
    }
  }

  get pending(): readonly Say[] {
    return this.queue;
  }

  private apply(ev: CompanionEvent, at: Date): void {
    const r = applyEvent(this.s, ev, at, { world: this.d.world() });
    const changed = r.effects.length > 0 || JSON.stringify(r.state) !== JSON.stringify(this.s);
    this.s = r.state;
    if (changed) this.save();
    if (!r.effects.length) return;
    const t = COMPANION_STRINGS[this.d.lang()];
    const rng = this.d.rng ?? Math.random;
    for (const e of r.effects) {
      if (e.kind === "returned") this.enqueue({ kind: "speech", text: returnedLine(this.d.lang(), rng) });
      if (e.kind === "incident") this.enqueue({ kind: "speech", text: t.incident[e.step] });
      if (e.kind === "secret") this.enqueue({ kind: "speech", text: t.secret[e.id] });
      if (e.kind === "first_hint") this.enqueue({ kind: "speech", text: t.firstHint[e.step], first: true });
      if (e.kind === "first_step") this.enqueue({ kind: "speech", text: e.next ? t.firstNext(t.firstShort[e.next]) : t.firstAllDone, first: true });
      if (e.kind === "first_done") {
        this.enqueue({ kind: "speech", text: t.firstAllDone });
        this.enqueue({ kind: "toast", text: t.firstToast });
      }
      if (e.kind === "evolved") this.enqueue({ kind: "toast", text: t.evolvedToast(t.forms[e.form]) });
      if (e.kind === "perk_say") {
        const lang = this.d.lang();
        const text =
          e.perk === "greeting"
            ? t.greeting(e.hour ?? 12)
            : e.perk === "app_gossip"
              ? t.gossip(this.d.appName?.(lang, e.tag ?? "") ?? e.tag ?? "")
              : e.perk === "memory_lines" && e.card
                ? t.recall(t.memory(e.card, t.forms))
                : e.perk === "bond"
                  ? returnedFrom(t.bondLines, rng)
                  : null;
        if (text) this.enqueue({ kind: "speech", text });
      }
    }
    // aynı olayda birden çok level: sadece sonuncusu söylenir (yeni açılan düğümlerle)
    const lv = r.effects.filter((e): e is Extract<Effect, { kind: "level" }> => e.kind === "level").at(-1);
    const perks = r.effects.filter((e): e is Extract<Effect, { kind: "perk_unlocked" }> => e.kind === "perk_unlocked").flatMap((e) => e.perks);
    if (lv) this.enqueue({ kind: "toast", text: perks.length ? t.perkToast(lv.level, perks.map((p) => t.perks[p].name)) : t.levelToast(lv.level) });
    this.d.onEffects?.(r.effects, this.s);
    void this.flush();
  }

  private enqueue(s: Say): void {
    if (s.first) this.queue = this.queue.filter((x) => !x.first);
    this.queue.push(s);
    // taşarsa önce ilk adım ipucu düşer (dönüş, olay, level lafları daha değerli), sonra en eski
    while (this.queue.length > MAX_QUEUE) {
      const i = this.queue.findIndex((x) => x.first);
      this.queue.splice(i >= 0 ? i : 0, 1);
    }
  }

  private save(): void {
    const delay = this.d.saveDelayMs ?? 2_000;
    const write = () => {
      this.saveTimer = null;
      void this.d.store
        .set(COMPANION_KEY, this.s)
        .then(() => this.d.store.save())
        .catch(() => undefined);
    };
    if (delay <= 0) return write();
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(write, delay);
  }
}
