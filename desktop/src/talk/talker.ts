// Konuşma yapıştırıcısı: tıklama -> soru kutusu -> cevap, kendiliğinden laf, günlük laf yenileme, bastırma.
// Saf kararlar reply.ts / triggers.ts / lines/engine.ts'te. Soru metni sadece reply()'a geçer; saklanmaz, loglanmaz.
import { FOLLOW_UP_MS, isFollowUp } from "./followup";
import { detectTone } from "./tone";
import type { Tone } from "../companion/events";
import type { DunnoApi } from "../api";
import { STRINGS } from "../i18n";
import { DAILY_QUESTIONS, LineEngine, localDay, nextDelayMs, renderText } from "../lines/engine";
import type { Mode } from "../lines/types";
import type { PetController } from "../pet/controller";
import { MeetingGuard, type GuardContext } from "../pet/meeting-guard";
import type { PetState } from "../pet/state";
import { isMuted, type Settings, type SettingsStore } from "../settings";
import { AskWindow } from "../ui/askbox";
import { Bubble, type BubbleHost } from "../ui/bubble";
import { errorHtml, petToastHtml, speechHtml } from "../ui/surfaces";
import { classify, type QType } from "./classify";
import { applyGuard, type GuardUi } from "./guard-apply";
import type { TalkMemory } from "./memory";
import { limitReply, reply, type Reply } from "./reply";
import { HonestQuota } from "./quota";
import { initialTempo, record } from "./tempo";
import { initialTestMode, tempoActive, testGate, type TestMode } from "../devmode/testmode";
import { DOZE_STEPS, planThinking, POOL_MS, remainingMs } from "./think";
import { cueStep, trimVerbs, verbSchedule, type Cue, type CueEvent } from "./thinkcue";
import { activeTriggers, ClickTracker } from "./triggers";
import { checkReact, initialAppReact, markSpoken, noteContext, reactKey } from "./app-react";
import { lineAllowed, type Tier } from "../pro/entitlements";
import { HoverHold, type HoldEnd } from "./hold";
import { readingMs } from "./reading";
import { BRIEF_THOUGHT_MS, categoryForAnswer, categoryForTrigger, type VoiceCategory } from "../voice/voice";
import deepPools from "../../assets/dunno_tr_pools.json";
import sitesEntertainment from "../../assets/sites_entertainment.json";
import { DunnoMultilingualDialogueEngine } from "./dunno_tr_engine";

export interface TalkerDeps {
  /** SPEC 17 L3: evrim formu (LLM üslup ipucu; enum) */
  persona?: () => string;
  settings: SettingsStore;
  memory: TalkMemory;
  api: DunnoApi;
  pet: PetController;
  host: BubbleHost;
  setInteractive: (on: boolean) => Promise<void>;
  /** toplantı koruması: pencereyi gizle / odak çalmadan geri getir */
  setVisible: (on: boolean) => Promise<void>;
  /** yerel havuzlar (pool_tr.json, pool_en.json) */
  pools: readonly (readonly unknown[])[];
  now?: () => Date;
  rng?: () => number;
  /** pet üstü düşünme işareti (SPEC 07 FB6, ThinkCueView); verilmezse işaret yok */
  setCue?: (cue: Cue) => void;
  /** stats.txt sayaçları (sadece cihazda); bağlama: desktop/src/stats */
  onStat?: (e: TalkStat) => void;
  /** Dunno sesi (SPEC 11): balon açılınca, daktilodan hemen önce; ayar/toplantı/sus kontrolü çağıranda */
  voice?: (category: VoiceCategory) => void;
  /** FB7 hatırlatıcı: ask.exe metni komutsa yerel cevap (sunucuya/LLM'e gitmez, hak düşmez), değilse null */
  reminder?: (text: string) => Promise<string | null>;
  /** daktilo yazıcı (SPEC 10 CL3, ui/typewriter.ts typeInto); verilmezse metin hemen tam */
  typeInto?: (bubbleEl: HTMLElement, textEl: Element | null, text: string) => { done: Promise<void> };
  /** Free / Pro (SPEC 15): Pro lafları sadece Pro'da; verilmezse free */
  tier?: () => Tier;
  /** Kişisel Dunno (SPEC 16, Pro + rıza): kendiliğinden lafların `share` kadarı kişisel şablondan; null = kapalı */
  personal?: () => { share: number; line: (lang: "tr" | "en", rng: () => number) => { id: string; text: string } | null } | null;
  /** gizli dünya / canavar havuzu (SPEC 14): kendiliğinden lafların `share` kadarı bu tetikten; null = normal */
  egg?: () => { trigger: string; share: number } | null;
  /** veri modu davranışı (SPEC 12 B): kendiliğinden konuşma sıklığı çarpanı, 0.5..2 (büyük = daha sık) */
  chattiness?: number | (() => number);
}

const noTyping = () => ({ done: Promise.resolve() });
/** ask.exe'deki son dunno satırı (cevap akışı buraya). DOM'suz testte null. */
const lastDunnoLine = (el: HTMLElement): Element | null => {
  const all = typeof el.querySelectorAll === "function" ? el.querySelectorAll(".msg-dunno") : null;
  return all && all.length ? all[all.length - 1] : null;
};

/** Konuşmadan doğan sayaç olayları. Soru metni yok. */
export type TalkStat =
  /** qtype: classify.ts tipi (SPEC 09 K9 başarımları; soru metni asla) */
  /** tone: L1 ton etiketi (SPEC 17; metin değil) */
  | { kind: "question"; qtype?: string; source?: "llm" | "pool" | "local"; tone?: Tone }
  /** charged:true honest cevap (SPEC 09 K9) */
  | { kind: "honest" }
  /** 2 dk içinde 4. soru, "yavaş" (SPEC 09 K9) */
  | { kind: "too_fast" }
  | { kind: "poke" }
  | { kind: "drag" }
  | { kind: "line"; trigger: string }
  /** günlük hak bitti (sulk) */
  | { kind: "limit" }
  /** toplantı koruması devreye girdi (shh) */
  | { kind: "meeting_guard" };

const SULK_EXTRA_MS = 3_000;
/** fart animasyonu (6 kare x 180 ms, scripts/sprites/states.mjs) + son kareye kısa bakış */
const FART_ANIM_MS = 6 * 180 + 300;
/** error.exe: [ tamam ] ile ya da 6 sn sonra kendiliğinden kapanır (SPEC 04 UP3) */
export const ERROR_MS = 6_000;
/** "bugün sus" gün dönümünü ve günlük laf yenilemeyi bu aralıkla yoklar */
const DAY_CHECK_MS = 60_000;
/** SPEC 13 uygulama tepkisi kontrol aralığı */
const APP_CHECK_MS = 5_000;
const DRAG_TALK_CHANCE = 0.5;
const CANCEL_TALK_CHANCE = 0.5;

export class Talker {
  private readonly engine: LineEngine;
  /** günlük doğru cevap hakkı; sadece charged:true düşürür (SPEC 06 Q3) */
  private readonly quota: HonestQuota;
  private readonly clicks = new ClickTracker();
  private readonly now: () => Date;
  private readonly rng: () => number;
  private busy = false;
  private current: Promise<void> = Promise.resolve();
  private asking?: AbortController;
  private timer?: ReturnType<typeof setTimeout>;
  private linesDay = "";
  private linesLang = "";
  private remote: readonly unknown[] = [];
  private context: readonly string[] = [];
  /** FB4-4: karşılama + sonraki uyku: kendiliğinden laf / uygulama tepkisi / toast yok (tıklama çalışır) */
  private welcoming = false;
  /** SPEC 13 uygulama tepkisi: ziyaret + bekleme süreleri (sadece bellekte, etiketler) */
  private appReact = initialAppReact();
  private readonly guard = new MeetingGuard();
  private guardTimer?: ReturnType<typeof setTimeout>;
  /** toplantıda/bilinmezken polite */
  private guardMode: Mode = "polite";
  private muted = false;
  private readonly bubbles = new Set<Bubble>();
  /** soru temposu (SPEC 06 Q4); sadece bellekte, zaman damgaları */
  private tempo = initialTempo();
  private sulkDay: string | null;
  /** "bugün beynim kapalı" iması gösterilen gün (oturum içi, günde bir kez) */
  private brainOffDay = "";
  /** imleç bir yüzeyin üstünde (Rust cursor://state pop; SPEC 07 FB5) */
  private popOver = false;
  /** açık balon beklemeleri (hover durması) */
  private readonly holds = new Set<HoverHold>();
  /** gizli test modu (SPEC 07 FB2): tempo anahtarı */
  private testMode: TestMode = initialTestMode();

  /** SPEC 17 L2: son cevabın zamanı (metin değil) */
  private lastAnswerAt: number | null = null;
  private readonly deepEngine = new DunnoMultilingualDialogueEngine(
    deepPools as any,
    sitesEntertainment as any
  );

  constructor(private readonly d: TalkerDeps) {
    this.now = d.now ?? (() => new Date());
    this.rng = d.rng ?? Math.random;
    this.engine = new LineEngine({ history: d.memory.initial.recent, rng: this.rng });
    this.quota = new HonestQuota(this.now, d.memory.initial.honest);
    this.sulkDay = d.memory.initial.sulkDay;
    this.setLines();
  }

  private get s(): Readonly<Settings> {
    return this.d.settings.get();
  }

  start(): void {
    this.refreshMute();
    void this.loadLines();
    this.schedule();
    this.d.settings.onChange((next) => this.apply(next));
    setInterval(() => {
      this.refreshMute();
      if (localDay(this.now()) !== this.linesDay) void this.loadLines();
    }, DAY_CHECK_MS);
    setInterval(() => this.checkAppReact(), APP_CHECK_MS);
  }

  /** Bağlamdan gelen trigger'lar (D7b: app:*, idle:*, battery:low; SPEC 09 K7: site:*). */
  setContext(triggers: readonly string[]): void {
    this.context = triggers;
    this.appReact = noteContext(this.appReact, reactKey(triggers), this.now().getTime());
  }

  /** FB4-4: karşılama sürerken (ve sonraki uykuda) kendiliğinden laf, uygulama tepkisi, başarım toast'u yok. */
  setWelcoming(on: boolean): void {
    this.welcoming = on;
  }

  /** Sessiz site kategorisi önde (SPEC 09 K7: adult/kumar): o sırada hiç laf yok. */
  setSiteSilent(on: boolean): void {
    this.engine.setSuppressed("site", on);
  }

  /** Toplantı durumu (meeting://state, getWatchState). Emin değilken true ver. */
  setMeeting(inMeeting: boolean): void {
    const actions = this.guard.update(inMeeting, this.guardCtx());
    if (actions.playShh) this.d.onStat?.({ kind: "meeting_guard" });
    applyGuard(actions, this.guardUi);
    clearTimeout(this.guardTimer);
    const at = this.guard.hideAt;
    if (at !== null) {
      this.guardTimer = setTimeout(() => applyGuard(this.guard.tick(this.guardCtx()), this.guardUi), Math.max(0, at - Date.now()));
    }
  }

  /**
   * Açılım bildirimi (SPEC 05 W3): interaction:unlock lafı + toast. Meşgulken, bugün sus ya da toplantıdayken
   * yapılmaz ve false döner (çağıran sonra tekrar dener).
   */
  announce(toast: string): Promise<boolean> {
    if (this.welcoming || this.busy || this.engine.isSuppressed || this.inMeeting || this.muted) return Promise.resolve(false);
    return this.run(async () => {
      await this.speakLine(["interaction:unlock"]);
      await this.showPop(petToastHtml(toast), this.read(toast), undefined, "achievement");
    }).then(() => true);
  }

  /**
   * SPEC 17: companion lafı (dönüş, olay zinciri, gizli eşik): konuşma balonu. {K:} kuyruğu moda göre işlenir.
   * Meşgulken, karşılamada, bugün sus ya da toplantıdayken yapılmaz ve false döner (çağıran sonra tekrar dener).
   */
  /** FB7 alarm: "bugün sus" da olsa çalar (kullanıcı kendisi kurdu); toplantıda, karşılamada ya da Dunno meşgulken false (çağıran tekrar dener) */
  alarm(text: string): Promise<boolean> {
    if (this.welcoming || this.busy || this.inMeeting) return Promise.resolve(false);
    return this.run(() => this.show(renderText(text, this.mode()), "talk", "greet")).then(() => true);
  }

  sayText(text: string): Promise<boolean> {
    if (this.welcoming || this.busy || this.engine.isSuppressed || this.inMeeting || this.muted) return Promise.resolve(false);
    return this.run(() => this.show(renderText(text, this.mode()), "talk")).then(() => true);
  }

  /** Rust cursor://state: pop = imleç balon/ask.exe üstünde. DOM pointerleave gelmezse balon hover'ı buradan biter. */
  onCursor(s: { pop?: boolean }): void {
    const pop = s.pop === true;
    if (pop === this.popOver) return;
    this.popOver = pop;
    for (const h of this.holds) {
      if (pop) h.enter();
      else h.leave();
    }
  }

  /** Test modu (SPEC 07 FB2): soru temposu anahtarı. */
  setTestMode(m: TestMode): void {
    this.testMode = m;
  }

  /** Test modu "doğru cevap hakkını sıfırla": bugünkü yerel hak geri gelir ve kaydedilir. */
  async resetQuota(): Promise<void> {
    this.quota.reset();
    await this.d.memory.save({ honest: this.quota.state });
  }

  /** dunno.exe durumu için. */
  get questionsLeft(): number {
    return this.quota.remaining();
  }

  get meetingActive(): boolean {
    return this.inMeeting;
  }

  /** Başka bir konuşma/soru sürüyor (osuruk kontrolü bu turu atlar, SPEC 09 K3). */
  get isBusy(): boolean {
    return this.busy;
  }

  /**
   * Osurma (SPEC 09 K3): tek seferlik fart animasyonu bitince interaction:fart lafı. Meşgulken, bugün sus ya da
   * toplantıdayken yapılmaz ve false döner (tetik kuralları talk/fart.ts'te; bu sadece gösterim).
   */
  fart(): Promise<boolean> {
    if (this.busy || this.engine.isSuppressed || this.inMeeting || this.muted) return Promise.resolve(false);
    return this.run(async () => {
      this.d.pet.pose("fart");
      await sleep(FART_ANIM_MS);
      await this.speakLine(["interaction:fart"]);
    }).then(() => true);
  }

  private get inMeeting(): boolean {
    return this.guard.state !== "clear";
  }

  private guardCtx(): GuardContext {
    return { askboxOpen: this.asking !== undefined, bubbleVisible: this.bubbles.size > 0, mode: this.s.mode };
  }

  private readonly guardUi: GuardUi = {
    closeAskbox: () => this.asking?.abort(),
    hideBubble: () => this.closeBubbles(),
    playShh: () => {
      this.d.pet.hold("meeting", true);
      this.d.pet.pose("shh");
    },
    hide: () => void this.d.setVisible(false),
    restore: () => {
      void this.d.setVisible(true);
      this.d.pet.hold("meeting", false);
      this.basePose();
    },
    setSuppressed: (on) => this.engine.setSuppressed("meeting", on),
    setEffectiveMode: (m) => (this.guardMode = m),
  };

  /** Konuşulacak mod: toplantıda polite. */
  private mode(): Mode {
    return this.inMeeting ? this.guardMode : this.s.mode;
  }

  /** Konuşma bitince dönülecek poz: toplantı > bugün sus > serbest. */
  private basePose(): void {
    if (this.inMeeting) this.d.pet.pose("shh");
    else if (this.muted) this.d.pet.pose("sleep");
    else this.d.pet.pose(null);
  }

  /** Açılır yüzey (ui-kit HTML); toplantı koruması kapatabilsin diye takip edilir. */
  private openPop(html: string): Bubble {
    const b = new Bubble(this.d.host);
    b.setHtml(html);
    this.bubbles.add(b);
    return b;
  }

  /**
   * Yüzeyi okuma süresi kadar gösterir; imleç üstündeyken durur, tıklamak kapatır (SPEC 07 FB5).
   * typed: konuşma balonu metni harf harf akar (SPEC 10 CL3); okuma süresi akış bitince başlar, akarken tık tamamlar.
   */
  private async showPop(html: string, ms: number, typed?: string, voice?: VoiceCategory | null): Promise<void> {
    if (this.inMeeting) return;
    const b = this.openPop(html);
    // SPEC 11 sırası: balon açıldı -> ses -> daktilo
    if (voice) this.d.voice?.(voice);
    if (typed !== undefined) await this.typeText(b, b.el.querySelector(".bubble-fill"), typed);
    await this.hold(b, ms);
    this.closeBubble(b); // guard daha önce kapattıysa bir şey yapmaz
  }

  /** Daktilo akışı (CL3): balon kapanırsa ya da toplantı başlarsa biter; yazıcı yoksa (test) hemen. */
  private async typeText(b: Bubble, el: Element | null, text: string): Promise<void> {
    if (!this.bubbles.has(b)) return;
    await (this.d.typeInto ?? noTyping)(b.el, el, text).done;
  }

  /** Okuma süresi: settings bubbleSpeed her seferinde okunur (değişince sonraki balona canlı uygulanır). */
  private read(text: string, honest = false): number {
    return readingMs(text, { honest, speed: this.s.bubbleSpeed });
  }

  /** Balonu okuma süresi kadar tutar (hover durur). Tıklanırsa balon kapanır; dışarıdan kapandıysa hemen döner. */
  private async hold(b: Bubble, ms: number): Promise<HoldEnd> {
    if (!this.bubbles.has(b)) return "closed";
    const h = new HoverHold(b.el, ms, { alive: () => this.bubbles.has(b) });
    if (this.popOver) h.enter();
    this.holds.add(h);
    try {
      const end = await h.done;
      if (end === "click") this.closeBubble(b);
      return end;
    } finally {
      this.holds.delete(h);
    }
  }

  private closeBubble(b: Bubble): void {
    if (this.bubbles.delete(b)) b.close();
  }

  private closeBubbles(): void {
    for (const b of [...this.bubbles]) this.closeBubble(b);
  }

  /** Pet'e tıklama (sürükleme değil). Toplantıda tepki yok; "bugün sus"ta uyurken error.exe. */
  async onClick(): Promise<void> {
    if (this.inMeeting) return;
    this.d.onStat?.({ kind: "poke" });
    if (this.muted) {
      const t = STRINGS[this.s.lang];
      if (!this.busy) void this.run(() => this.showPop(errorHtml(t.mutedTitle, t.mutedBody, t.ok), ERROR_MS));
      return;
    }
    if (this.clicks.click(this.now().getTime())) {
      this.asking?.abort();
      void this.current.then(() => this.sayLine(["interaction:spam_click"]));
      return;
    }
    if (this.asking) {
      this.asking.abort(); // kutu açıkken pet'e tıklamak kapatır
      return;
    }
    if (this.busy) return;
    if (this.engine.isSuppressed) {
      this.d.pet.react("shrug");
      return;
    }

    // Dunnolama kontrolü: panoda veya seçili metin varsa analiz edip yorumla
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
        const clipText = (await navigator.clipboard.readText()).trim();
        if (clipText.length >= 3 && clipText.length <= 5000) {
          const dunnola = this.deepEngine.dunnolaSelectedText(clipText, true, {
            locale: this.s.lang as any,
            mouthMode: this.mode(),
          });
          if (!dunnola.silent && dunnola.response && dunnola.poolKey) {
            void this.run(() => this.show(dunnola.response, "talk"));
            return;
          }
        }
      }
    } catch {
      // Pano okuma kısıtlıysa veya hata verirse normal soru akışına devam et
    }

    // hak bitince bir kez sulk; sonra havuz cevapları devam eder (SPEC 06 Q4)
    if (!this.quota.canAsk() && !this.sulkedToday) {
      void this.run(() => this.sulk(limitReply(this.ctx()).text));
      return;
    }
    const g = testGate(this.tempo, this.now().getTime(), this.testMode);
    if (g.kind !== "ok") {
      void this.run(() => this.waitView(g.waitMs));
      return;
    }
    void this.run(() => this.ask());
  }

  onDragEnd(): void {
    this.d.onStat?.({ kind: "drag" });
    if (this.rng() < DRAG_TALK_CHANCE) void this.sayLine(["interaction:drag"]);
  }

  /** SPEC 14: gizli havuzdan bir laf (canavar modu açılınca; süren konuşma bitince); havuz yoksa sessiz. */
  async sayEgg(trigger: string): Promise<void> {
    await this.current;
    return this.sayLine([trigger], true);
  }

  /** Kendiliğinden laf (zamanlayıcı ve dev kısayolu). */
  chatter(): Promise<void> {
    if (this.welcoming) return Promise.resolve();
    const egg = this.d.egg?.();
    if (egg && this.rng() < egg.share && this.engine.hasTrigger(egg.trigger, this.s.lang)) return this.sayLine([egg.trigger], true);
    // katman sırası (Plan v2): ... -> easter egg -> kişisel dunno -> son tepki
    const personal = this.d.personal?.();
    if (personal && this.rng() < personal.share && !this.busy && !this.engine.isSuppressed) {
      const line = personal.line(this.s.lang, this.rng);
      if (line) return this.run(() => this.show(renderText(line.text, this.mode()), "talk"));
    }
    return this.sayLine(activeTriggers(this.now(), this.context));
  }

  private ctx() {
    const s = this.s;
    return {
      quota: this.quota,
      engine: this.engine,
      deepEngine: this.deepEngine,
      ask: (req: Parameters<DunnoApi["ask"]>[0]) => this.d.api.ask(req),
      lang: s.lang,
      mode: this.mode(),
      deviceId: s.deviceId,
      fallback: STRINGS[s.lang].fallbackAnswer,
      sulked: this.sulkedToday,
    };
  }

  private get sulkedToday(): boolean {
    return this.sulkDay === localDay(this.now());
  }

  /** Havuzda tam bu trigger'ın lafı varsa onu söyler; yoksa null (random'a düşmez). */
  private exactLine(trigger: string): string | null {
    return this.engine.sayExact([trigger], this.s.lang, this.mode());
  }

  private thinkVerb(): string {
    const verbs = STRINGS[this.s.lang].thinkingVerbs;
    return this.exactLine("interaction:thinking") ?? verbs[Math.floor(this.rng() * verbs.length) % verbs.length];
  }

  /** Tempo kilidi: ask.exe'de kum saati + biraz bekle; pet'e tıklamak kapatır. */
  private async waitView(waitMs: number): Promise<void> {
    const t = STRINGS[this.s.lang];
    const win = new AskWindow(this.d.host, t, this.quota.remaining(), DAILY_QUESTIONS, this.s.mode, () => undefined);
    this.bubbles.add(win.bubble);
    const waiting = new AbortController();
    this.asking = waiting;
    try {
      await win.wait(waitMs, waiting.signal);
    } finally {
      if (this.asking === waiting) this.asking = undefined;
      this.closeBubble(win.bubble);
    }
  }

  /** Aynı anda tek konuşma; pet bu sırada yürümez. */
  private run(fn: () => Promise<void>): Promise<void> {
    if (this.busy) return this.current;
    this.busy = true;
    this.d.pet.hold("talk", true);
    this.current = (async () => {
      try {
        await fn();
      } finally {
        this.basePose();
        this.d.pet.hold("talk", false);
        this.busy = false;
      }
    })();
    return this.current;
  }

  private async ask(): Promise<void> {
    const t = STRINGS[this.s.lang];
    await this.d.setInteractive(true);
    const asking = new AbortController();
    this.asking = asking;
    const win = new AskWindow(
      this.d.host,
      t,
      this.quota.remaining(),
      DAILY_QUESTIONS,
      this.s.mode,
      (mode) => void this.d.settings.update({ mode }),
      () => {
        asking.abort();
        this.closeBubble(win.bubble);
      },
    );
    this.bubbles.add(win.bubble);
    let question: string | null;
    try {
      question = await win.ask(asking.signal);
    } finally {
      this.asking = undefined;
      await this.d.setInteractive(false);
    }
    if (question === null) {
      this.closeBubble(win.bubble);
      // Esc/boş gönderim ara sıra laf alır; pet'e tıklayıp kapatma almaz
      if (!asking.signal.aborted && this.rng() < CANCEL_TALK_CHANCE) await this.speakLine(["interaction:click"]);
      return;
    }

    // FB7: alarm / hatırlatıcı komutu: yerelde biter (tempo, hak, sunucu yok)
    const local = this.d.reminder ? await this.d.reminder(question).catch(() => null) : null;
    if (local !== null) {
      win.thinking(question, this.thinkVerb(), false);
      question = null;
      await sleep(POOL_MS[0]);
      if (this.inMeeting || !this.bubbles.has(win.bubble)) return;
      win.answer(local);
      this.d.pet.pose("talk");
      this.d.voice?.("answer");
      await this.typeText(win.bubble, lastDunnoLine(win.bubble.el), local);
      await this.hold(win.bubble, this.read(local));
      this.closeBubble(win.bubble);
      return;
    }

    // 2 dk içinde 4. soru: cevap yok, "yavaş" + 60 sn kilit (hak düşmez)
    const rec = record(this.tempo, this.now().getTime());
    this.tempo = rec.tempo;
    if (rec.tooFast && tempoActive(this.testMode)) {
      this.d.onStat?.({ kind: "too_fast" });
      win.thinking(question, this.thinkVerb(), false);
      question = null;
      await sleep(POOL_MS[0]);
      if (this.inMeeting || !this.bubbles.has(win.bubble)) return;
      const text = this.exactLine("interaction:too_fast") ?? t.tooFastFallback;
      win.answer(text);
      this.d.pet.pose("shrug");
      this.d.voice?.("too_fast");
      await this.typeText(win.bubble, lastDunnoLine(win.bubble.el), text);
      await this.hold(win.bubble, this.read(text));
      this.closeBubble(win.bubble);
      return;
    }

    // SPEC 17 L2: cevaptan hemen sonraki "neden" / "ciddi misin" takip sorusu; L1 ton (sadece enum)
    const base = classify(question);
    const qtype: QType = this.lastAnswerAt !== null && Date.now() - this.lastAnswerAt < FOLLOW_UP_MS && isFollowUp(question) ? "follow_up" : base;
    const tone = detectTone(question, qtype);
    win.thinking(question, this.thinkVerb(), false); // hak sadece charged cevapta düşer
    this.d.pet.pose("idle"); // düşünürken idle + tüy (SPEC 06 Q5)
    const plan = planThinking(this.rng);
    // pet üstü işaret (SPEC 07 FB6): düşünürken açık; cevapta "answer", başka her çıkışta "cancel"
    let cue: Cue = "off";
    const cueEvent = (ev: CueEvent) => {
      const next = cueStep(cue, ev, plan);
      if (next === cue) return;
      cue = next;
      this.d.setCue?.(cue);
    };
    cueEvent("think");
    try {
      const started = Date.now();
      const verbs = this.scheduleVerbs(win, verbSchedule(plan, this.rng));
      let r: Reply;
      let prefix = "";
      try {
        const pending = reply(question, qtype, { ...this.ctx(), tone, persona: this.d.persona?.() });
        question = null;
        if (plan.doze) {
          // landing ask.exe: zzz… -> yeniden düşünür -> huh. what. oh. + cevap
          await sleep(DOZE_STEPS.asleep);
          verbs.stop();
          if (this.bubbles.has(win.bubble)) win.doze(t.dozeAsleep);
          cueEvent("doze");
          this.d.pet.pose("sleep");
          await sleep(DOZE_STEPS.rethink);
          if (this.bubbles.has(win.bubble)) win.rethink(this.thinkVerb());
          cueEvent("rethink");
          this.d.pet.pose("idle");
          r = await pending;
          await sleep(DOZE_STEPS.wake);
          prefix = t.dozeWake;
        } else {
          r = await pending;
          const wait = remainingMs(plan, r.kind === "answer" ? r.source : "local", Date.now() - started);
          // honest erken geldiyse cevaba 0.6 sn'den yakın değişimler atılır
          verbs.trim(Date.now() - started + wait);
          await sleep(wait);
        }
      } finally {
        question = null;
        verbs.stop();
      }
      await this.d.memory.save({ honest: this.quota.state, recent: [...this.engine.recent] });
      if (r.kind === "sulk") {
        this.closeBubble(win.bubble);
        cueEvent("cancel");
        await this.sulk(r.text);
        return;
      }
      this.d.onStat?.({ kind: "question", qtype, source: r.source, tone });
      this.lastAnswerAt = Date.now();
      if (r.honest) this.d.onStat?.({ kind: "honest" });
      if (this.inMeeting || !this.bubbles.has(win.bubble)) return; // toplantı başladıysa guard kapattı
      const text = prefix + r.text;
      win.answer(text, this.quota.remaining());
      cueEvent("answer");
      this.d.pet.pose(r.dodge ? "shrug" : "talk"); // yasak konu: omuz silkme
      this.d.voice?.(categoryForAnswer(r));
      await this.typeText(win.bubble, lastDunnoLine(win.bubble.el), text);
      await this.hold(win.bubble, this.read(text, r.honest));
      // honest denendi ama beyin kapalı: günde bir kez ima (hak düşmedi)
      const today = localDay(this.now());
      if (r.brainOff && this.brainOffDay !== today && this.bubbles.has(win.bubble) && !this.inMeeting) {
        this.brainOffDay = today;
        const hint = this.exactLine("interaction:brain_off") ?? t.brainOffFallback;
        win.say(hint);
        this.d.voice?.("answer");
        await this.typeText(win.bubble, lastDunnoLine(win.bubble.el), hint);
        await this.hold(win.bubble, this.read(hint));
      }
      this.closeBubble(win.bubble);
    } finally {
      // iptal, toplantı, kapanma, hata: işaret açık kalmasın
      if (cue !== "off") cueEvent("cancel");
    }
  }

  /**
   * Düşünme metni değişimleri (SPEC 07 FB6, thinkcue.verbSchedule): düşünme başından ms cinsinden anlar.
   * stop: kalan zamanlayıcıları temizler · trim(answerAt): cevaba ANSWER_GAP_MS'den yakın ya da sonraki değişimleri iptal eder.
   */
  private scheduleVerbs(win: AskWindow, at: readonly number[]): { stop: () => void; trim: (answerAt: number) => void } {
    const timers = new Map<number, ReturnType<typeof setTimeout>>();
    for (const t of at) {
      timers.set(
        t,
        setTimeout(() => {
          timers.delete(t);
          if (this.bubbles.has(win.bubble)) win.setVerb(this.thinkVerb());
        }, t),
      );
    }
    const drop = (keep: readonly number[]) => {
      for (const [t, h] of timers) {
        if (keep.includes(t)) continue;
        clearTimeout(h);
        timers.delete(t);
      }
    };
    return { stop: () => drop([]), trim: (answerAt) => drop(trimVerbs([...timers.keys()], answerAt)) };
  }

  private async sulk(text: string | null): Promise<void> {
    this.d.onStat?.({ kind: "limit" });
    this.sulkDay = localDay(this.now());
    await this.d.memory.save({ sulkDay: this.sulkDay });
    if (this.inMeeting) return;
    this.d.pet.pose("sulk");
    const t = STRINGS[this.s.lang];
    const body = text ?? t.limitFallback;
    await this.showPop(errorHtml(t.limitTitle, body, t.ok), ERROR_MS, undefined, "sulk");
    await sleep(SULK_EXTRA_MS);
    await this.d.memory.save({ recent: [...this.engine.recent] });
  }

  /** Balonla konuşur, okuma süresi kadar bekler. */
  /** Tepki pozu -> kısa düşünme -> balon -> ses -> daktilo (SPEC 11). */
  private async show(text: string, pose: PetState, voice: VoiceCategory | null = "context"): Promise<void> {
    if (this.inMeeting) return; // toplantı başladıysa hiç konuşma
    this.d.pet.pose(pose);
    if (this.d.voice) {
      await sleep(BRIEF_THOUGHT_MS);
      if (this.inMeeting) return;
    }
    await this.showPop(speechHtml(text), this.read(text), text, voice);
  }

  /**
   * SPEC 13: uygulamaya / site kategorisine geçip orada kalınca bazen ona özel laf (app-react.ts kuralları). Bugün sus, toplantı,
   * sessiz site, meşgulken zar atılmaz (bekler); konuşunca bekleme süreleri başlar ve kendiliğinden laf zamanlayıcısı yeniden kurulur.
   */
  checkAppReact(): void {
    if (this.welcoming || this.busy || this.engine.isSuppressed || this.inMeeting) return;
    const r = checkReact(this.appReact, this.now().getTime(), this.s.frequency, this.rng);
    this.appReact = r.state;
    const key = r.fire;
    if (!key) return;
    void this.run(async () => {
      if (await this.speakLine([key], true)) {
        this.appReact = markSpoken(this.appReact, key, this.now().getTime());
        this.schedule();
      }
    });
  }

  private async speakLine(triggers: readonly string[], exact = false): Promise<boolean> {
    const lang = this.s.lang;
    const line = exact ? this.engine.pickExact(triggers, lang, this.mode()) : this.engine.pick(triggers, lang, this.mode());
    if (!line) return false;
    const text = renderText(line[lang]!, this.mode());
    this.d.onStat?.({ kind: "line", trigger: line.trigger });
    await this.show(text, "talk", categoryForTrigger(line.trigger));
    await this.d.memory.save({ recent: [...this.engine.recent] });
    return true;
  }

  private sayLine(triggers: readonly string[], exact = false): Promise<void> {
    if (this.busy || this.engine.isSuppressed) return Promise.resolve();
    return this.run(async () => void (await this.speakLine(triggers, exact)));
  }

  private schedule(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      void this.chatter();
      this.schedule();
    }, nextDelayMs(this.s.frequency, this.rng) / (typeof this.d.chattiness === "function" ? this.d.chattiness() : (this.d.chattiness ?? 1)));
  }

  private apply(next: Settings): void {
    this.refreshMute();
    this.schedule();
    if (next.lang !== this.linesLang) void this.loadLines(next.lang);
  }

  /** "bugün sus": bastır + pet uyur; gün dönünce kendiliğinden kalkar. */
  private refreshMute(): void {
    const muted = isMuted(this.s, this.now());
    this.engine.setSuppressed("mute", muted);
    if (muted === this.muted) return;
    this.muted = muted;
    if (muted) {
      this.asking?.abort();
      this.closeBubbles();
    }
    this.d.pet.hold("mute", muted);
    if (!this.busy) this.basePose();
  }

  private setLines(): void {
    const tier = this.d.tier?.() ?? "free";
    this.engine.setLines([...this.d.pools.flat(), ...this.remote].filter((l) => lineAllowed(tier, l)));
  }

  /** Pro durumu değişti (SPEC 15): havuz yeniden süzülür. */
  refreshTier(): void {
    this.setLines();
  }

  /** /v1/lines (ETag'li); çevrimdışıysa önbellek ya da sadece yerel havuz. */
  private async loadLines(lang = this.s.lang): Promise<void> {
    this.linesDay = localDay(this.now());
    this.linesLang = lang;
    this.remote = await this.d.api.fetchLines(lang);
    this.setLines();
    await this.d.memory.save({ lines: this.d.api.snapshot() });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
