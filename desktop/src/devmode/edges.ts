// Test modu "kenara gönder" (SPEC 07 FB2, saf): sol/sağ/üst/alt ve 4 köşe için pet kutusunun hedefi.
// Pet normalde U yolunda yürür (pet/path.ts: sol, alt, sağ); üst kenar yolda yok: serbest konum (s = null).
// Köşelerde yan kenar sayılır (kenar pozu peek görünsün); poz ve yön uygulamanın kuralından (pet/facing.ts).
import type { Facing } from "../player/player";
import { facingForEdge, restStateFor, type ScreenEdge } from "../pet/facing";
import type { EdgePath } from "../pet/path";
import type { PetState } from "../pet/state";

export const EDGE_TARGETS = ["left", "right", "top", "bottom", "top_left", "top_right", "bottom_left", "bottom_right"] as const;
export type EdgeTarget = (typeof EDGE_TARGETS)[number];

export interface EdgePlacement {
  /** pet kutusunun sol üstü, çalışma alanına göre (mantıksal px) */
  x: number;
  y: number;
  /** yol koordinatı (controller hedefi); üst kenarda null: yol dışı, doğrudan konum */
  s: number | null;
  edge: ScreenEdge;
  /** orada dururken poz ve yön */
  state: PetState;
  facing: Facing;
}

/** Hedefin konumu, kenarı ve pozu. Yollar EdgePath ile aynı (yan kenar ortaları, köşeler yolun uçları). */
export function edgePlacement(target: EdgeTarget, path: EdgePath): EdgePlacement {
  const at = (s: number): Omit<EdgePlacement, "state" | "facing"> => {
    const p = path.pointAt(s);
    // köşe noktalarında yol alt kenarı döndürür; köşe hedefinde yan kenarı istiyoruz (peek)
    return { x: p.x, y: p.y, s: path.clamp(s), edge: p.edge };
  };
  let base: Omit<EdgePlacement, "state" | "facing">;
  switch (target) {
    case "left":
      base = at(path.vLen / 2);
      break;
    case "right":
      base = at(path.length - path.vLen / 2);
      break;
    case "bottom":
      base = at(path.bottomStart + path.xMax / 2);
      break;
    case "top":
      base = { x: Math.round(path.xMax / 2), y: 0, s: null, edge: "top" };
      break;
    case "top_left":
      base = { ...at(0), edge: "left" };
      break;
    case "top_right":
      base = { ...at(path.length), edge: "right" };
      break;
    case "bottom_left":
      base = { ...at(path.bottomStart), edge: "left" };
      break;
    case "bottom_right":
      base = { ...at(path.bottomEnd), edge: "right" };
      break;
  }
  const state = restStateFor(base.edge);
  return { ...base, state, facing: facingForEdge(state, base.edge, "right") };
}
