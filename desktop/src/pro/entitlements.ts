// Free / Başarım / Pro (SPEC 15, saf). İlke (Plan v2): Pro karakteri kilitlemez, derinlik satar.
// - Free: tam ve eğlenceli temel Dunno. Tüm kostüm/tema/aksesuarlar başarımlarla açılır (hiçbiri satılmaz), temel laf havuzu,
//   ses, gizli dünyalar, temel modlar (tema/aksesuar/laf/balon, en fazla FREE_MAX_MODS), 3 aksesuar yeri.
// - Başarım ilerlemesi: açılan başarım sayısıyla balon ve ses stilleri, canavar modu anahtarı (PROGRESSION).
// - Pro: daha derin uygulama havuzları + nadir laflar (`pro: true`), 5 aksesuar yeri, kişilik ön ayarları, gelişmiş modlar
//   (kostüm/ses/davranış, daha çok mod), Kişisel Dunno (SPEC 16, ayrıca açık rıza).
// Pro durumu Rust lisansından (license.rs, çevrimdışı) ya da test modu simülasyonundan; ağ yok.

export type Tier = "free" | "pro";

export const FREE_MAX_WORN = 3;
export const PRO_MAX_WORN = 5;
export const FREE_MAX_MODS = 3;
export const PRO_MAX_MODS = 32;
/** Free modların kullanabildiği türler; diğerleri (costumes, sounds, behavior) Pro */
export const FREE_MOD_KINDS = ["themes", "accessories", "reactions", "bubbles"] as const;

export const maxWorn = (t: Tier) => (t === "pro" ? PRO_MAX_WORN : FREE_MAX_WORN);
export const maxMods = (t: Tier) => (t === "pro" ? PRO_MAX_MODS : FREE_MAX_MODS);

/** Bu mod bu katmanda yüklenebilir mi (izin listesindeki türlere göre); değilse neden. */
export function modAllowed(t: Tier, permissions: readonly string[]): { ok: true } | { ok: false; kinds: string[] } {
  if (t === "pro") return { ok: true };
  const kinds = permissions.filter((p) => !(FREE_MOD_KINDS as readonly string[]).includes(p));
  return kinds.length ? { ok: false, kinds } : { ok: true };
}

/** Laf bu katmanda söylenebilir mi (`pro: true` derin/nadir laflar Pro). */
export const lineAllowed = (t: Tier, line: unknown): boolean => t === "pro" || (line as { pro?: unknown })?.pro !== true;

// ---------------------------------------------------------------- kişilik (Pro)

export const PERSONALITIES = ["balanced", "calm", "chatty", "chaotic"] as const;
export type Personality = (typeof PERSONALITIES)[number];
/** konuşma sıklığı / dinlenme çarpanı (modların davranış sınırlarıyla aynı aralık: 0.5..2) */
export const PERSONALITY: Record<Personality, { chattiness: number; restScale: number }> = {
  balanced: { chattiness: 1, restScale: 1 },
  calm: { chattiness: 0.6, restScale: 1.6 },
  chatty: { chattiness: 1.7, restScale: 0.9 },
  chaotic: { chattiness: 1.4, restScale: 0.55 },
};
/** Free'de hep dengeli (ayar korunur, Pro gelince geri gelir). */
export const personalityFor = (t: Tier, p: Personality) => PERSONALITY[t === "pro" ? p : "balanced"];

// ---------------------------------------------------------------- başarım ilerlemesi (herkes)

export const BUBBLE_STYLES = ["classic", "mint", "night", "cotton", "ink"] as const;
export type BubbleStyleId = (typeof BUBBLE_STYLES)[number];
/** balon dolgu / yazı (tema renklerinden; kontrast testli). classic = temanın kâğıdı */
export const BUBBLE_COLORS: Record<Exclude<BubbleStyleId, "classic">, { fill: string; ink: string }> = {
  mint: { fill: "#BDEBD2", ink: "#2B1E2F" },
  night: { fill: "#D9E0F6", ink: "#2B1E2F" },
  cotton: { fill: "#FFD1EC", ink: "#2B1E2F" },
  ink: { fill: "#2B1E2F", ink: "#FFF1D6" },
};

export const VOICE_STYLES = ["classic", "tiny", "robot", "deep"] as const;
export type VoiceStyleId = (typeof VOICE_STYLES)[number];

export type Reward = { kind: "bubble"; id: Exclude<BubbleStyleId, "classic"> } | { kind: "voice"; id: Exclude<VoiceStyleId, "classic"> } | { kind: "monster" };

/** açılan başarım sayısı -> ödül (ilerleme; az seçenekle başlar, zamanla açılır) */
export const PROGRESSION: readonly { at: number; reward: Reward }[] = [
  { at: 3, reward: { kind: "bubble", id: "mint" } },
  { at: 6, reward: { kind: "voice", id: "tiny" } },
  { at: 10, reward: { kind: "bubble", id: "night" } },
  { at: 15, reward: { kind: "voice", id: "robot" } },
  { at: 20, reward: { kind: "monster" } },
  { at: 25, reward: { kind: "bubble", id: "cotton" } },
  { at: 32, reward: { kind: "voice", id: "deep" } },
  { at: 40, reward: { kind: "bubble", id: "ink" } },
];

/** Açılan başarım sayısına göre açık ödüller ve sıradaki. */
export function progression(done: number): { open: Reward[]; next: { at: number; reward: Reward } | null } {
  return { open: PROGRESSION.filter((p) => done >= p.at).map((p) => p.reward), next: PROGRESSION.find((p) => done < p.at) ?? null };
}

export const bubbleOpen = (done: number, id: BubbleStyleId) => id === "classic" || progression(done).open.some((r) => r.kind === "bubble" && r.id === id);
export const voiceOpen = (done: number, id: VoiceStyleId) => id === "classic" || progression(done).open.some((r) => r.kind === "voice" && r.id === id);
export const monsterByProgress = (done: number) => progression(done).open.some((r) => r.kind === "monster");
