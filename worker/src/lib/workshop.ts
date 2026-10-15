// Dunno Workshop (SPEC 18 Faz 2): topluluk içerik paketleri. Paket = SPEC 12 veri modu (klasör: manifest.json + json/png/md/txt).
// KOD YOK. Sunucu yapısal güvenlik doğrulaması yapar (yol, uzantı, boyut, manifest, yasak kelime/küfür); tam içerik doğrulaması
// masaüstünde (desktop/src/mods/mods.ts validateMods) hem yüklemeden önce hem kurulumdan sonra yine yapılır.
// Yüklenen paket "pending" bekler; yönetici onaylamadan listede görünmez (moderasyon). Kişisel veri yok: yaratıcı = seçilen takma ad
// + tuzlu cihaz hash'i (ham kimlik saklanmaz). Beğeni cihaz başına bir.
import type { KVLike } from "./env";
import { hasExplicitSwear, hasForbiddenWord } from "./lines";

export const WS_MAX_FILES = 64;
export const WS_MAX_FILE_BYTES = 256 * 1024;
export const WS_MAX_TOTAL_BYTES = 2 * 1024 * 1024;
export const WS_ALLOWED_EXT = [".json", ".png", ".md", ".txt"] as const;
export const WS_KINDS = ["themes", "accessories", "costumes", "reactions", "sounds", "bubbles", "behavior"] as const;
/** cihaz başı günlük yükleme */
export const WS_UPLOADS_PER_DAY = 3;
export const WS_PAGE = 30;
export const HANDLE = /^[a-z0-9_]{3,20}$/;
export const PACK_ID = /^[a-z][a-z0-9_]{1,31}$/;

export interface PackFile {
  path: string;
  size: number;
  text?: string;
  base64?: string;
}
export interface Pack {
  dir: string;
  files: PackFile[];
}

export type Status = "pending" | "approved" | "rejected";

export interface Item {
  id: string;
  name: { tr: string; en: string };
  description: { tr: string; en: string };
  author: string;
  /** tuzlu cihaz hash'i (sahiplik; istemciye gönderilmez) */
  owner: string;
  kinds: string[];
  version: string;
  bytes: number;
  createdAt: string;
  status: Status;
  likes: number;
  downloads: number;
  /** SPEC 18 Faz 4: Pro paketi (premium dünya / kozmetik); Free istemci listeler ama kurmaz */
  premium?: boolean;
}

/** İstemciye giden özet (sahip hash'i yok) */
export type Summary = Omit<Item, "owner">;
export const summary = ({ owner: _owner, ...rest }: Item): Summary => rest;

export const itemKey = (id: string) => `ws:item:${id}`;
export const packKey = (id: string) => `ws:pack:${id}`;
export const INDEX_KEY = "ws:index";
export const PENDING_KEY = "ws:pending";
export const likeKey = (id: string, hash: string) => `ws:like:${id}:${hash}`;
export const uploadsKey = (hash: string, day: string) => `ws:up:${hash}:${day}`;

const extOf = (p: string) => (p.includes(".") ? p.slice(p.lastIndexOf(".")).toLowerCase() : "");
const safePath = (p: string) => /^[a-z0-9_./-]{1,96}$/i.test(p) && !p.startsWith("/") && !p.includes("..") && !p.includes("//") && !p.startsWith(".");
const b64Bytes = (b: string) => Math.floor((b.length * 3) / 4) - (b.endsWith("==") ? 2 : b.endsWith("=") ? 1 : 0);
const PNG_B64 = "iVBORw0KGgo";

export type PackCheck = { ok: true; item: Omit<Item, "owner" | "author" | "createdAt" | "status" | "likes" | "downloads"> } | { ok: false; error: string };

/** Metin içeriği güvenli mi (yasak konu / açık küfür; iki dil) */
function cleanText(t: string): boolean {
  return !hasForbiddenWord(t, "tr") && !hasForbiddenWord(t, "en") && !hasExplicitSwear(t, "tr") && !hasExplicitSwear(t, "en");
}

/** Görünen metin: json'da sadece metin DEĞERLERİ (anahtarlar "body" gibi alan adları sayılmaz), md/txt'de tamamı. */
function visibleStrings(path: string, text: string): string {
  if (!path.toLowerCase().endsWith(".json")) return text;
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  try {
    walk(JSON.parse(text));
  } catch {
    return text;
  }
  return out.join(" \n ");
}

/** Yapısal doğrulama (saf). Hata mesajı sabit metin; içerikten parça taşımaz. */
export function checkPack(raw: unknown): PackCheck {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "invalid pack" };
  const p = raw as Partial<Pack>;
  if (!Array.isArray(p.files) || p.files.length === 0 || p.files.length > WS_MAX_FILES) return { ok: false, error: "too many files" };
  let total = 0;
  for (const f of p.files) {
    if (typeof f !== "object" || f === null || typeof f.path !== "string" || !safePath(f.path)) return { ok: false, error: "unsafe path" };
    if (!(WS_ALLOWED_EXT as readonly string[]).includes(extOf(f.path))) return { ok: false, error: "file type not allowed" };
    const bytes = typeof f.text === "string" ? new TextEncoder().encode(f.text).length : typeof f.base64 === "string" ? b64Bytes(f.base64) : -1;
    if (bytes < 0) return { ok: false, error: "empty file" };
    if (bytes > WS_MAX_FILE_BYTES) return { ok: false, error: "file too large" };
    if (extOf(f.path) === ".png" && !(typeof f.base64 === "string" && f.base64.startsWith(PNG_B64))) return { ok: false, error: "not a png" };
    if (typeof f.text === "string" && !cleanText(visibleStrings(f.path, f.text))) return { ok: false, error: "content not allowed" };
    total += bytes;
  }
  if (total > WS_MAX_TOTAL_BYTES) return { ok: false, error: "pack too large" };
  const mf = p.files.find((f) => f.path === "manifest.json");
  if (!mf?.text) return { ok: false, error: "missing manifest" };
  let m: Record<string, unknown>;
  try {
    m = JSON.parse(mf.text) as Record<string, unknown>;
  } catch {
    return { ok: false, error: "bad manifest" };
  }
  const name = m.name as { tr?: unknown; en?: unknown } | undefined;
  const okText = (v: unknown, max: number) => typeof v === "string" && v.trim().length > 0 && Array.from(v).length <= max;
  if (m.schema !== 1 || typeof m.id !== "string" || !PACK_ID.test(m.id)) return { ok: false, error: "bad manifest" };
  if (!name || !okText(name.tr, 32) || !okText(name.en, 32)) return { ok: false, error: "bad manifest" };
  const perms = Array.isArray(m.permissions) ? m.permissions : [];
  if (!perms.length || !perms.every((k) => (WS_KINDS as readonly unknown[]).includes(k))) return { ok: false, error: "bad manifest" };
  const desc = (m.description ?? {}) as { tr?: unknown; en?: unknown };
  const d = { tr: typeof desc.tr === "string" ? desc.tr.slice(0, 120) : "", en: typeof desc.en === "string" ? desc.en.slice(0, 120) : "" };
  return {
    ok: true,
    item: {
      id: m.id,
      name: { tr: (name.tr as string).trim(), en: (name.en as string).trim() },
      description: d,
      kinds: perms as string[],
      version: typeof m.version === "string" && /^\d+\.\d+\.\d+$/.test(m.version) ? m.version : "1.0.0",
      bytes: total,
    },
  };
}

// ---------------------------------------------------------------- depolama (KV)

export async function readJson<T>(kv: KVLike, key: string): Promise<T | null> {
  const v = await kv.get(key);
  if (!v) return null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

export async function readIndex(kv: KVLike, key = INDEX_KEY): Promise<string[]> {
  return (await readJson<string[]>(kv, key)) ?? [];
}

export async function listApproved(kv: KVLike, sort: "new" | "top", kind?: string): Promise<Summary[]> {
  const ids = await readIndex(kv);
  const items = (await Promise.all(ids.map((id) => readJson<Item>(kv, itemKey(id))))).filter((x): x is Item => x?.status === "approved");
  const filtered = kind ? items.filter((i) => i.kinds.includes(kind)) : items;
  const sorted = sort === "top" ? filtered.sort((a, b) => b.likes - a.likes || b.downloads - a.downloads) : filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return sorted.slice(0, WS_PAGE).map(summary);
}
