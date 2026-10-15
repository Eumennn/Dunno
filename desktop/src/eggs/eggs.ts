// Gizli dünyalar + canavar modu (SPEC 14, saf). Sadece cihazda: dürtme sayısı ve açılan dünyalar store'da, hiçbir yere gitmez
// (telemetri olayı yok). Zorlama yok: açılan dünya bir kez söylenir, sonra settings.exe'den seçilir ya da kapatılır.
// - 100 dürtme: kağıt dünya (karakalem görünüm, defter zemini, kendine özel laflar)
// - 1000 dürtme: glitch dünya (bozuk renkler, ara sıra geri geri yürür, gizli yaratık "glitch" dolapta, kendine özel laflar)
// - canavar modu: gizli hareket = 20 sn içinde üç kez art arda dürtme sağanağı (Dunno'yu fazla kızdırınca). Aynı hareket kapatır.

export const WORLDS = ["normal", "paper", "glitch"] as const;
export type World = (typeof WORLDS)[number];
/** dünyanın açıldığı ömür boyu dürtme sayısı */
export const WORLD_AT: Record<Exclude<World, "normal">, number> = { paper: 100, glitch: 1000 };

/** dürtme sağanağı: SPAM_WINDOW_MS içinde SPAM_CLICKS dürtme (talk/triggers.ts ile aynı eşik) */
export const BURST_CLICKS = 4;
export const BURST_WINDOW_MS = 2_000;
/** canavar: bu süre içinde bu kadar sağanak */
export const MONSTER_BURSTS = 3;
export const MONSTER_WINDOW_MS = 20_000;

export interface EggState {
  /** ömür boyu dürtme (stats.txt toplamından başlar) */
  pokes: number;
  /** açılan dünyalar ("normal" hep açık, listede tutulmaz) */
  worlds: Exclude<World, "normal">[];
  /** seçili dünya */
  world: World;
  monster: boolean;
  /** canavar modunu bir kez bulduysa settings.exe'de anahtarı görünür */
  monsterFound: boolean;
}

export const initialEggs = (): EggState => ({ pokes: 0, worlds: [], world: "normal", monster: false, monsterFound: false });

const isWorld = (v: unknown): v is World => typeof v === "string" && (WORLDS as readonly string[]).includes(v);

/** Store'dan gelen bozuk/eski kaydı onarır. statsClicks: stats.txt toplam dürtme (sayaç ondan geri gitmez). */
export function cleanEggs(raw: unknown, statsClicks = 0): EggState {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Partial<Record<keyof EggState, unknown>>;
  const pokes = Math.max(typeof r.pokes === "number" && Number.isFinite(r.pokes) && r.pokes >= 0 ? Math.floor(r.pokes) : 0, statsClicks);
  // açılanlar sayaçla tutarlı: sayaç eşiği geçtiyse açık (eski kurulumda biriken dürtmeler de sayılır)
  const worlds = (Object.keys(WORLD_AT) as Exclude<World, "normal">[]).filter(
    (w) => pokes >= WORLD_AT[w] || (Array.isArray(r.worlds) && r.worlds.includes(w)),
  );
  const world = isWorld(r.world) && (r.world === "normal" || worlds.includes(r.world)) ? r.world : "normal";
  const monsterFound = r.monsterFound === true;
  return { pokes, worlds, world, monster: monsterFound && r.monster === true, monsterFound };
}

/** Dürtme zaman damgaları (sadece bellekte; sağanak tespiti için). */
export interface PokeTracker {
  clicks: number[];
  bursts: number[];
}
export const initialTracker = (): PokeTracker => ({ clicks: [], bursts: [] });

export interface PokeResult {
  state: EggState;
  tracker: PokeTracker;
  /** bu dürtmeyle açılan dünya (bir kez) */
  unlocked: Exclude<World, "normal"> | null;
  /** canavar modu bu dürtmeyle açıldı/kapandı */
  monsterToggled: boolean;
}

/** Bir dürtme: sayaç, dünya eşikleri, canavar hareketi. */
export function notePoke(s: EggState, t: PokeTracker, nowMs: number): PokeResult {
  const pokes = s.pokes + 1;
  let unlocked: PokeResult["unlocked"] = null;
  let worlds = s.worlds;
  for (const w of Object.keys(WORLD_AT) as Exclude<World, "normal">[]) {
    if (pokes >= WORLD_AT[w] && !worlds.includes(w)) {
      worlds = [...worlds, w];
      unlocked = w;
    }
  }
  let clicks = [...t.clicks.filter((c) => nowMs - c < BURST_WINDOW_MS), nowMs];
  let bursts = t.bursts.filter((b) => nowMs - b < MONSTER_WINDOW_MS);
  if (clicks.length >= BURST_CLICKS) {
    bursts = [...bursts, nowMs];
    clicks = [];
  }
  let monster = s.monster;
  let monsterFound = s.monsterFound;
  let monsterToggled = false;
  if (bursts.length >= MONSTER_BURSTS) {
    monster = !monster;
    monsterFound = true;
    monsterToggled = true;
    bursts = [];
  }
  return { state: { ...s, pokes, worlds, monster, monsterFound }, tracker: { clicks, bursts }, unlocked, monsterToggled };
}

/** settings.exe: dünya seçimi (açılmamış dünya seçilemez). */
export function chooseWorld(s: EggState, w: World): EggState {
  return w === "normal" || s.worlds.includes(w) ? { ...s, world: w } : s;
}

/** settings.exe: canavar anahtarı (sadece bulunduysa). */
export function setMonster(s: EggState, on: boolean): EggState {
  return s.monsterFound ? { ...s, monster: on } : s;
}

/** Görünüm önceliği: canavar > dünya > dolap seçimi. Gizli tema/kostüm id'leri "egg_" önekli (dolapla çakışmaz). */
export function eggLook(s: EggState): { theme: string | null; costume: string | null } {
  if (s.monster) return { theme: "egg_monster", costume: "egg_monster" };
  if (s.world === "paper") return { theme: "egg_paper", costume: null };
  if (s.world === "glitch") return { theme: "egg_glitch", costume: null };
  return { theme: null, costume: null };
}

/** Kendiliğinden lafta gizli havuz tetiği ve payı (geri kalanı normal laflar; dünya Dunno'yu değiştirmez, tadını değiştirir). */
export function eggTrigger(s: EggState): { trigger: string; share: number } | null {
  if (s.monster) return { trigger: "egg:monster", share: 0.6 };
  if (s.world !== "normal") return { trigger: `egg:${s.world}`, share: 0.4 };
  return null;
}

/** Glitch dünyasında ara sıra geri geri yürür (yürüyüş başına olasılık). */
export const MOONWALK_CHANCE = 0.35;

/** Canavar balonu: koyu dolgu, açık yazı (ana paletten; kontrast testli). */
export const MONSTER_BUBBLE = { fill: "#2B1E2F", ink: "#FFF1D6" } as const;
