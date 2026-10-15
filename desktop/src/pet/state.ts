// Pet animasyon durumları: docs/PROJECT.md "Animasyon durumları (sözleşme)".
import type { PlayOptions } from "../player/player";
import type { Sheet } from "../player/sheet";

export const PET_STATES = [
  "idle",
  "shrug",
  "walk",
  "talk",
  "sleep",
  "run_away",
  "sulk",
  "peek",
  "shh",
  "dragged",
  "fart",
  // SPEC 17 eğlenceli animasyonlar
  "wave",
  "jump",
  "dance",
  "yawn",
  "sneeze",
] as const;

export type PetState = (typeof PET_STATES)[number];

/** Sözleşmedeki kare sayıları. Sheet bunlarla uyuşmazsa uyarı verilir, oynatma yine çalışır. */
export const STATE_FRAMES: Record<PetState, number> = {
  idle: 4,
  shrug: 4,
  walk: 6,
  talk: 3,
  sleep: 4,
  run_away: 4,
  sulk: 2,
  peek: 4,
  shh: 3,
  dragged: 2,
  fart: 6,
  wave: 4,
  jump: 4,
  dance: 8,
  yawn: 5,
  sneeze: 6,
};

/** Tek seferlik durumlar son karede durur ve onDone çağrılır; diğerleri döner. */
export const ONE_SHOT: ReadonlySet<PetState> = new Set<PetState>(["shrug", "fart", "wave", "jump", "dance", "yawn", "sneeze"]);

export function isPetState(name: string): name is PetState {
  return (PET_STATES as readonly string[]).includes(name);
}

export function playOptions(state: PetState, onDone?: () => void): PlayOptions {
  return { loop: !ONE_SHOT.has(state), onDone };
}

/** Sözleşmeye göre sheet'teki eksik/uyumsuz durumlar (boş dizi = tamam). */
export function checkSheet(sheet: Sheet): string[] {
  const problems: string[] = [];
  for (const state of PET_STATES) {
    const tag = sheet.tags.get(state);
    if (!tag) {
      problems.push(`missing tag: ${state}`);
      continue;
    }
    const count = tag.to - tag.from + 1;
    if (count !== STATE_FRAMES[state]) {
      problems.push(`${state}: ${count} frames, expected ${STATE_FRAMES[state]}`);
    }
  }
  return problems;
}
