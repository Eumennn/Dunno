// Kenara göre yön (UP7, saf). Sprite'lar sağa bakacak şekilde çizili; "left" = yatay ayna.
// peek: sprite'ta duvar sağda -> sağ kenarda olduğu gibi, sol kenarda ayna (duvar ekran kenarında kalır).
// sleep: yüz sağa bakar -> kenara sırtını verir: sol kenarda olduğu gibi, sağ kenarda ayna.
// walk / run_away: hareket yönü (çağıranın verdiği son yön). Önden pozlar simetrik: hiç aynalanmaz.
import type { Facing } from "../player/player";
import type { Edge } from "./path";
import type { PetState } from "./state";

export type ScreenEdge = Edge | "top";

/** Önden çizilmiş (simetrik) pozlar: ayna gerekmez, sol üst ışık hep aynı tarafta kalsın. */
const SYMMETRIC: ReadonlySet<PetState> = new Set<PetState>(["idle", "talk", "shrug", "shh", "dragged", "sulk"]);

export function facingForEdge(state: PetState, edge: ScreenEdge, lastFacing: Facing): Facing {
  if (state === "walk" || state === "run_away") return lastFacing;
  if (SYMMETRIC.has(state)) return "right";
  if (state === "peek") return edge === "left" ? "left" : "right";
  if (state === "sleep") return edge === "right" ? "left" : edge === "left" ? "right" : lastFacing;
  return lastFacing;
}

/** Kenarda dururken poz: yan kenarda peek, alt ve üst kenarda idle (yukarıdan sarkma pozu yok). */
export function restStateFor(edge: ScreenEdge): PetState {
  return edge === "left" || edge === "right" ? "peek" : "idle";
}
