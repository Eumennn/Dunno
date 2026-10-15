// Yay (bezier) uçuşu ve iniş yaylanması (SPEC 10 CL2, saf). Clicky'deki bezier yay + yay fikri; kod taşınmadı.
// "dunno'yu çağır", "kenara gönder", sürükle-bırak sonrası kenara oturma ve test modu pin bırakma: ışınlanma/düz çizgi yerine
// ikinci dereceden bezier (başlangıç, yukarı kalkık kontrol noktası, hedef) + smoothstep zamanlama, 600-900 ms.
// Kontrol noktası çalışma alanı kutusuna kenetlenir: bezier eğrisi üç noktanın dışbükey zarfında kalır, yani uçuş ekrandan taşmaz.
// İniş: 1-2 karelik yaylanma, sprite tam sayı pikseli kadar kenara doğru basılma ve geri (ölçek değil).

export interface Pt {
  x: number;
  y: number;
}

export const FLIGHT_MIN_MS = 600;
export const FLIGHT_MAX_MS = 900;
/** yay yüksekliği: mesafenin bu oranı, [ARC_MIN, ARC_MAX] px */
export const ARC_RATIO = 0.35;
export const ARC_MIN = 24;
export const ARC_MAX = 180;
/** yaylanma kareleri: [süre ms, kenara doğru sprite px]. FB5: hep negatif (kenardan içeri hafif sekme, dur): eskiden +2 px
 *  ile kenarı geçiyordu (alt kenarda görev çubuğunun altına, yan kenarda ekran dışına). */
export const BOUNCE: readonly (readonly [number, number])[] = [
  [80, -2],
  [80, -1],
];
export const BOUNCE_MS = BOUNCE.reduce((t, [ms]) => t + ms, 0);

export interface Flight {
  from: Pt;
  ctrl: Pt;
  to: Pt;
  ms: number;
}

/** smoothstep 3t² − 2t³ (t [0,1] dışı kenetlenir). */
export function smoothstep(t: number): number {
  const k = Math.min(1, Math.max(0, t));
  return k * k * (3 - 2 * k);
}

/** Uçuş süresi: mesafeyle 600'den 900 ms'ye. */
export function flightMs(distance: number): number {
  return Math.round(Math.min(FLIGHT_MAX_MS, Math.max(FLIGHT_MIN_MS, FLIGHT_MIN_MS + distance * 0.25)));
}

/**
 * Uçuş planı. bounds: kutunun sol üst köşesinin alabileceği alan [0..maxX] x [minY..maxY] (çalışma alanı - kutu).
 * Kontrol noktası iki ucun ortasından yukarı (ekranda y küçülür) kalkar ve alana kenetlenir.
 */
export function planFlight(from: Pt, to: Pt, bounds: { maxX: number; minY?: number; maxY: number }): Flight {
  const d = Math.hypot(to.x - from.x, to.y - from.y);
  const arc = Math.min(ARC_MAX, Math.max(ARC_MIN, d * ARC_RATIO));
  const mid = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - arc };
  const ctrl = {
    x: Math.min(bounds.maxX, Math.max(0, mid.x)),
    y: Math.min(bounds.maxY, Math.max(bounds.minY ?? 0, mid.y)),
  };
  return { from: { ...from }, ctrl, to: { ...to }, ms: flightMs(d) };
}

/** t (0..1 zaman oranı) anında konum: smoothstep zamanlama, tam sayı piksel; t >= 1 tam hedef. */
export function flightAt(f: Flight, t: number): Pt {
  if (t >= 1) return { ...f.to };
  const u = smoothstep(t);
  const a = (1 - u) * (1 - u);
  const b = 2 * (1 - u) * u;
  const c = u * u;
  return {
    x: Math.round(a * f.from.x + b * f.ctrl.x + c * f.to.x),
    y: Math.round(a * f.from.y + b * f.ctrl.y + c * f.to.y),
  };
}

/** İnişten ms sonra kenara doğru sprite piksel ofseti (tam sayı); yaylanma bitince 0. */
export function bounceAt(ms: number): number {
  if (ms < 0) return 0;
  let t = 0;
  for (const [len, px] of BOUNCE) {
    if (ms < t + len) return px;
    t += len;
  }
  return 0;
}

/** Kenara doğru birim yön (pencere px): alt kenar aşağı, sol kenar sola, sağ kenar sağa. */
export function towardEdge(edge: "left" | "right" | "bottom" | "top"): Pt {
  switch (edge) {
    case "left":
      return { x: -1, y: 0 };
    case "right":
      return { x: 1, y: 0 };
    case "top":
      return { x: 0, y: -1 };
    default:
      return { x: 0, y: 1 };
  }
}

// ------------------------------------------------------------------ paraşütlü iniş (Plan v2 CL2 ek isteği)
// Havada bırakılınca hedefe yapışmaz: kısa serbest düşüş, mini paraşüt açılır, yavaşça ve hafif salınarak alt kenara iner,
// sonra aynı yaylanma. Kenara yapışık bırakılırsa (yan duvar yakınında ya da zaten altta) yay uçuşu sürer.

/** havada sayılmak için alt kenardan en az bu kadar yukarıda (mantıksal px) */
export const AIR_MIN = 48;
/** yan duvara bu kadar yakın bırakılırsa duvara yay uçuşu (peek) */
export const SIDE_HUG = 56;
/** paraşüt açılmadan önceki serbest düşüş: sürenin bu oranı, yolun bu oranı */
export const FREE_FALL_T = 0.1;
export const FREE_FALL_D = 0.14;
/** süzülme süresi: mesafe başına ms, sınırlar */
export const CHUTE_MS_PER_PX = 6;
export const CHUTE_MIN_MS = 1_100;
export const CHUTE_MAX_MS = 3_400;
/** yatay salınım genliği (mantıksal px) ve tur sayısı */
export const SWAY_PX = 5;
export const SWAY_TURNS = 1.5;

export interface Chute {
  from: Pt;
  to: Pt;
  ms: number;
}

/** Bırakma türü: havada (paraşüt) mı, kenara yakın (yay) mı. bounds: kutunun alabileceği en büyük x / y. */
export function dropKind(box: Pt, bounds: { maxX: number; maxY: number }): "chute" | "arc" {
  const inAir = box.y < bounds.maxY - AIR_MIN;
  const nearSide = box.x < SIDE_HUG || box.x > bounds.maxX - SIDE_HUG;
  return inAir && !nearSide ? "chute" : "arc";
}

/** Paraşüt planı: dikey olarak alt kenara (x aynı, alana kenetli). */
export function planChute(from: Pt, bounds: { maxX: number; maxY: number }): Chute {
  const to = { x: Math.min(bounds.maxX, Math.max(0, Math.round(from.x))), y: bounds.maxY };
  const d = Math.max(0, to.y - from.y);
  return { from: { ...from }, to, ms: Math.round(Math.min(CHUTE_MAX_MS, Math.max(CHUTE_MIN_MS, d * CHUTE_MS_PER_PX))) };
}

/**
 * t (0..1) anında konum, tam sayı piksel. Önce hızlı düşüş (FREE_FALL_T sürede FREE_FALL_D yol), sonra sabit yavaş süzülme;
 * yatay salınım paraşüt açılınca başlar, inişe doğru söner (tam hedef x'e iner). t >= 1 tam hedef. Alan dışına çıkmaz.
 */
export function chuteAt(c: Chute, t: number, bounds: { maxX: number; maxY: number }): Pt {
  if (t >= 1) return { ...c.to };
  const k = Math.max(0, t);
  const fall = k < FREE_FALL_T ? (k / FREE_FALL_T) ** 2 * FREE_FALL_D : FREE_FALL_D + ((k - FREE_FALL_T) / (1 - FREE_FALL_T)) * (1 - FREE_FALL_D);
  const glide = Math.max(0, (k - FREE_FALL_T) / (1 - FREE_FALL_T));
  const sway = SWAY_PX * Math.sin(glide * SWAY_TURNS * 2 * Math.PI) * (1 - glide);
  const x = Math.round(c.from.x + (c.to.x - c.from.x) * k + sway);
  const y = Math.round(c.from.y + (c.to.y - c.from.y) * fall);
  return { x: Math.min(bounds.maxX, Math.max(0, x)), y: Math.min(bounds.maxY, Math.max(0, y)) };
}

/** Paraşüt görünür mü (serbest düşüş bitince açılır, inişe kadar). */
export const chuteOpen = (t: number): boolean => t >= FREE_FALL_T && t < 1;
