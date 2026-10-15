// FB6 performans: pet penceresi her zaman açık ve en üstte. Dunno yürümüyor/sürüklenmiyor/inmiyorken saniyede 60 kez uyanmak
// gereksiz (kare animasyonları zaten ~4-10 fps): boşta ~12 fps zamanlayıcı, hareket varken requestAnimationFrame.
// Etkileşim (fare) gelince döngü hemen hızlanır (wake).
export const IDLE_FRAME_MS = 83;

export interface FrameLoop {
  /** fare/olay: bekleyen yavaş kareyi iptal edip hemen hızlı kareye geç */
  wake(): void;
  stop(): void;
}

export function startFrameLoop(
  tick: () => void,
  busy: () => boolean,
  env: { raf: (f: () => void) => number; caf: (id: number) => void; setTimeout: (f: () => void, ms: number) => number; clearTimeout: (id: number) => void } = {
    raf: (f) => requestAnimationFrame(f),
    caf: (id) => cancelAnimationFrame(id),
    setTimeout: (f, ms) => window.setTimeout(f, ms),
    clearTimeout: (id) => window.clearTimeout(id),
  },
): FrameLoop {
  let raf: number | null = null;
  let timer: number | null = null;
  let stopped = false;
  const frame = () => {
    raf = null;
    timer = null;
    if (stopped) return;
    tick();
    schedule();
  };
  const schedule = () => {
    if (stopped || raf !== null || timer !== null) return;
    if (busy()) raf = env.raf(frame);
    else timer = env.setTimeout(frame, IDLE_FRAME_MS);
  };
  schedule();
  return {
    wake() {
      if (timer === null || stopped) return;
      env.clearTimeout(timer);
      timer = null;
      raf = env.raf(frame);
    },
    stop() {
      stopped = true;
      if (raf !== null) env.caf(raf);
      if (timer !== null) env.clearTimeout(timer);
    },
  };
}
