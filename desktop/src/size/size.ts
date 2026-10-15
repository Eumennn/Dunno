// Pet boyutu (SPEC 08 SZ1, saf): seviye -> tam sayı sprite ölçeği ve buna bağlı her ölçü.
// PM kararı: minik 1x, küçük 2x (varsayılan = bugünkü SPRITE_SCALE), normal 3x, büyük 4x, dev 5x.
// Keskinlik: her sprite pikseli tam sayı kadar CİHAZ pikseline düşer (round(ölçek x dpr), player.pixelScale ile aynı);
// mantıksal ölçüler bundan türetilir (dpr 1.25/1.5'te kesirli olabilir, fiziksel her zaman tam sayı).
// Birimler: "sprite px" = 32x32 sprite ızgarası; "mantıksal" = CSS/Tauri mantıksal px; "fiziksel" = cihaz px.
// DOM/Tauri yok; desktop (SZ1b) bağlar.
import type { ScreenEdge } from "../pet/facing";

/**
 * FB4-2 (kullanıcı): boyut 0..100. 0 = minik (1x), 25 = küçük (2x, varsayılan), 50 = normal (3x), 75 = büyük (4x), 100 = dev (5x);
 * aradaki değerler kesirli ölçek. Keskinlik: cihaz pikseli yarım piksele yuvarlanır (pencere yine tam sayı fiziksel px).
 */
export type SizeLevel = number;
/** eski seviyeler / test modu hızlı geçiş durakları */
export const SIZE_LEVELS: readonly SizeLevel[] = [0, 25, 50, 75, 100];
export const LEGACY_SIZES: Readonly<Record<string, SizeLevel>> = { minik: 0, kucuk: 25, normal: 50, buyuk: 75, dev: 100 };

export const DEFAULT_SIZE: SizeLevel = 25;
/** 0..100 -> 1x..5x */
export const sizeScale = (level: SizeLevel): number => 1 + Math.min(100, Math.max(0, level)) / 25;
/** hızlar/uzunluklar bu ölçekte ayarlandı (movement.ts sabitleri) */
export const BASE_SCALE = 2;

/** durak adları (kaydırıcı uçları ve eski seviyeler) */
export const SIZE_LABELS: Readonly<Record<"tr" | "en", Record<number, string>>> = {
  tr: { 0: "minik", 25: "küçük", 50: "normal", 75: "büyük", 100: "dev" },
  en: { 0: "tiny", 25: "small", 50: "normal", 75: "big", 100: "huge" },
};

/** Store'dan gelen değer: 0..100 sayı ya da eski seviye adı; geçersizse varsayılan (küçük). */
export function cleanSize(raw: unknown): SizeLevel {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.round(Math.min(100, Math.max(0, raw)));
  if (typeof raw === "string" && raw in LEGACY_SIZES) return LEGACY_SIZES[raw];
  return DEFAULT_SIZE;
}
export const isSize = (v: unknown): v is SizeLevel => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100;

export const SPRITE = 32;
/** pencere payı (sprite px): yanlarda 8, üstte 10 (2x'te 96x84 = bugünkü BASE_WINDOW) */
export const PAD = { side: 8, top: 10 } as const;

export interface Size {
  w: number;
  h: number;
}
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Point {
  x: number;
  y: number;
}

/** Bir sprite pikselinin cihaz pikseli (tam sayı, en az 1). */
export function devScale(level: SizeLevel, dpr: number): number {
  return quantize(sizeScale(level) * dpr);
}

/** cihaz px / sprite px: yarım piksele yuvarla (pencere ölçüleri 42 ve 48 sprite px: her zaman tam sayı fiziksel px), en az 1 */
export const quantize = (x: number): number => Math.max(1, Math.round(x * 2) / 2);

/** Bir sprite pikselinin mantıksal boyu (dpr kesirliyse kesirli). */
export function logicalPerSpritePx(level: SizeLevel, dpr: number): number {
  return devScale(level, dpr) / dpr;
}

export interface WindowLayout {
  /** pencere: fiziksel tam sayı, mantıksal = fiziksel / dpr */
  physical: Size;
  logical: Size;
  /** pet kutusu pencere içinde (mantıksal): yatayda ortalı, altta */
  pet: Rect;
  /** pet kutusu fiziksel (canvas boyutu) */
  petPhysical: Size;
}

/** Pencere ve içindeki pet kutusu. 2x / dpr 1: 96x84, pet {16, 20, 64, 64}. */
export function windowLayout(level: SizeLevel, dpr: number): WindowLayout {
  const d = devScale(level, dpr);
  const physical = { w: (SPRITE + 2 * PAD.side) * d, h: (SPRITE + PAD.top) * d };
  const petPhysical = { w: SPRITE * d, h: SPRITE * d };
  return {
    physical,
    logical: { w: physical.w / dpr, h: physical.h / dpr },
    pet: { x: (PAD.side * d) / dpr, y: (PAD.top * d) / dpr, w: petPhysical.w / dpr, h: petPhysical.h / dpr },
    petPhysical,
  };
}

// ---------------------------------------------------------------- tıklama alanı (dolu piksel maskesi)

/** RGBA kare -> dolu piksel maskesi (alfa > 0). */
export function maskFromRgba(data: ArrayLike<number>, w = SPRITE, h = SPRITE): boolean[][] {
  return Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => data[(y * w + x) * 4 + 3] > 0));
}

/** Yatay ayna (sola bakış): maske de aynalanır. */
export const mirrorMask = (mask: readonly (readonly boolean[])[]): boolean[][] => mask.map((row) => [...row].reverse());

/**
 * Maskeyi az sayıda dikdörtgene böler (sprite px): satır başına dolu aralıklar, alt alta aynı aralıklar birleşir.
 * Rust hit_test bu listeyi tarar; 32x32'de tipik 10-30 dikdörtgen.
 */
export function maskRects(mask: readonly (readonly boolean[])[]): Rect[] {
  const open = new Map<string, Rect>();
  const done: Rect[] = [];
  mask.forEach((row, y) => {
    const runs: [number, number][] = [];
    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue;
      const start = x;
      while (x + 1 < row.length && row[x + 1]) x++;
      runs.push([start, x]);
    }
    const seen = new Set<string>();
    for (const [a, b] of runs) {
      const key = `${a}:${b}`;
      seen.add(key);
      const r = open.get(key);
      if (r && r.y + r.h === y) r.h++;
      else {
        if (r) done.push(r);
        open.set(key, { x: a, y, w: b - a + 1, h: 1 });
      }
    }
    for (const [key, r] of open) {
      if (!seen.has(key)) {
        done.push(r);
        open.delete(key);
      }
    }
  });
  done.push(...open.values());
  return done.sort((p, q) => p.y - q.y || p.x - q.x);
}

/** Sprite px dikdörtgenleri -> pencere içi mantıksal (pet kutusunun sol üstü origin). Kenarlar cihaz pikseline oturur. */
export function scaleRects(rects: readonly Rect[], level: SizeLevel, dpr: number, origin: Point): Rect[] {
  const s = logicalPerSpritePx(level, dpr);
  return rects.map((r) => ({ x: origin.x + r.x * s, y: origin.y + r.y * s, w: r.w * s, h: r.h * s }));
}

/** Hazır: kare maskesi -> pencere içi tıklama dikdörtgenleri (ilk eleman pet sınır kutusu: Rust yakınlığı ona göre). */
export function hitRects(mask: readonly (readonly boolean[])[], level: SizeLevel, dpr: number): Rect[] {
  const pet = windowLayout(level, dpr).pet;
  return [pet, ...scaleRects(maskRects(mask), level, dpr, pet)];
}

// ---------------------------------------------------------------- anchor

/**
 * Sprite px noktası (anchors.json) -> pencere içi mantıksal (o pikselin sol üstü). facing left: ayna (x -> 31 - x).
 * Aksesuarlar dress.ts ile sheet'e işlendiği için bu, sprite dışı işaretler (düşünme işareti vb.) içindir.
 */
export function scaleAnchor(p: Point, level: SizeLevel, dpr: number, facing: "left" | "right" = "right"): Point {
  const pet = windowLayout(level, dpr).pet;
  const s = logicalPerSpritePx(level, dpr);
  const x = facing === "left" ? SPRITE - 1 - p.x : p.x;
  return { x: pet.x + x * s, y: pet.y + p.y * s };
}

// ---------------------------------------------------------------- hız

/** movement.ts değerleri (2x için) -> bu ölçekte (px/s ve px uzunluklar): görsel hız aynı hissettirsin. */
export function scaleMotion(valueAt2x: number, level: SizeLevel): number {
  return (valueAt2x * sizeScale(level)) / BASE_SCALE;
}

// ---------------------------------------------------------------- kenara yeniden oturma

export interface WorkArea {
  width: number;
  height: number;
}

/**
 * Boyut değişince pet kutusunun yeni yeri (çalışma alanına göre mantıksal, kutunun sol üstü).
 * Kenara yapışık kalır; kenar boyunca merkez korunur; çalışma alanından taşmaz. topReserve: yan kenarda üstte balon payı (EdgePath ile aynı).
 * Pencere konumu = kutu - windowLayout().pet.{x,y}.
 */
export function reseat(old: Rect, edge: ScreenEdge, next: Size, area: WorkArea, topReserve = 0): Point {
  const xMax = Math.max(0, area.width - next.w);
  const yMax = Math.max(0, area.height - next.h);
  const yMin = Math.min(Math.max(0, topReserve), yMax);
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const cx = old.x + old.w / 2;
  const cy = old.y + old.h / 2;
  switch (edge) {
    case "left":
      return { x: 0, y: clamp(cy - next.h / 2, yMin, yMax) };
    case "right":
      return { x: xMax, y: clamp(cy - next.h / 2, yMin, yMax) };
    case "bottom":
      return { x: clamp(cx - next.w / 2, 0, xMax), y: yMax };
    case "top":
      return { x: clamp(cx - next.w / 2, 0, xMax), y: 0 };
  }
}

// ---------------------------------------------------------------- UP1

/**
 * placePopover'ın pet girdisi: pencerenin ekran konumu (mantıksal) + pet kutusu. Balonlar pet'in gerçek boyutuna göre yerleşir.
 */
export function petScreenBox(windowPos: Point, level: SizeLevel, dpr: number): Rect {
  const pet = windowLayout(level, dpr).pet;
  return { x: windowPos.x + pet.x, y: windowPos.y + pet.y, w: pet.w, h: pet.h };
}
