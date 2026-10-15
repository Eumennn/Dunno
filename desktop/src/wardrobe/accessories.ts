// Aksesuarlar (SPEC 05 W2): bağlantı noktaları (content/art/dunno_anchors.json) ve aksesuar tanımları
// (content/wardrobe/accessories/<id>.json) için saf yükleyici + doğrulayıcı. Çizim desktop'ta; burası sadece "nereye / çizilir mi".

export const ANCHOR_NAMES = ["head", "antenna", "eyes", "ears", "neck"] as const;
export type AnchorName = (typeof ANCHOR_NAMES)[number];
/** aksesuarın oturduğu nokta (antenna sadece tüy kararı için, aksesuar ona oturmaz) */
export type AccessoryAnchor = "head" | "eyes" | "ears" | "neck";
const ACCESSORY_ANCHORS: readonly string[] = ["head", "eyes", "ears", "neck"];

/** Giyilen yer (SPEC 09 K6): aynı slotta tek parça, farklı slotlar birlikte (en fazla MAX_WORN). */
export const SLOTS = ["head", "eyes", "neck", "body", "side"] as const;
export type Slot = (typeof SLOTS)[number];
export const MAX_WORN = 3;

export type AnchorPoint = { x: number; y: number } | { hidden: string };

export interface AnchorFrame {
  frame: string;
  index: number;
  tag: string;
  n: number;
  points: Record<AnchorName, AnchorPoint>;
  /** ekran kenarı (peek): x >= clipRight olan aksesuar pikselleri kenarın arkasında kalır, çizilmez */
  clipRight?: number;
}

export interface AnchorsFile {
  size: number;
  points: AnchorName[];
  frames: AnchorFrame[];
  /** durum -> gizli nokta -> gerekçe (özet) */
  hidden: Record<string, Partial<Record<AnchorName, string>>>;
}

export interface Accessory {
  id: string;
  name: { tr: string; en: string };
  anchor: AccessoryAnchor;
  /** slot (SPEC 09 K6); yoksa bağlantı noktasından: eyes -> eyes, neck -> neck, diğerleri head */
  slot?: Slot;
  /** aksesuar görüntüsünde bağlantı noktasına oturan piksel */
  pivot: { x: number; y: number };
  /** tüy deliğinden çıkar (through: tüy önde) ya da arkada kalır (behind: aksesuar önde) */
  antenna: "through" | "behind";
  /** bu durumlarda çizilmez */
  hiddenIn: string[];
  image: string;
  size: number;
  /**
   * Gövde konturu dışına izinli taşma (sprite px, SPEC 09 K1): top = kafa çizgisinin üstüne (taç, şapka tepesi),
   * side = satırın kontur genişliğinin iki yanına (kulaklık kapları), bottom = gövdenin altına. Yoksa hepsi 0.
   */
  overflow?: { top?: number; side?: number; bottom?: number };
}

/** Aksesuarın slotu (alan yoksa bağlantı noktasından). */
export function slotOf(acc: Pick<Accessory, "slot" | "anchor">): Slot {
  if (acc.slot) return acc.slot;
  return acc.anchor === "eyes" ? "eyes" : acc.anchor === "neck" ? "neck" : "head";
}

/** Taşma payı; alan yoksa 0. */
export function overflowOf(acc: Pick<Accessory, "overflow">): { top: number; side: number; bottom: number } {
  return { top: acc.overflow?.top ?? 0, side: acc.overflow?.side ?? 0, bottom: acc.overflow?.bottom ?? 0 };
}

const isInt = (v: unknown, max: number) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v < max;

/** Her karede her nokta ya sınır içinde tam sayı ya da gerekçeli gizli olmalı. */
export function checkAnchors(raw: unknown, sheet?: { frames: string[]; tags: string[] }): string[] {
  const out: string[] = [];
  const a = raw as Partial<AnchorsFile> | null;
  if (!a || !isInt(a.size, 1025) || !Array.isArray(a.frames)) return ["anchors: size and frames required"];
  const size = a.size!;
  a.frames.forEach((f, i) => {
    const where = `frame ${i}`;
    if (f?.index !== i) out.push(`${where}: index must be ${i}`);
    if (typeof f?.tag !== "string") out.push(`${where}: tag required`);
    if (f?.clipRight !== undefined && !isInt(f.clipRight, size + 1)) out.push(`${where}: clipRight must be 0..${size}`);
    for (const name of ANCHOR_NAMES) {
      const p = f?.points?.[name] as Record<string, unknown> | undefined;
      if (!p) out.push(`${where}: ${name} missing (mark it or hide it with a reason)`);
      else if ("hidden" in p) {
        if (typeof p.hidden !== "string" || p.hidden.trim() === "") out.push(`${where}: ${name} hidden without a reason`);
      } else if (!isInt(p.x, size) || !isInt(p.y, size)) out.push(`${where}: ${name} outside the ${size}x${size} frame`);
    }
  });
  if (sheet) {
    if (sheet.frames.length !== a.frames.length) out.push(`anchors: ${a.frames.length} frames, sheet has ${sheet.frames.length}`);
    a.frames.forEach((f, i) => {
      if (sheet.frames[i] !== undefined && f?.frame !== sheet.frames[i]) out.push(`frame ${i}: name ${f?.frame} != sheet ${sheet.frames[i]}`);
    });
    for (const t of new Set(a.frames.map((f) => f?.tag))) if (!sheet.tags.includes(t)) out.push(`anchors: unknown tag ${t}`);
  }
  return out;
}

const ID = /^[a-z][a-z0-9_]*$/;

export function checkAccessory(raw: unknown, tags: readonly string[]): string[] {
  const a = raw as Partial<Accessory> | null;
  const id = typeof a?.id === "string" ? a.id : "?";
  const out: string[] = [];
  if (!ID.test(id)) out.push(`${id}: id must be snake_case`);
  if (typeof a?.name?.tr !== "string" || typeof a?.name?.en !== "string") out.push(`${id}: name.tr and name.en required`);
  else if (a.name.tr !== a.name.tr.toLocaleLowerCase("tr") || a.name.en !== a.name.en.toLowerCase()) out.push(`${id}: names are lowercase`);
  if (!ACCESSORY_ANCHORS.includes(String(a?.anchor))) out.push(`${id}: anchor must be head, eyes, ears or neck`);
  if (a?.slot !== undefined && !(SLOTS as readonly string[]).includes(a.slot)) out.push(`${id}: slot must be one of ${SLOTS.join(", ")}`);
  const size = a?.size ?? 0;
  if (!isInt(size, 257) || size === 0) out.push(`${id}: size required`);
  else if (!isInt(a?.pivot?.x, size) || !isInt(a?.pivot?.y, size)) out.push(`${id}: pivot outside the image`);
  if (a?.antenna !== "through" && a?.antenna !== "behind") out.push(`${id}: antenna must be through or behind`);
  if (!Array.isArray(a?.hiddenIn)) out.push(`${id}: hiddenIn must be a list`);
  else for (const t of a.hiddenIn) if (!tags.includes(t)) out.push(`${id}: hiddenIn has unknown state ${t}`);
  if (a?.image !== `${id}.png`) out.push(`${id}: image must be ${id}.png`);
  if (a?.overflow !== undefined) {
    const o = a.overflow as Record<string, unknown> | null;
    if (typeof o !== "object" || o === null) out.push(`${id}: overflow must be an object`);
    else
      for (const [k, v] of Object.entries(o)) {
        if (!["top", "side", "bottom"].includes(k)) out.push(`${id}: overflow has unknown side ${k}`);
        else if (!isInt(v, 33)) out.push(`${id}: overflow.${k} must be 0-32`);
      }
  }
  return out;
}

/**
 * Bu karede aksesuar görüntüsünün sol üstü (karenin piksel koordinatında), tüy sırası ve varsa ekran kenarı;
 * çizilmeyecekse null (durum hiddenIn'de ya da bağlantı noktası bu karede gizli).
 */
export function placeAccessory(
  anchors: AnchorsFile,
  frameIndex: number,
  acc: Accessory,
): { x: number; y: number; antennaInFront: boolean; clipRight?: number } | null {
  const f = anchors.frames[frameIndex];
  if (!f || acc.hiddenIn.includes(f.tag)) return null;
  const p = f.points[acc.anchor];
  if (!p || "hidden" in p) return null;
  const place = { x: p.x - acc.pivot.x, y: p.y - acc.pivot.y, antennaInFront: acc.antenna === "through" };
  return f.clipRight === undefined ? place : { ...place, clipRight: f.clipRight };
}
