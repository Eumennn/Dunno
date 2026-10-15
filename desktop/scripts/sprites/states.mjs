// Sheet durumları (tek kaynak): gen-sheet.mjs pikselleri, gen-wardrobe.mjs bağlantı noktalarını buradan üretir.
import { back, dance, fart, front, jump, peek, side, sleep, sneeze, wave, yawn } from "./poses.mjs";

/** Durum -> [kare süresi ms, kareler]. Kare sayıları src/pet/state.ts STATE_FRAMES ile aynı (test doğrular). */
export const STATES = {
  idle: [500, [front(), front().breathe(20), front({ ant: "sway" }), front({ eyes: "closed" })]],
  shrug: [260, [front({ arms: "side" }), front({ arms: "up" }), front({ arms: "up", ant: "sway" }), front({ arms: "up" })]],
  walk: [
    220,
    [
      side({ step: 0 }),
      side({ step: 1 }).shift(0, -1),
      side({ step: 0, ant: "sway" }),
      side({ step: 2 }),
      side({ step: 2 }).shift(0, -1),
      side({ step: 0, ant: "sway" }),
    ],
  ],
  talk: [260, [front({ mouth: "closed" }), front({ mouth: "open" }), front({ mouth: "half" })]],
  sleep: [800, [sleep({ z: 0 }), sleep({ z: 1, breath: true }), sleep({ z: 2 }), sleep({ z: 3, breath: true })]],
  run_away: [
    250,
    [
      side({ step: 1, run: true }),
      side({ step: 0, run: true, ant: "sway", drops: 1 }).shift(0, -1),
      side({ step: 2, run: true }),
      side({ step: 0, run: true, ant: "sway", drops: 1 }).shift(0, -1),
    ],
  ],
  sulk: [600, [back(), back({ ant: "sway" }).breathe(20)]],
  peek: [400, [peek(), peek({ ant: "sway" }), peek({ out: 1 }), peek({ eyes: "closed" })]],
  shh: [400, [front({ finger: true }), front({ finger: true, ant: "sway" }), front({ finger: true, eyes: "closed" })]],
  dragged: [300, [front({ feet: "dangle", ant: "droop", arms: "up" }), front({ feet: "dangle", ant: "droop", arms: "up" }).shift(0, 1)]],
  // SPEC 09 K3: tek seferlik, ~1.1 sn; sonra interaction:fart lafı
  fart: [180, [0, 1, 2, 3, 4, 5].map((n) => fart(n))],
  // SPEC 17 eğlenceli animasyonlar (tek seferlik)
  wave: [220, [0, 1, 2, 3].map((n) => wave(n))],
  jump: [140, [0, 1, 2, 3].map((n) => jump(n))],
  dance: [200, [0, 1, 2, 3, 4, 5, 6, 7].map((n) => dance(n))],
  yawn: [300, [0, 1, 2, 3, 4].map((n) => yawn(n))],
  sneeze: [200, [0, 1, 2, 3, 4, 5].map((n) => sneeze(n))],
};
