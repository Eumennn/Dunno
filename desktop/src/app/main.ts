// dunno.exe ana penceresi. Ayar/sayaç yazmaz: istekleri pet penceresine gönderir, durumu oradan alır.
// Tauri dışında (headless önizleme, ui-shots) örnek durumla çalışır; ?tab=settings ile sekme seçilir.
import { demoApi } from "../workshop/demo";
import { WorkshopController } from "./workshop-controller";
import { PACKS, packDir } from "../packs/packs";
import { applyDarkMode } from "../wardrobe/ui-theme";
import { isDark, type DarkMode } from "../settings";
import "@ui-kit/fonts.css";
import "@ui-kit/tokens.css";
import "@ui-kit/kit.css";
import "./app.css";
import sheetJson from "../../assets/dunno_sheet.json";
import sheetUrl from "../../assets/dunno_sheet.png";
import { claimLicense } from "../pro/billing";
import { dedupeFrames, encodeGif, type GifFrame } from "../share/gif";
import { GIF_STRINGS } from "../share/strings";
import { isMac, STRINGS, type UiStrings } from "../i18n";
import { invoke } from "@tauri-apps/api/core";
import { isNewer } from "../update/update";
import { mergeMods, validateMods, type ModResult } from "../mods/mods";
import { applyBubbleStyle, builtinIds, modItemsOf, modNames, readModDirs } from "../mods/load";
import { cleanEggs, eggLook, MONSTER_BUBBLE } from "../eggs/eggs";
import { maxWorn, type BubbleStyleId, type Personality, type VoiceStyleId } from "../pro/entitlements";
import { licenseActivate, licenseRemove } from "../pro/license";
import { PRESETS } from "../pro/presets";
import { eggCostumeIconUrl, eggExtras } from "../eggs/assets";
import {
  onStatus,
  requestStatus,
  sendUiAction,
  setAutostart,
  windowDrag,
  windowHide,
  windowMinimize,
  windowToggleMaximize,
  type AppStatus,
  type UiAction,
} from "../ipc-app";
import { isPetState, playOptions } from "../pet/state";
import { Player } from "../player/player";
import { parseSheet } from "../player/sheet";
import { frameHtml, setMacAx, SET_CATS, tabBodyHtml, tabLabel, TABS, type ModRow, type PersonalForm, type SetCat, type Tab } from "./view";
import { emptyProfile, LISTS, SLIDERS, type ListId, type SliderId } from "../personal/profile";
import { petScaleFor } from "./scale";
import { zoomFor } from "./zoom";
import { applyUiTheme } from "../wardrobe/ui-theme";
import type { Theme } from "../wardrobe/themes";
import { facingForEdge } from "../pet/facing";
import { accessoryImageUrl, costumeIconUrl, loadThemeList, loadWardrobeRenderer } from "../wardrobe/assets";
import type { WardrobeRenderer } from "../wardrobe/render";
import { ACHIEVEMENTS } from "../wardrobe/achievements";
import { applyEvent, cleanWardrobe, initialWardrobe, registerModItems, select, setWornLimit, wardrobeView } from "../wardrobe/wardrobe";
import { gridMove, PREVIEW_STATES, toggleView, WR_CATS, wardrobeParts, type PreviewState, type WardrobeUi, type WrCat } from "./wardrobe-view";
import { allUnlocks, initialTaps, tap } from "../devmode/testmode";
import { TESTMODE_STRINGS } from "../devmode/strings";
import type { EdgeTarget } from "../devmode/edges";
import type { AchievementId } from "../wardrobe/achievements";
import type { BubbleSpeed } from "../talk/reading";
import type { SizeLevel } from "../size/size";
import { toastHtml } from "@ui-kit/kit";
import { companionView } from "../companion/view";
import { demoCompanion } from "../companion/demo";
import { cardData, drawCard } from "../companion/card";
import { COMPANION_STRINGS } from "../companion/strings";
import { skillTip } from "../companion/skill-tree";
import { lockedTabHtml } from "../companion/app-view";
import { tabLevel, tabOpen } from "./unlocks";
import { WORLDS } from "../eggs/eggs";
import type { VoiceVolume } from "../voice/voice";

const builtinThemes = loadThemeList();
/** sprite etiketleri (mod doğrulama; workshop paketleri kurulmadan önce de doğrulanır) */
const sheetTags = Object.keys((sheetJson as { meta?: { frameTags?: { name: string }[] } }).meta?.frameTags ? Object.fromEntries(((sheetJson as { meta: { frameTags: { name: string }[] } }).meta.frameTags).map((f) => [f.name, 1])) : {});
let themeList = builtinThemes;

// veri modları (SPEC 12 B): bu pencere de okur + doğrular (settings.exe listesi, dolap kutucukları); uygulayan pet penceresi
let modResults: ModResult[] = [];
let modsKey = "";
let eggThemes: readonly Theme[] = [];
const devModsPreview = !("__TAURI_INTERNALS__" in window) && import.meta.env.DEV && new URLSearchParams(location.search).get("mods") === "example";
let modMerged = mergeMods([]);
const modAccIcon = new Map<string, string>();
const modCostumeIcon = new Map<string, string>();

/** pet penceresinin yüklediği modlar (status.modsActive) dolapta görünür. */
function syncMods(): void {
  const key = `${(status.modsActive ?? []).join(",")}|${status.eggs?.worlds.join(",") ?? ""}`;
  if (key === modsKey) return;
  modsKey = key;
  const ids = new Set(status.modsActive ?? []);
  modMerged = mergeMods(modResults.flatMap((r) => (r.mod && ids.has(r.mod.manifest.id) ? [r.mod] : [])));
  const m = modItemsOf(modMerged);
  // SPEC 14: glitch dünyası açıldıysa gizli yaratık dolapta
  const hidden = status.eggs?.worlds.includes("glitch") ? [{ id: "egg_glitch", blocks: [] }] : [];
  registerModItems({ ...m, costumes: [...(m.costumes ?? []), ...hidden] });
  themeList = [...builtinThemes, ...modMerged.themes];
}

/** settings.exe mod satırları (geçerli dilde). */
const modRows = (): ModRow[] =>
  // uygulama paketleri (SPEC 18) workshop.exe > paketler'de; burada sadece kullanıcının kendi modları
  modResults.filter((r) => !PACKS.some((p) => p.id === r.dir)).map((r) => ({
    dir: r.dir,
    errors: r.errors,
    mod: r.mod && {
      id: r.mod.manifest.id,
      name: r.mod.manifest.name[status.lang],
      version: r.mod.manifest.version,
      author: r.mod.manifest.author,
      description: r.mod.manifest.description?.[status.lang] ?? "",
    },
  }));

// SPEC 15 lisans alanı: yazılan anahtar yeniden çizimde kaybolmasın (sadece bu pencerenin belleğinde; store'a/olaya gitmez)
const proUi: { key: string; msg: string | null; order: string; email: string } = { key: "", msg: null, order: "", email: "" };

// SPEC 16 kişisel dunno formu: düzenlenirken durum yayınları formu ezmesin (dirty); kaydedince pet penceresi süzer ve geri yayınlar
const personalForm: PersonalForm = {
  consent: false,
  name: "",
  lists: Object.fromEntries(LISTS.map((l) => [l, ""])) as Record<ListId, string>,
  sliders: { ...emptyProfile().sliders },
  dirty: false,
  msg: null,
};
function syncPersonalForm(): void {
  const p = status.personal?.profile;
  if (personalForm.dirty || !p) return;
  personalForm.name = p.preferred_name;
  for (const l of LISTS) personalForm.lists[l] = p[l].join(", ");
  personalForm.sliders = { ...p.sliders };
}

/** Lisans: anahtar doğrudan Rust komutuna (pet penceresine olayla gitmez); sonra pet yeniden sorar. */
async function proAction(action: "pro_activate" | "pro_remove"): Promise<void> {
  const t = STRINGS[status.lang];
  const r = action === "pro_activate" ? await licenseActivate(proUi.key) : await licenseRemove();
  if (r.error) proUi.msg = t.proErrors[r.error as keyof typeof t.proErrors] ?? t.proErrors.format;
  else {
    proUi.key = "";
    proUi.msg = r.pro ? t.proActivated : null;
  }
  act({ action: "license_changed" });
  render();
}

/** Ödeme -> lisans: sipariş no + e-postayla sunucudan lisans, sonra her zamanki etkinleştirme (Rust doğrular). */
async function proClaim(): Promise<void> {
  const t = STRINGS[status.lang];
  const r = await claimLicense(proUi.order, proUi.email);
  if (!r.ok) {
    proUi.msg = r.status === 404 || r.status === 400 ? t.proClaimFail.notFound : r.status === 429 ? t.proClaimFail.tooMany : r.status === 503 ? t.proClaimFail.closed : t.proClaimFail.offline;
    return render();
  }
  proUi.key = r.license;
  proUi.order = "";
  proUi.email = "";
  await proAction("pro_activate");
}

/** Dil dizeleri + mod parça adları. */
function strings(): UiStrings {
  const t = STRINGS[status.lang];
  if (!modMerged.accessories.length && !modMerged.costumes.length) return { ...t, costumeNames: { ...t.costumeNames, egg_glitch: "glitch" } };
  const n = modNames(modMerged, status.lang);
  return { ...t, accessoryNames: { ...t.accessoryNames, ...n.accessories }, costumeNames: { ...t.costumeNames, ...n.costumes, egg_glitch: "glitch" } };
}

/** önizleme (Tauri dışı) için örnek gardırop: 37 dürtme, gece başlığı açık ve seçili; ?wr=all hepsi açık */
function sampleWardrobe() {
  const d = new Date(2026, 9, 3, 1);
  if (new URLSearchParams(location.search).get("wr") === "all") {
    const unlocked = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, d.toISOString()]));
    return wardrobeView(cleanWardrobe({ progress: { unlocked }, theme: "lavender", accessories: ["party_hat", "sunglasses", "scarf"], costume: "bee" }), d);
  }
  let s = initialWardrobe();
  for (let i = 0; i < 37; i++) s = applyEvent(s, { type: "click" }, d).state;
  s = applyEvent(s, { type: "question" }, d).state;
  // ?testmode=1: kilitler yok sayılır, ilerleme aynı (37 / 100 görünür); kilitli tema + aksesuar giyilmiş
  if (new URLSearchParams(location.search).get("testmode") === "1") {
    const all = allUnlocks(loadThemeList().map((x) => x.id));
    return wardrobeView(select(select(s, { theme: "night", accessory: "crown" }, all), { costume: "fly" }, all), d, all);
  }
  return wardrobeView(select(s, { accessory: "nightcap" }), d);
}

declare const __APP_VERSION__: string;

const inTauri = "__TAURI_INTERNALS__" in window;
const params = new URLSearchParams(location.search);
const root = document.querySelector<HTMLElement>("#app")!;

const PREVIEW: AppStatus = {
  state: "idle",
  facing: "right",
  left: 2,
  total: 3,
  mode: "polite",
  lang: (params.get("lang") as AppStatus["lang"]) ?? "en",
  frequency: "normal",
  autostart: false,
  muted: false,
  inMeeting: false,
  manualMeeting: false,
  stats: {
    day: "2026-10-03",
    today: { questions: 1, clicks: 7, drags: 2, sleepMinutes: 14, lines: 5, topApp: "vscode", apps: [{ app: "vscode", n: 3 }], honest: 1, farts: 0 },
    total: {
      questions: 23,
      clicks: 141,
      drags: 19,
      sleepMinutes: 380,
      lines: 96,
      topApp: "excel",
      apps: [{ app: "excel", n: 31 }, { app: "browser", n: 22 }, { app: "vscode", n: 9 }],
      honest: 7,
      farts: 4,
    },
    week: [
      { day: "2026-09-27", questions: 2, clicks: 10, lines: 6 },
      { day: "2026-09-28", questions: 0, clicks: 0, lines: 0 },
      { day: "2026-09-29", questions: 4, clicks: 22, lines: 9 },
      { day: "2026-09-30", questions: 3, clicks: 5, lines: 12 },
      { day: "2026-10-01", questions: 1, clicks: 30, lines: 8 },
      { day: "2026-10-02", questions: 3, clicks: 12, lines: 10 },
      { day: "2026-10-03", questions: 1, clicks: 7, lines: 5 },
    ],
    since: "2026-09-20",
    activeDays: 11,
  },
  wardrobe: sampleWardrobe(),
  bubbleSpeed: "normal",
  size: 25,
  fart: true,
  tabTitles: true,
  telemetry: false,
  // ?testmode=1: önizlemede test modu bölümü (ui-shots)
  testMode: { on: params.get("testmode") === "1", tempoOff: false },
  // ?update=<sürüm>: önizlemede bulunan güncelleme (ui-shots/about-update-*.png)
  update: { available: params.get("update"), busy: false, upToDate: false },
};

// ?theme=<id>: önizlemede tema (ui-shots/theme-ui-*.png)
const previewTheme = params.get("theme");
if (previewTheme && PREVIEW.wardrobe) PREVIEW.wardrobe = { ...PREVIEW.wardrobe, theme: previewTheme };
// önizleme (SPEC 15): ?pro=on (lisanslı görünüm) | ?pro=key (lisans sistemi açık, anahtar alanı)
const previewPro = params.get("pro");
if (previewPro) PREVIEW.pro = previewPro === "on" ? { tier: "pro", enabled: true, tail: "a1b2c3", sim: false } : { tier: "free", enabled: true, tail: null, sim: false };
// önizleme (SPEC 16): ?personal=off (Pro, rıza bekliyor) | ?personal=on (örnek profil)
const previewPersonal = params.get("personal");
if (previewPersonal) {
  PREVIEW.pro = { tier: "pro", enabled: true, tail: "a1b2c3", sim: false };
  PREVIEW.personal =
    previewPersonal === "on"
      ? {
          on: true,
          consentAt: "2026-10-07T10:00:00.000Z",
          profile: { ...emptyProfile(), preferred_name: "mert", inside_jokes: ["kahve bitti"], recurring_topics: ["sınav haftası"], sliders: { ...emptyProfile().sliders, sweet_teasing: 3 } },
          rejected: { "explicit_preferences.0": "secret" },
        }
      : { on: false, consentAt: null, profile: null, rejected: {} };
}
// önizleme (SPEC 14): ?eggs=paper | glitch | monster gizli görünümü gösterir (gizli bölüm settings.exe'de açık)
const previewEggs = params.get("eggs");
if (previewEggs) {
  PREVIEW.eggs = {
    worlds: ["paper", "glitch"],
    world: previewEggs === "glitch" ? "glitch" : previewEggs === "paper" ? "paper" : "normal",
    monster: previewEggs === "monster",
    monsterFound: true,
  };
}
// önizleme (SPEC 17): ?companion=<form> pet.txt örnek durumu (?pro=on ile Pro görünümü)
const previewCompanion = params.get("companion");
if (previewCompanion) PREVIEW.companion = companionView(demoCompanion(previewCompanion), PREVIEW.pro?.tier ?? "free");
let status: AppStatus = PREVIEW;
/**
 * FB12: about.txt güncelleme düğmesi kontrolü ve kurulumu bu pencerede kendisi yapar (pet penceresi üzerinden giden yol
 * Windows'ta "bakıyorum"da kalıyordu). null: pet'in günlük kontrol sonucu (status.update) gösterilir.
 */
let localUpdate: AppStatus["update"] | null = null;
const UPDATE_FUSE_MS = 30_000;
const withFuse = <T>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([p, new Promise<T>((_, rej) => window.setTimeout(() => rej(new Error("timeout")), ms))]);

async function checkUpdateHere(): Promise<void> {
  if (!inTauri) return;
  localUpdate = { available: null, busy: true, upToDate: false, error: null };
  render();
  try {
    const info = await withFuse(invoke<{ version: string } | null>("update_check"), UPDATE_FUSE_MS);
    const available = info && isNewer(info.version, __APP_VERSION__) ? info.version : null;
    localUpdate = { available, busy: false, upToDate: !available, error: null };
  } catch (e) {
    localUpdate = { available: null, busy: false, upToDate: false, error: String(e instanceof Error ? e.message : e).slice(0, 140) };
  }
  render();
}

async function installUpdateHere(): Promise<void> {
  if (!inTauri) return;
  const keep = localUpdate ?? status.update ?? { available: null, busy: false, upToDate: false };
  localUpdate = { ...keep, busy: true, error: null };
  render();
  try {
    // başarılıysa uygulama yeniden başlar ve buraya dönülmez
    await invoke("update_install");
  } catch (e) {
    localUpdate = { ...keep, busy: false, error: String(e instanceof Error ? e.message : e).slice(0, 140) };
    render();
  }
}
// son sekme hatırlanır (sadece bu pencerenin tarayıcı deposu; erişilemezse home)
const TAB_KEY = "dunno.app.tab";
const isTab = (x: string | null): x is Tab => (TABS as readonly string[]).includes(x ?? "");
function loadTab(): Tab {
  const fromUrl = params.get("tab");
  if (isTab(fromUrl)) return fromUrl;
  try {
    const saved = localStorage.getItem(TAB_KEY);
    if (isTab(saved)) return saved;
  } catch {
    /* depo yok: varsayılan */
  }
  return "home";
}
// FB6 settings.exe kategorisi (hatırlanır; ?setcat= önizleme)
const SETCAT_KEY = "dunno.app.setcat";
const isSetCat = (x: string | null): x is SetCat => (SET_CATS as readonly string[]).includes(x ?? "");
let setCat: SetCat = (() => {
  const u = params.get("setcat");
  if (isSetCat(u)) return u;
  try {
    const v = localStorage.getItem(SETCAT_KEY);
    if (isSetCat(v)) return v;
  } catch {
    /* depo yok */
  }
  return "general";
})();
function showSetCat(c: SetCat, focus = false): void {
  setCat = c;
  try {
    localStorage.setItem(SETCAT_KEY, c);
  } catch {
    /* depo yok */
  }
  render();
  root.querySelector<HTMLElement>(".app-body")?.scrollTo(0, 0);
  if (focus) root.querySelector<HTMLElement>(`[data-setcat="${c}"]`)?.focus();
}
function saveTab(x: Tab): void {
  try {
    localStorage.setItem(TAB_KEY, x);
  } catch {
    /* önemli değil */
  }
}
let tab: Tab = loadTab();
/** pet.txt yetenek ağacında seçili düğüm (sadece bu oturum) */
let petSel: string | null = null;
/** SPEC 18 workshop.exe */
const workshop = new WorkshopController({
  render: () => render(),
  setMod: (id, on) => {
    patch({ mods: { ...(status.mods ?? {}), [id]: on } });
    act({ action: "mod", id, on });
  },
  lang: () => status.lang,
  tier: () => status.pro?.tier ?? "free",
  owned: () => status.pro?.packs ?? [],
  deviceId: () => status.deviceId ?? (inTauri ? null : "preview-device-01"),
  modsEnabled: () => status.mods ?? {},
  readMine: () => readModDirs(),
  validate: (dirs) => validateMods(dirs, sheetTags, builtinIds(builtinThemes)),
  inTauri,
  // ?ws=demo: önizlemede sahte workshop (ui-shots)
  api: params.get("ws") === "demo" ? demoApi() : undefined,
});

/** Anahtar değişince önizleme hemen o duruma geçer (sleep / shh); pet penceresi onaylayınca ya da 4 sn sonra kalkar. */
let preview: { state: string; until: number } | null = null;
const previewState = () => (preview && Date.now() < preview.until ? preview.state : status.state);

// büyük Dunno: tek canvas, yeniden çizimde yerine taşınır
const petCanvas = document.createElement("canvas");
petCanvas.className = "app-petcanvas";
let player: Player | null = null;
// wardrobe.exe önizlemesi: ayrı canvas + Player, aynı renderer (tema + aksesuar)
const wrCanvas = document.createElement("canvas");
wrCanvas.className = "app-petcanvas";
let wrPlayer: Player | null = null;
let wrPreview: PreviewState = (PREVIEW_STATES as readonly string[]).includes(params.get("preview") ?? "")
  ? (params.get("preview") as PreviewState)
  : "idle";
let renderer: WardrobeRenderer | null = null;
/** ana sayfa Dunno'sunun o anki kıyafeti (paylaşım GIF'i aynısını giyer) */
let petOutfit: Parameters<WardrobeRenderer["apply"]>[1] | null = null;
/** paylaşım GIF'i için sprite sayfası ve görüntüsü */
let petSheet: ReturnType<typeof parseSheet> | null = null;
let petImg: HTMLImageElement | null = null;
let applied = "";

// dolap kategorisi + "sadece açıklar" (UX-01): sadece bu pencerenin tarayıcı deposu (kişisel kolaylık; erişilemezse varsayılan)
const WR_UI_KEY = "dunno.app.wardrobe";
function loadWrUi(): WardrobeUi {
  const fromUrl = params.get("wrcat");
  try {
    const raw = JSON.parse(localStorage.getItem(WR_UI_KEY) ?? "{}") as Partial<WardrobeUi>;
    const cat = (WR_CATS as readonly string[]).includes(fromUrl ?? raw.cat ?? "") ? ((fromUrl ?? raw.cat) as WrCat) : "start";
    return { cat, onlyOpen: raw.onlyOpen === true, achOpen: params.get("ach") === "open" || raw.achOpen === true };
  } catch {
    return { cat: (WR_CATS as readonly string[]).includes(fromUrl ?? "") ? (fromUrl as WrCat) : "start", onlyOpen: false };
  }
}
let wrUi: WardrobeUi = loadWrUi();
function setWrUi(next: Partial<WardrobeUi>): void {
  wrUi = { ...wrUi, ...next };
  try {
    localStorage.setItem(WR_UI_KEY, JSON.stringify(wrUi));
  } catch {
    /* depo yok: oturum boyunca */
  }
  render();
}

/** Pencere genişliğine göre tam sayı ölçek (FB3); CSS boyutu cihaz ölçeğinden (bulanık ara ölçek yok). */
let petScale = 0;
let petDpr = 0;
function sizePets(): void {
  const scale = petScaleFor(window.innerWidth, window.innerHeight);
  const dpr = window.devicePixelRatio || 1;
  // FB10-2: yakınlaştırma piksel yoğunluğunu değiştirir; ölçek aynı kalsa da canvas yeniden boyutlanır (bulanık olmasın)
  if (scale === petScale && dpr === petDpr) return;
  petScale = scale;
  petDpr = dpr;
  for (const [p, c] of [[player, petCanvas], [wrPlayer, wrCanvas]] as const) {
    if (!p) continue;
    const size = p.resize(scale, window.devicePixelRatio || 1);
    c.style.width = `${size.w}px`;
    c.style.height = `${size.h}px`;
  }
}

async function loadPlayer(): Promise<void> {
  const img = new Image();
  img.src = sheetUrl;
  await img.decode();
  const sheet = parseSheet(sheetJson);
  petSheet = sheet;
  petImg = img;
  player = new Player(petCanvas, sheet, img);
  // FB4-7: preview.txt sabit (durmuş saat: seçili durumun ilk karesi, animasyon yok)
  wrPlayer = new Player(wrCanvas, sheet, img, () => 0);
  sizePets();
  window.addEventListener("resize", sizePets);
  window.addEventListener("resize", () => {
    window.clearTimeout(zoomTimer);
    zoomTimer = window.setTimeout(applyZoom, 120);
  });
  applyZoom();
  // geliştirme önizlemesi: ?mods=example (Tauri dışı) örnek modu yükler ve açık sayar
  const devMods = devModsPreview;
  const dirs = devMods ? await (await import("../dev/example-mod")).exampleModDirs() : await readModDirs();
  if (devMods) status = { ...status, mods: { pastel: true }, modsActive: ["pastel"] };
  // SPEC 18: uygulama paketleri de (dolapta sadece pet penceresinin yüklediği, yani hak sahibi olunanlar görünür)
  modResults = validateMods([...dirs, ...PACKS.map((p) => packDir(p.id))], [...sheet.tags.keys()], builtinIds(builtinThemes));
  for (const r of modResults) {
    for (const a of r.mod?.accessories ?? []) modAccIcon.set(a.acc.id, a.image.dataUrl);
    for (const c of r.mod?.costumes ?? []) modCostumeIcon.set(c.costume.id, c.icon.dataUrl);
  }
  // önizleme tüm geçerli modların parçalarını çizebilir; dolapta sadece yüklü olanlar görünür (syncMods)
  const all = mergeMods(modResults.flatMap((r) => (r.mod ? [r.mod] : [])));
  const eggX = eggExtras([...sheet.tags.keys()]);
  eggThemes = eggX.themes;
  renderer = await loadWardrobeRenderer(sheet, img, { themes: [...all.themes, ...eggX.themes], accessories: all.accessories, costumes: [...all.costumes, ...eggX.costumes] });
  applyWardrobe();
  applyState();
  applyPreview();
  let cardAt = 0;
  // FB6 performans: dunno.exe kapalıyken (gizli) ya da çizilecek pet yoksa saniyede bir uyanır; görünürken ~12 fps yeter
  // (sadece kare animasyonu, hareket yok)
  const frame = () => {
    const live = !document.hidden && (tab === "home" || tab === "wardrobe" || tab === "pet");
    if (live) {
      player?.tick();
      wrPlayer?.tick();
      // pet.txt kartı: pet görüntüsü canlı (yarım saniyede bir)
      if (tab === "pet" && performance.now() - cardAt > 500) {
        cardAt = performance.now();
        paintCard();
      }
    }
    setTimeout(frame, live ? 83 : 1_000);
  };
  frame();
}

/** Seçili tema + aksesuar her iki Dunno'ya (home ve wardrobe önizlemesi). */
/** SPEC 17 karanlık mod: pet penceresindeki ayar (sistem: bu pencerenin koyu tercihi) */
const darkQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
function applyDark(): void {
  const mode = (params.get("dark") as DarkMode | null) ?? status.darkMode ?? "off";
  const on = isDark(mode, darkQuery?.matches === true);
  if (on !== (document.documentElement.dataset.dark === "1")) applyDarkMode(document.documentElement, on);
}
darkQuery?.addEventListener?.("change", applyDark);

function applyWardrobe(): void {
  applyDark();
  const w = status.wardrobe;
  // gizli görünüm (SPEC 14): canavar > dünya > dolap. Ana sayfa Dunno'su gerçek görünüm; dolap önizlemesi dolap seçimi + dünya rengi
  const look = eggLook(cleanEggs(status.eggs));
  const root = document.documentElement;
  root.dataset.world = status.eggs?.monster ? "monster" : (status.eggs?.world ?? "normal");
  if (status.eggs?.monster) {
    root.style.setProperty("--bubble-fill", MONSTER_BUBBLE.fill);
    root.style.setProperty("--bubble-ink", MONSTER_BUBBLE.ink);
  } else applyBubbleStyle(root, modMerged);
  // uygulama geneli tema (SPEC 09 K5): pencere token'ları, sprite'tan bağımsız hemen
  const uiTheme = look.theme ?? w?.theme;
  if (w) applyUiTheme(root, [...themeList, ...eggThemes].find((x) => x.id === uiTheme));
  if (!renderer || !w) return;
  // SPEC 17: evrim formu (kostüm giyilmemişse) ana sayfa Dunno'sunda da
  const form = status.companion?.form;
  const evo = form && form !== "dunno" ? `evo_${form}` : null;
  const key = `${w.theme}|${w.costume ?? ""}|${w.accessories.join(",")}|${look.theme ?? ""}|${look.costume ?? ""}|${evo ?? ""}`;
  if (key === applied) return;
  applied = key;
  petOutfit = { theme: look.theme ?? w.theme, accessories: w.accessories, costume: look.costume ?? w.costume ?? evo };
  if (player) renderer.apply(player, petOutfit);
  if (wrPlayer) renderer.apply(wrPlayer, { theme: look.costume ? w.theme : (look.theme ?? w.theme), accessories: w.accessories, costume: w.costume });
}

function applyPreview(): void {
  if (!wrPlayer) return;
  wrPlayer.setState(wrPreview, { loop: true });
  // peek: sağ kenar hali (duvar sağda); walk sağa yürür
  wrPlayer.setFacing(facingForEdge(wrPreview, wrPreview === "peek" ? "right" : "bottom", "right"));
}

function applyState(): void {
  if (!player) return;
  const want = previewState();
  const s = isPetState(want) ? want : "idle";
  player.setState(s, { ...playOptions(s), loop: true });
  player.setFacing(status.facing);
}

/** Odaktaki kontrolün kimliği: yeniden çizimden sonra aynı kontrole geri dönülür (klavye gezinme kopmasın). */
function focusKey(): string | null {
  const el = document.activeElement as HTMLElement | null;
  if (!el || !root.contains(el)) return null;
  const d = el.dataset;
  if (d.tab) return `[data-tab="${d.tab}"]`;
  if (d.switch) return `[data-switch="${d.switch}"]`;
  if (d.action) return `[data-action="${d.action}"]`;
  if (d.ctl) return `[data-ctl="${d.ctl}"]`;
  // wardrobe.exe kutucukları: seçince odak aynı kutucukta kalsın
  // kutucuk mu "üzerindekiler" çipi mi: aynı id iki yerde olabilir, odak tıklanan türde kalır
  const kind = el.classList.contains("wr-chip") ? ".wr-chip" : ".wr-tile";
  if (d.theme !== undefined) return `${kind}[data-theme="${d.theme}"]`;
  if (d.costume !== undefined) return `${kind}[data-costume="${d.costume}"]`;
  if (d.preset) return `.wr-tile[data-preset="${d.preset}"]`;
  if (d.accessory !== undefined) return `${kind}[data-accessory="${d.accessory}"]`;
  if (d.slider) return `[data-slider="${d.slider}"]`;
  if (el.id) return `#${el.id}`;
  const group = el.closest("[role=group]")?.getAttribute("aria-label");
  if (group && d.value) return `[aria-label="${group}"] [data-value="${d.value}"]`;
  return null;
}

/**
 * Kaydırılmış alanlar (sekme gövdesi, dolap sütunları): yeniden çizimde konumu korunur. Anahtar = etiket + sınıflar + sıra
 * (aynı sekmede düzen aynı). Eskiden her seçimde innerHTML kaydırmayı sıfırlıyor, dolap en üste atlıyordu.
 */
function scrollKeys(): Map<string, [number, number]> {
  const out = new Map<string, [number, number]>();
  const seen = new Map<string, number>();
  for (const el of root.querySelectorAll<HTMLElement>("*")) {
    const base = `${el.tagName}.${el.className}`;
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    if (el.scrollTop || el.scrollLeft) out.set(`${base}#${n}`, [el.scrollTop, el.scrollLeft]);
  }
  return out;
}

function restoreScroll(saved: Map<string, [number, number]>): void {
  if (!saved.size) return;
  const seen = new Map<string, number>();
  for (const el of root.querySelectorAll<HTMLElement>("*")) {
    const base = `${el.tagName}.${el.className}`;
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    const at = saved.get(`${base}#${n}`);
    if (at) [el.scrollTop, el.scrollLeft] = at;
  }
}

function render(): void {
  syncMods();
  syncPersonalForm();
  setWornLimit(maxWorn(status.pro?.tier ?? "free"));
  const t = strings();
  const keep = focusKey();
  const scroll = scrollKeys();
  document.documentElement.lang = status.lang;
  const level = status.companion?.level ?? (inTauri ? 1 : 99);
  const bypass = status.pro?.tier === "pro" || status.testMode.on;
  const locked = new Map(TABS.flatMap((x) => (tabOpen(x, level, bypass) ? [] : [[x, tabLevel(x) ?? 0] as const])));
  const lockedNeed = locked.get(tab);
  // FB6: dolapta önizleme + wearing sabit sol panelde (kaydırma alanının dışında)
  const wr =
    !lockedNeed && tab === "wardrobe" && status.wardrobe
      ? wardrobeParts(t, status.lang, status.wardrobe, themeList, (id) => modAccIcon.get(id) ?? accessoryImageUrl(id), (id) => modCostumeIcon.get(id) ?? costumeIconUrl(id) ?? eggCostumeIconUrl(id), wrPreview, status.testMode.on ? TESTMODE_STRINGS[status.lang].allOpen : undefined, wrUi)
      : null;
  const body = lockedNeed
    ? lockedTabHtml(status.lang, tabLabel(tab, t), lockedNeed, status.companion)
    : tab === "workshop"
      ? (workshop.ensureOpen(), workshop.html())
      : wr
      ? wr.main
      : tabBodyHtml(tab, t, { ...status, update: localUpdate ?? (status.update ? { ...status.update, busy: false } : undefined) }, __APP_VERSION__, previewState(), modRows(), proUi, personalForm, petSel, setCat);
  root.innerHTML = frameHtml(t, tab, body, locked, wr?.aside);
  root.querySelector("#app-pet")?.replaceWith(petCanvas);
  root.querySelector("#wr-pet")?.replaceWith(wrCanvas);
  paintCard();
  restoreScroll(scroll);
  if (keep) root.querySelector<HTMLElement>(keep)?.focus({ preventScroll: true });
}

/** Paylaşım GIF'i: Dunno'nun kendi kıyafetiyle ~2.4 sn dans (yoksa el sallama), krem zeminde 6 kat; sadece bu pencerenin
 * kendi çizimi (ekran görüntüsü değil). Ardışık aynı kareler birleşir. */
const GIF_SCALE = 6;
const GIF_MS = 2_400;
const GIF_STEP = 40;
function recordGif(): Uint8Array | null {
  if (!renderer || !petSheet || !petImg) return null;
  const off = document.createElement("canvas");
  let t = 0;
  const p = new Player(off, petSheet, petImg, () => t);
  p.resize(GIF_SCALE, 1);
  if (petOutfit) renderer.apply(p, petOutfit);
  const state = ["dance", "wave", "idle"].find((x) => petSheet!.tags.has(x));
  if (!state) return null;
  p.setState(state, { loop: true });
  const pad = 2 * GIF_SCALE;
  const out = document.createElement("canvas");
  out.width = off.width + 2 * pad;
  out.height = off.height + 2 * pad;
  const ctx = out.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  const cream = getComputedStyle(document.documentElement).getPropertyValue("--cream").trim() || "#FFF1D6";
  const frames: GifFrame[] = [];
  for (t = 0; t < GIF_MS; t += GIF_STEP) {
    p.tick();
    ctx.fillStyle = cream;
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(off, pad, pad);
    frames.push({ data: ctx.getImageData(0, 0, out.width, out.height).data, delayMs: GIF_STEP });
  }
  return encodeGif(dedupeFrames(frames), out.width, out.height);
}
async function gifAction(): Promise<void> {
  const t = COMPANION_STRINGS[status.lang];
  const gif = recordGif();
  if (!gif) return toast(t.cardFailed);
  try {
    const path = await invoke<string>("save_gif", { gif: Array.from(gif) });
    toast(GIF_STRINGS[status.lang].saved(path));
  } catch {
    toast(t.cardFailed);
  }
}

/** SPEC 17 pet.txt kartı: token renkleri + piksel font; pet görüntüsü ana sayfa Dunno'sundan (o anki kare). */
/** FB6: kaydedilen/kopyalanan kart 4 kat (1200x720), ekrandaki kart cihaz piksel oranında (bulanık değil) */
const CARD_EXPORT_SCALE = 4;
function cardCanvas(target?: HTMLCanvasElement): HTMLCanvasElement | null {
  const v = status.companion;
  if (!v) return null;
  const c = target ?? document.createElement("canvas");
  const scale = target ? Math.max(1, Math.ceil(window.devicePixelRatio || 1)) : CARD_EXPORT_SCALE;
  c.width = 300 * scale;
  c.height = 180 * scale;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const css = getComputedStyle(document.documentElement);
  const tok = (n: string, fb: string) => css.getPropertyValue(n).trim() || fb;
  const worlds = { open: status.eggs?.worlds.length ?? 0, total: WORLDS.length - 1 };
  drawCard(ctx, cardData(status.lang, v, worlds), { ink: tok("--ink", "#2B1E2F"), main: tok("--main", "#F2A65A"), cream: tok("--cream", "#FFF1D6"), light: tok("--light", "#FFD29A") }, tok("--font-body", "sans-serif"), player ? petCanvas : null, v.perks.some((p) => p.id === "card_frame" && p.open));
  return c;
}
function paintCard(): void {
  const el = root.querySelector<HTMLCanvasElement>("#pt-card");
  if (el) cardCanvas(el);
}
async function cardAction(kind: "copy" | "save"): Promise<void> {
  const t = COMPANION_STRINGS[status.lang];
  const c = cardCanvas();
  const blob = c ? await new Promise<Blob | null>((r) => c.toBlob(r, "image/png")) : null;
  if (!blob) return toast(t.cardFailed);
  try {
    if (kind === "copy") {
      // panoya sadece YAZILIR (okuma yok)
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast(t.cardCopied);
    } else {
      const path = await invoke<string>("save_card", { png: Array.from(new Uint8Array(await blob.arrayBuffer())) });
      toast(t.cardSaved(path));
    }
  } catch {
    toast(t.cardFailed);
  }
}

/** FB6 ilk adımlar: dunno.exe açıldı / pet.txt görüldü (oturumda bir kez; pet penceresi bitmişse yok sayar) */
const onboardSent = new Set<string>();
function onboard(value: "open" | "tree"): void {
  if (onboardSent.has(value) || !status.companion?.firstSteps) return;
  onboardSent.add(value);
  act({ action: "onboard", value });
}
/** pencere gerçekten görünür ve odaktaysa: "dunno.exe açıldı" (+ pet.txt açıksa "ağaca bakıldı") */
function seen(): void {
  if (document.visibilityState !== "visible" || !document.hasFocus()) return;
  onboard("open");
  if (tab === "pet") onboard("tree");
}
function showTab(x: Tab, focus = false): void {
  tab = x;
  saveTab(x);
  render();
  if (x === "pet") onboard("tree");
  if (x === "workshop" && !root.querySelector(".pt-lockpage")) void workshop.open();
  if (focus) root.querySelector<HTMLElement>(`[data-tab="${x}"]`)?.focus();
}

/** Kısa bildirim (dunno.exe içinde, kit toast); 2.5 sn sonra kalkar. */
function toast(text: string): void {
  root.querySelector(".app-toast")?.remove();
  const el = document.createElement("div");
  el.className = "app-toast";
  el.innerHTML = toastHtml(text);
  root.append(el);
  setTimeout(() => el.remove(), 2_500);
}

// about.txt sürüm satırı: 3 sn içinde 5 tık -> test modu aç/kapat (SPEC 07 FB2)
let taps = initialTaps();

function act(a: UiAction): void {
  if (inTauri) void sendUiAction(a);
}

/** Yerel durumu iyimser günceller (pet penceresi asıl durumu kısa süre içinde yayınlar). */
function patch(p: Partial<AppStatus>): void {
  status = { ...status, ...p };
  render();
}

root.addEventListener("click", (e) => {
  const el = e.target as HTMLElement;
  const ctl = el.closest<HTMLElement>("[data-ctl]")?.dataset.ctl;
  if (ctl) {
    if (inTauri) void (ctl === "close" ? windowHide() : ctl === "maximize" ? windowToggleMaximize() : windowMinimize());
    return;
  }
  const tabEl = el.closest<HTMLElement>("[data-tab]");
  if (tabEl) {
    showTab(tabEl.dataset.tab as Tab);
    return;
  }
  const catEl = el.closest<HTMLElement>("[data-setcat]");
  if (catEl && isSetCat(catEl.dataset.setcat ?? null)) {
    showSetCat(catEl.dataset.setcat as SetCat);
    return;
  }
  const action = el.closest<HTMLElement>("[data-action]")?.dataset.action;
  if (action === "update_check") {
    void checkUpdateHere();
    return;
  }
  if (action === "update_install") {
    void installUpdateHere();
    return;
  }
  if (action === "summon" || action === "send_edge" || action === "stats_reset" || action === "welcome") {
    act({ action });
    return;
  }
  if (action === "reminder_delete") {
    const id = el.closest<HTMLElement>("[data-action]")?.dataset.id ?? "";
    patch({ reminders: (status.reminders ?? []).filter((r) => r.id !== id) });
    act({ action, id });
    return;
  }
  if (action === "telemetry_answer") {
    const value = el.closest<HTMLElement>("[data-action]")?.dataset.value === "true";
    patch({ telemetryAsk: false, telemetry: value });
    act({ action, value });
    return;
  }
  if (action === "onboard_restart") {
    onboardSent.clear();
    act({ action });
    showTab("home");
    return;
  }
  if (action === "ach_toggle") {
    setWrUi({ achOpen: wrUi.achOpen !== true });
    return;
  }
  const go = el.closest<HTMLElement>("[data-goto]")?.dataset.goto;
  if (go && (TABS as readonly string[]).includes(go)) {
    showTab(go as Tab, true);
    return;
  }
  if (action?.startsWith("ws_")) {
    void workshop.action(action, el.closest<HTMLElement>("[data-action]")!);
    return;
  }
  const perk = el.closest<SVGElement>("[data-perk]")?.dataset.perk;
  if (perk) {
    petSel = petSel === perk ? null : perk;
    render();
    root.querySelector<SVGElement>(`[data-perk="${perk}"]`)?.focus();
    return;
  }
  if (action === "gif_save") {
    void gifAction();
    return;
  }
  if (action === "card_copy" || action === "card_save") {
    void cardAction(action === "card_copy" ? "copy" : "save");
    return;
  }
  if (action === "evolve_choose") {
    const form = el.closest<HTMLElement>("[data-form]")?.dataset.form;
    if (form) act({ action: "evolve_choose", form: form as never });
    return;
  }
  if (action === "personal_on" || action === "personal_off") {
    personalForm.consent = false;
    personalForm.dirty = false;
    personalForm.msg = null;
    act({ action });
    return;
  }
  if (action === "personal_save") {
    personalForm.dirty = false;
    personalForm.msg = STRINGS[status.lang].personalSaved;
    act({
      action: "personal_save",
      profile: { preferred_name: personalForm.name, ...Object.fromEntries(LISTS.map((l) => [l, personalForm.lists[l]])), sliders: personalForm.sliders },
    });
    return;
  }
  if (action === "pro_activate" || action === "pro_remove") {
    void proAction(action);
    return;
  }
  if (action === "pro_claim") {
    void proClaim();
    return;
  }
  if (action === "ax_request") {
    void checkAccess(true);
    return;
  }
  if (action === "mods_open" || action === "restart") {
    if (inTauri) void invoke(action === "mods_open" ? "open_mods_dir" : "restart_app");
    return;
  }
  if (el.closest("[data-tap]")) {
    const r = tap(taps, Date.now());
    taps = r.taps;
    if (r.fired) {
      const x = TESTMODE_STRINGS[status.lang];
      toast(status.testMode.on ? x.toastOff : x.toastOn);
      patch({ testMode: status.testMode.on ? { on: false, tempoOff: false } : { on: true, tempoOff: false } });
      act({ action: "test", op: "toggle" });
    }
    return;
  }
  const test = el.closest<HTMLButtonElement>("[data-test]");
  if (test) {
    if (test.disabled) return;
    const d = test.dataset;
    switch (d.test) {
      case "trigger":
        act({ action: "test", op: "trigger", id: d.id as AchievementId });
        break;
      case "edge":
        act({ action: "test", op: "edge", target: d.target as EdgeTarget });
        break;
      case "pro":
        patch({ testMode: { ...status.testMode, proSim: d.on === "true" || undefined } });
        act({ action: "test", op: "pro", on: d.on === "true" });
        break;
      case "tempo":
        patch({ testMode: { ...status.testMode, tempoOff: d.on !== "true" } });
        act({ action: "test", op: "tempo", on: d.on === "true" });
        break;
      case "meeting":
        patch({ manualMeeting: d.on === "true" });
        act({ action: "meeting", value: d.on === "true" });
        break;
      case "size_next":
        act({ action: "test", op: "size_next" });
        break;
      case "fart":
        act({ action: "test", op: "fart" });
        break;
      case "anim":
        act({ action: "test", op: "anim", anim: d.anim as "wave" });
        break;
      case "reset_quota":
        toast(TESTMODE_STRINGS[status.lang].quotaReset);
        act({ action: "test", op: "reset_quota" });
        break;
      case "off":
        toast(TESTMODE_STRINGS[status.lang].toastOff);
        patch({ testMode: { on: false, tempoOff: false } });
        act({ action: "test", op: "off" });
        break;
    }
    return;
  }
  // wardrobe.exe: sadece açık parçalar seçilir (pet penceresi de kilidi kontrol eder)
  // "üzerindekiler" çipleri de aynı yoldan: tıklayınca o parça çıkar (kostüm/aksesuar aynı id = çıkar)
  const tile = el.closest<HTMLElement>(".wr-tile, .wr-chip");
  if (tile) {
    if (tile.getAttribute("aria-disabled") === "true" || !status.wardrobe) return;
    if (tile.dataset.theme !== undefined) {
      const theme = tile.dataset.theme;
      patch({ wardrobe: { ...status.wardrobe, theme } });
      act({ action: "wardrobe", theme });
    } else if (tile.dataset.accessory !== undefined) {
      const accessory = tile.dataset.accessory || null;
      patch({ wardrobe: toggleView(status.wardrobe, { accessory }) });
      act({ action: "wardrobe", accessory });
    } else if (tile.dataset.costume !== undefined) {
      const costume = tile.dataset.costume || null;
      patch({ wardrobe: toggleView(status.wardrobe, { costume }) });
      act({ action: "wardrobe", costume });
    } else if (tile.dataset.preset) {
      // hazır görünüm (SPEC 15): hepsi açıksa uygulanır; önizleme hemen, kesin durum pet penceresinden
      const p = PRESETS.find((x) => x.id === tile.dataset.preset);
      if (p) patch({ wardrobe: { ...status.wardrobe, theme: p.theme, costume: p.costume, accessories: [...p.accessories] } });
      act({ action: "preset", id: tile.dataset.preset });
    }
    applyWardrobe();
    return;
  }
  const sw = el.closest<HTMLElement>("[data-switch]");
  if (sw) {
    const on = sw.getAttribute("aria-checked") !== "true";
    if (workshop.switchPack(sw.dataset.switch!, on)) return;
    toggle(sw.dataset.switch!, on);
    return;
  }
  const seg = el.closest<HTMLButtonElement>(".seg");
  if (!seg) return;
  const group = seg.closest("[role=group]")?.getAttribute("aria-label");
  const v = seg.dataset.value!;
  if (group?.startsWith("ws_")) {
    void workshop.segment(group, v);
    return;
  }
  switch (group) {
    case "wrcat":
      setWrUi({ cat: v as WrCat });
      break;
    case "dark_mode":
      patch({ darkMode: v as DarkMode });
      act({ action: "dark_mode", value: v as DarkMode });
      break;
    case "bubble_style":
      patch({ bubbleStyle: v as BubbleStyleId });
      act({ action: "bubble_style", value: v as BubbleStyleId });
      break;
    case "voice_style":
      patch({ voiceStyle: v as VoiceStyleId });
      act({ action: "voice_style", value: v as VoiceStyleId });
      break;
    case "personality":
      if (status.pro?.tier !== "pro") break; // Free: dengeli
      patch({ personality: v as Personality });
      act({ action: "personality", value: v as Personality });
      break;
    case "egg_world":
      patch({ eggs: { ...status.eggs!, world: v } });
      act({ action: "egg_world", value: v as "normal" });
      break;
    case "preview":
      wrPreview = v as PreviewState;
      applyPreview();
      render();
      break;
    case "mode":
      patch({ mode: v as AppStatus["mode"] });
      act({ action: "mode", value: v as AppStatus["mode"] });
      break;
    case "lang":
      patch({ lang: v as AppStatus["lang"] });
      act({ action: "lang", value: v as AppStatus["lang"] });
      break;
    case "frequency":
      patch({ frequency: v as AppStatus["frequency"] });
      act({ action: "frequency", value: v as AppStatus["frequency"] });
      break;
    case "bubble":
      patch({ bubbleSpeed: v as BubbleSpeed });
      act({ action: "bubble_speed", value: v as BubbleSpeed });
      break;
  }
});

function expirePreview(): void {
  setTimeout(() => {
    applyState();
    render();
  }, 4_100);
}

/** Piksel anahtarlar (home, settings.exe, dolap filtresi). */
function toggle(name: string, on: boolean): void {
  if (name.startsWith("mod:")) {
    const id = name.slice(4);
    patch({ mods: { ...status.mods, [id]: on } });
    act({ action: "mod", id, on });
    return;
  }
  switch (name) {
    case "monster":
      patch({ eggs: { ...status.eggs!, monster: on } });
      act({ action: "monster", value: on });
      return;
    case "wr_only_open":
      setWrUi({ onlyOpen: on });
      return;
    case "mute_today":
      preview = on ? { state: "sleep", until: Date.now() + 4_000 } : null;
      patch({ muted: on });
      applyState();
      act({ action: "mute_today", value: on });
      expirePreview();
      break;
    case "meeting":
      preview = on ? { state: "shh", until: Date.now() + 4_000 } : null;
      patch({ manualMeeting: on });
      applyState();
      act({ action: "meeting", value: on });
      expirePreview();
      break;
    case "fart":
      patch({ fart: on });
      act({ action: "fart", value: on });
      break;
    case "music":
      patch({ music: on });
      act({ action: "music", value: on });
      break;
    case "tab_titles":
      patch({ tabTitles: on });
      act({ action: "tab_titles", value: on });
      break;
    case "telemetry":
      patch({ telemetry: on });
      act({ action: "telemetry", value: on });
      break;
    case "voice":
      patch({ voice: on });
      act({ action: "voice", value: on });
      break;
    case "autostart":
      patch({ autostart: on });
      if (inTauri) {
        // gerçek durum kayıt defterinden; pet penceresi ayara yazar
        void setAutostart(on).then((actual) => {
          patch({ autostart: actual });
          act({ action: "autostart", value: actual });
        });
      }
      break;
  }
}

root.addEventListener("input", (e) => {
  const el = e.target as HTMLInputElement;
  // FB4-2: kaydırırken sayı canlı güncellenir (uygulama bırakınca)
  if (el.dataset.slider && el.closest(".range")) {
    const out = root.querySelector(`[data-range-value="${el.dataset.slider}"]`);
    if (out) out.textContent = el.value;
    el.setAttribute("aria-valuetext", el.value);
  }
  if (el.dataset.wsInput) workshop.input(el.dataset.wsInput, el.value);
  if (el.id === "pro-key") proUi.key = el.value;
  if (el.id === "pro-order") proUi.order = el.value;
  if (el.id === "pro-email") proUi.email = el.value;
  if (el.id === "ps-preferred_name") {
    personalForm.name = el.value;
    personalForm.dirty = true;
  }
  if (el.id.startsWith("ps-") && (LISTS as readonly string[]).includes(el.id.slice(3))) {
    personalForm.lists[el.id.slice(3) as ListId] = el.value;
    personalForm.dirty = true;
  }
});

// kademeli kaydırıcı (SPEC 09 K8b, pet boyutu): bırakınca / ok tuşuyla her kademede "change"
root.addEventListener("change", (e) => {
  const box = e.target as HTMLInputElement;
  if (box.id === "personal-consent") {
    personalForm.consent = box.checked;
    render();
    return;
  }
  const input = (e.target as HTMLElement).closest<HTMLInputElement>("input[data-slider]");
  const ps = input?.dataset.slider?.startsWith("ps_") ? (input.dataset.slider.slice(3) as SliderId) : null;
  if (input && ps && (SLIDERS as readonly string[]).includes(ps)) {
    personalForm.sliders[ps] = Number(input.value);
    personalForm.dirty = true;
    return;
  }
  if (input?.dataset.slider === "voice_volume") {
    const voiceVolume: VoiceVolume = Math.round(Number(input.value));
    patch({ voiceVolume });
    act({ action: "voice_volume", value: voiceVolume });
    return;
  }
  if (!input || input.dataset.slider !== "size") return;
  // FB4-2: 0..100 sürekli kaydırıcı
  const size: SizeLevel = Math.round(Number(input.value));
  if (size === status.size) return;
  patch({ size });
  act({ action: "pet_size", value: size });
});

// FB6 dolap: sabit sol panelin üstünde tekerlek çevrilince de tek kaydırma alanı kayar (panel kendi taşmıyorsa)
root.addEventListener(
  "wheel",
  (e) => {
    const aside = (e.target as HTMLElement).closest<HTMLElement>(".app-aside");
    if (!aside || aside.scrollHeight > aside.clientHeight) return;
    root.querySelector<HTMLElement>(".app-body")?.scrollBy({ top: e.deltaY, left: 0 });
  },
  { passive: true },
);

// FB10-2: büyük pencerede orantılı büyüme (app/zoom.ts). Tauri'de webview yakınlaştırması (innerWidth küçülür, o yüzden
// yakınlaştırmasız boyut = iç boyut x mevcut değer); tarayıcı önizlemesinde CSS zoom.
let appZoom = 1;
let zoomTimer = 0;
function applyZoom(): void {
  if (!inTauri) {
    const z = zoomFor(window.innerWidth, window.innerHeight);
    document.documentElement.style.zoom = z === 1 ? "" : String(z);
    return;
  }
  const z = zoomFor(window.innerWidth * appZoom, window.innerHeight * appZoom);
  if (z === appZoom) return;
  appZoom = z;
  void invoke("set_app_zoom", { factor: z }).catch(() => undefined);
}

// F11: tam ekran (çık: tekrar F11)
window.addEventListener("keydown", (e) => {
  if (e.key !== "F11" || !inTauri) return;
  e.preventDefault();
  void invoke("window_toggle_fullscreen").catch(() => undefined);
});

// FB6 settings.exe menüsü: yukarı/aşağı ok, Home/End (roving tabindex)
root.addEventListener("keydown", (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>("[data-setcat]");
  if (!el) return;
  const i = SET_CATS.indexOf(el.dataset.setcat as SetCat);
  const n = e.key === "ArrowDown" ? i + 1 : e.key === "ArrowUp" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? SET_CATS.length - 1 : null;
  if (n === null) return;
  e.preventDefault();
  showSetCat(SET_CATS[(n + SET_CATS.length) % SET_CATS.length], true);
});

// FB6 yetenek ağacı balonu: düğümün üstüne gelince / odaklanınca ne açtığı, hangi level, kaç level kaldı
function showSkillTip(n: Element | null): void {
  const wrap = root.querySelector<HTMLElement>(".sk-wrap");
  const tip = wrap?.querySelector<HTMLElement>(".sk-tip");
  const id = (n as SVGElement | null)?.dataset?.perk;
  const html = id && status.companion ? skillTip(COMPANION_STRINGS[status.lang], status.companion, id) : null;
  if (!wrap || !tip) return;
  if (!n || !html) {
    tip.hidden = true;
    return;
  }
  tip.innerHTML = html;
  tip.hidden = false;
  const r = n.querySelector("rect")!.getBoundingClientRect();
  const w = wrap.getBoundingClientRect();
  const left = Math.max(0, Math.min(r.left + r.width / 2 - w.left + wrap.scrollLeft - tip.offsetWidth / 2, wrap.scrollWidth - tip.offsetWidth));
  const above = r.top - w.top - tip.offsetHeight - 8;
  tip.style.left = `${Math.round(left)}px`;
  tip.style.top = `${Math.round(above >= 0 ? above : r.bottom - w.top + 8)}px`;
}
root.addEventListener("pointerover", (e) => {
  const n = (e.target as Element | null)?.closest?.(".sk-node");
  if (n) showSkillTip(n);
});
root.addEventListener("pointerout", (e) => {
  const n = (e.target as Element | null)?.closest?.(".sk-node");
  if (n && !n.contains(e.relatedTarget as Node | null)) showSkillTip(null);
});
root.addEventListener("focusin", (e) => showSkillTip((e.target as Element | null)?.closest?.(".sk-node") ?? null));

// dolap ızgarası (UX-01): ok tuşlarıyla kutucuklar arası, Home/End; seçim Enter/Space (düğme varsayılanı)
// yetenek ağacı düğümleri (svg g, role=button): Enter / boşluk seçer
root.addEventListener("keydown", (e) => {
  const n = (e.target as Element | null)?.closest?.(".sk-node");
  if (!n || (e.key !== "Enter" && e.key !== " ")) return;
  e.preventDefault();
  n.dispatchEvent(new MouseEvent("click", { bubbles: true }));
});
root.addEventListener("keydown", (e) => {
  const tileEl = (e.target as HTMLElement).closest<HTMLElement>(".wr-grid .wr-tile");
  if (!tileEl) return;
  const tiles = [...tileEl.parentElement!.querySelectorAll<HTMLElement>(".wr-tile")];
  const next = gridMove(
    tiles.map((x) => ({ x: x.offsetLeft, y: x.offsetTop })),
    tiles.indexOf(tileEl),
    e.key,
  );
  if (next === null) return;
  e.preventDefault();
  tiles[next].focus();
});

// sekmeler: ok tuşları / Home / End (WAI-ARIA tabs)
root.addEventListener("keydown", (e) => {
  const tabEl = (e.target as HTMLElement).closest<HTMLElement>("[data-tab]");
  if (!tabEl) return;
  const i = TABS.indexOf(tabEl.dataset.tab as Tab);
  const next =
    e.key === "ArrowRight" ? TABS[(i + 1) % TABS.length]
    : e.key === "ArrowLeft" ? TABS[(i - 1 + TABS.length) % TABS.length]
    : e.key === "Home" ? TABS[0]
    : e.key === "End" ? TABS[TABS.length - 1]
    : null;
  if (!next) return;
  e.preventDefault();
  showTab(next, true);
});

// başlık çubuğundan sürükle ya da çift tıkla büyüt (kontroller hariç)
root.addEventListener("mousedown", (e) => {
  const el = e.target as HTMLElement;
  if (e.button !== 0 || !el.closest("[data-drag]") || el.closest("[data-ctl]") || !inTauri) return;
  // çift tık: büyüt / eski boyut (Windows başlık çubuğu alışkanlığı, FB3); tek tık: sürükle
  void (e.detail === 2 ? windowToggleMaximize() : windowDrag());
});

async function start(): Promise<void> {
  render();
  await loadPlayer();
  if (devModsPreview) {
    syncMods();
    status = { ...status, wardrobe: sampleWardrobe() }; // örnek dolap mod parçalarını görsün
  }
  if (modResults.length) render(); // mod listesi (settings.exe, dolap) okununca
  if (!inTauri) return;
  await onStatus((s) => {
    const stateChanged = s.state !== status.state || s.facing !== status.facing;
    status = s;
    if (stateChanged) applyState();
    applyWardrobe();
    // aktif bir kontrolle etkileşim yokken yeniden çiz
    render();
    seen();
  });
  await requestStatus();
  void checkAccess(false);
  window.addEventListener("focus", () => {
    void requestStatus();
    void checkAccess(false); // sistem ayarlarından izin verip dönünce
    seen();
  });
}

/** SPEC 19 M4: macOS Erişilebilirlik izni. prompt sadece "izin ver" düğmesinden: macOS kendi penceresini açar. */
async function checkAccess(prompt: boolean): Promise<void> {
  if (!inTauri || !isMac()) return;
  const r = await invoke<string>("accessibility_status", { prompt }).catch(() => "na");
  setMacAx(r === "granted" || r === "missing" ? r : null);
  render();
}

void start();
