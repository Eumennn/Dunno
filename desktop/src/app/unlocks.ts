// FB6: bazı dunno.exe sekmeleri level ile açılır (yetenek ağacının "os" dalı). Saf.
// Pro ve test modu beklemez. Level bilinmiyorsa (pet penceresinden durum gelmeden) 1 sayılır.
import { PERKS, type PerkId } from "../companion/perks";
import type { Tab } from "./view";

export const TAB_PERK: Partial<Record<Tab, PerkId>> = { stats: "stats_tab", workshop: "workshop_tab" };

/** sekmenin açıldığı level; her zaman açıksa null */
export function tabLevel(tab: Tab): number | null {
  const id = TAB_PERK[tab];
  return id ? (PERKS.find((p) => p.id === id)?.level ?? null) : null;
}

export function tabOpen(tab: Tab, level: number, bypass: boolean): boolean {
  const need = tabLevel(tab);
  return bypass || need === null || level >= need;
}
