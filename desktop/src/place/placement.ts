// Konumlandırma motoru (saf, tek kaynak): pet'in yanında açılan her yüzey (ask.exe, error.exe, konuşma balonu, toast).
// Pet hangi kenar/köşedeyse yüzey ekranın İÇİNE açılır; çalışma alanına (görev çubuğu hariç) her zaman tamamen sığar.
// Birimler: girdiler ve `x/y/w/h` çıktıları ekran koordinatında MANTIKSAL piksel (çoklu monitörde negatif olabilir);
// `physical` alanları cihaz pikseli (scaleFactor ile). Tüm çıktılar cihaz pikseli ızgarasına oturur (bulanık kenar yok).

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Size {
  w: number;
  h: number;
}

export type TailSide = "top" | "bottom" | "left" | "right";

/** Pet'in çalışma alanındaki yeri. */
export type Anchor =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "middle";

export interface PlaceOptions {
  /** çalışma alanı kenarından iç boşluk (varsayılan 8) */
  margin?: number;
  /** pet ile yüzey arası boşluk, kuyruk bu boşluğa çizilir (varsayılan 12) */
  gap?: number;
  /** kuyruk ucunun yüzey köşesine en yakın mesafesi (varsayılan 8) */
  tailInset?: number;
  /** pencerenin cihaz ölçeği: 1, 1.25, 1.5 ... (varsayılan 1) */
  scaleFactor?: number;
  /** pet bu kadar (mantıksal px) yakınsa o kenarda sayılır; varsayılan max(pet.w, pet.h) */
  edgeThreshold?: number;
  /**
   * Pet kutusunun o karedeki saydam kenar payları (mantıksal px; SPEC 09 K4). Verilirse yüzey ve kuyruk görünen gövdeye göre
   * yerleşir (ör. peek'te gövde kutunun yarısı: balon pet'e yaklaşır). Kenar tespiti ve pencere birleşimi tam kutuyla kalır.
   */
  petInset?: { left: number; right: number; top: number; bottom: number };
}

export interface Placement {
  /** yüzeyin sol üstü ve boyutu (mantıksal, ekran) */
  x: number;
  y: number;
  w: number;
  h: number;
  /** yüzey çalışma alanına sığmak için istenen boyuttan küçültüldü (içerik kaydırılmalı) */
  shrunk: boolean;
  /** kuyruk: yüzeyin pet'e bakan kenarı ve o kenar boyunca ofset (yüzeyin sol/üstünden); pet yok sayıldıysa null */
  tail: { side: TailSide; offset: number } | null;
  /** pet'in yeri (kenar/köşe); pet yok sayıldıysa null */
  anchor: Anchor | null;
  /** yüzey pet'in üstüne binmek zorunda kaldı (ekranda iki yönde de yer yok) */
  overlapsPet: boolean;
  /**
   * Geçici pencere kutusu: pet + yüzey birleşimi. Pencere buraya taşınıp bu boyuta getirilirse pet ekranda yerinde kalır;
   * içerideki yerleşim `local`'da. Pet yok sayıldıysa sadece yüzey.
   */
  window: Box;
  local: { pet: { x: number; y: number } | null; popover: { x: number; y: number } };
  /** pencere kutusu cihaz pikseli (Tauri PhysicalPosition/PhysicalSize için) */
  physical: Box;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/** Konum: en yakın cihaz pikseline. */
const snap = (v: number, s: number) => Math.round(v * s) / s;
/** Boyut: aşağı yuvarla (sığdırma garantisi bozulmasın). */
const snapDown = (v: number, s: number) => Math.floor(v * s + 1e-9) / s;

/** Pet'in çalışma alanında hangi kenar/köşede olduğu. */
export function anchorOf(pet: Box, area: Box, threshold = Math.max(pet.w, pet.h)): Anchor {
  const left = pet.x - area.x <= threshold;
  const right = area.x + area.w - (pet.x + pet.w) <= threshold;
  const top = pet.y - area.y <= threshold;
  const bottom = area.y + area.h - (pet.y + pet.h) <= threshold;
  const v = top && !bottom ? "top" : bottom && !top ? "bottom" : null;
  const h = left && !right ? "left" : right && !left ? "right" : null;
  if (v && h) return `${v}-${h}` as Anchor;
  return v ?? h ?? "middle";
}

/**
 * Yüzeyi pet'e göre yerleştirir.
 * Sıra: kenar sınıfı -> yön (içeri) -> yer yoksa karşı yön -> çalışma alanına sıkıştır -> kuyruk -> pencere kutusu.
 */
export function placePopover(petBox: Box, popoverSize: Size, workArea: Box, opts: PlaceOptions = {}): Placement {
  const s = opts.scaleFactor && opts.scaleFactor > 0 ? opts.scaleFactor : 1;
  const margin = opts.margin ?? 8;
  const gap = opts.gap ?? 12;
  const inset = opts.tailInset ?? 8;

  // çalışma alanının iç kutusu (boşluk düşülmüş)
  const inner = { x: workArea.x + margin, y: workArea.y + margin, w: workArea.w - 2 * margin, h: workArea.h - 2 * margin };

  // çok büyük yüzey: sığacak kadar küçült
  const w = snapDown(Math.min(popoverSize.w, inner.w), s);
  const h = snapDown(Math.min(popoverSize.h, inner.h), s);
  const shrunk = w < popoverSize.w || h < popoverSize.h;

  // çalışma alanından büyük pet kutusu: yok say, yüzeyi ortala
  if (petBox.w > workArea.w || petBox.h > workArea.h || petBox.w <= 0 || petBox.h <= 0) {
    const x = snap(inner.x + (inner.w - w) / 2, s);
    const y = snap(inner.y + (inner.h - h) / 2, s);
    const win = { x, y, w, h };
    return {
      x, y, w, h, shrunk, tail: null, anchor: null, overlapsPet: false,
      window: win, local: { pet: null, popover: { x: 0, y: 0 } }, physical: toPhysical(win, s),
    };
  }

  const anchor = anchorOf(petBox, workArea, opts.edgeThreshold);
  // yerleşim görünen gövdeye göre (petInset yoksa tam kutu)
  const pi = opts.petInset;
  const vis =
    pi && petBox.w - pi.left - pi.right > 0 && petBox.h - pi.top - pi.bottom > 0
      ? { x: petBox.x + pi.left, y: petBox.y + pi.top, w: petBox.w - pi.left - pi.right, h: petBox.h - pi.top - pi.bottom }
      : petBox;
  const cx = vis.x + vis.w / 2;
  const cy = vis.y + vis.h / 2;

  const spaceAbove = vis.y - gap - inner.y;
  const spaceBelow = inner.y + inner.h - (vis.y + vis.h + gap);
  const spaceLeft = vis.x - gap - inner.x;
  const spaceRight = inner.x + inner.w - (vis.x + vis.w + gap);

  // içeri doğru tercih edilen yönler (sırayla denenir)
  const vertical: TailSide[] = anchor.startsWith("top") ? ["top", "bottom"] : anchor.startsWith("bottom") ? ["bottom", "top"] : spaceAbove >= spaceBelow ? ["bottom", "top"] : ["top", "bottom"];
  const order: TailSide[] =
    anchor === "right" ? ["right", ...vertical, "left"] : anchor === "left" ? ["left", ...vertical, "right"] : [...vertical, ...(cx > inner.x + inner.w / 2 ? (["right", "left"] as TailSide[]) : (["left", "right"] as TailSide[]))];

  // tail = yüzeyin pet'e bakan kenarı: "bottom" -> yüzey pet'in üstünde
  const fits = (side: TailSide) =>
    side === "bottom" ? spaceAbove >= h : side === "top" ? spaceBelow >= h : side === "right" ? spaceLeft >= w : spaceRight >= w;
  let side = order.find(fits);
  let overlapsPet = false;
  if (!side) {
    // hiçbir yöne tam sığmıyor: en çok yer olan dikey yön, sıkıştırılınca pet'e biner
    side = spaceAbove >= spaceBelow ? "bottom" : "top";
    overlapsPet = true;
  }

  let x: number;
  let y: number;
  if (side === "bottom" || side === "top") {
    y = side === "bottom" ? vis.y - gap - h : vis.y + vis.h + gap;
    // köşede çapraz: yüzey pet'ten içeri doğru uzanır; ortada ve üst/alt kenarda pet'e ortalı
    if (anchor.endsWith("right")) x = vis.x + vis.w - w;
    else if (anchor.endsWith("left")) x = vis.x;
    else x = cx - w / 2;
  } else {
    x = side === "right" ? vis.x - gap - w : vis.x + vis.w + gap;
    y = cy - h / 2;
  }
  x = snap(clamp(x, inner.x, inner.x + inner.w - w), s);
  y = snap(clamp(y, inner.y, inner.y + inner.h - h), s);
  if (!overlapsPet) overlapsPet = intersects({ x, y, w, h }, vis);

  // kuyruk pet merkezini gösterir, yüzey kenarına `inset`ten yakın olmaz
  const along = side === "bottom" || side === "top" ? cx - x : cy - y;
  const length = side === "bottom" || side === "top" ? w : h;
  const offset = snap(clamp(along, inset, length - inset), s);

  // pencere kutusu: pet + yüzey birleşimi (pet yerinde kalır)
  const left = Math.min(x, petBox.x);
  const top = Math.min(y, petBox.y);
  const win = {
    x: snap(left, s),
    y: snap(top, s),
    w: snap(Math.max(x + w, petBox.x + petBox.w) - left, s),
    h: snap(Math.max(y + h, petBox.y + petBox.h) - top, s),
  };
  return {
    x, y, w, h, shrunk, tail: { side, offset }, anchor, overlapsPet,
    window: win,
    local: { pet: { x: snap(petBox.x - win.x, s), y: snap(petBox.y - win.y, s) }, popover: { x: snap(x - win.x, s), y: snap(y - win.y, s) } },
    physical: toPhysical(win, s),
  };
}

function intersects(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function toPhysical(b: Box, s: number): Box {
  return { x: Math.round(b.x * s), y: Math.round(b.y * s), w: Math.round(b.w * s), h: Math.round(b.h * s) };
}
