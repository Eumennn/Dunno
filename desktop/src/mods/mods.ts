// Güvenli veri modları (SPEC 12 B, saf): mod = klasör + manifest.json + varlıklar. KOD YOK.
// Rust (src-tauri/src/mods.rs) mod klasörünü güvenle okur (sembolik bağlantı yok, klasör dışına çıkmaz, boyut sınırı) ve
// dosyaları ham verir; burası her şeyi doğrular ve geçen içeriği uygulamanın biçimine çevirir. Geçmeyen mod hiç yüklenmez.
// Modun göremediği şeyler: soru metni, pencere başlığı, istatistik, ağ, dosya sistemi (modlar sadece veridir).
import bannedEn from "../../assets/banned_en.txt?raw";
import bannedTr from "../../assets/banned_tr.txt?raw";
import { checkPool, parseBanned } from "../lines/pool-check";
import { checkAccessory, SLOTS, slotOf, type Accessory, type Slot } from "../wardrobe/accessories";
import { checkCostume, type Costume } from "../wardrobe/costumes";
import { loadThemes, type Theme } from "../wardrobe/themes";
import { VOICE_CATEGORIES, type VoiceCategory, type VoiceProfile, type Wave } from "../voice/voice";

export const MOD_SCHEMA = 1;
/** izin listesi: modun dokunabildiği içerik türleri */
export const MOD_KINDS = ["themes", "accessories", "costumes", "reactions", "sounds", "bubbles", "behavior"] as const;
export type ModKind = (typeof MOD_KINDS)[number];

/** sadece veri uzantıları; başka her dosya (js, html, exe, dll, ps1, bat, svg, ...) modu reddettirir */
export const ALLOWED_EXT = [".json", ".png", ".md", ".txt"] as const;
export const MAX_FILES = 64;
export const MAX_FILE_BYTES = 256 * 1024;
export const MAX_TOTAL_BYTES = 2 * 1024 * 1024;
/** mod tema/aksesuar/kostüm/laf sayısı sınırları (seçim yorgunluğu + performans) */
export const MAX_ITEMS = 24;
export const MAX_LINES = 200;

/** Rust'tan gelen ham dosya (yol mod klasörüne göre, / ayraçlı). */
export interface ModFile {
  path: string;
  size: number;
  /** json/md/txt: metin; png: base64; diğer: içerik yok (zaten reddedilir) */
  text?: string;
  base64?: string;
}

export interface ModDir {
  /** klasör adı */
  dir: string;
  files: ModFile[];
}

export interface ModManifest {
  schema: number;
  id: string;
  name: { tr: string; en: string };
  version: string;
  author: string;
  description?: { tr: string; en: string };
  permissions: ModKind[];
  contents: {
    themes?: string[];
    accessories?: string[];
    costumes?: string[];
    reactions?: { tr?: string; en?: string };
    sounds?: string;
    bubbles?: string;
    behavior?: string;
  };
}

/** Bir dosyanın görüntüsü (dolap simgesi ve çizim için): data: URL + piksel boyutu. */
export interface ModImage {
  path: string;
  dataUrl: string;
  width: number;
  height: number;
}

export interface Behavior {
  /** kendiliğinden konuşma sıklığı çarpanı (0.5 = yarısı, 2 = iki katı) */
  chattiness: number;
  /** dinlenme süresi çarpanı (büyük = daha az yürür) */
  restScale: number;
}

export interface BubbleStyle {
  fill: string;
  ink: string;
}

export interface LoadedMod {
  manifest: ModManifest;
  themes: Theme[];
  accessories: { acc: Accessory; slot: Slot; image: ModImage }[];
  costumes: { costume: Costume; parts: Record<string, ModImage>; icon: ModImage }[];
  reactions: { tr: unknown[]; en: unknown[] };
  sounds: Partial<Record<VoiceCategory, VoiceProfile>>;
  bubbles: BubbleStyle | null;
  behavior: Behavior | null;
}

export interface ModResult {
  dir: string;
  mod: LoadedMod | null;
  errors: string[];
}

const ID = /^[a-z][a-z0-9_]{1,31}$/;
const VERSION = /^\d+\.\d+\.\d+$/;
const HEX = /^#[0-9A-Fa-f]{6}$/;
/** kod/ağ belirtisi: herhangi bir metin değerinde olursa mod reddedilir (savunma derinliği) */
const CODE_HINT = /(https?:|ftp:|file:|javascript:|data:|<\s*script|<\s*iframe|\bon[a-z]+\s*=|\beval\s*\(|\bimport\s*\(|\brequire\s*\()/i;

const banned = { tr: parseBanned(bannedTr), en: parseBanned(bannedEn) };

/** Yol güvenli mi: göreli, `..` yok, sürücü/ters eğik çizgi yok, gizli dosya yok. */
export function safePath(p: string): boolean {
  if (typeof p !== "string" || p === "" || p.length > 128) return false;
  if (p.startsWith("/") || p.includes("\\") || /^[a-zA-Z]:/.test(p) || p.includes("\0")) return false;
  return p.split("/").every((seg) => seg !== "" && seg !== "." && seg !== ".." && !seg.startsWith("."));
}

const ext = (p: string) => p.slice(p.lastIndexOf(".")).toLowerCase();

/** PNG başlığından genişlik/yükseklik (IHDR); PNG değilse null. */
export function pngSize(base64: string): { width: number; height: number } | null {
  let bin: string;
  try {
    bin = atob(base64.slice(0, 64));
  } catch {
    return null;
  }
  const sig = "\x89PNG\r\n\x1a\n";
  if (bin.slice(0, 8) !== sig || bin.slice(12, 16) !== "IHDR") return null;
  const u32 = (o: number) => ((bin.charCodeAt(o) << 24) | (bin.charCodeAt(o + 1) << 16) | (bin.charCodeAt(o + 2) << 8) | bin.charCodeAt(o + 3)) >>> 0;
  return { width: u32(16), height: u32(20) };
}

/** Herhangi bir derinlikte string değerlerde kod/ağ belirtisi (ilk bulunan). */
function codeHint(value: unknown, at = "$"): string | null {
  if (typeof value === "string") return CODE_HINT.test(value) ? at : null;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const hit = codeHint(value[i], `${at}[${i}]`);
      if (hit) return hit;
    }
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (CODE_HINT.test(k)) return `${at}.${k}`;
      const hit = codeHint(v, `${at}.${k}`);
      if (hit) return hit;
    }
  }
  return null;
}

const clampIn = (v: unknown, lo: number, hi: number) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
const pair = (v: unknown, lo: number, hi: number) => Array.isArray(v) && v.length === 2 && clampIn(v[0], lo, hi) && clampIn(v[1], lo, hi) && v[0] <= v[1];

/** Ses profili sınırları (kulak tırmalamasın, uzamasın). */
export function checkProfile(p: unknown): string[] {
  const r = p as Partial<VoiceProfile> | null;
  const out: string[] = [];
  if (!r || typeof r !== "object") return ["profile must be an object"];
  if (!pair(r.base, 80, 1200)) out.push("base: [lo, hi] in 80..1200 Hz");
  if (!pair(r.syllables, 1, 8)) out.push("syllables: [lo, hi] in 1..8");
  if (!pair(r.dur, 20, 200)) out.push("dur: [lo, hi] in 20..200 ms");
  if (!pair(r.gap, 10, 150)) out.push("gap: [lo, hi] in 10..150 ms");
  if (!pair(r.glide, 0.5, 1.5)) out.push("glide: [lo, hi] in 0.5..1.5");
  if (!clampIn(r.contour, 0.5, 2)) out.push("contour: 0.5..2");
  if (!(["square", "triangle", "sawtooth"] as Wave[]).includes(r.wave as Wave)) out.push("wave: square, triangle or sawtooth");
  return out;
}

const luminance = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
export const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/**
 * Mod klasörünü doğrular. tags: sprite durumları (aksesuar/kostüm hiddenIn için). taken: çakışmasın diye mevcut id'ler
 * (yerleşik + önceki modlar). Hata varsa mod null (yarım yükleme yok).
 */
export function validateMod(d: ModDir, tags: readonly string[], taken: ReadonlySet<string> = new Set()): ModResult {
  const errors: string[] = [];
  const fail = (): ModResult => ({ dir: d.dir, mod: null, errors });

  // 1) dosyalar: sayı, boyut, yol, uzantı (kod dosyası varsa hiç bakmadan reddet)
  if (!Array.isArray(d.files) || d.files.length === 0) return { dir: d.dir, mod: null, errors: ["empty mod folder"] };
  if (d.files.length > MAX_FILES) errors.push(`too many files (${d.files.length} > ${MAX_FILES})`);
  let total = 0;
  for (const f of d.files) {
    total += f.size;
    if (!safePath(f.path)) errors.push(`unsafe path ${JSON.stringify(f.path)}`);
    else if (!(ALLOWED_EXT as readonly string[]).includes(ext(f.path))) errors.push(`${f.path}: only ${ALLOWED_EXT.join(" ")} files (no code)`);
    if (f.size > MAX_FILE_BYTES) errors.push(`${f.path}: larger than ${MAX_FILE_BYTES / 1024} KB`);
  }
  if (total > MAX_TOTAL_BYTES) errors.push(`mod larger than ${MAX_TOTAL_BYTES / 1024 / 1024} MB`);
  if (errors.length) return fail();
  const byPath = new Map(d.files.map((f) => [f.path, f]));
  const readJson = (p: string, what: string): unknown => {
    const f = byPath.get(p);
    if (!f || !p.endsWith(".json") || f.text === undefined) {
      errors.push(`${what}: ${p} missing`);
      return undefined;
    }
    try {
      const v = JSON.parse(f.text) as unknown;
      const hint = codeHint(v);
      if (hint) {
        errors.push(`${p}: looks like code or a link at ${hint} (mods are data only)`);
        return undefined;
      }
      return v;
    } catch {
      errors.push(`${p}: invalid json`);
      return undefined;
    }
  };
  const readPng = (p: string, what: string, size?: number): ModImage | null => {
    const f = byPath.get(p);
    if (!f || !p.endsWith(".png") || !f.base64) {
      errors.push(`${what}: ${p} missing`);
      return null;
    }
    const s = pngSize(f.base64);
    if (!s) {
      errors.push(`${p}: not a png`);
      return null;
    }
    if (size !== undefined && (s.width !== size || s.height !== size)) {
      errors.push(`${p}: must be ${size}x${size} (is ${s.width}x${s.height})`);
      return null;
    }
    return { path: p, dataUrl: `data:image/png;base64,${f.base64}`, width: s.width, height: s.height };
  };

  // 2) manifest
  const m = readJson("manifest.json", "manifest") as Partial<ModManifest> | undefined;
  if (!m) return fail();
  const allowedKeys = ["schema", "id", "name", "version", "author", "description", "permissions", "contents"];
  for (const k of Object.keys(m)) if (!allowedKeys.includes(k)) errors.push(`manifest: unknown field "${k}" (no scripts, hooks or urls)`);
  if (m.schema !== MOD_SCHEMA) errors.push(`manifest: schema must be ${MOD_SCHEMA}`);
  const id = typeof m.id === "string" ? m.id : "";
  if (!ID.test(id)) errors.push("manifest: id must be snake_case, 2-32 chars");
  if (typeof m.name?.tr !== "string" || typeof m.name?.en !== "string" || !m.name.tr.trim() || !m.name.en.trim()) errors.push("manifest: name.tr and name.en required");
  if (typeof m.version !== "string" || !VERSION.test(m.version)) errors.push("manifest: version must be x.y.z");
  if (typeof m.author !== "string" || !m.author.trim() || m.author.length > 40) errors.push("manifest: author required (max 40 chars)");
  const perms = Array.isArray(m.permissions) ? m.permissions : [];
  if (!Array.isArray(m.permissions)) errors.push("manifest: permissions must be a list");
  for (const p of perms) if (!(MOD_KINDS as readonly string[]).includes(p)) errors.push(`manifest: unknown permission "${p}"`);
  const c = (m.contents ?? {}) as ModManifest["contents"];
  if (typeof m.contents !== "object" || m.contents === null) errors.push("manifest: contents required");
  for (const k of Object.keys(c)) {
    if (!(MOD_KINDS as readonly string[]).includes(k)) errors.push(`manifest: unknown content "${k}"`);
    else if (!perms.includes(k as ModKind)) errors.push(`manifest: "${k}" used without permission`);
  }
  if (errors.length) return fail();

  // içerik id'leri mod adıyla başlar (yerleşik ve diğer modlarla çakışmaz)
  const prefixed = (itemId: string, what: string) => {
    if (!itemId.startsWith(`${id}_`)) errors.push(`${what} id "${itemId}" must start with "${id}_"`);
    else if (taken.has(itemId)) errors.push(`${what} id "${itemId}" already exists`);
  };
  const list = (v: unknown, what: string): string[] => {
    if (v === undefined) return [];
    if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) {
      errors.push(`manifest: contents.${what} must be a list of file paths`);
      return [];
    }
    if (v.length > MAX_ITEMS) errors.push(`manifest: contents.${what} has more than ${MAX_ITEMS}`);
    return v as string[];
  };

  const mod: LoadedMod = { manifest: m as ModManifest, themes: [], accessories: [], costumes: [], reactions: { tr: [], en: [] }, sounds: {}, bubbles: null, behavior: null };

  // 3) temalar (kontrast kuralları aynen: geçmeyen tema UI'a uygulanmaz ama sprite renkleri yine geçerli olmalı)
  for (const p of list(c.themes, "themes")) {
    const raw = readJson(p, "theme");
    if (raw === undefined) continue;
    const r = loadThemes({ fixed: { outline: "#2B1E2F", cheek: "#E86A7A" }, themes: [{ status: "candidate", ...(raw as object) }] });
    if (r.errors.length || !r.file?.themes[0]) errors.push(...r.errors.map((e) => `${p}: ${e}`));
    else {
      prefixed(r.file.themes[0].id, "theme");
      mod.themes.push(r.file.themes[0]);
    }
  }

  // 4) aksesuarlar (yerleşiklerle aynı doğrulayıcı + 32x32 png + simge)
  for (const p of list(c.accessories, "accessories")) {
    const raw = readJson(p, "accessory");
    if (raw === undefined) continue;
    const problems = checkAccessory(raw, tags);
    if (problems.length) {
      errors.push(...problems.map((e) => `${p}: ${e}`));
      continue;
    }
    const acc = raw as Accessory;
    prefixed(acc.id, "accessory");
    const base = p.slice(0, p.lastIndexOf("/") + 1);
    const image = readPng(base + acc.image, `accessory ${acc.id}`, acc.size);
    if (image) mod.accessories.push({ acc, slot: slotOf(acc), image });
  }

  // 5) kostümler (yerleşiklerle aynı doğrulayıcı; renk serbest ama geçerli hex)
  for (const p of list(c.costumes, "costumes")) {
    const raw = readJson(p, "costume");
    if (raw === undefined) continue;
    const problems = checkCostume(raw, tags);
    if (problems.length) {
      errors.push(...problems.map((e) => `${p}: ${e}`));
      continue;
    }
    const costume = raw as Costume;
    prefixed(costume.id, "costume");
    const base = p.slice(0, p.lastIndexOf("/") + 1);
    const icon = readPng(base + costume.icon, `costume ${costume.id} icon`, 32);
    const parts: Record<string, ModImage> = {};
    for (const part of costume.parts) {
      const img = readPng(base + part.image, `costume ${costume.id} part ${part.id}`, part.size);
      if (img) parts[part.id] = img;
    }
    if (icon && Object.keys(parts).length === costume.parts.length) mod.costumes.push({ costume, parts, icon });
  }

  // 6) laflar: yerleşik havuzla aynı kurallar (pool:check): <=60 karakter, küçük harf, ünlem/emoji yok, küfür sadece *** {K:} içinde,
  // yasak konular, trigger izin listesi
  if (c.reactions) {
    let count = 0;
    for (const lang of ["tr", "en"] as const) {
      const p = c.reactions[lang];
      if (p === undefined) continue;
      const raw = readJson(p, `reactions ${lang}`);
      if (raw === undefined) continue;
      const issues = checkPool(lang, raw, banned).filter((x) => x.severity === "error");
      if (issues.length) errors.push(...issues.slice(0, 10).map((x) => `${p}: ${x.id ?? `#${x.index}`}: ${x.message}`));
      else {
        for (const e of raw as { id: string }[]) prefixed(e.id, "reaction");
        count += (raw as unknown[]).length;
        mod.reactions[lang] = raw as unknown[];
      }
    }
    if (count > MAX_LINES) errors.push(`more than ${MAX_LINES} reactions`);
  }

  // 7) sesler: kategori -> profil (sınırlı aralıklar)
  if (c.sounds) {
    const raw = readJson(c.sounds, "sounds") as Record<string, unknown> | undefined;
    if (raw && typeof raw === "object") {
      for (const [cat, prof] of Object.entries(raw)) {
        if (!(VOICE_CATEGORIES as readonly string[]).includes(cat)) errors.push(`${c.sounds}: unknown sound category "${cat}"`);
        else {
          const problems = checkProfile(prof);
          if (problems.length) errors.push(...problems.map((e) => `${c.sounds}: ${cat}: ${e}`));
          else mod.sounds[cat as VoiceCategory] = prof as VoiceProfile;
        }
      }
    }
  }

  // 8) balon renkleri: dolgu + yazı/kontur, okunur kontrast
  if (c.bubbles) {
    const raw = readJson(c.bubbles, "bubbles") as Partial<BubbleStyle> | undefined;
    if (raw) {
      if (!HEX.test(raw.fill ?? "") || !HEX.test(raw.ink ?? "")) errors.push(`${c.bubbles}: fill and ink must be #rrggbb`);
      else if (contrast(raw.fill!, raw.ink!) < 4.5) errors.push(`${c.bubbles}: ink/fill contrast ${contrast(raw.fill!, raw.ink!).toFixed(2)} < 4.5`);
      else mod.bubbles = { fill: raw.fill!.toUpperCase(), ink: raw.ink!.toUpperCase() };
    }
  }

  // 9) davranış: sınırlı çarpanlar (Dunno yine Dunno)
  if (c.behavior) {
    const raw = readJson(c.behavior, "behavior") as Partial<Behavior> | undefined;
    if (raw) {
      const b = { chattiness: raw.chattiness ?? 1, restScale: raw.restScale ?? 1 };
      for (const k of Object.keys(raw)) if (!["chattiness", "restScale"].includes(k)) errors.push(`${c.behavior}: unknown field "${k}"`);
      if (!clampIn(b.chattiness, 0.5, 2)) errors.push(`${c.behavior}: chattiness 0.5..2`);
      if (!clampIn(b.restScale, 0.5, 2)) errors.push(`${c.behavior}: restScale 0.5..2`);
      mod.behavior = b;
    }
  }

  return errors.length ? fail() : { dir: d.dir, mod, errors: [] };
}

/** Birden çok mod: sırayla doğrular, id ve içerik çakışmalarını önler (ilk gelen kazanır). */
export function validateMods(dirs: readonly ModDir[], tags: readonly string[], builtin: ReadonlySet<string>): ModResult[] {
  const taken = new Set(builtin);
  const modIds = new Set<string>();
  return dirs.map((d) => {
    const r = validateMod(d, tags, taken);
    if (r.mod) {
      if (modIds.has(r.mod.manifest.id)) return { dir: d.dir, mod: null, errors: [`duplicate mod id "${r.mod.manifest.id}"`] };
      modIds.add(r.mod.manifest.id);
      for (const t of r.mod.themes) taken.add(t.id);
      for (const a of r.mod.accessories) taken.add(a.acc.id);
      for (const c of r.mod.costumes) taken.add(c.costume.id);
    }
    return r;
  });
}

/** Etkin modlardan birleşik içerik (birden çok modda davranış/balon: son etkin mod kazanır, ses profilleri birleşir). */
export function mergeMods(mods: readonly LoadedMod[]) {
  return {
    themes: mods.flatMap((m) => m.themes),
    accessories: mods.flatMap((m) => m.accessories),
    costumes: mods.flatMap((m) => m.costumes),
    lines: mods.flatMap((m) => [...m.reactions.tr, ...m.reactions.en]),
    sounds: Object.assign({}, ...mods.map((m) => m.sounds)) as Partial<Record<VoiceCategory, VoiceProfile>>,
    bubbles: mods.reduce<BubbleStyle | null>((b, m) => m.bubbles ?? b, null),
    behavior: mods.reduce<Behavior | null>((b, m) => m.behavior ?? b, null),
  };
}

export { SLOTS };
