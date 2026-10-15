// FB9 kurulum akışı (saf): adımlar, ilerleme, satır seçimi, Dunno'nun hali.
export type Step = "welcome" | "installing" | "done" | "failed";

/** Sessiz NSIS ilerleme bildirmez: süreye göre %95'e yaklaşan eğri, bitince %100. Geri gitmez. */
export function progressAt(ms: number, finished: boolean): number {
  if (finished) return 100;
  const p = 95 * (1 - Math.exp(-Math.max(0, ms) / 2500));
  return Math.min(95, Math.floor(p));
}

/** Kurulum satırı: [ dunno ] seçildiyse önce o cevap, sonra 2.2 sn'de bir sıradaki (sonuncuda kalır). */
export function lineAt(ms: number, lines: readonly string[], dunnoPicked: string | null): string {
  const all = dunnoPicked ? [dunnoPicked, ...lines] : lines;
  const i = Math.min(all.length - 1, Math.floor(Math.max(0, ms) / 2200));
  return all[i] ?? "";
}

export type SetupMode = "install" | "uninstall";

/** Dunno'nun animasyonu (sheet etiketleri). Kaldırırken: surat asar, toparlanır, el sallar. */
export function petState(step: Step, mode: SetupMode = "install"): string {
  switch (step) {
    case "welcome":
      return mode === "uninstall" ? "sulk" : "idle";
    case "installing":
      return "walk";
    case "done":
      return mode === "uninstall" ? "wave" : "dance";
    case "failed":
      return "shrug";
  }
}

/** İlerleme çubuğu blokları (gradyan yok: tek renk bloklar). */
export function blocks(pct: number, total = 20): number {
  return Math.max(0, Math.min(total, Math.round((pct / 100) * total)));
}
