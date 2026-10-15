import { hasPerk } from "./companion/perks";
import { activePackDirs } from "./packs/packs";
import { applyDarkMode } from "./wardrobe/ui-theme";
import { isDark } from "./settings";
import "@ui-kit/fonts.css";
import "@ui-kit/tokens.css";
import "@ui-kit/kit.css";
import "./styles/app.css";
import "./styles/pet.css";
import sheetJson from "../assets/dunno_sheet.json";
import sheetUrl from "../assets/dunno_sheet.png";
import poolEn from "../assets/pool_en.json";
import poolTr from "../assets/pool_tr.json";
import { DEFAULT_BASE_URL, DunnoApi } from "./api";
import { STRINGS } from "./i18n";
import {
  getDebugFlags,
  getWorkArea,
  moveWindow,
  onCursorState,
  onTyping,
  onWorkAreaChanged,
  setCapture,
  setHitRects,
  setPetMask,
  setInteractive,
  setPetVisible,
  setWindowBox,
  type WorkArea,
} from "./ipc";
import { petRect, type Rect } from "./layout";
import { DEFAULT_SIZE, reseat, scaleMotion, SIZE_LEVELS, sizeScale, windowLayout, type SizeLevel } from "./size/size";
import { PopoverHost } from "./ui/popover";
import { PetController } from "./pet/controller";
import { contextTriggers, getWatchState, onContextChanged, onMediaNow, onMeetingState, setMusicWatch, setTabTitles } from "./ipc-context";
import { initialMusic, stepMusic } from "./music/tracker";
import { emitStatus, onStatusRequest, onUiAction, openAppWindow, setManualMeeting, type AppStatus, type UiAction } from "./ipc-app";
import { onTrayAction, updateTrayState } from "./ipc-tray";
import { DAILY_QUESTIONS, localDay } from "./lines/engine";
import { checkSheet } from "./pet/state";
import { Player } from "./player/player";
import { parseSheet } from "./player/sheet";
import { isMuted, openAppStore, openSettings } from "./settings";
import { createStats, type StatsEvent } from "./stats/stats";
import type { AchEvent, AchievementId } from "./wardrobe/achievements";
import { loadThemeList, loadWardrobeRenderer } from "./wardrobe/assets";
import { applyBubbleStyle, loadMods, modItemsOf, readModDirs } from "./mods/load";
import { chooseWorld, cleanEggs, eggLook, eggTrigger, initialTracker, MONSTER_BUBBLE, MOONWALK_CHANCE, notePoke, setMonster, type EggState } from "./eggs/eggs";
import { eggExtras } from "./eggs/assets";
import { MONSTER_PROFILES } from "./eggs/monster-voice";
import { BUBBLE_COLORS, bubbleOpen, maxWorn, monsterByProgress, personalityFor, voiceOpen, type Tier } from "./pro/entitlements";
import { styleProfiles } from "./pro/voice-styles";
import { licenseActivate, licenseStatus, licenseToken, type LicenseStatus } from "./pro/license";
import { refreshLicense, shouldRefresh } from "./pro/billing";
import { applyPreset, PRESETS } from "./pro/presets";
import { appName, cleanPersonal, consent, forget, PERSONAL_SHARE, personalLine, sanitizeProfile, sliderBehavior, type PersonalState, type Reject, type Template } from "./personal/profile";
import personalTemplates from "../../content/personal/templates.json";
import { isForbidden } from "./talk/classify";
import { applyEvent, cleanWardrobe, registerModItems, select, setWornLimit, takePending, unlockOf, WARDROBE_KEY, wardrobeView, type WardrobeState } from "./wardrobe/wardrobe";
import {
  cleanTestMode,
  initialTestMode,
  onTestModeChange,
  TESTMODE_KEY,
  toggle as toggleTestMode,
  triggerAchievement,
  unlockOverride,
  type TestMode,
} from "./devmode/testmode";
import type { TalkStat } from "./talk/talker";
import { ThinkCueView } from "./ui/thinkcue";
import { applyUiTheme } from "./wardrobe/ui-theme";
import { CHECK_MS as FART_CHECK_MS, cleanFartState, fartCheck, type FartState } from "./talk/fart";

/** osuruk durumu (SPEC 09 K3): günlük sayaç + son an */
declare const __APP_VERSION__: string;
const FART_KEY = "fart";
import { TalkMemory } from "./talk/memory";
import { settingsPatchFor, trayStateOf } from "./talk/tray-map";
import { Talker } from "./talk/talker";
import type { BubbleHost } from "./ui/bubble";
import { runFirstRun, say } from "./ui/firstrun";
import { HitRegions } from "./ui/hit";
import { PetMask } from "./ui/petmask";
import { typeInto } from "./ui/typewriter";
import { playWelcome, WELCOME_SLEEP_MS } from "./pet/welcome";
import { CompanionRuntime } from "./companion/runtime";
import { companionView } from "./companion/view";
import { formOf } from "./companion/evolution";
import { afterCheck, cleanUpdateState, isNewer, shouldCheck, UPDATE_KEY, type UpdateState } from "./update/update";
import { checkUpdate, installUpdate } from "./update/ipc";
import { createTelemetry, httpSender } from "./telemetry";
import { ParachuteView } from "./ui/parachute";
import { VoicePlayer } from "./voice/player";
import { startFrameLoop } from "./pet/frame-rate";
import { parseReminder } from "./reminders/parse";
import { addReminder, cleanReminders, clearReminders, dueReminders, FREE_MAX, PERK_MAX, REMINDERS_KEY, whenLabel } from "./reminders/store";
import { REMINDER_STRINGS } from "./reminders/strings";

/** FB6: sayaç izni bu kadar aktif günden sonra bir kez sorulur */
const TELEMETRY_ASK_DAYS = 7;
import { planBabble, PROFILES, shouldSpeak, VARIANTS, VOICE_CATEGORIES, volumeGain, type VoiceCategory } from "./voice/voice";

const canvas = document.querySelector<HTMLCanvasElement>("#pet")!;
const stage = document.querySelector<HTMLElement>("#stage")!;
// pet kutusu (ilk hit rect) yakınlık/hover; tıklama = karenin dolu pikselleri (SPEC 08 SZ1c). Yer değişince ikisi birlikte gider.
let petMask: PetMask | undefined;
const hit = new HitRegions(canvas, (rects) => {
  void setHitRects(rects);
  petMask?.refresh();
});

async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

/** pet boyutu ayarı (SPEC 08); ayar yüklenince ve değişince güncellenir */
let petSize: SizeLevel = DEFAULT_SIZE;

/** Canvas'ı boyutlar, yerleştirir ve hit rect'leri çizilen kutulardan günceller. Pet kutusunu döner. */
function layout(player: Player): Rect {
  const dpr = window.devicePixelRatio || 1;
  const size = player.resize(sizeScale(petSize), dpr);
  const r = petRect(window.innerWidth, window.innerHeight, size.w, size.h);
  canvas.style.left = `${r.x}px`;
  canvas.style.top = `${r.y}px`;
  canvas.style.width = `${size.w}px`;
  canvas.style.height = `${size.h}px`;
  hit.refresh();
  return r;
}

// Pencere başka DPI'lı ekrana geçince resize gelmeyebilir; ölçeği yeniden hesapla.
function watchDpr(onChange: () => void): void {
  const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  mq.addEventListener(
    "change",
    () => {
      onChange();
      watchDpr(onChange);
    },
    { once: true },
  );
}

// Sadece dev build: alt + sağ tık kendiliğinden laf, shift + sağ tık yön değiştir (düz sağ tık herkeste dunno.exe'yi açar).
function installDebug(player: Player, talker: () => Talker | undefined): void {
  canvas.addEventListener("contextmenu", (e) => {
    if (e.shiftKey) player.setFacing(player.getFacing() === "right" ? "left" : "right");
    else if (e.altKey) void talker()?.chatter();
  });
}

async function start(): Promise<void> {
  const store = await openAppStore();
  const settings = await openSettings(store);
  document.documentElement.lang = settings.get().lang;
  settings.onChange((s) => (document.documentElement.lang = s.lang));


  const sheet = parseSheet(sheetJson);
  if (import.meta.env.DEV) {
    for (const p of checkSheet(sheet)) console.warn(`[sheet] ${p}`);
  }
  const baseImage = await loadImage(sheetUrl);
  const player = new Player(canvas, sheet, baseImage);
  petMask = new PetMask(canvas, sheet.frames, () => petSize, (rects) => void setPetMask(rects));
  player.setOnDraw((index, facing, image) => petMask?.drawn(image, index, facing));
  // Free / Pro (SPEC 15): lisans Rust'ta doğrulanır (çevrimdışı); test modunda Pro simülasyonu. Katman açılışta modları ve yer sayısını belirler.
  let license: LicenseStatus = await licenseStatus();
  let testMode: TestMode = cleanTestMode(await store.get(TESTMODE_KEY).catch(() => undefined));
  const tier = (): Tier => (license.pro || (testMode.on && testMode.proSim === true) ? "pro" : "free");
  setWornLimit(maxWorn(tier()));
  // Kişisel Dunno (SPEC 16): Pro + açık rıza, varsayılan kapalı, sadece store'da (ağ/LLM/telemetri yok). Profil sadece bilerek yazılanlar.
  const PERSONAL_KEY = "personal";
  let personal: PersonalState = cleanPersonal(await store.get(PERSONAL_KEY).catch(() => undefined), isForbidden);
  let personalRejected: Partial<Record<string, Reject>> = {};
  const personalActive = () => tier() === "pro" && personal.on;
  const savePersonal = () => void store.set(PERSONAL_KEY, personal).then(() => store.save());
  /** davranış: kişisel kaydırıcılar (açıksa) > kişilik ön ayarı (Pro) > dengeli */
  const behavior = () => (personalActive() ? sliderBehavior(personal.profile) : personalityFor(tier(), settings.get().personality));
  // veri modları (SPEC 12 B): açılışta okunur + doğrulanır; sadece ayarda açık olanlar uygulanır (değişiklik yeniden başlatınca)
  // SPEC 18: hak sahibi olunan paketler (kozmetik: lisans packs, premium dünya: Pro)
  const mods = loadMods(await readModDirs(), [...sheet.tags.keys()], loadThemeList(), settings.get().mods, tier(), activePackDirs(tier(), license.packs ?? [], settings.get().mods));
  if (import.meta.env.DEV) for (const r of mods.results) for (const e of r.errors) console.warn(`[mods] ${r.dir}: ${e}`);
  const modsActive = mods.active.map((m) => m.manifest.id);
  // gizli dünyalar (SPEC 14): sadece cihazda; sayaç + açılanlar store'da, telemetri yok
  const EGGS_KEY = "eggs";
  let eggs: EggState = cleanEggs(await store.get(EGGS_KEY).catch(() => undefined));
  let pokeTracker = initialTracker();
  const saveEggs = () => void store.set(EGGS_KEY, eggs).then(() => store.save());
  const eggX = eggExtras([...sheet.tags.keys()]);
  // dolap kaydı: etkin modlar + glitch dünyası açıldıysa gizli yaratık
  const registerItems = () => {
    const m = modItemsOf(mods.merged);
    const hidden = eggs.worlds.includes("glitch") ? [{ id: "egg_glitch", blocks: [] }] : [];
    registerModItems({ ...m, costumes: [...(m.costumes ?? []), ...hidden] });
  };
  registerItems();
  // tema + aksesuar çizimi (SPEC 05 W1/W2): pet ve dunno.exe önizlemesi aynı renderer (+ mod ve gizli parçalar)
  const wardrobeRenderer = await loadWardrobeRenderer(sheet, baseImage, {
    themes: [...mods.merged.themes, ...eggX.themes],
    accessories: mods.merged.accessories,
    costumes: [...mods.merged.costumes, ...eggX.costumes],
  });
  let talker: Talker | undefined;
  const debug = await getDebugFlags();
  /** peek başlangıcı -> edge başarımı (achieve aşağıda tanımlanınca bağlanır) */
  let onPeek: (() => void) | undefined;
  let parachute: ParachuteView | undefined;
  /** SPEC 17 animasyon sesleri (ses hazır olunca bağlanır) */
  let playSfx: ((state: string) => void) | undefined;
  /** SPEC 17 companion (memory, ilişki, level, evrim); aşağıda store hazır olunca yüklenir */
  let companion: CompanionRuntime | undefined;
  /** açılır yüzey yöneticisi (aşağıda kurulur; controller'dan önce lazım) */
  let popRef: PopoverHost | undefined;
  const pet = new PetController({
    frozen: debug.freezeMovement,
    // mod davranışı x kişilik (Pro; Free'de dengeli)
    restScale: () => (mods.merged.behavior?.restScale ?? 1) * behavior().restScale * (companion?.behavior().restScale ?? 1),
    // glitch dünyası: ara sıra geri geri yürür
    moonwalk: () => eggs.world === "glitch" && !eggs.monster && Math.random() < MOONWALK_CHANCE,
    player,
    moveWindow: (x, y) => void moveWindow(x, y),
    setCapture: (on) => void setCapture(on),
    onClick: () => talker?.onClick(),
    onDragEnd: () => talker?.onDragEnd(),
    onPeek: () => onPeek?.(),
    // havadan bırakınca mini paraşüt (Plan v2 CL2 ek)
    onChute: (open) => parachute?.set(open),
    // SPEC 17 eğlenceli animasyonlar: dinlenirken ara sıra (gece/enerji düşükken esneme, nadiren hapşırma, kaos+dans perk'iyle dans)
    fidget: () => {
      const r = Math.random();
      const c = companion?.state;
      const level = c?.progress.level ?? 1;
      const night = new Date().getHours() >= 23 || new Date().getHours() < 6;
      if ((night || (c?.rel.energy ?? 70) < 35) && r < 0.5) return "yawn";
      if (r < 0.12) return "sneeze";
      if (hasPerk(level, "dance") && (c?.rel.chaos ?? 0) >= 60 && r < 0.3) return "dance";
      return r < 0.2 ? "yawn" : "shrug";
    },
    onAnim: (a) => playSfx?.(a),
    onAnimEnd: (a) => {
      // ardından bazen bir laf (hapşırma, esneme, dans)
      if ((a === "sneeze" || a === "yawn" || a === "dance") && Math.random() < 0.5) void talker?.sayEgg(`interaction:${a}`);
    },
    // FB5: balon açıkken uçuş/iniş: pencere balonlu yerleşime göre taşınır, inince balon yeniden yerleşir
    windowAt: (b) => popRef?.windowAt(b) ?? null,
    onSettle: () => popRef?.replaceAll(),
  });

  let workArea: WorkArea | null = await getWorkArea();
  let box = petRect(window.innerWidth, window.innerHeight, 0, 0);
  // açılır yüzeyler UP1 motoruyla: pencere geçici büyür, kapanınca taban boyuta döner
  const popovers = new PopoverHost({
    pet: canvas,
    petBox: () => pet.petBox(),
    workArea: () => workArea,
    setWindowBox: (b) => setWindowBox(b.x, b.y, b.w, b.h),
    restore: () => {
      const b = pet.petBox();
      const base = windowLayout(petSize, window.devicePixelRatio || 1).logical;
      const off = petRect(base.w, base.h, b.w, b.h);
      void setWindowBox(b.x - off.x, b.y - off.y, base.w, base.h).then(relayout);
    },
    refreshHit: () => hit.refresh(),
    petInset: () => petMask?.visibleInset() ?? null,
  });
  popRef = popovers;
  const host: BubbleHost = {
    stage,
    hit,
    petBox: () => box,
    visibleX: () => pet.visibleX(stage.clientWidth),
    place: (el) => popovers.place(el),
    release: (el) => popovers.release(el),
  };
  function relayout(): void {
    if (popovers.busy) return; // pencere geçici büyük: pet yerleşimi popover'da
    const r = layout(player);
    box = r;
    if (workArea) pet.setGeometry({ workArea, boxW: r.w, boxH: r.h, offsetX: r.x, offsetY: r.y });
  }
  relayout();
  window.addEventListener("resize", relayout);
  // pet boyutu (SPEC 08): anında, yeniden başlatmadan. size.reseat: yeni kutu aynı kenara yapışık, kenar boyunca merkez korunur,
  // çalışma alanından taşmaz; pencere = kutu - windowLayout().pet; yeni pencere gelince relayout kenar yolunu kurar.
  // Açılır yüzey açıkken pencereye dokunulmaz, kapanınca restore yeni boyutu kullanır.
  let thinkCue: ThinkCueView | undefined;
  const applySize = (next: SizeLevel) => {
    const from = pet.petBox();
    const edge = pet.edge();
    petSize = next;
    pet.setSpeedFactor(scaleMotion(1, next));
    thinkCue?.setScale(sizeScale(next));
    parachute?.setScale(sizeScale(next));
    if (popovers.busy || !workArea) return;
    const lay = windowLayout(next, window.devicePixelRatio || 1);
    const at = reseat(from, edge, { w: lay.pet.w, h: lay.pet.h }, workArea, lay.pet.y);
    void setWindowBox(at.x - lay.pet.x, at.y - lay.pet.y, lay.logical.w, lay.logical.h).then(relayout);
  };
  if (settings.get().size !== petSize) applySize(settings.get().size);
  settings.onChange((s) => {
    if (s.size !== petSize) applySize(s.size);
  });
  watchDpr(relayout);
  // çalışma alanı değişti: görev çubuğu, çözünürlük ya da etkin monitör (SPEC 10 CL5: sürüklerken monitör değişti / çıkarıldı)
  void onWorkAreaChanged((wa) => {
    workArea = wa;
    relayout();
    if (wa.cursor) pet.dragOnto(wa.cursor.x, wa.cursor.y);
  });
  // balon hover (SPEC 07 FB5): pencere imleci bırakınca DOM pointerleave gelmeyebilir, Rust pop bayrağı da beslenir
  void onCursorState((s) => {
    pet.onCursor(s);
    talker?.onCursor(s);
  });
  // FB10-3: yazarken yürümez/kaçmaz; pencere taşıma Windows'un gizlediği imleci her tuşta geri getiriyordu (yanıp sönme)
  void onTyping((on) => pet.hold("typing", on));

  // bağlam ve toplantı (Rust watch.rs); talker hazır olunca son değer uygulanır
  // "sekme adlarına bak" (SPEC 09 K7): Rust ayar gelene kadar başlık okumaz; açılışta ve değişince bildirilir
  let tabTitles = settings.get().tabTitles;
  void setTabTitles(tabTitles).catch(() => undefined);
  settings.onChange((s) => {
    if (s.tabTitles === tabTitles) return;
    tabTitles = s.tabTitles;
    void setTabTitles(tabTitles).catch(() => undefined);
  });
  // FB8 müziğe tepki (isteğe bağlı): Rust sadece özet yollar; tetik gelince ara sıra laf
  let music = settings.get().music;
  void setMusicWatch(music).catch(() => undefined);
  settings.onChange((s) => {
    if (s.music === music) return;
    music = s.music;
    void setMusicWatch(music).catch(() => undefined);
  });
  const musicState = initialMusic(new Date());
  void onMediaNow((m) => {
    const trig = stepMusic(musicState, m, new Date());
    if (trig && music && !siteSilent) void talker?.sayEgg(trig);
  }).catch(() => undefined);
  let context: string[] = [];
  let siteSilent = false;
  let inMeeting = true; // emin değilken sus
  // FB11: toplantı sanılıp saklanmışken dunno.exe'den "çağır / kenara gönder" basıldı: toplantı bitene kadar görünür kalır
  let meetingOverride = false;
  // başarım olayı: gardırop yüklenince bağlanır (ondan önceki olaylar kaybolmaz, sadece sayılmaz)
  let achieve: (ev: AchEvent) => void = () => {};
  let lastIdle: string | null = null;
  await onContextChanged((c) => {
    // 60 dk boşta kalma: eşiğe her girişte bir kez (SPEC 05 idle_hour)
    if (c.idleTrigger === "idle:60" && lastIdle !== "idle:60") {
      achieve({ type: "idle_hour" });
      companion?.emit({ type: "idle_hour" });
    }
    lastIdle = c.idleTrigger;
    context = contextTriggers(c);
    siteSilent = c.siteSilent === true;
    talker?.setContext(context);
    talker?.setSiteSilent(siteSilent);
  });
  await onMeetingState((m) => {
    if (!m.inMeeting) meetingOverride = false;
    inMeeting = m.inMeeting && !meetingOverride;
    talker?.setMeeting(inMeeting);
  });
  const watch = await getWatchState();
  context = contextTriggers(watch.context);
  siteSilent = watch.context?.siteSilent === true;
  inMeeting = watch.inMeeting;

  // FB6: sağ tık dunno.exe'yi açar (Windows 11 tray simgesini gizli taşma menüsüne saklayabiliyor; ilk adımlar buna dayanıyor)
  canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    if (!e.shiftKey && !e.altKey) void openAppWindow().catch(() => undefined);
  });
  canvas.addEventListener("pointerdown", (e) => {
    loop.wake();
    if (e.button !== 0) return;
    canvas.setPointerCapture(e.pointerId);
    pet.pointerDown(e.screenX, e.screenY);
  });
  canvas.addEventListener("pointermove", (e) => {
    loop.wake();
    pet.pointerMove(e.screenX, e.screenY);
  });
  canvas.addEventListener("pointerup", () => pet.pointerUp());
  canvas.addEventListener("pointercancel", () => pet.pointerUp(true));

  // FB6 performans: boşta ~12 fps, hareket varken ekran hızında (pet/frame-rate.ts)
  const loop = startFrameLoop(
    () => {
      pet.tick();
      player.tick();
    },
    () => pet.busy,
  );

  if (import.meta.env.DEV) installDebug(player, () => talker);

  // karşılama: kenardan bakış -> ortaya uçuş -> laf -> köşeye uçup uyku. Toplantıda ya da "bugün sus"ta oynamaz.
  let welcoming = false;
  let welcomeQueued = false;
  /** ses hazır olunca bağlanır (aşağıda speak) */
  let speakNow: ((c: VoiceCategory) => void) | undefined;
  const runWelcome = async () => {
    const area = pet.welcomeArea();
    if (welcoming || !area || inMeeting || isMuted(settings.get(), new Date())) return;
    welcoming = true;
    // FB4-4: karşılama ve sonraki uyku boyunca başka laf/toast yok: pet köşeye inip orada uyusun, hemen başka yere gitmesin
    talker?.setWelcoming(true);
    try {
      await playWelcome(pet, area, STRINGS[settings.get().lang].welcomeLine, {
        say: (text, ms) => say(host, text, ms),
        sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
        voice: () => speakNow?.("greet"),
      });
      await new Promise((r) => setTimeout(r, WELCOME_SLEEP_MS));
    } finally {
      welcoming = false;
      talker?.setWelcoming(false);
    }
  };

  if (!settings.get().firstRunDone) {
    pet.hold("firstrun", true);
    await setInteractive(true);
    const s0 = settings.get();
    const choice = await runFirstRun(host, { lang: s0.lang, mode: s0.mode });
    await settings.update({ lang: choice.lang, mode: choice.mode, firstRunDone: true });
    await setInteractive(false);
    const t = STRINGS[choice.lang];
    await say(host, choice.dunno ? t.setupDunnoToast : t.firstRunDone, 3_500, "toast");
    pet.hold("firstrun", false);
    // karşılama (SPEC 10 CL4): sadece ilk açılışta; ses ve konuşmacı hazır olunca (FB4-4: eskiden ses hazır değildi)
    welcomeQueued = true;
  }

  // gardırop + tembel başarımlar (SPEC 05): sadece cihazda, store'da; tek yazan bu pencere
  const themes = [...loadThemeList(), ...mods.merged.themes];
  const allThemes = [...themes, ...eggX.themes];
  // giydir: sprite (tema + aksesuar) ve uygulama geneli tema (SPEC 09 K5: balon, ask.exe, toast token'ları)
  /** açılan başarım sayısı (SPEC 15 ilerleme: balon/ses stilleri, canavar anahtarı) */
  const achievementsDone = () => Object.keys(wardrobe.progress.unlocked).length;
  const dress = () => {
    // gizli görünüm önceliği: canavar > dünya > dolap (SPEC 14)
    const look = eggLook(eggs);
    const theme = look.theme ?? wardrobe.theme;
    // SPEC 17: evrim formu kostüm giyilmemişse görünür (giyilen kostüm ve gizli görünüm önde)
    const evo = companion && formOf(companion.state.evo) !== "dunno" ? `evo_${formOf(companion.state.evo)}` : null;
    const evoCostume = evo && eggX.costumes.some((c) => c.costume.id === evo) ? evo : null;
    wardrobeRenderer.apply(player, { theme, accessories: wardrobe.accessories, costume: look.costume ?? wardrobe.costume ?? evoCostume });
    applyUiTheme(document.documentElement, allThemes.find((x) => x.id === theme));
    document.documentElement.dataset.world = eggs.monster ? "monster" : eggs.world;
    if (eggs.monster) {
      document.documentElement.style.setProperty("--bubble-fill", MONSTER_BUBBLE.fill);
      document.documentElement.style.setProperty("--bubble-ink", MONSTER_BUBBLE.ink);
    } else {
      // balon: başarım stili (açıksa) > mod balonu > temanın kâğıdı
      const st = settings.get().bubbleStyle;
      const c = st !== "classic" && bubbleOpen(achievementsDone(), st) ? BUBBLE_COLORS[st] : null;
      if (c) {
        document.documentElement.style.setProperty("--bubble-fill", c.fill);
        document.documentElement.style.setProperty("--bubble-ink", c.ink);
      } else applyBubbleStyle(document.documentElement, mods.merged);
    }
  };
  let wardrobe: WardrobeState = cleanWardrobe(await store.get(WARDROBE_KEY).catch(() => undefined));
  const saveWardrobe = async () => {
    await store.set(WARDROBE_KEY, wardrobe);
    await store.save();
  };
  dress();
  // test modu (SPEC 07 FB2): kilitler yok sayılır, ilerleme silinmez; tek yazan bu pencere
  const unlocks = () => unlockOverride(testMode, themes.map((x) => x.id));
  // isteğe bağlı kullanım istatistiği (SPEC 10 CL6): varsayılan kapalı, her olayda ayar okunur; kapalıyken ağ çağrısı yok
  const telemetry = createTelemetry(() => settings.get().telemetry, httpSender(import.meta.env.VITE_API_BASE ?? DEFAULT_BASE_URL));
  telemetry.track({ event: "app_opened" });
  achieve = (ev: AchEvent) => {
    const r = applyEvent(wardrobe, ev, new Date());
    // SPEC 15 ilerleme: yeterli başarımda canavar anahtarı açılır (gizli hareketi bilmeyen de bulur)
    if (r.unlocked.length && !eggs.monsterFound && monsterByProgress(Object.keys(r.state.progress.unlocked).length)) {
      eggs = { ...eggs, monsterFound: true };
      saveEggs();
    }
    const changed = JSON.stringify(r.state) !== JSON.stringify(wardrobe);
    wardrobe = r.state;
    if (changed) void saveWardrobe();
    if (r.unlocked.length) void deliverUnlocks();
    for (const id of r.unlocked) telemetry.track({ event: "achievement_unlocked", id });
    for (const id of r.unlocked) companion?.emit({ type: "achievement", id });
    if (r.unlocked.length) pet.queueReact("jump");
  };
  const itemName = (id: AchievementId) => {
    const u = unlockOf(id);
    const lang = settings.get().lang;
    if (u.kind === "theme") return themes.find((x) => x.id === u.id)?.name[lang] ?? u.id;
    return (u.kind === "costume" ? STRINGS[lang].costumeNames[u.id] : STRINGS[lang].accessoryNames[u.id]) ?? u.id;
  };
  // açılım bildirimi: bugün sus / toplantı / başka konuşma varken ertelenir, kuyruk store'da kalır
  let delivering = false;
  const deliverUnlocks = async () => {
    if (delivering || !talker) return;
    delivering = true;
    try {
      while (wardrobe.pending.length) {
        const id = wardrobe.pending[0];
        const ok = await talker.announce(STRINGS[settings.get().lang].unlockToast(itemName(id)));
        if (!ok) break;
        wardrobe = takePending(wardrobe).state;
        await saveWardrobe();
      }
    } finally {
      delivering = false;
    }
  };

  // stats.txt: sadece cihazda; tek yazan bu pencere, dunno.exe snapshot'ı durumla alır
  const stats = createStats(store);
  let statsSnap = await stats.snapshot().catch(() => null);
  // gizli dünya sayacı stats.txt toplamından geri kalmaz (eski kurulumda biriken dürtmeler sayılır)
  eggs = cleanEggs(eggs, statsSnap?.total.clicks ?? 0);
  const refreshStats = async () => {
    statsSnap = await stats.snapshot().catch(() => statsSnap);
  };
  const recordStat = (ev: StatsEvent) => void stats.record(ev).then(refreshStats, () => undefined);
  // SPEC 17: companion (sadece cihazda). Laflar talker boşken; evrim görünümü ve dünya hediyesi burada uygulanır.
  companion = await CompanionRuntime.load({
    store,
    world: () => eggs.world,
    lang: () => settings.get().lang,
    say: (x) => (talker ? (x.kind === "toast" ? talker.announce(x.text) : talker.sayText(x.text)) : Promise.resolve(false)),
    appName: (lang, tag) => appName(lang, tag),
    onEffects: (effects) => {
      if (effects.some((e) => e.kind === "evolved")) dress();
      // yetenek ağacı: zıpırlık / zafer turu
      if (effects.some((e) => e.kind === "zoomies")) pet.zoomies();
      // SPEC 17: level atlayınca zıplar (dans perk'i varsa dans), selam perk'inde el sallar
      const lv = effects.find((e) => e.kind === "level");
      if (lv && lv.kind === "level") pet.queueReact(hasPerk(lv.level, "dance") ? "dance" : "jump");
      if (effects.some((e) => e.kind === "perk_say" && e.perk === "greeting")) pet.queueReact("wave");
      if (effects.some((e) => e.kind === "world_gift") && !eggs.worlds.includes("paper")) {
        eggs = { ...eggs, worlds: [...eggs.worlds, "paper"] };
        saveEggs();
        registerItems();
        companion?.emit({ type: "world_change", world: "paper", unlocked: true });
      }
    },
  });
  const comp = companion;
  dress();
  // SPEC 17 karanlık mod: pet balonları da koyu (sistem seçeneği Windows tercihini izler)
  const darkQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
  const applyDark = () => applyDarkMode(document.documentElement, isDark(settings.get().darkMode, darkQuery?.matches === true));
  applyDark();
  darkQuery?.addEventListener?.("change", applyDark);
  const onStat = (e: TalkStat) => {
    const app = e.kind === "line" && e.trigger.startsWith("app:") ? e.trigger.slice(4) : null;
    switch (e.kind) {
      case "poke": {
        recordStat({ type: "click" });
        achieve({ type: "click" });
        // SPEC 14: dünya eşikleri + canavar hareketi (sadece cihazda)
        const r = notePoke(eggs, pokeTracker, Date.now());
        eggs = r.state;
        pokeTracker = r.tracker;
        saveEggs();
        comp.emit({ type: "click", total: eggs.pokes });
        if (r.unlocked) comp.emit({ type: "world_change", world: r.unlocked, unlocked: true });
        if (r.unlocked) {
          registerItems();
          const t = STRINGS[settings.get().lang];
          void talker?.announce(t.eggWorldToast(t.eggWorldNames[r.unlocked]));
        }
        if (r.monsterToggled) {
          dress();
          if (eggs.monster) void talker?.sayEgg("egg:monster");
        }
        break;
      }
      case "drag":
        recordStat({ type: "drag" });
        achieve({ type: "drag" });
        comp.emit({ type: "drag" });
        break;
      case "question":
        recordStat({ type: "question" });
        achieve({ type: "question", qtype: e.qtype });
        comp.emit({ type: "question", qtype: e.qtype, tone: e.tone });
        // SPEC 17: selam/görüşürüz -> el sallar, iltifat/sevgi -> zıplar (güven yüksek ve dans perk'i varsa dans)
        if (e.qtype === "greeting" || e.qtype === "bye" || e.qtype === "good_morning") pet.queueReact("wave");
        else if (e.qtype === "compliment" || e.qtype === "love" || e.tone === "kind")
          pet.queueReact(hasPerk(comp.state.progress.level, "dance") && comp.state.rel.trust >= 60 ? "dance" : "jump");
        if (e.source) telemetry.track({ event: "question_asked", source: e.source });
        break;
      case "honest":
      case "too_fast":
        if (e.kind === "honest") recordStat({ type: "honest" });
        achieve({ type: e.kind });
        if (e.kind === "honest") comp.emit({ type: "honest" });
        break;
      case "line":
        recordStat({ type: "line", app });
        achieve({ type: "line", app });
        comp.emit({ type: "line", app });
        break;
      case "limit":
        achieve({ type: "limit_reached" });
        break;
      case "meeting_guard":
        achieve({ type: "meeting_guard" });
        break;
    }
  };

  const memory = await TalkMemory.load(store);
  thinkCue = new ThinkCueView(canvas);
  thinkCue.setScale(sizeScale(petSize));
  parachute = new ParachuteView(canvas);
  parachute.setScale(sizeScale(petSize));
  const cue = thinkCue;
  // Dunno sesi (SPEC 11): ayar + toplantı + bugün sus + sessiz site kontrolü burada; plan kategori + rastgele varyasyon (metin yok)
  const voicePlayer = new VoicePlayer();
  // FB4-4: ilk dokunuş pencerenin herhangi bir yerinde (kurulum balonu dahil) sesi açar
  document.addEventListener("pointerdown", () => voicePlayer.unlock(), { once: true, capture: true });
  /** ses: mod profilleri + başarımla açılan ses stili (açık değilse klasik) */
  const voiceProfiles = () => {
    const base = { ...PROFILES, ...mods.merged.sounds };
    const st = settings.get().voiceStyle;
    return voiceOpen(achievementsDone(), st) ? styleProfiles(st, base) : base;
  };
  const speak = (category: VoiceCategory, force = false) => {
    const s = settings.get();
    const ok = shouldSpeak({ enabled: s.voice, meeting: inMeeting, muted: isMuted(s, new Date()), siteSilent });
    if (!ok && !(force && s.voice && !inMeeting)) return;
    voicePlayer.play(planBabble(category, Math.floor(Math.random() * VARIANTS), eggs.monster ? MONSTER_PROFILES : voiceProfiles()), volumeGain(s.voiceVolume));
  };
  // FB7 hatırlatıcı / alarm: sadece bu cihazda (store), ask.exe'den kurulur, zamanı gelince Dunno söyler (bugün sus'ta da)
  let reminders = cleanReminders(await store.get(REMINDERS_KEY).catch(() => undefined));
  const saveReminders = async () => {
    await store.set(REMINDERS_KEY, reminders);
    await store.save();
    publish(true);
  };
  const reminderMax = () => (tier() === "pro" || hasPerk(companion?.state.progress.level ?? 1, "alarm_plus") ? PERK_MAX : FREE_MAX);
  const reminderCommand = async (text: string): Promise<string | null> => {
    const now = new Date();
    const cmd = parseReminder(text, now);
    if (!cmd) return null;
    const lang = settings.get().lang;
    const rs = REMINDER_STRINGS[lang];
    if (cmd.kind === "no_time") return rs.noTime;
    if (cmd.kind === "list") return rs.list(reminders.map((r) => `${whenLabel(new Date(r.at), now, lang)}${r.label ? ` ${r.label}` : ""}`));
    if (cmd.kind === "clear") {
      const r = clearReminders(reminders, cmd.label);
      reminders = r.list;
      await saveReminders();
      return rs.cleared(r.removed);
    }
    const added = addReminder(reminders, cmd.at, cmd.label, reminderMax(), `rem_${now.getTime().toString(36)}`);
    if (!added.ok) return rs.full(reminderMax());
    reminders = added.list;
    await saveReminders();
    return rs.set(whenLabel(cmd.at, now, lang), cmd.label);
  };
  /** zamanı gelen alarmı söyletir; Dunno meşgulse / toplantıdaysa birkaç saniyede bir yeniden dener (en çok 10 dk) */
  const ringing = new Set<string>();
  const ring = async (text: string, key: string) => {
    if (ringing.has(key)) return;
    ringing.add(key);
    for (let i = 0; i < 200; i++) {
      if (talker && (await talker.alarm(text))) {
        pet.queueReact("jump");
        break;
      }
      await new Promise((r) => setTimeout(r, 3_000));
    }
    ringing.delete(key);
  };
  const bootAt = Date.now();
  const checkReminders = () => {
    const now = new Date();
    const d = dueReminders(reminders, now);
    if (!d.due.length && !d.stale.length) return;
    reminders = d.rest;
    void saveReminders();
    const lang = settings.get().lang;
    for (const r of d.due) {
      const late = Date.parse(r.at) < bootAt - 60_000;
      void ring(late ? REMINDER_STRINGS[lang].missed(r.label, whenLabel(new Date(r.at), now, lang)) : REMINDER_STRINGS[lang].fire(r.label), r.id);
    }
  };
  setInterval(checkReminders, 5_000);
  talker = new Talker({
    reminder: reminderCommand,
    settings,
    memory,
    api: new DunnoApi({ baseUrl: import.meta.env.VITE_API_BASE ?? DEFAULT_BASE_URL, cache: memory.initial.lines }),
    pet,
    host,
    setInteractive,
    setVisible: setPetVisible,
    pools: [poolTr, poolEn, mods.merged.lines],
    chattiness: () => (mods.merged.behavior?.chattiness ?? 1) * behavior().chattiness * comp.behavior().chattiness,
    // SPEC 17 L3: evrim formu LLM üslup ipucu (enum)
    persona: () => comp.form,
    // kişisel laflar: sadece uygulama ETİKETİ (başlık değil) ve bilerek yazılan profil
    personal: () =>
      personalActive()
        ? {
            share: PERSONAL_SHARE,
            line: (lang: "tr" | "en", rng: () => number) =>
              personalLine(personalTemplates as Template[], lang, personal.profile, appName(lang, context.find((x) => x.startsWith("app:"))?.slice(4) ?? null), rng),
          }
        : null,
    tier,
    egg: () => eggTrigger(eggs),
    onStat,
    // pet üstü düşünme işareti (SPEC 07 FB6): talker cueStep ile söyler, burada çizilir
    setCue: (c) => cue.set(c),
    // daktilo balon metni (SPEC 10 CL3)
    typeInto,
    // Dunno sesi (SPEC 11): balon açılınca, daktilodan önce
    voice: (c) => speak(c),
  });
  talker.setContext(context);
  talker.setSiteSilent(siteSilent);
  talker.setMeeting(inMeeting);
  talker.start();
  speakNow = (c) => speak(c, true);
  playSfx = (a) => {
    if ((VOICE_CATEGORIES as readonly string[]).includes(a)) speak(a as VoiceCategory);
  };
  if (welcomeQueued) void runWelcome();
  const t0 = talker;
  achieve({ type: "open" });
  achieve({ type: "mode", mode: settings.get().mode });
  let lastMode = settings.get().mode;
  let lastMuted = isMuted(settings.get(), new Date());
  onPeek = () => {
    achieve({ type: "edge" });
    comp.emit({ type: "edge" });
  };
  comp.emit({ type: "session_start" });
  settings.onChange((s) => {
    if (s.mode !== lastMode) achieve({ type: "mode", mode: s.mode });
    lastMode = s.mode;
    // "bugün sus" açıldı (SPEC 09 K9 quiet_days)
    const muted = isMuted(s, new Date());
    if (muted && !lastMuted) achieve({ type: "mute" });
    lastMuted = muted;
  });
  // güncelleme (SPEC 10 CL1): günde bir sessiz kontrol (dev'de yok), yeni sürüm başına bir toast; kurulum about.txt'ten
  let updateState: UpdateState = cleanUpdateState(await store.get(UPDATE_KEY).catch(() => undefined));
  let updateView = { available: null as string | null, busy: false, upToDate: false, error: null as string | null };
  const runUpdateCheck = async (manual: boolean) => {
    const today = localDay(new Date());
    if (updateView.busy || (!manual && (import.meta.env.DEV || !shouldCheck(updateState, today)))) return;
    updateView = { ...updateView, busy: true, upToDate: false, error: null };
    publish(true);
    // FB12: Rust tarafı 20 sn'de keser; burada da 30 sn sigorta (düğme "bakıyorum"da kalmasın)
    const res = await Promise.race([
      checkUpdate(),
      new Promise<{ info: null; error: string }>((r) => window.setTimeout(() => r({ info: null, error: "timeout" }), 30_000)),
    ]);
    const found = res.info;
    const r = afterCheck(updateState, today, found?.version ?? null, __APP_VERSION__);
    const available = found && isNewer(found.version, __APP_VERSION__) ? found.version : null;
    // önce dunno.exe: düğme hemen "kur" olur; Dunno'nun lafı beklenmez (meşgulse sonra söyler)
    updateView = { available, busy: false, upToDate: manual && !available && !res.error, error: manual ? res.error : null };
    publish(true);
    // toast gösterilemediyse (meşgul/toplantı) bildirilmemiş sayılır, ertesi kontrolde yine
    const shown = r.notify ? await t0.announce(STRINGS[settings.get().lang].updateToast) : true;
    updateState = shown ? r.state : { ...r.state, notified: updateState.notified };
    void store.set(UPDATE_KEY, updateState).then(() => store.save());
  };
  // gün dönümü (açık gün), ertelenmiş açılım bildirimleri ve günlük güncelleme kontrolü dakikada bir
  setInterval(() => {
    achieve({ type: "open" });
    comp.emit({ type: "heartbeat", idle: lastIdle !== null });
    void comp.flush();
    void deliverUnlocks();
    void runUpdateCheck(false);
  }, 60_000);
  void runUpdateCheck(false);
  void deliverUnlocks();

  // tray + dunno.exe: aynı aksiyon yolu; ayarları sadece bu pencere yazar (Rust ve dunno.exe yazmaz)
  let manualMeeting = false;
  const syncTray = () => void updateTrayState(trayStateOf(settings.get(), new Date(), manualMeeting));
  syncTray();
  settings.onChange(syncTray);
  setInterval(syncTray, 60_000); // "bugün sus" gün dönümünde menüden de kalksın
  /**
   * FB11: kullanıcı açıkça çağırdı. Toplantı koruması saklamışsa (yanlış alarm olabilir) ya da yazma tutması varsa
   * bırak: görünür olsun, sonra hareket et. Elle "toplantıdayım" açıksa o da kapanır.
   */
  const comeBack = (go: () => void) => {
    pet.hold("typing", false);
    if (!inMeeting) {
      go();
      return;
    }
    if (manualMeeting) {
      manualMeeting = false;
      void setManualMeeting(false);
      syncTray();
    }
    meetingOverride = true;
    inMeeting = false;
    talker?.setMeeting(false);
    window.setTimeout(go, 300); // geri gelme (görünür olma, tutmanın kalkması) bitsin
  };
  const handle = (a: UiAction) => {
    switch (a.action) {
      case "meeting":
        // tray'de Rust izleyiciye zaten uyguladı; dunno.exe'den gelince burada uygulanır
        manualMeeting = a.value;
        void setManualMeeting(a.value);
        syncTray();
        return;
      case "summon":
        comeBack(() => pet.summon());
        return;
      case "welcome":
        void runWelcome();
        return;
      case "send_edge":
        comeBack(() => pet.sendToEdge());
        return;
      case "wardrobe": {
        // sadece açık parçalar (select kilidi kontrol eder); anında pet'e uygulanır, kalıcı
        const next = select(wardrobe, { theme: a.theme, accessory: a.accessory, costume: a.costume }, unlocks());
        if (next !== wardrobe) {
          wardrobe = next;
          dress();
          void saveWardrobe();
          comp.emit({ type: "customize" });
          publish(true);
        }
        return;
      }
      case "onboard":
        comp.emit({ type: "onboard", step: a.value });
        return;
      case "reminder_delete":
        reminders = reminders.filter((r) => r.id !== a.id);
        void saveReminders();
        return;
      case "onboard_restart":
        comp.restartFirstSteps();
        publish(true);
        return;
      case "evolve_choose":
        // strateji §14: Pro evrim yolunu seçer (Free otomatik)
        if (tier() === "pro" && comp.choose(a.form)) publish(true);
        return;
      case "update_check":
        void runUpdateCheck(true);
        return;
      case "update_install":
        updateView = { ...updateView, busy: true };
        publish(true);
        // başarılıysa uygulama yeniden başlar; değilse durum geri gelir
        void installUpdate().then((err) => {
          if (err !== null) {
            updateView = { ...updateView, busy: false, error: err };
            publish(true);
          }
        });
        return;
      case "stats_reset":
        void stats.reset().then(refreshStats).then(() => publish(true));
        return;
      case "fart":
        void settings.update({ fart: a.value });
        return;
      case "music":
        void settings.update({ music: a.value });
        return;
      case "tab_titles":
        void settings.update({ tabTitles: a.value });
        return;
      case "telemetry":
        void settings.update({ telemetry: a.value });
        return;
      case "telemetry_answer":
        void settings.update({ telemetry: a.value, telemetryAsked: true }).then(() => publish(true));
        return;
      case "voice":
        void settings.update({ voice: a.value });
        if (a.value) speak("greet");
        return;
      case "egg_world":
        eggs = chooseWorld(eggs, a.value);
        saveEggs();
        dress();
        publish(true);
        return;
      case "monster":
        eggs = setMonster(eggs, a.value);
        saveEggs();
        dress();
        publish(true);
        return;
      case "mod":
        void settings.update({ mods: { ...settings.get().mods, [a.id]: a.on } });
        return;
      case "personality":
        void settings.update({ personality: a.value });
        return;
      case "bubble_style":
        void settings.update({ bubbleStyle: a.value }).then(() => dress());
        return;
      case "voice_style":
        void settings.update({ voiceStyle: a.value }).then(() => speak("greet", true));
        return;
      case "personal_on":
        if (tier() === "pro" && !personal.on) {
          personal = consent(new Date());
          personalRejected = {};
          savePersonal();
        }
        publish(true);
        return;
      case "personal_off":
        // kapat = sil: profil store'da kalmaz
        personal = forget();
        personalRejected = {};
        savePersonal();
        publish(true);
        return;
      case "personal_save":
        if (personal.on) {
          const r = sanitizeProfile(a.profile, isForbidden);
          personal = { ...personal, profile: r.profile };
          personalRejected = r.rejected;
          savePersonal();
        }
        publish(true);
        return;
      case "preset": {
        const p = PRESETS.find((x) => x.id === a.id);
        const next = p ? applyPreset(wardrobe, p, unlocks()) : wardrobe;
        if (next !== wardrobe) {
          wardrobe = next;
          void saveWardrobe();
          dress();
        }
        publish(true);
        return;
      }
      case "license_changed":
        void licenseStatus().then((l) => {
          license = l;
          applyTier();
        });
        return;
      case "voice_volume":
        void settings.update({ voiceVolume: a.value });
        speak("greet", true); // deneme: yeni düzeyde kısa bir ses
        return;
      case "pet_size":
        void settings.update({ size: a.value });
        return;
      case "dark_mode":
        void settings.update({ darkMode: a.value }).then(() => {
          applyDark();
          publish(true);
        });
        return;
      case "bubble_speed":
        void settings.update({ bubbleSpeed: a.value });
        return;
      case "test":
        void handleTest(a);
        return;
      case "quit":
        return; // Rust kapatır
      default: {
        const patch = settingsPatchFor(a, new Date());
        if (patch) void settings.update(patch);
      }
    }
  };
  // test modu aksiyonları (talker: setTestMode tempo için, resetQuota hak için)
  t0.setTestMode(testMode);
  // Pro değişince (lisans / test simülasyonu): havuz süzülür, yer sınırı güncellenir (fazla aksesuar en eskiden çıkar). Modlar yeniden başlatınca.
  let lastTier = tier();
  const applyTier = () => {
    const t = tier();
    if (t !== lastTier) {
      lastTier = t;
      setWornLimit(maxWorn(t));
      if (wardrobe.accessories.length > maxWorn(t)) {
        wardrobe = { ...wardrobe, accessories: wardrobe.accessories.slice(-maxWorn(t)) };
        void saveWardrobe();
        dress();
      }
      t0.refreshTier();
    }
    publish(true);
  };
  // abonelik lisansı: bitişe 10 gün kala ya da geçtiyse sunucudan aynı kimlikte yenisi istenir (açılışta + 12 saatte bir).
  // Ağ yoksa / abonelik bittiyse sessizce kalır (süresi geçen lisans Pro vermez).
  const maybeRefreshLicense = async () => {
    if (!shouldRefresh(license.until, new Date().toISOString().slice(0, 10))) return;
    const token = await licenseToken();
    if (!token) return;
    const r = await refreshLicense(token);
    if (!r.ok) return;
    const next = await licenseActivate(r.license);
    if (!next.error) {
      license = next;
      applyTier();
    }
  };
  void maybeRefreshLicense();
  setInterval(() => void maybeRefreshLicense(), 12 * 3_600_000);
  const setTestMode = async (next: TestMode) => {
    const wasOn = testMode.on;
    testMode = next;
    t0.setTestMode(testMode);
    if (wasOn && !testMode.on) {
      // kapanınca: test modunda giyilen kilitli parça açık olana döner, pet kenardan serbest kalır
      const settled = onTestModeChange(wardrobe, testMode);
      if (settled !== wardrobe) {
        wardrobe = settled;
        dress();
        await saveWardrobe();
      }
      pet.unpin();
    }
    await store.set(TESTMODE_KEY, testMode);
    await store.save();
    applyTier();
    publish(true);
  };
  const handleTest = async (a: Extract<UiAction, { action: "test" }>) => {
    if (a.op === "toggle") return setTestMode(toggleTestMode(testMode));
    if (!testMode.on) return; // diğerleri sadece mod açıkken
    switch (a.op) {
      case "off":
        return setTestMode(initialTestMode());
      case "pro":
        return setTestMode({ ...testMode, proSim: a.on || undefined });
      case "tempo":
        return setTestMode({ ...testMode, tempoOff: !a.on });
      case "reset_quota":
        await t0.resetQuota();
        publish(true);
        return;
      case "trigger": {
        const r = triggerAchievement(wardrobe, a.id, new Date(), testMode);
        if (r.state !== wardrobe) {
          wardrobe = r.state;
          await saveWardrobe();
          void deliverUnlocks();
          publish(true);
        }
        return;
      }
      case "edge":
        pet.pinEdge(a.target);
        return;
      case "fart":
        // test modu (SPEC 09 K3c): kural/sayaç atlanır, gösterim aynı (meşgul / sus / toplantıda yine olmaz)
        void t0.fart();
        return;
      case "anim":
        pet.queueReact(a.anim);
        return;
      case "size_next": {
        // boyutlar arası hızlı geçiş (SPEC 08): 1x -> 2x -> ... -> 5x -> 1x
        // sıradaki durak (0, 25, 50, 75, 100; aradaki değerden bir üst durağa)
        const cur = settings.get().size;
        void settings.update({ size: SIZE_LEVELS.find((x) => x > cur) ?? SIZE_LEVELS[0] });
        return;
      }
    }
  };
  // osurma (SPEC 09 K3): CHECK_MS'de bir saf kural (talk/fart.ts); fire -> animasyon + laf. Durum store'da (günde en fazla 2).
  let fartState: FartState = cleanFartState(await store.get(FART_KEY).catch(() => undefined), new Date());
  setInterval(() => {
    const s = settings.get();
    const now = new Date();
    const r = fartCheck(fartState, { enabled: s.fart, meeting: t0.meetingActive, muted: isMuted(s, now), busy: t0.isBusy }, now, Math.random);
    if (JSON.stringify(r.state) !== JSON.stringify(fartState)) {
      fartState = r.state;
      void store.set(FART_KEY, fartState).then(() => store.save());
    }
    // gösterildiyse başarım olayı (K9a): toplantı/sus/meşgulde talker false döner, sayılmaz
    if (r.fire)
      void t0.fart().then((shown) => {
        if (!shown) return;
        recordStat({ type: "fart" });
        achieve({ type: "fart" });
      });
  }, FART_CHECK_MS);
  await onTrayAction(handle);
  await onUiAction(handle);

  // dunno.exe durumu: değişince (ve istenince) yayınla
  const status = (): AppStatus => {
    const s = settings.get();
    return {
      state: player.state,
      facing: player.getFacing(),
      left: t0.questionsLeft,
      total: DAILY_QUESTIONS,
      mode: s.mode,
      lang: s.lang,
      frequency: s.frequency,
      autostart: s.autostart,
      muted: isMuted(s, new Date()),
      inMeeting: t0.meetingActive,
      manualMeeting,
      stats: statsSnap,
      wardrobe: wardrobeView(wardrobe, new Date(), unlocks()),
      bubbleSpeed: s.bubbleSpeed,
      darkMode: s.darkMode,
      size: s.size,
      fart: s.fart,
      tabTitles: s.tabTitles,
      telemetry: s.telemetry,
      music: s.music,
      // FB6: bir haftadan sonra bir kez, açık sorulur (varsayılan yine kapalı)
      reminders,
      telemetryAsk: !s.telemetry && !s.telemetryAsked && (statsSnap?.activeDays ?? 0) >= TELEMETRY_ASK_DAYS,
      voice: s.voice,
      voiceVolume: s.voiceVolume,
      mods: s.mods,
      modsActive,
      modsBlocked: mods.blocked,
      personal: { on: personal.on, consentAt: personal.consentAt, profile: personal.on ? personal.profile : null, rejected: personalRejected },
      pro: { tier: tier(), enabled: license.enabled, tail: license.tail, sim: testMode.on && testMode.proSim === true, packs: license.packs ?? [], until: license.until ?? null, expired: license.expired === true },
      deviceId: s.deviceId,
      personality: s.personality,
      bubbleStyle: s.bubbleStyle,
      voiceStyle: s.voiceStyle,
      eggs: { worlds: eggs.worlds, world: eggs.world, monster: eggs.monster, monsterFound: eggs.monsterFound },
      testMode,
      update: updateView,
      companion: companionView(comp.state, tier()),
    };
  };
  let lastStatus = "";
  const publish = (force: boolean) => {
    const st = status();
    const key = JSON.stringify(st);
    if (!force && key === lastStatus) return;
    lastStatus = key;
    void emitStatus(st);
  };
  // uyku süresi: sleep animasyonundan çıkınca kaydedilir
  let sleepSince: number | null = null;
  setInterval(() => {
    const sleeping = player.state === "sleep";
    if (sleeping && sleepSince === null) sleepSince = Date.now();
    if (!sleeping && sleepSince !== null) {
      recordStat({ type: "sleep", ms: Date.now() - sleepSince });
      comp.emit({ type: "sleep", minutes: Math.floor((Date.now() - sleepSince) / 60_000) });
      sleepSince = null;
    }
    publish(false);
  }, 500);
  await onStatusRequest(() => publish(true));
}

void start();
