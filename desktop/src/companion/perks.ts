// Yetenek ağacı (SPEC 17 R5b, kullanıcı isteği: "rpg oyunlarındaki gibi level atladıkça ekstra özellik açılsın, gerçek ağaç olsun").
// Üç dal: akıl (konuşma), beden (hareket), ruh (evrim + lore). Her düğüm bir level'da kendiliğinden açılır ve GERÇEK bir şey yapar.
// Konumlar elle (ağaç görünümü app-view'da SVG). Evrim düğümleri ruh dalında dallanır: dunno -> chaos/chill -> 4 form.
import type { Form } from "./evolution";

export type Branch = "os" | "mind" | "body" | "soul";

export const PERK_IDS = [
  "greeting",
  "app_gossip",
  "memory_lines",
  "bond",
  "zoomies",
  "card_frame",
  "dance",
  "victory_lap",
  "lore_1",
  "evolve_1",
  "lore_2",
  "stats_tab",
  "workshop_tab",
  "alarm_plus",
  "lore_3",
] as const;
export type PerkId = (typeof PERK_IDS)[number];

export interface Perk {
  id: PerkId;
  branch: Branch;
  level: number;
  parent: PerkId | "root";
  /** SVG konumu (viewBox 840 x 420) */
  x: number;
  y: number;
}

export const PERKS: readonly Perk[] = [
  // os: dunno.exe sekmeleri ve araçlar (FB6/FB7)
  { id: "stats_tab", branch: "os", level: 3, parent: "root", x: 70, y: 110 },
  { id: "alarm_plus", branch: "os", level: 5, parent: "stats_tab", x: 70, y: 180 },
  { id: "workshop_tab", branch: "os", level: 10, parent: "alarm_plus", x: 70, y: 250 },
  // akıl: konuşma
  { id: "greeting", branch: "mind", level: 2, parent: "root", x: 220, y: 110 },
  { id: "app_gossip", branch: "mind", level: 6, parent: "greeting", x: 220, y: 180 },
  { id: "memory_lines", branch: "mind", level: 12, parent: "app_gossip", x: 220, y: 250 },
  { id: "bond", branch: "mind", level: 30, parent: "memory_lines", x: 220, y: 320 },
  // beden: hareket ve görünüm
  { id: "zoomies", branch: "body", level: 4, parent: "root", x: 380, y: 110 },
  { id: "card_frame", branch: "body", level: 8, parent: "zoomies", x: 380, y: 180 },
  { id: "dance", branch: "body", level: 15, parent: "card_frame", x: 380, y: 250 },
  { id: "victory_lap", branch: "body", level: 22, parent: "dance", x: 380, y: 320 },
  // ruh: lore + evrim (evrim düğümünden form ağacı çıkar; lore zinciri en sağda)
  { id: "lore_1", branch: "soul", level: 3, parent: "root", x: 600, y: 110 },
  { id: "evolve_1", branch: "soul", level: 10, parent: "lore_1", x: 600, y: 180 },
  { id: "lore_2", branch: "soul", level: 15, parent: "evolve_1", x: 780, y: 180 },
  { id: "lore_3", branch: "soul", level: 20, parent: "lore_2", x: 780, y: 250 },
];

export const ROOT = { x: 380, y: 34 } as const;

/** evrim formlarının ağaçtaki yeri (ruh dalı, evolve_1/evolve_2 altında) */
export const FORM_NODES: Readonly<Record<Exclude<Form, "dunno">, { x: number; y: number; parent: Form }>> = {
  chaos: { x: 540, y: 250, parent: "dunno" },
  chill: { x: 675, y: 250, parent: "dunno" },
  gremlin: { x: 500, y: 320, parent: "chaos" },
  demon: { x: 570, y: 320, parent: "chaos" },
  sloth: { x: 645, y: 320, parent: "chill" },
  cloud: { x: 712, y: 320, parent: "chill" },
  glitchling: { x: 605, y: 385, parent: "chaos" },
};

export const hasPerk = (level: number, id: PerkId): boolean => level >= (PERKS.find((p) => p.id === id)?.level ?? Infinity);

/** sıradaki açılacak düğüm (en düşük level); hepsi açıksa null */
export function nextPerk(level: number): Perk | null {
  return [...PERKS].filter((p) => p.level > level).sort((a, b) => a.level - b.level)[0] ?? null;
}

/** bu level aralığında açılanlar (level atlayınca toast) */
export const perksBetween = (from: number, to: number): Perk[] => PERKS.filter((p) => p.level > from && p.level <= to);
