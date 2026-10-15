// Seçim yorgunluğuna karşı (SPEC 15, saf): hazır görünümler, paketler, öneriler. Plan v2: sınırsız seçim != iyi UX.
// Hepsi Free; sadece açılmış parçalarla çalışır (kilitli parçalı hazır görünüm "x/y açık" gösterir, uygulanamaz).
import type { Unlock } from "../wardrobe/achievements";
import { isUnlocked, select, type WardrobeState, type WardrobeView } from "../wardrobe/wardrobe";

export interface Preset {
  id: string;
  theme: string;
  costume: string | null;
  accessories: readonly string[];
}

/** küratörlü hazır görünümler (az ve farklı; tasarımcı onayı bekler) */
export const PRESETS: readonly Preset[] = [
  { id: "starter", theme: "classic", costume: null, accessories: ["beanie"] },
  { id: "cozy", theme: "lavender", costume: null, accessories: ["nightcap", "scarf"] },
  { id: "office", theme: "coffee", costume: null, accessories: ["nerd_glasses", "bow_tie"] },
  { id: "party", theme: "cotton_candy", costume: null, accessories: ["party_hat", "sunglasses"] },
  { id: "buzz", theme: "lemon", costume: "bee", accessories: ["sunglasses"] },
  { id: "spooky", theme: "midnight", costume: "ghost", accessories: [] },
];

/** kostüm paketleri (dolapta başlıklı gruplar); listede olmayan (mod/gizli) "other" */
export const PACKS: Readonly<Record<string, readonly string[]>> = {
  bugs: ["bug", "fly", "bee", "cockroach"],
  animals: ["cat", "dog", "duck", "fish", "frog", "dino"],
  spooky: ["ghost", "skeleton", "vampire", "mini_monster"],
  odd: ["slime", "mushroom", "robot", "alien", "astronaut", "pizza"],
};
export const PACK_IDS = [...Object.keys(PACKS), "other"] as const;

export function packOf(costume: string): string {
  return Object.entries(PACKS).find(([, ids]) => ids.includes(costume))?.[0] ?? "other";
}

const parts = (p: Preset): Unlock[] => [
  { kind: "theme", id: p.theme },
  ...(p.costume ? [{ kind: "costume" as const, id: p.costume }] : []),
  ...p.accessories.map((id) => ({ kind: "accessory" as const, id })),
];

/** Hazır görünümün kaç parçası açık (dolap görünümünden). */
export function presetOpen(w: Pick<WardrobeView, "unlocked">, p: Preset): { open: number; total: number } {
  const list = parts(p);
  return { open: list.filter((u) => w.unlocked.some((x) => x.kind === u.kind && x.id === u.id)).length, total: list.length };
}

/** Hazır görünümü uygular (hepsi açıksa; değilse durum aynı). Aksesuarlar baştan giyilir. */
export function applyPreset(s: WardrobeState, p: Preset, override?: readonly Unlock[]): WardrobeState {
  if (!parts(p).every((u) => isUnlocked(s, u, override))) return s;
  let r = select(s, { theme: p.theme, accessory: null, costume: null }, override);
  if (p.costume) r = select(r, { costume: p.costume }, override);
  for (const a of p.accessories) r = select(r, { accessory: a }, override);
  return r;
}

/** Öneri: bitmeye en yakın başarımlar (oran büyükten), en fazla n. */
export function recommend(w: Pick<WardrobeView, "achievements">, n = 2): WardrobeView["achievements"] {
  return w.achievements
    .filter((a) => !a.done && a.target > 0)
    .sort((a, b) => b.value / b.target - a.value / a.target || a.target - b.target)
    .slice(0, n);
}
