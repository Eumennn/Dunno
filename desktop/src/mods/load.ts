// Mod yükleme (SPEC 12 B): Rust ham okur (list_mods), burada doğrulanır (mods.ts) ve etkin olanlar birleştirilir.
// Pet penceresi etkin modları uygular; dunno.exe aynı listeyi settings.exe ve dolap için okur. Mod kodu yoktur, çalıştırılmaz.
import { invoke } from "@tauri-apps/api/core";
import type { Theme } from "../wardrobe/themes";
import { ACCESSORIES, COSTUMES, type ModItems } from "../wardrobe/wardrobe";
import { mergeMods, validateMods, type LoadedMod, type ModDir, type ModResult } from "./mods";
import { maxMods, modAllowed, type Tier } from "../pro/entitlements";

export type MergedMods = ReturnType<typeof mergeMods>;

/** Mods klasöründeki ham klasörler; Tauri dışında ya da hata olursa boş. */
export async function readModDirs(): Promise<ModDir[]> {
  if (!("__TAURI_INTERNALS__" in window)) return [];
  try {
    return await invoke<ModDir[]>("list_mods");
  } catch {
    return [];
  }
}

/** Yerleşik içerik id'leri (mod parçası bunlarla çakışamaz). */
export function builtinIds(themes: readonly Theme[]): Set<string> {
  return new Set<string>(["classic", ...themes.map((t) => t.id), ...ACCESSORIES, ...COSTUMES]);
}

export interface ModsLoad {
  results: ModResult[];
  /** geçerli VE ayarda açık olanlar */
  active: LoadedMod[];
  merged: MergedMods;
  /** SPEC 15: ayarda açık modun bu katmanda atlanan kısmı -> Pro türleri ya da ["limit"] (mod sayısı sınırı, hiç yüklenmedi) */
  blocked: Record<string, string[]>;
}

/**
 * Doğrula + ayarda açık olanları birleştir. Yeni bulunan mod kapalıdır (enabled[id] !== true).
 * SPEC 15: Free'de gelişmiş türler (kostüm/ses/davranış) atlanır, FREE_MAX_MODS üstü modlar yüklenmez (blocked).
 */
export function loadMods(
  dirs: readonly ModDir[],
  tags: readonly string[],
  themes: readonly Theme[],
  enabled: Readonly<Record<string, boolean>>,
  tier: Tier = "free",
  /** SPEC 18: uygulamayla gelen, hakkı denetlenmiş paketler (sınır ve Free süzgeci dışı; yine tam doğrulanır) */
  bundled: readonly ModDir[] = [],
): ModsLoad {
  const results = validateMods(dirs, tags, builtinIds(themes));
  const active: LoadedMod[] = [];
  const blocked: Record<string, string[]> = {};
  for (const r of results) {
    if (!r.mod || enabled[r.mod.manifest.id] !== true) continue;
    if (active.length >= maxMods(tier)) {
      blocked[r.mod.manifest.id] = ["limit"];
      continue;
    }
    // Free: modun temel türleri yüklenir, Pro türleri (kostüm/ses/davranış) atlanır (mod bütünüyle kapanmaz)
    const ok = modAllowed(tier, r.mod.manifest.permissions);
    if (ok.ok) active.push(r.mod);
    else {
      blocked[r.mod.manifest.id] = ok.kinds;
      active.push({ ...r.mod, costumes: [], sounds: {}, behavior: null });
    }
  }
  for (const r of validateMods(bundled, tags, builtinIds(themes))) if (r.mod) active.push(r.mod);
  return { results, active, merged: mergeMods(active), blocked };
}

/** Dolap kaydı için parça listesi (wardrobe.ts registerModItems). */
export function modItemsOf(m: MergedMods): ModItems {
  return {
    themes: m.themes.map((t) => t.id),
    accessories: m.accessories.map((a) => ({ id: a.acc.id, slot: a.slot })),
    costumes: m.costumes.map((c) => ({ id: c.costume.id, blocks: c.costume.blocks })),
  };
}

/** Mod parça adları (dolap kutucukları). */
export function modNames(m: MergedMods, lang: "tr" | "en"): { accessories: Record<string, string>; costumes: Record<string, string> } {
  return {
    accessories: Object.fromEntries(m.accessories.map((a) => [a.acc.id, a.acc.name[lang]])),
    costumes: Object.fromEntries(m.costumes.map((c) => [c.costume.id, c.costume.name[lang]])),
  };
}

/** Balon renkleri (kit.css --bubble-fill / --bubble-ink); mod yoksa temanın kâğıt/mürekkebi. */
export function applyBubbleStyle(root: HTMLElement, m: MergedMods): void {
  if (m.bubbles) {
    root.style.setProperty("--bubble-fill", m.bubbles.fill);
    root.style.setProperty("--bubble-ink", m.bubbles.ink);
  } else {
    root.style.removeProperty("--bubble-fill");
    root.style.removeProperty("--bubble-ink");
  }
}
