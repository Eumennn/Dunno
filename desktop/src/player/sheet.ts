// Aseprite sprite sheet JSON ayrıştırıcı ("json-array" ve "json-hash" dışa aktarımları).

export type Direction = "forward" | "reverse" | "pingpong" | "pingpong_reverse";

export interface Frame {
  /** sheet PNG içindeki kaynak bölge */
  x: number;
  y: number;
  w: number;
  h: number;
  /** kırpılmış (trimmed) karelerde, kare kutusu içindeki ofset */
  ox: number;
  oy: number;
  duration: number;
}

export interface Tag {
  name: string;
  from: number;
  to: number;
  direction: Direction;
}

export interface Sheet {
  frames: Frame[];
  tags: Map<string, Tag>;
  /** kırpılmamış kare boyutu (ör. 48x48) */
  frameW: number;
  frameH: number;
  placeholder: boolean;
}

const DEFAULT_DURATION = 100;
const DIRECTIONS: readonly Direction[] = ["forward", "reverse", "pingpong", "pingpong_reverse"];

interface XY {
  x: number;
  y: number;
}
interface WH {
  w: number;
  h: number;
}
interface AseFrame {
  frame: XY & WH;
  rotated?: boolean;
  spriteSourceSize?: XY & WH;
  sourceSize?: WH;
  duration?: number;
}
interface AseTag {
  name: string;
  from: number;
  to: number;
  direction?: string;
}
interface AseSheet {
  frames: AseFrame[] | Record<string, AseFrame>;
  meta?: { frameTags?: AseTag[]; placeholder?: boolean };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function parseFrame(raw: unknown, i: number): Frame & WH & { sw: number; sh: number } {
  if (!isObject(raw) || !isObject(raw.frame)) throw new Error(`sheet: frame ${i} has no "frame" rect`);
  const f = raw as unknown as AseFrame;
  const { x, y, w, h } = f.frame;
  if (![x, y, w, h].every(isNum)) throw new Error(`sheet: frame ${i} rect is not numeric`);
  if (f.rotated) throw new Error(`sheet: frame ${i} is rotated (unsupported)`);
  const sss = f.spriteSourceSize ?? { x: 0, y: 0, w, h };
  const src = f.sourceSize ?? { w, h };
  return {
    x,
    y,
    w,
    h,
    ox: sss.x,
    oy: sss.y,
    sw: src.w,
    sh: src.h,
    duration: isNum(f.duration) && f.duration > 0 ? f.duration : DEFAULT_DURATION,
  };
}

export function parseSheet(json: unknown): Sheet {
  if (!isObject(json) || !isObject(json.frames)) throw new Error("sheet: missing frames");
  const ase = json as unknown as AseSheet;
  // hash formatında kare sırası anahtar sırasıdır (Aseprite sıralı yazar)
  const rawFrames = Array.isArray(ase.frames) ? ase.frames : Object.values(ase.frames);
  if (rawFrames.length === 0) throw new Error("sheet: no frames");

  const parsed = rawFrames.map(parseFrame);
  const frameW = parsed[0].sw;
  const frameH = parsed[0].sh;
  const frames: Frame[] = parsed.map(({ x, y, w, h, ox, oy, duration }) => ({ x, y, w, h, ox, oy, duration }));

  const tags = new Map<string, Tag>();
  for (const t of ase.meta?.frameTags ?? []) {
    if (typeof t.name !== "string" || !isNum(t.from) || !isNum(t.to)) throw new Error("sheet: bad frameTag");
    if (t.from < 0 || t.to >= frames.length || t.from > t.to) {
      throw new Error(`sheet: tag ${t.name} range ${t.from}-${t.to} outside ${frames.length} frames`);
    }
    const direction = DIRECTIONS.find((d) => d === t.direction) ?? "forward";
    tags.set(t.name, { name: t.name, from: t.from, to: t.to, direction });
  }

  return { frames, tags, frameW, frameH, placeholder: ase.meta?.placeholder === true };
}
