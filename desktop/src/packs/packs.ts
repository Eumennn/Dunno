// Uygulamayla gelen paketler (SPEC 18 Faz 4, strateji §13-15): content/packs/<id>/ (SPEC 12 veri modu, kod yok).
// requires "pack": tek seferlik kozmetik (lisans packs listesinde), "pro": premium dünya (Pro aboneliği).
// Hak yoksa paket yüklenmez; dunno.exe'de kilitli görünür ("satın al" değil "bu paket şunu ekler" dili, strateji §14).
// Paketler kullanıcı modlarının sayı sınırına girmez ve SPEC 15 Free tür süzgecinden geçmez (hak zaten denetlendi).
import packsJson from "../../../content/packs/packs.json";
import type { ModDir, ModFile } from "../mods/mods";
import type { Tier } from "../pro/entitlements";

export interface PackInfo {
  id: string;
  requires: "pack" | "pro";
  name: { tr: string; en: string };
  description: { tr: string; en: string };
}

export const PACKS: readonly PackInfo[] = (packsJson as { packs: PackInfo[] }).packs;

const files = import.meta.glob("../../../content/packs/*/**/*.json", { eager: true, query: "?raw", import: "default" }) as Record<string, string>;

/** Paketin hakkı var mı. */
export function entitled(p: Pick<PackInfo, "requires" | "id">, tier: Tier, owned: readonly string[]): boolean {
  return p.requires === "pro" ? tier === "pro" : owned.includes(p.id);
}

/** Paketin ham klasörü (mod doğrulayıcısına gerçek mod gibi girer). */
export function packDir(id: string): ModDir {
  const prefix = `../../../content/packs/${id}/`;
  const list: ModFile[] = Object.entries(files)
    .filter(([p]) => p.startsWith(prefix))
    .map(([p, text]) => ({ path: p.slice(prefix.length), size: new TextEncoder().encode(text).length, text }));
  return { dir: id, files: list };
}

/** Hak sahibi olunan ve kullanıcının kapatmadığı paketler (settings.mods[id] === false kapatır). */
export function activePackDirs(tier: Tier, owned: readonly string[], enabled: Readonly<Record<string, boolean>>): ModDir[] {
  return PACKS.filter((p) => entitled(p, tier, owned) && enabled[p.id] !== false).map((p) => packDir(p.id));
}
