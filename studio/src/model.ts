// Studio veri modeli (saf): trigger ağacı, arama, id üretimi, ekle/çoğalt/sil. DOM yok, testlenir.
import { categoryOf } from "@desktop/lines/engine";
import type { CoverageRow, Issue } from "@desktop/lines/pool-check";

export type Lang = "tr" | "en" | "es";
export type Entry = Record<string, unknown> & { id?: unknown; trigger?: unknown; intent?: unknown };

/** Ağaçta kategori sırası (laf motorunun önceliğiyle aynı, sonra cevaplar). */
export const CATEGORY_ORDER = ["app", "time", "idle", "battery", "interaction", "random", "answer"] as const;

export function categoryOfTrigger(trigger: string): string {
  const [cat] = trigger.split(":");
  return cat || "random";
}

export interface TreeTrigger {
  trigger: string;
  count: number;
  target: number;
}
export interface TreeNode {
  category: string;
  count: number;
  target: number;
  triggers: TreeTrigger[];
}

/** Kapsam satırlarından kategori > trigger ağacı (seçili dilin sayılarıyla). */
export function buildTree(rows: readonly CoverageRow[], lang: Lang): TreeNode[] {
  // Temel 7 kategori (motor sırasıyla)
  const baseNodes: TreeNode[] = CATEGORY_ORDER.map((category) => {
    const triggers = rows
      .filter((r) => categoryOfTrigger(r.trigger) === category)
      .map((r) => ({ trigger: r.trigger, count: (r as Record<string, any>)[lang] ?? 0, target: r.target }));
    return {
      category,
      triggers,
      count: triggers.reduce((a, t) => a + t.count, 0),
      target: triggers.reduce((a, t) => a + t.target, 0),
    };
  }).filter((n) => n.triggers.length > 0);

  // Derin kategoriler: dizi, film, oyun, mevsim, gün, anime, vb. (bu dilde en az 1 repliği olanlar)
  const extraCategories = Array.from(
    new Set(
      rows
        .filter((r) => {
          const cat = categoryOfTrigger(r.trigger);
          return !(CATEGORY_ORDER as readonly string[]).includes(cat) && ((r as Record<string, any>)[lang] ?? 0) > 0;
        })
        .map((r) => categoryOfTrigger(r.trigger)),
    ),
  ).sort();

  const extraNodes: TreeNode[] = extraCategories.map((category) => {
    const triggers = rows
      .filter((r) => categoryOfTrigger(r.trigger) === category)
      .map((r) => {
        const count = (r as Record<string, any>)[lang] ?? 0;
        return { trigger: r.trigger, count, target: count };
      });
    return {
      category,
      triggers,
      count: triggers.reduce((a, t) => a + t.count, 0),
      target: triggers.reduce((a, t) => a + t.target, 0),
    };
  }).filter((n) => n.triggers.length > 0);

  return [...baseNodes, ...extraNodes];
}

export interface Item {
  entry: Entry;
  /** dosyadaki sıra (kayıt ve hata eşleme bununla) */
  index: number;
}

/** Trigger ve aramaya göre süzer. Arama id, intent ve metinde (dile göre küçük harf). */
export function filterEntries(entries: readonly Entry[], lang: Lang, opts: { trigger?: string | null; search?: string } = {}): Item[] {
  const q = (opts.search ?? "").trim().toLocaleLowerCase(lang);
  return entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => !opts.trigger || entry.trigger === opts.trigger)
    .filter(({ entry }) => {
      if (q === "") return true;
      const hay = [entry.id, entry.intent, entry[lang]].map((v) => String(v ?? "")).join(" ").toLocaleLowerCase(lang);
      return hay.includes(q);
    });
}

/** Satır sırası -> o satırın mesajları (kural hataları ve placeholder açıkları). Kapsam açıkları (-1) dahil değil. */
export function issuesByIndex(issues: readonly Issue[]): Map<number, string[]> {
  const out = new Map<number, string[]>();
  for (const i of issues) {
    if (i.index < 0) continue;
    out.set(i.index, [...(out.get(i.index) ?? []), i.message]);
  }
  return out;
}

/** id öneki: app:excel -> excel, time:late_night -> late_night, idle:10 -> idle10, interaction:spam_click -> spam ... */
export function idPrefix(trigger: string): string {
  const [cat, rest = ""] = trigger.split(":");
  if (cat === "app" || cat === "time") return rest;
  if (cat === "idle") return `idle${rest}`;
  if (cat === "battery") return "battery";
  if (cat === "interaction") return ({ spam_click: "spam", limit_reached: "limit" } as Record<string, string>)[rest] ?? rest;
  if (cat === "answer") return "answer";
  if (cat === "random") return "random";
  if (rest) return `${cat}_${rest}`.replace(/[^a-z0-9_]/g, "_");
  return cat.replace(/[^a-z0-9_]/g, "_");
}

/** `<lang>_<önek>_<NN>`: o önekteki en büyük numaranın bir fazlası, iki hane. */
export function nextId(entries: readonly Entry[], lang: Lang, trigger: string): string {
  const prefix = `${lang}_${idPrefix(trigger)}_`;
  let max = 0;
  for (const e of entries) {
    const id = String(e.id ?? "");
    if (!id.startsWith(prefix)) continue;
    const n = Number(id.slice(prefix.length));
    if (Number.isInteger(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(2, "0")}`;
}

export function blankEntry(entries: readonly Entry[], lang: Lang, trigger: string): Entry {
  return { id: nextId(entries, lang, trigger), trigger, intent: "", [lang]: "" };
}

/** Kopya: yeni id, aynı trigger/intent/metin. */
export function duplicateEntry(entries: readonly Entry[], lang: Lang, index: number): Entry {
  const src = entries[index];
  return { ...src, id: nextId(entries, lang, String(src.trigger ?? "random")) };
}

/**
 * Yeni lafı aynı trigger'ın son lafının arkasına koyar (dosya trigger'a göre gruplu kalsın).
 * O trigger'da laf yoksa sona ekler. Dönen: yeni dizi + eklenen sıra.
 */
export function insertEntry(entries: readonly Entry[], entry: Entry): { entries: Entry[]; index: number } {
  let last = -1;
  entries.forEach((e, i) => {
    if (e.trigger === entry.trigger) last = i;
  });
  const index = last === -1 ? entries.length : last + 1;
  return { entries: [...entries.slice(0, index), entry, ...entries.slice(index)], index };
}

export function replaceEntry(entries: readonly Entry[], index: number, entry: Entry): Entry[] {
  return entries.map((e, i) => (i === index ? entry : e));
}

export function removeEntry(entries: readonly Entry[], index: number): Entry[] {
  return entries.filter((_, i) => i !== index);
}
