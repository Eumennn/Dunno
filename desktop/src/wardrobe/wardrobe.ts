// Gardırop durumu (saf, SPEC 05 W3/W4): başarım ilerlemesi + seçili tema/aksesuar + bildirilmemiş açılımlar.
// Motor achievements.ts'te (backend); burası onu sarar ve kalıcı biçimi tutar. Sadece cihazda, store'a düz JSON.
import {
  ACHIEVEMENTS,
  cleanProgress,
  initialProgress,
  progressOf,
  step,
  unlockedItems,
  type AchEvent,
  type AchievementId,
  type Progress,
  type Unlock,
} from "./achievements";
import { MAX_WORN, type Slot } from "./accessories";

export const WARDROBE_KEY = "wardrobe";

/**
 * Aksesuar -> slot (SPEC 05 W2 ilk altı + SPEC 09 K6 on dört); sıra = UI sırası. Slotlar aksesuar JSON'larıyla aynı (test).
 * Aynı slotta tek parça, farklı slotlar birlikte, en fazla MAX_WORN.
 */
export const ACCESSORY_SLOTS = {
  beanie: "head",
  crown: "head",
  party_hat: "head",
  sunglasses: "eyes",
  nightcap: "head",
  headphones: "head",
  cowboy_hat: "head",
  pirate_bandana: "head",
  chef_hat: "head",
  wizard_hat: "head",
  grad_cap: "head",
  hard_hat: "head",
  cat_ears: "head",
  monocle: "eyes",
  nerd_glasses: "eyes",
  bow_tie: "neck",
  scarf: "neck",
  cape: "body",
  ribbon: "side",
  flower: "side",
} as const satisfies Record<string, Slot>;
export type AccessoryId = keyof typeof ACCESSORY_SLOTS;
export const ACCESSORIES = Object.keys(ACCESSORY_SLOTS) as AccessoryId[];

/** Kostümler (SPEC 09 K2); sıra = UI sırası. Kapattığı slotlar kostüm JSON'unda (blocks). */
export const COSTUMES = [
  "bug",
  "fly",
  "bee",
  "ghost",
  "dino",
  "frog",
  "astronaut",
  "pizza",
  // SPEC 12 yaratıklar
  "cockroach",
  "cat",
  "dog",
  "slime",
  "mushroom",
  "robot",
  "alien",
  "fish",
  "duck",
  "skeleton",
  "vampire",
  "mini_monster",
] as const;
export type CostumeId = (typeof COSTUMES)[number];

// SPEC 12 B: etkin modların parçaları (açılışta kaydedilir; kullanıcı kurduğu için hep açık). id'ler mod adıyla başlar, çakışmaz.
const modSlots = new Map<string, Slot>();
/** SPEC 15: aksesuar yeri sınırı (Free 3, Pro 5); pet penceresi lisans durumuna göre ayarlar */
let wornLimit = MAX_WORN;
export function setWornLimit(n: number): void {
  wornLimit = n;
}
export const wornLimitNow = () => wornLimit;
const modCostumes = new Map<string, readonly Slot[]>();
const modThemes = new Set<string>();

export interface ModItems {
  themes?: readonly string[];
  accessories?: readonly { id: string; slot: Slot }[];
  /** blocks: kostümün kapattığı slotlar */
  costumes?: readonly { id: string; blocks: readonly Slot[] }[];
}

/** Etkin mod parçalarını kaydeder (öncekileri siler). */
export function registerModItems(items: ModItems): void {
  modSlots.clear();
  modCostumes.clear();
  modThemes.clear();
  for (const a of items.accessories ?? []) modSlots.set(a.id, a.slot);
  for (const c of items.costumes ?? []) modCostumes.set(c.id, c.blocks);
  for (const t of items.themes ?? []) modThemes.add(t);
}

/** Yerleşik + mod aksesuarları / kostümleri (dolap ızgarası sırası: önce yerleşikler). */
export const allAccessories = (): string[] => [...ACCESSORIES, ...modSlots.keys()];
export const allCostumes = (): string[] => [...COSTUMES, ...modCostumes.keys()];
export const isModTheme = (id: string): boolean => modThemes.has(id);
/** Mod kostümünün kapattığı slotlar (yerleşikler için undefined). */
export const modCostumeBlocks = (id: string): readonly Slot[] | undefined => modCostumes.get(id);

/** Aksesuarın slotu (yerleşik ya da mod). */
export function slotFor(id: string): Slot | undefined {
  return Object.hasOwn(ACCESSORY_SLOTS, id) ? ACCESSORY_SLOTS[id as AccessoryId] : modSlots.get(id);
}

const isAccessory = (v: unknown): v is AccessoryId => typeof v === "string" && slotFor(v) !== undefined;
const isCostume = (v: unknown): v is CostumeId => typeof v === "string" && ((COSTUMES as readonly string[]).includes(v) || modCostumes.has(v));
const isModItem = (item: Unlock) =>
  (item.kind === "accessory" && modSlots.has(item.id)) || (item.kind === "costume" && modCostumes.has(item.id)) || (item.kind === "theme" && modThemes.has(item.id));

export interface WardrobeState {
  progress: Progress;
  /** seçili tema id'si (themes.json) */
  theme: string;
  /** giyilen aksesuarlar (SPEC 09 K6: slot başına bir, en fazla MAX_WORN; giyilme sırasıyla); [] = çıplak */
  accessories: AccessoryId[];
  /** giyilen kostüm (SPEC 09 K2); null = yok */
  costume: CostumeId | null;
  /** açıldı ama henüz bildirilmedi (bugün sus / toplantı sırasında ertelenir) */
  pending: AchievementId[];
}

export function initialWardrobe(): WardrobeState {
  return { progress: initialProgress(), theme: "classic", accessories: [], costume: null, pending: [] };
}

const ACH_IDS = new Set<string>(ACHIEVEMENTS.map((a) => a.id));

/**
 * override (SPEC 07 FB2 test modu): verilirse açıklık bu listeye göre (devmode allUnlocks); ilerleme dokunulmaz.
 * Verilmezse normal kural: başlangıç + açılan başarımlar.
 */
export function isUnlocked(s: Pick<WardrobeState, "progress">, item: Unlock, override?: readonly Unlock[]): boolean {
  if (isModItem(item)) return true;
  return (override ?? unlockedItems(s.progress)).some((u) => u.kind === item.kind && u.id === item.id);
}

/** Normal kurala göre kilitli seçimi açık olana döndürür (test modu kapanınca). İlerleme aynen kalır. */
export function settleSelection(s: WardrobeState): WardrobeState {
  const theme = isUnlocked(s, { kind: "theme", id: s.theme }) ? s.theme : initialWardrobe().theme;
  const accessories = s.accessories.filter((id) => isUnlocked(s, { kind: "accessory", id }));
  const costume = s.costume && isUnlocked(s, { kind: "costume", id: s.costume }) ? s.costume : null;
  return theme === s.theme && accessories.length === s.accessories.length && costume === s.costume ? s : { ...s, theme, accessories, costume };
}

/**
 * Giyme (SPEC 09 K6): giyiliyse çıkarır; değilse aynı slottaki parçayı çıkarıp ekler, MAX_WORN aşılırsa en eski çıkar.
 */
export function wear(list: readonly AccessoryId[], id: AccessoryId): AccessoryId[] {
  if (list.includes(id)) return list.filter((x) => x !== id);
  const next = [...list.filter((x) => slotFor(x) !== slotFor(id)), id];
  return next.slice(-wornLimit);
}

/** Store'dan gelen değeri onarır: kilitli seçim varsayılana döner. */
export function cleanWardrobe(raw: unknown): WardrobeState {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const s = initialWardrobe();
  s.progress = cleanProgress(r.progress);
  if (typeof r.theme === "string" && isUnlocked(s, { kind: "theme", id: r.theme })) s.theme = r.theme;
  // eski biçim (SPEC 05-08): tek "accessory"
  const worn = Array.isArray(r.accessories) ? r.accessories : typeof r.accessory === "string" ? [r.accessory] : [];
  for (const id of worn) if (isAccessory(id) && isUnlocked(s, { kind: "accessory", id })) s.accessories = wear(s.accessories.filter((x) => x !== id), id);
  if (isCostume(r.costume) && isUnlocked(s, { kind: "costume", id: r.costume })) s.costume = r.costume;
  if (Array.isArray(r.pending)) {
    s.pending = [...new Set(r.pending.filter((x): x is AchievementId => typeof x === "string" && ACH_IDS.has(x) && Boolean(s.progress.unlocked[x as AchievementId])))];
  }
  return s;
}

/** Olayı işler; yeni açılanlar bildirim kuyruğuna eklenir. */
export function applyEvent(s: WardrobeState, ev: AchEvent, now: Date): { state: WardrobeState; unlocked: AchievementId[] } {
  const r = step(s.progress, ev, now);
  const unlocked = r.unlocked.map((d) => d.id);
  return { state: { ...s, progress: r.progress, pending: [...s.pending, ...unlocked] }, unlocked };
}

/**
 * Seçim: sadece açık parçalar; kilitli istek yok sayılır. accessory: id = giy/çıkar (wear), null = hepsini çıkar.
 * costume: id = giy (aynıysa çıkar), null = çıkar. override: test modunda açık sayılan liste (isUnlocked ile aynı).
 */
export function select(
  s: WardrobeState,
  sel: { theme?: string; accessory?: string | null; costume?: string | null },
  override?: readonly Unlock[],
): WardrobeState {
  let { theme, accessories, costume } = s;
  if (sel.theme !== undefined && isUnlocked(s, { kind: "theme", id: sel.theme }, override)) theme = sel.theme;
  if (sel.accessory === null) accessories = [];
  else if (isAccessory(sel.accessory) && isUnlocked(s, { kind: "accessory", id: sel.accessory }, override)) accessories = wear(accessories, sel.accessory);
  if (sel.costume === null) costume = null;
  else if (isCostume(sel.costume) && isUnlocked(s, { kind: "costume", id: sel.costume }, override)) costume = costume === sel.costume ? null : sel.costume;
  const same = theme === s.theme && costume === s.costume && accessories.join() === s.accessories.join();
  return same ? s : { ...s, theme, accessories, costume };
}

/** Sıradaki bildirilecek açılım (kuyruktan düşer). */
export function takePending(s: WardrobeState): { state: WardrobeState; next: AchievementId | null } {
  if (!s.pending.length) return { state: s, next: null };
  const [next, ...rest] = s.pending;
  return { state: { ...s, pending: rest }, next };
}

/** Açılımın verdiği parça. */
export function unlockOf(id: AchievementId): Unlock {
  return ACHIEVEMENTS.find((a) => a.id === id)!.unlocks;
}

/** dunno.exe wardrobe.exe sekmesinin gördüğü özet (sadece cihaz içi). */
export interface WardrobeView {
  theme: string;
  accessories: string[];
  costume: string | null;
  unlocked: Unlock[];
  achievements: { id: AchievementId; value: number; target: number; done: boolean; at: string | null; unlocks: Unlock }[];
}

/** override: test modunda açık görünen liste; başarım ilerlemesi yine gerçek değerlerle gösterilir. */
export function wardrobeView(s: WardrobeState, now: Date, override?: readonly Unlock[]): WardrobeView {
  return {
    theme: s.theme,
    accessories: [...s.accessories],
    costume: s.costume,
    unlocked: [
      ...(override ? [...override] : unlockedItems(s.progress)),
      ...[...modThemes].map((id) => ({ kind: "theme" as const, id })),
      ...[...modSlots.keys()].map((id) => ({ kind: "accessory" as const, id })),
      ...[...modCostumes.keys()].map((id) => ({ kind: "costume" as const, id })),
    ],
    achievements: ACHIEVEMENTS.map((a) => {
      const p = progressOf(s.progress, a.id, now);
      return { id: a.id, value: p.value, target: p.target, done: p.done, at: s.progress.unlocked[a.id] ?? null, unlocks: a.unlocks };
    }),
  };
}
