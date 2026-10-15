// Pet davranışı: hareket, imleçten kaçma, sürükle-bırak. Saf kararlar movement.ts / path.ts'te; burası yapıştırıcı.
import type { CursorState, WorkArea } from "../ipc";
import type { Facing, Player } from "../player/player";
import {
  facingFor,
  isDrag,
  pickNext,
  RUN_COOLDOWN_MS,
  REST_MS,
  RUN_SPEED,
  runAwayTarget,
  stepToward,
  WALK_SPEED,
  type Rng,
} from "./movement";
import { edgePlacement, type EdgeTarget } from "../devmode/edges";
import { facingForEdge, restStateFor, type ScreenEdge } from "./facing";
import { EdgePath } from "./path";
import { playOptions, type PetState } from "./state";
import { bounceAt, BOUNCE_MS, chuteAt, chuteOpen, dropKind, flightAt, planChute, planFlight, towardEdge, type Chute, type Flight } from "./flight";

/** paraşüt süzülmesinde pencere taşıma aralığı (ms): akıcı ama sürekli değil (uçuştan uzun sürer) */
const CHUTE_MOVE_MS = 33;

/** pin: test modu "kenara gönder" (SPEC 07 FB2): konum, poz ve yön sabit; sürükle/çağır/kenara gönder bırakır */
type Mode = "rest" | "walk" | "run" | "shrug" | "pose" | "sleep" | "drag" | "snap" | "pin";

export interface Geometry {
  workArea: WorkArea;
  /** pet kutusu boyutu ve pencere içindeki yeri (mantıksal) */
  boxW: number;
  boxH: number;
  offsetX: number;
  offsetY: number;
}

export interface ControllerDeps {
  player: Player;
  moveWindow: (x: number, y: number) => void;
  setCapture: (on: boolean) => void;
  /** tıklama (sürükleme değil); D4'te soru kutusu açar */
  onClick: () => void;
  /** sürükleyip bırakınca */
  onDragEnd?: () => void;
  /** paraşüt açıldı/kapandı (çizim pet üstünde, ui/parachute.ts) */
  onChute?: (open: boolean) => void;
  /** yan kenarda durup bakmaya (peek) başladı (SPEC 09 K9 edge başarımı; sadece sayı) */
  onPeek?: () => void;
  clock?: () => number;
  rng?: Rng;
  /** gizli glitch dünyası (SPEC 14): bu yürüyüş geri geri mi (alt kenarda, yürüyüş başına bir kez sorulur) */
  moonwalk?: () => boolean;
  /** veri modu davranışı (SPEC 12 B): dinlenme süresi çarpanı, 0.5..2 (büyük = daha az yürür) */
  restScale?: number | (() => number);
  /** teşhis (DUNNO_FREEZE_MOVEMENT): kendiliğinden yürüme/kaçma yok; sürükleme çalışır */
  frozen?: boolean;
  /**
   * FB5: açılır yüzey açıkken pencere geçici büyük ve pet pencere içinde başka yerde: kutu -> pencere konumu buradan
   * (balon pet'le birlikte taşınır). null: taban yerleşim (geometry offset).
   */
  windowAt?: (box: Point) => Point | null;
  /** FB5: uçuş/paraşüt bitti, pet yere indi (açık balon yeni yere göre yeniden yerleşsin) */
  onSettle?: () => void;
  /** SPEC 17: dinlenirken ara sıra oynanacak tek seferlik poz (shrug, yawn, sneeze, dance); yoksa shrug */
  fidget?: () => PetState;
  /** SPEC 17: tek seferlik animasyon başladı (ses efekti) / bitti (ardından laf) */
  onAnim?: (state: PetState) => void;
  onAnimEnd?: (state: PetState) => void;
}

/** SPEC 17 zıplama: pencere yukarı kayması (mantıksal px, ölçek 1) kare zamanına göre */
export const HOP: readonly (readonly [number, number])[] = [
  [140, 0],
  [70, -5],
  [70, -9],
  [70, -10],
  [70, -8],
  [70, -4],
];
export const HOP_MS = HOP.reduce((t, [ms]) => t + ms, 0);
export function hopAt(ms: number): number {
  if (ms < 0) return 0;
  let t = 0;
  for (const [len, px] of HOP) {
    if (ms < t + len) return px;
    t += len;
  }
  return 0;
}

/**
 * Pencere konumu en fazla ~12.5 Hz ve sadece en az 1 px değişince gönderilir: her SetWindowPos DWM'de
 * yeniden birleştirme demek (başka uygulamalarda caret titremesi, TASK-BUG-CARET). Sürükleme bundan muaf.
 */
export const MOVE_INTERVAL_MS = 80;

/** SPEC 17: sesi olan tek seferlik animasyonlar */
const SFX: ReadonlySet<PetState> = new Set<PetState>(["wave", "jump", "dance", "yawn", "sneeze"]);
const MIN_STEP_PX = 1;
const MAX_DT_MS = 100;

export interface Point {
  x: number;
  y: number;
}

export class PetController {
  private readonly clock: () => number;
  private readonly rng: Rng;
  private geo?: Geometry;
  private path?: EdgePath;
  private mode: Mode = "rest";
  /** SPEC 14: bu yürüyüş geri geri */
  private moon = false;
  private s = 0;
  private target = 0;
  private until = 0;
  private facing: Facing = "right";
  private lastTick = 0;
  private lastRun = -Infinity;
  private cursor: CursorState = { over: false, near: false, dx: 0, dy: 0 };
  /** sürükleme/snap sırasında kutu konumu (yol dışında olabilir) */
  private box: Point = { x: 0, y: 0 };
  /** yay uçuşu (SPEC 10 CL2): çağır, kenara gönder, bırakınca oturma, pin bırakma; "snap" modunda */
  private flight?: Flight;
  /** havadan bırakınca paraşütlü iniş (Plan v2 CL2 ek isteği); "snap" modunda, flight yerine */
  private chute?: Chute;
  private chuteShown = false;
  private snapStart = 0;
  /** iniş yaylanmasının başladığı an (BOUNCE_MS boyunca kutu kenara doğru tam sayı px oynar) */
  private landedAt = -Infinity;
  /** uçuş sonu (CL4 karşılama): yol dışına iner ve o pozda bekler (pin) ya da uyur; inince çözülür */
  private landing?: { pin?: { pose: PetState; facing: Facing }; sleepMs?: number; done: () => void };
  /** rebase: monitör değişti (CL5), sıradaki hareket yeni başlangıç noktasıdır (ekran koordinatı monitörler arası sıçrar) */
  private pointer?: { x: number; y: number; box: Point; dragging: boolean; rebase?: boolean };
  private sent?: Point;
  private lastSentAt = -Infinity;
  /** pet boyutu (SPEC 08): yürüme/koşma hızı çarpanı; görsel hız her boyutta aynı */
  private speed = 1;
  /** balon açıkken pet yerinde durur, kaçmaz, sürüklenmez (tıklama yine gelir) */
  private readonly holds = new Set<string>();
  /** SPEC 17: konuşma bitince oynanacak tepki (zıpla, dans, el salla) */
  private pendingReact: PetState | null = null;
  /** zıplama başlangıcı (pencere havalanır) */
  private hopStart = -Infinity;

  /** son gösterilen animasyon (peek başlangıcını bir kez saymak için) */
  private shown: PetState | null = null;

  constructor(private readonly deps: ControllerDeps) {
    this.clock = deps.clock ?? (() => performance.now());
    this.rng = deps.rng ?? Math.random;
  }

  /** Çalışma alanı, DPI ya da kutu boyutu değişince çağrılır; konum yeni sınırlara oturur. */
  setGeometry(geo: Geometry): void {
    const first = !this.path;
    const pos = first ? undefined : this.currentBox();
    this.geo = geo;
    this.path = new EdgePath(geo.workArea.width, geo.workArea.height, geo.boxW, geo.boxH, geo.offsetY);
    if (first) {
      this.s = this.path.bottomEnd; // sağ alt köşe
      this.rest(3_000);
    } else if (pos) {
      // FB5: uçarken (karşılama sonu, çağır, bırakma) s uçuşun HEDEFİNE göre kalır; eskiden o anki havadaki konuma
      // göre yeniden hesaplanıyordu (balon kapanınca relayout): pet köşeye inip ekranın ortasına ışınlanıyordu
      const aim = this.mode === "snap" ? (this.chute?.to ?? this.flight?.to) : undefined;
      this.s = aim ? this.path.project(aim.x, aim.y) : this.path.project(pos.x, pos.y);
      this.target = this.path.clamp(this.target);
      if (this.mode === "drag" || this.mode === "snap") this.box = this.path.clampBox(pos.x, pos.y);
    }
    this.push(true);
  }

  /** Pet'in şu an bulunduğu kenar (boyut değişince yeni kutu aynı kenara oturur, SPEC 08). */
  edge(): ScreenEdge {
    if (!this.path || this.mode === "drag" || this.mode === "snap") return "bottom";
    return this.path.pointAt(this.s).edge;
  }

  /** Pet boyutu değişince (SPEC 08): px/sn hızlar ölçekle orantılı. */
  setSpeedFactor(k: number): void {
    this.speed = k;
  }

  /** FB6 performans: hareket, iniş yaylanması, bekleyen tepki, fare üstünde ya da dinlenme bitmek üzereyse hızlı kare gerekir */
  get busy(): boolean {
    if (this.mode !== "rest" || this.pendingReact || this.cursor.over) return true;
    const now = this.clock();
    return now - this.landedAt <= BOUNCE_MS + 2 * MOVE_INTERVAL_MS || now >= this.until - 100;
  }

  private get held(): boolean {
    return this.holds.size > 0;
  }

  /** Nedene göre tutma (firstrun, talk, mute, meeting); hepsi bırakılınca pet serbest. */
  hold(reason: string, on: boolean): void {
    if (on) this.holds.add(reason);
    else this.holds.delete(reason);
    if (on && (this.mode === "walk" || this.mode === "run")) this.rest(0);
  }

  onCursor(state: CursorState): void {
    this.cursor = state;
    const now = this.clock();
    if (
      this.path &&
      !this.held &&
      !this.deps.frozen &&
      state.near &&
      !state.over &&
      (this.mode === "rest" || this.mode === "walk") &&
      now - this.lastRun >= RUN_COOLDOWN_MS
    ) {
      this.lastRun = now;
      this.target = runAwayTarget(this.path, this.s, state.dx, state.dy);
      this.setMode("run");
    }
  }

  pointerDown(screenX: number, screenY: number): void {
    if (!this.path) return;
    this.pointer = { x: screenX, y: screenY, box: this.currentBox(), dragging: false };
    this.deps.setCapture(true);
  }

  pointerMove(screenX: number, screenY: number): void {
    const p = this.pointer;
    if (!p || !this.path) return;
    if (p.rebase) {
      p.rebase = false;
      p.x = screenX;
      p.y = screenY;
      p.box = { ...this.box };
      return;
    }
    const dx = screenX - p.x;
    const dy = screenY - p.y;
    if (!p.dragging && (this.held || !isDrag(dx, dy))) return;
    if (!p.dragging) {
      p.dragging = true;
      // uçuş, paraşüt ya da karşılama sürerken yakalandı: orada biter (bekleyen çözülür)
      this.flight = undefined;
      this.endChute();
      this.landing?.done();
      this.landing = undefined;
      this.setMode("drag");
    }
    this.box = this.path.clampBox(p.box.x + dx, p.box.y + dy);
    this.push(true);
  }

  pointerUp(cancelled = false): void {
    const p = this.pointer;
    if (!p) return;
    this.pointer = undefined;
    this.deps.setCapture(false);
    if (p.dragging && this.path) {
      const bounds = { maxX: this.path.xMax, maxY: this.path.yMax };
      // havada bırakıldı: paraşütle alt kenara süzülür; duvar dibinde ya da altta: yay ile en yakın kenara
      if (dropKind(this.box, bounds) === "chute") this.startChute(planChute(this.box, bounds));
      else this.flyTo(this.path.project(this.box.x, this.box.y));
      this.deps.onDragEnd?.();
    } else if (!cancelled) {
      this.deps.onClick();
    }
  }

  /** Pencerenin (genişlik winW) ekranda görünen yatay aralığı, pencereye göre. */
  /** Pet kutusu, çalışma alanına göre mantıksal (açılır yüzey yerleşimi için). */
  petBox(): { x: number; y: number; w: number; h: number } {
    const b = this.path ? this.currentBox() : { x: 0, y: 0 };
    return { x: b.x, y: b.y, w: this.geo?.boxW ?? 0, h: this.geo?.boxH ?? 0 };
  }

  visibleX(winW: number): [number, number] {
    if (!this.geo || !this.path) return [0, winW];
    const winX = this.currentBox().x - this.geo.offsetX;
    return [Math.max(0, -winX), Math.min(winW, this.geo.workArea.width - winX)];
  }

  /** dunno.exe "dunno'yu çağır": alt kenarın ortasına yay çizerek uçar (SPEC 10 CL2). */
  summon(): void {
    if (!this.path || this.mode === "drag" || this.mode === "snap" || this.held) return;
    this.flyTo(this.path.bottomStart + this.path.xMax / 2);
  }

  /**
   * SPEC 17 yetenek ağacı (zıpırlık / zafer turu): alt kenardaysa diğer uca koşar. Meşgulken, tutuluyken, uçarken ya da
   * dondurulmuşken (teşhis) bir şey yapmaz; false döner.
   */
  zoomies(): boolean {
    const p = this.path;
    if (!p || this.held || this.deps.frozen || (this.mode !== "rest" && this.mode !== "walk")) return false;
    if (p.pointAt(this.s).edge !== "bottom") return false;
    const mid = p.bottomStart + p.xMax / 2;
    this.target = this.s < mid ? p.bottomEnd - p.xMax * 0.1 : p.bottomStart + p.xMax * 0.1;
    this.lastRun = this.clock();
    this.setMode("run");
    return true;
  }

  /** dunno.exe "kenara gönder": en yakın yan kenarın ortasına uçar (orada inince peek). */
  sendToEdge(): void {
    if (!this.path || this.mode === "drag" || this.mode === "snap" || this.held) return;
    const p = this.path;
    this.flyTo(this.s < p.length / 2 ? p.vLen / 2 : p.length - p.vLen / 2);
  }

  /**
   * Karşılama (SPEC 10 CL4): çalışma alanında herhangi bir kutu noktasına uçar, orada pose ile bekler (pin).
   * İnince çözülür. Sürüklenirse ya da bırakılırsa (unpin) karşılama orada biter.
   */
  flyToPoint(x: number, y: number, pose: PetState, facing: Facing = "right"): Promise<void> {
    if (!this.path) return Promise.resolve();
    const to = this.path.clampBox(x, y);
    return new Promise((done) => {
      this.flyTo(this.path!.project(to.x, to.y), to);
      this.landing = { pin: { pose, facing }, done };
    });
  }

  /** Karşılama sonu: yol üstündeki s'ye uçar ve sleepMs uyur. İnince çözülür. */
  flyHomeAndSleep(s: number, sleepMs: number): Promise<void> {
    if (!this.path) return Promise.resolve();
    return new Promise((done) => {
      this.flyTo(s);
      this.landing = { sleepMs, done };
    });
  }

  /** Şu anki kutudan yol üstündeki s noktasına (ya da verilen kutu noktasına) bezier uçuşu; uçarken dragged, inişte yaylanma. */
  private flyTo(s: number, point?: Point): void {
    const path = this.path!;
    const from = this.currentBox();
    this.landing?.done();
    this.landing = undefined;
    this.s = path.clamp(s);
    const to = point ?? path.pointAt(this.s);
    this.flight = planFlight(from, { x: to.x, y: to.y }, { maxX: path.xMax, maxY: path.yMax });
    this.box = { ...from };
    this.snapStart = this.clock();
    this.lastRun = this.snapStart;
    this.setMode("snap");
  }

  /**
   * Sürüklerken başka monitöre geçildi (SPEC 10 CL5): yeni çalışma alanı setGeometry ile kurulduktan sonra çağrılır;
   * pet imlecin altına (cursor: yeni alana göre mantıksal) gelir, sürükleme yeni alanda sürer.
   */
  dragOnto(cursorX: number, cursorY: number): void {
    const p = this.pointer;
    if (!p?.dragging || !this.path || !this.geo) return;
    this.box = this.path.clampBox(cursorX - this.geo.boxW / 2, cursorY - this.geo.boxH / 2);
    p.rebase = true;
    this.push(true);
  }

  /** Karşılama planı için yol ölçüleri (SPEC 10 CL4). */
  welcomeArea(): { xMax: number; yMax: number; bottomStart: number; bottomEnd: number } | null {
    const p = this.path;
    return p ? { xMax: p.xMax, yMax: p.yMax, bottomStart: p.bottomStart, bottomEnd: p.bottomEnd } : null;
  }

  private startChute(c: Chute): void {
    const path = this.path!;
    this.landing?.done();
    this.landing = undefined;
    this.flight = undefined;
    this.chute = c;
    this.s = path.project(c.to.x, c.to.y);
    this.snapStart = this.clock();
    this.lastRun = this.snapStart;
    this.setMode("snap");
  }

  private endChute(): void {
    this.chute = undefined;
    if (this.chuteShown) {
      this.chuteShown = false;
      this.deps.onChute?.(false);
    }
  }

  /** Uçuş bitti mi (test ve dunno.exe durum için). */
  get flying(): boolean {
    return this.mode === "snap";
  }

  /**
   * Test modu "kenara gönder" (SPEC 07 FB2): kutu doğrudan hedefe (yol dışı da olabilir: üst kenar), poz ve yön verildiği gibi.
   * Pet orada kalır; sürüklemek, çağırmak, kenara göndermek ya da unpin() serbest bırakır.
   */
  pinAt(x: number, y: number, state: PetState, facing: Facing): void {
    if (!this.path || this.mode === "drag" || this.mode === "snap") return;
    this.box = this.path.clampBox(x, y);
    this.s = this.path.project(this.box.x, this.box.y);
    this.mode = "pin";
    this.deps.player.setState(state, playOptions(state));
    this.deps.player.setFacing(facing);
    this.push(true);
  }

  /** Test modu "kenara gönder: <hedef>": yol geometrisinden yer, poz ve yön (devmode/edges.ts), sonra pinAt. */
  pinEdge(target: EdgeTarget): void {
    if (!this.path) return;
    const p = edgePlacement(target, this.path);
    this.pinAt(p.x, p.y, p.state, p.facing);
  }

  /** Test modu kapanınca: pin'deyse en yakın yol noktasına oturur. */
  unpin(): void {
    if (this.mode !== "pin" || !this.path) return;
    this.mode = "rest"; // flyTo kutuyu pin konumundan alır
    const from = { ...this.box };
    this.flyTo(this.path.project(from.x, from.y));
    this.flight = planFlight(from, this.flight!.to, { maxX: this.path.xMax, maxY: this.path.yMax });
    this.box = from;
  }

  /** Dışarıdan sürekli poz (talk, sulk...); null ile serbest bırakır. Sürüklenirken yok sayılır. */
  pose(state: PetState | null): void {
    if (this.mode === "drag" || this.mode === "snap" || this.mode === "pin") return;
    if (!state) {
      if (this.mode === "pose") this.rest(this.between(2_000, 5_000));
      return;
    }
    this.mode = "pose";
    this.show(state, playOptions(state));
  }

  /**
   * SPEC 17: tepkiyi uygun ana bırakır: pet serbestse hemen, konuşuyor/tutuluyorsa ya da uçuyorsa dinlenmeye geçince.
   * Yeni tepki eskisinin yerine geçer (birikmez).
   */
  queueReact(state: PetState): void {
    if (!this.held && (this.mode === "rest" || this.mode === "walk")) this.react(state);
    else this.pendingReact = state;
  }

  /** Dışarıdan tek seferlik tepki (ör. tıklamaya shrug). */
  react(state: PetState): void {
    if (this.mode === "drag" || this.mode === "snap" || this.mode === "pin") return;
    this.show(
      state,
      playOptions(state, () => {
        this.deps.onAnimEnd?.(state);
        this.rest(this.between(2_000, 5_000));
      }),
    );
    this.mode = "shrug";
  }

  tick(): void {
    const now = this.clock();
    const dt = Math.min(MAX_DT_MS, this.lastTick ? now - this.lastTick : 0);
    this.lastTick = now;
    const path = this.path;
    if (!path) return;

    switch (this.mode) {
      case "rest":
        if (this.pendingReact && !this.held) {
          const r = this.pendingReact;
          this.pendingReact = null;
          this.react(r);
          break;
        }
        // iniş yaylanması sırasında (CL2) her kare gönderilir, bitince bir kez daha (yerine otursun)
        if (now - this.landedAt <= BOUNCE_MS + 2 * MOVE_INTERVAL_MS) this.push(true);
        if (!this.held && !this.cursor.over && now >= this.until) this.decide();
        break;
      case "walk":
        if (this.cursor.over) {
          this.rest(2_000); // tıklanabilsin diye durur
          break;
        }
        this.step(WALK_SPEED * this.speed, dt);
        break;
      case "run":
        this.step(RUN_SPEED * this.speed, dt);
        break;
      case "sleep":
        if (now >= this.until) this.rest(this.between(2_000, 5_000));
        break;
      case "snap": {
        if (this.chute) {
          const c = this.chute;
          const t = (now - this.snapStart) / c.ms;
          this.box = chuteAt(c, t, { maxX: path.xMax, maxY: path.yMax });
          const open = chuteOpen(t);
          if (open !== this.chuteShown) {
            this.chuteShown = open;
            this.deps.onChute?.(open);
          }
          if (now - this.lastSentAt >= CHUTE_MOVE_MS) this.push(true);
          if (t >= 1) {
            this.endChute();
            this.push(true);
            this.landedAt = now;
            this.rest(this.between(2_000, 5_000));
            this.deps.onSettle?.();
          }
          break;
        }
        const f = this.flight;
        const t = f ? (now - this.snapStart) / f.ms : 1;
        this.box = f ? flightAt(f, t) : path.pointAt(this.s);
        // uçuş kısa ve kullanıcı başlatır: sürükleme gibi 80 ms sınırından muaf (akıcı yay); bitince yine sınırlı
        this.push(true);
        if (t >= 1) {
          this.flight = undefined;
          const landing = this.landing;
          this.landing = undefined;
          if (landing?.pin) {
            this.mode = "pin";
            this.deps.player.setState(landing.pin.pose, playOptions(landing.pin.pose));
            this.deps.player.setFacing(landing.pin.facing);
          } else {
            this.landedAt = now;
            if (landing?.sleepMs !== undefined) {
              this.until = now + landing.sleepMs;
              this.setMode("sleep");
            } else this.rest(this.between(2_000, 5_000));
          }
          landing?.done();
          this.deps.onSettle?.();
        }
        break;
      }
      case "shrug":
        // zıplama sırasında pencere havalanır (her kare)
        if (now - this.hopStart <= HOP_MS + MOVE_INTERVAL_MS) this.push(true);
        break;
      case "drag":
      case "pose":
      case "pin":
        break;
    }
    this.push(false);
  }

  private step(speed: number, dt: number): void {
    const prev = this.s;
    const r = stepToward(this.s, this.target, speed, dt);
    this.s = r.s;
    this.setFacing(facingFor(r.s - prev, this.facing));
    if (r.arrived) this.rest(this.between(...REST_MS));
  }

  private decide(): void {
    if (!this.path) return;
    const picked = pickNext(this.path, this.s, this.rng);
    const next = this.deps.frozen && picked.kind === "walk" ? { kind: "idle" as const, ms: 8_000 } : picked;
    switch (next.kind) {
      case "walk":
        this.target = next.target;
        this.moon = this.path.pointAt(this.s).edge === "bottom" && this.deps.moonwalk?.() === true;
        this.setFacing(facingFor(next.target - this.s, this.facing));
        this.setMode("walk");
        break;
      case "idle":
        this.rest(next.ms);
        break;
      case "shrug":
        this.react(this.deps.fidget?.() ?? "shrug");
        break;
      case "sleep": {
        // SPEC 17: uyumadan önce esner
        const ms = next.ms;
        this.show(
          "yawn",
          playOptions("yawn", () => {
            if (this.mode !== "shrug") return;
            this.until = this.clock() + ms;
            this.setMode("sleep");
          }),
        );
        this.mode = "shrug";
        break;
      }
    }
  }

  private rest(ms: number): void {
    const r = this.deps.restScale;
    this.until = this.clock() + ms * (typeof r === "function" ? r() : (r ?? 1));
    this.setMode("rest");
  }

  private setMode(mode: Mode): void {
    this.mode = mode;
    if (mode === "run") this.setFacing(facingFor(this.target - this.s, this.facing));
    const anim = this.animFor(mode);
    if (anim) this.show(anim, playOptions(anim));
  }

  /** Animasyon + kenara göre yön (UP7): peek duvarı ekran kenarında, sleep kenara sırtını verir, simetrik pozlar aynalanmaz. */
  private show(anim: PetState, opts: ReturnType<typeof playOptions>): void {
    if (anim === "peek" && this.shown !== "peek") this.deps.onPeek?.();
    if (SFX.has(anim)) this.deps.onAnim?.(anim);
    if (anim === "jump") this.hopStart = this.clock();
    this.shown = anim;
    this.deps.player.setState(anim, opts);
    const edge = this.mode === "drag" || this.mode === "snap" || !this.path ? "bottom" : this.path.pointAt(this.s).edge;
    const f = facingForEdge(anim, edge, this.facing);
    // hareket yönü hafızası sadece yürürken/koşarken güncellenir; duruş pozları sadece görüntüyü çevirir
    if (anim === "walk" || anim === "run_away") this.setFacing(f);
    else this.deps.player.setFacing(f);
  }

  private animFor(mode: Mode): PetState | undefined {
    switch (mode) {
      case "rest":
        // yan kenarda durup bakar (peek), alt kenarda idle; yön show() içinde kenardan
        return this.path ? restStateFor(this.path.pointAt(this.s).edge) : "idle";
      case "walk":
        return "walk";
      case "run":
        return "run_away";
      case "sleep":
        return "sleep";
      case "drag":
      case "snap":
        return "dragged";
      case "shrug":
      case "pose":
      case "pin":
        return undefined;
    }
  }

  private setFacing(f: Facing): void {
    this.facing = f;
    // geri geri yürüyüş: yön hafızası gerçek yön, görüntü ters (sadece yürürken)
    this.deps.player.setFacing(this.moon && this.mode === "walk" ? (f === "left" ? "right" : "left") : f);
  }

  private currentBox(): Point {
    if (this.mode === "drag" || this.mode === "snap" || this.mode === "pin") return { ...this.box };
    const p = this.path!.pointAt(this.s);
    // SPEC 17 zıplama: alt kenardaysa yukarı (yan kenarda yerinde)
    const hop = p.edge === "bottom" ? hopAt(this.clock() - this.hopStart) * Math.max(1, Math.round(this.speed)) : 0;
    if (hop !== 0) return { x: p.x, y: p.y + hop };
    // iniş yaylanması (CL2): kenara doğru sprite tam sayı pikseli (ölçek = hız çarpanı)
    const k = bounceAt(this.clock() - this.landedAt) * Math.round(this.speed);
    if (k === 0) return { x: p.x, y: p.y };
    const d = towardEdge(p.edge);
    return { x: p.x + d.x * k, y: p.y + d.y * k };
  }

  /** Pencere konumunu Rust'a gönderir; force değilse MOVE_INTERVAL_MS ve MIN_STEP_PX sınırıyla. */
  private push(force: boolean): void {
    if (!this.geo || !this.path) return;
    const now = this.clock();
    if (!force && now - this.lastSentAt < MOVE_INTERVAL_MS) return;
    const b = this.currentBox();
    const pos = this.deps.windowAt?.(b) ?? { x: b.x - this.geo.offsetX, y: b.y - this.geo.offsetY };
    const s = this.sent;
    if (!force && s && Math.abs(pos.x - s.x) < MIN_STEP_PX && Math.abs(pos.y - s.y) < MIN_STEP_PX) return;
    this.sent = pos;
    this.lastSentAt = now;
    this.deps.moveWindow(pos.x, pos.y);
  }

  private between(a: number, b: number): number {
    return a + this.rng() * (b - a);
  }
}
