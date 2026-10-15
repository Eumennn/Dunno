// Kostümler (SPEC 09 K2, saf): content/wardrobe/costumes/<id>.json doğrulayıcı + kare başına parça yerleşimi.
// Kostüm = gövde rol renkleri (palette) + satır şeritleri (bands) + noktalara oturan parçalar (parts, aksesuar gibi).
// Çizim dress.ts'te (tek kaynak); burası "ne, nereye, hangi karede".
import { SLOTS, placeAccessory, type Accessory, type AccessoryAnchor, type AnchorsFile, type Slot } from "./accessories";
import { ROLES, type Role } from "./themes";

export interface CostumePart {
  id: string;
  anchor: AccessoryAnchor;
  pivot: { x: number; y: number };
  hiddenIn: string[];
  /** "even" | "odd": sadece çift/tek numaralı karede (anchors.frames[i].n), kanat çırpma gibi */
  frames?: "even" | "odd";
  image: string;
  size: number;
  /** gövde konturu dışına izinli taşma (aksesuardaki gibi; costumes testi sınar) */
  overflow?: { top?: number; side?: number; bottom?: number };
}

export interface CostumeBand {
  anchor: AccessoryAnchor;
  /** noktaya göre satırlar (dy) */
  rows: number[];
  color: string;
}

export interface Costume {
  id: string;
  name: { tr: string; en: string };
  /** gövde rol renkleri; verilmeyen rol temadan kalır */
  palette?: Partial<Record<Role, string>>;
  bands?: CostumeBand[];
  /** tüy çizilmez (antenler tüyün yerini alır) */
  hidesTuft: boolean;
  /** kapattığı aksesuar slotları: bu slottaki aksesuar kostümle çizilmez */
  blocks: Slot[];
  parts: CostumePart[];
  /** dolap simgesi (idle ilk kare, kostümlü) */
  icon: string;
}

const ID = /^[a-z][a-z0-9_]*$/;
const HEX = /^#[0-9A-F]{6}$/;
const isInt = (v: unknown, max: number) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v < max;
const ANCHORS: readonly string[] = ["head", "eyes", "ears", "neck"];

/** allowedColors: palet + kostüm renkleri (ana palet ve themes.json renkleri). Büyük harf hex. */
export function checkCostume(raw: unknown, tags: readonly string[], allowedColors?: ReadonlySet<string>): string[] {
  const c = raw as Partial<Costume> | null;
  const id = typeof c?.id === "string" ? c.id : "?";
  const out: string[] = [];
  const color = (v: unknown, where: string) => {
    if (typeof v !== "string" || !HEX.test(v)) out.push(`${id}: ${where} must be #RRGGBB`);
    else if (allowedColors && !allowedColors.has(v)) out.push(`${id}: ${where} ${v} is not a palette/theme colour`);
  };
  if (!ID.test(id)) out.push(`${id}: id must be snake_case`);
  if (typeof c?.name?.tr !== "string" || typeof c?.name?.en !== "string") out.push(`${id}: name.tr and name.en required`);
  else if (c.name.tr !== c.name.tr.toLocaleLowerCase("tr") || c.name.en !== c.name.en.toLowerCase()) out.push(`${id}: names are lowercase`);
  if (typeof c?.hidesTuft !== "boolean") out.push(`${id}: hidesTuft must be true or false`);
  if (!Array.isArray(c?.blocks)) out.push(`${id}: blocks must be a list`);
  else for (const s of c.blocks) if (!(SLOTS as readonly string[]).includes(s)) out.push(`${id}: blocks has unknown slot ${s}`);
  if (c?.palette !== undefined) {
    for (const [k, v] of Object.entries(c.palette ?? {})) {
      if (!(ROLES as readonly string[]).includes(k)) out.push(`${id}: palette has unknown role ${k}`);
      else color(v, `palette.${k}`);
    }
  }
  for (const b of c?.bands ?? []) {
    if (!ANCHORS.includes(b?.anchor)) out.push(`${id}: band anchor must be head, eyes, ears or neck`);
    if (!Array.isArray(b?.rows) || !b.rows.every((r) => Number.isInteger(r) && Math.abs(r) < 32)) out.push(`${id}: band rows must be integers`);
    color(b?.color, "band color");
  }
  if (c?.icon !== `${id}.png`) out.push(`${id}: icon must be ${id}.png`);
  if (!Array.isArray(c?.parts)) out.push(`${id}: parts must be a list`);
  else
    for (const p of c.parts) {
      const pid = `${id}.${p?.id ?? "?"}`;
      if (!ID.test(String(p?.id))) out.push(`${pid}: part id must be snake_case`);
      if (!ANCHORS.includes(p?.anchor)) out.push(`${pid}: anchor must be head, eyes, ears or neck`);
      if (!isInt(p?.size, 257) || p.size === 0) out.push(`${pid}: size required`);
      else if (!isInt(p?.pivot?.x, p.size) || !isInt(p?.pivot?.y, p.size)) out.push(`${pid}: pivot outside the image`);
      if (!Array.isArray(p?.hiddenIn)) out.push(`${pid}: hiddenIn must be a list`);
      else for (const t of p.hiddenIn) if (!tags.includes(t)) out.push(`${pid}: hiddenIn has unknown state ${t}`);
      if (p?.frames !== undefined && p.frames !== "even" && p.frames !== "odd") out.push(`${pid}: frames must be even or odd`);
      if (p?.image !== `${id}.${p?.id}.png`) out.push(`${pid}: image must be ${id}.${p?.id}.png`);
    }
  return out;
}

/** Parçayı aksesuar gibi yerleştirir (tüy kararı: kostüm tüyü gizliyorsa yok, değilse tüy önde). Çizilmeyecekse null. */
export function placePart(anchors: AnchorsFile, frameIndex: number, costume: Pick<Costume, "hidesTuft">, part: CostumePart) {
  const f = anchors.frames[frameIndex];
  if (!f) return null;
  if (part.frames === "even" && f.n % 2 !== 0) return null;
  if (part.frames === "odd" && f.n % 2 !== 1) return null;
  const asAcc: Accessory = {
    id: part.id,
    name: { tr: part.id, en: part.id },
    anchor: part.anchor,
    pivot: part.pivot,
    antenna: costume.hidesTuft ? "behind" : "through",
    hiddenIn: part.hiddenIn,
    image: part.image,
    size: part.size,
  };
  return placeAccessory(anchors, frameIndex, asAcc);
}
