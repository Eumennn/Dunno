// Hareket kararları ve adımlama (saf). Yol geometrisi: path.ts.
import type { Facing } from "../player/player";
import type { EdgePath } from "./path";

/** mantıksal px / sn */
export const WALK_SPEED = 18;
export const RUN_SPEED = 110;
export const RUN_DISTANCE = 220;
export const RUN_COOLDOWN_MS = 30_000;
export const MIN_WALK = 80;
/** tıklama ile sürüklemeyi ayıran eşik (mantıksal px) */
export const DRAG_THRESHOLD = 4;
/** yürüyüşler arası dinlenme (ms) */
export const REST_MS: readonly [number, number] = [8_000, 20_000];

export type Rng = () => number;

/** Hedefe sabit hızla yaklaşır. */
export function stepToward(s: number, target: number, speed: number, dtMs: number): { s: number; arrived: boolean } {
  const max = (speed * dtMs) / 1000;
  const d = target - s;
  if (Math.abs(d) <= max) return { s: target, arrived: true };
  return { s: s + Math.sign(d) * max, arrived: false };
}

/** Yol boyunca s artarken sağa bakar (sprite'lar sağa çizili). */
export function facingFor(ds: number, current: Facing): Facing {
  if (ds > 0) return "right";
  if (ds < 0) return "left";
  return current;
}

export function isDrag(dx: number, dy: number, threshold = DRAG_THRESHOLD): boolean {
  return Math.hypot(dx, dy) > threshold;
}

/**
 * İmlecin tersine, kenar boyunca kaçış hedefi.
 * dx/dy: imlecin pet'e göre yönü (-1/0/1), Rust'tan.
 */
export function runAwayTarget(path: EdgePath, s: number, dx: number, dy: number, distance = RUN_DISTANCE): number {
  const edge = path.pointAt(s).edge;
  // ekranda kaçış yönü (-dx, -dy) -> yol yönü
  let dir = edge === "bottom" ? -dx : edge === "left" ? -dy : dy;
  if (dir === 0) dir = path.length - s >= s ? 1 : -1; // imleç tam karşıda: geniş tarafa
  let target = path.clamp(s + dir * distance);
  if (Math.abs(target - s) < distance / 4) target = path.clamp(s - dir * distance); // köşeye sıkıştı: öbür yana
  return target;
}

export type NextAction =
  | { kind: "walk"; target: number }
  | { kind: "idle"; ms: number }
  | { kind: "shrug" }
  | { kind: "sleep"; ms: number };

const between = (rng: Rng, a: number, b: number) => a + rng() * (b - a);

/** Rastgele yürüyüş hedefi; çoğunlukla alt kenar. */
export function pickTarget(path: EdgePath, s: number, rng: Rng): number {
  for (let i = 0; i < 4; i++) {
    const target =
      rng() < 0.7 ? between(rng, path.bottomStart, path.bottomEnd) : between(rng, 0, path.length);
    if (Math.abs(target - s) >= MIN_WALK) return target;
  }
  // yol çok kısa ya da şans kötü: uzak uca git
  return s > path.length / 2 ? 0 : path.length;
}

/** Durunca sırada ne yapılacak. */
export function pickNext(path: EdgePath, s: number, rng: Rng): NextAction {
  const r = rng();
  if (r < 0.45) return { kind: "walk", target: pickTarget(path, s, rng) };
  if (r < 0.65) return { kind: "idle", ms: between(rng, ...REST_MS) };
  if (r < 0.78) return { kind: "shrug" };
  return { kind: "sleep", ms: between(rng, 30_000, 90_000) };
}

// bırakınca oturma artık yay uçuşu (SPEC 10 CL2): pet/flight.ts
