// Sekme / pencere başlığı farkındalığı (SPEC 09 K7, saf): başlık -> site kategorisi.
// GİZLİLİK: başlık sadece bu fonksiyonun içinde, bellekte normalize edilip anahtar listesiyle karşılaştırılır;
// saklanmaz, loglanmaz, ağa ya da LLM'e gitmez. Dönen tek şey kategori (ör. "video") ve sessiz bayrağı.
// Tablo: content/context/sites.json (pool:sync -> assets/sites.json). Sıra = öncelik, ilk eşleşen kazanır.
import sitesJson from "../../assets/sites.json";
import { fold } from "./classify";

export interface SiteCategory {
  id: string;
  /** true: o sekme öndeyken dunno hiç laf atmaz (adult/kumar) */
  silent: boolean;
  keys: string[];
}

export interface SiteMatch {
  category: string;
  silent: boolean;
}

const ID = /^[a-z][a-z0-9_]*$/;

/** Başlık ve anahtarlar aynı biçime: Türkçe harf katlama, küçük harf; harf/rakam/+ dışı her şey boşluk ("amazon.com.tr" -> "amazon com tr"). */
export function normalizeTitle(text: string): string {
  return fold(text)
    .replace(/['’`]/g, " ")
    .replace(/[^a-z0-9+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** sites.json doğrulayıcı; bozuk kategori listeye girmez, sorunu `errors`'a yazılır. */
export function loadSites(raw: unknown): { categories: SiteCategory[]; errors: string[] } {
  const errors: string[] = [];
  const list = (raw as { categories?: unknown })?.categories;
  if (!Array.isArray(list)) return { categories: [], errors: ["categories must be an array"] };
  const seen = new Set<string>();
  const categories: SiteCategory[] = [];
  for (const c of list as Partial<SiteCategory>[]) {
    const id = typeof c?.id === "string" ? c.id : "?";
    const problems: string[] = [];
    if (!ID.test(id)) problems.push(`${id}: id must be snake_case`);
    else if (seen.has(id)) problems.push(`${id}: duplicate id`);
    if (typeof c?.silent !== "boolean") problems.push(`${id}: silent must be true or false`);
    if (!Array.isArray(c?.keys) || c.keys.length === 0) problems.push(`${id}: keys required`);
    else for (const k of c.keys) if (typeof k !== "string" || normalizeTitle(k) === "") problems.push(`${id}: empty key`);
    seen.add(id);
    if (problems.length) errors.push(...problems);
    else categories.push({ id, silent: c.silent!, keys: c.keys!.map(normalizeTitle) });
  }
  return { categories, errors };
}

/**
 * Başlık -> ilk eşleşen kategori (kelime sınırıyla; "bet" "better" içinde eşleşmez). Eşleşme yoksa ya da başlık boşsa null.
 * Başlık hiçbir yere kopyalanmaz; dönen nesnede sadece kategori var.
 */
export function siteMatch(title: string | null | undefined, categories: readonly SiteCategory[]): SiteMatch | null {
  if (!title) return null;
  const hay = ` ${normalizeTitle(title)} `;
  for (const c of categories) {
    if (c.keys.some((k) => hay.includes(` ${k} `))) return { category: c.id, silent: c.silent };
  }
  return null;
}

/** Laf motoruna giden trigger: "site:<kategori>"; sessiz kategoride null (çağıran o sırada hiç konuşmaz). */
export function siteTrigger(m: SiteMatch | null): string | null {
  return m && !m.silent ? `site:${m.category}` : null;
}

let table: SiteCategory[] | null = null;

/** Uygulama tablosuyla (assets/sites.json) eşleme. */
export function siteOf(title: string | null | undefined): SiteMatch | null {
  table ??= loadSites(sitesJson).categories;
  return siteMatch(title, table);
}
