// Creator Studio (SPEC 18 Faz 3, strateji §11, saf): kendi temanı ve laf paketini yap -> SPEC 12 veri modu (ModDir).
// Kod yok. Renkler onaylı tema paletlerinden (marka kuralı). Sonuç gerçek mod doğrulamasından geçer (validateMods) ve kurulur,
// sonra istenirse workshop'a yüklenir. Free (AI dünya üretici Pro).
import themesJson from "../../../content/wardrobe/themes.json";
import type { ModDir } from "../mods/mods";

export interface Palette {
  id: string;
  name: { tr: string; en: string };
  colors: { body: string; shade: string; light: string; belly: string };
}

export const STUDIO_PALETTES: readonly Palette[] = (themesJson as { themes: Palette[] }).themes.map((t) => ({ id: t.id, name: t.name, colors: t.colors }));

/** studio laf paketlerinin tetikleyicileri (havuz tetikleyicileri) */
export const STUDIO_TRIGGERS = [
  "interaction:click",
  "interaction:drag",
  "time:morning",
  "time:noon",
  "time:evening",
  "time:night",
  "idle:10",
  "idle:30",
  "app:browser",
  "app:excel",
  "app:vscode",
  "app:game",
  "random",
] as const;
export type StudioTrigger = (typeof STUDIO_TRIGGERS)[number];

export const STUDIO_MAX_LINES = 30;

export function slugify(s: string): string {
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" };
  return s
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşü]/g, (c) => map[c] ?? c)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 18);
}

/** paket kimliği: my_<ad>_<4 hex> (çakışmasın; mod id kuralı ^[a-z][a-z0-9_]{1,31}$) */
export function packId(name: string, rng: () => number = Math.random): string {
  const hex = Math.floor(rng() * 0xffff).toString(16).padStart(4, "0");
  return `my_${slugify(name) || "pack"}_${hex}`.slice(0, 32);
}

const file = (path: string, v: unknown) => {
  const text = typeof v === "string" ? v : `${JSON.stringify(v, null, 2)}\n`;
  return { path, size: new TextEncoder().encode(text).length, text };
};

export interface StudioName {
  tr: string;
  en: string;
}

const cleanName = (n: StudioName): StudioName => ({ tr: n.tr.trim().toLocaleLowerCase("tr").slice(0, 32), en: n.en.trim().toLowerCase().slice(0, 32) });

/** Tema paketi: tek tema, onaylı paletten. */
export function themePack(name: StudioName, paletteId: string, author: string, rng?: () => number): ModDir | null {
  const p = STUDIO_PALETTES.find((x) => x.id === paletteId);
  const n = cleanName(name);
  if (!p || !n.tr || !n.en) return null;
  const id = packId(n.en, rng);
  const themeId = `${id}_theme`.slice(0, 40);
  return {
    dir: id,
    files: [
      file("manifest.json", { schema: 1, id, name: n, version: "1.0.0", author: author || "me", permissions: ["themes"], contents: { themes: [`themes/${themeId}.json`] } }),
      file(`themes/${themeId}.json`, { id: themeId, name: n, colors: p.colors }),
    ],
  };
}

export interface StudioLine {
  trigger: StudioTrigger;
  tr: string;
  en: string;
}

/** Laf paketi: tetikleyici + iki dil. Marka kuralları ve yasak konular validateMods/checkPool'da denetlenir. */
export function linesPack(name: StudioName, lines: readonly StudioLine[], author: string, rng?: () => number): ModDir | null {
  const n = cleanName(name);
  const ok = lines.filter((l) => (STUDIO_TRIGGERS as readonly string[]).includes(l.trigger) && l.tr.trim() && l.en.trim()).slice(0, STUDIO_MAX_LINES);
  if (!n.tr || !n.en || !ok.length) return null;
  const id = packId(n.en, rng);
  const react = (lang: "tr" | "en") =>
    ok.map((l, i) => ({ id: `${id}_${String(i + 1).padStart(2, "0")}`, trigger: l.trigger, intent: "creator studio line", [lang]: l[lang].trim() }));
  return {
    dir: id,
    files: [
      file("manifest.json", { schema: 1, id, name: n, version: "1.0.0", author: author || "me", permissions: ["reactions"], contents: { reactions: { tr: "reactions/tr.json", en: "reactions/en.json" } } }),
      file("reactions/tr.json", react("tr")),
      file("reactions/en.json", react("en")),
    ],
  };
}

/** Pakettin laf önizlemesi (AI dünya / workshop): ilk n laf */
export function previewLines(pack: ModDir, lang: "tr" | "en", n = 4): string[] {
  const f = pack.files.find((x) => x.path === `reactions/${lang}.json`);
  try {
    return (JSON.parse(f?.text ?? "[]") as Record<string, string>[]).slice(0, n).map((l) => l[lang]).filter(Boolean);
  } catch {
    return [];
  }
}
