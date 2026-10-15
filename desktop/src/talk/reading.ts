// Balon süresi (SPEC 07 FB5, saf): metin uzunluğuna göre okuma süresi + hover'da durma.
// triggers.ts readingMs'in (2.5-8 sn) yerini alır; talker bu modüle geçer (desktop). Saat dışarıdan verilir.

export type BubbleSpeed = "short" | "normal" | "long";

/** settings "balon süresi": kısa / normal / uzun */
export const SPEED_FACTOR: Readonly<Record<BubbleSpeed, number>> = { short: 0.75, normal: 1, long: 1.5 };

export const READ_BASE_MS = 2_000;
export const READ_PER_CHAR_MS = 110;
export const READ_MIN_MS = 4_000;
export const READ_MAX_MS = 12_000;
/** honest (uzun, ≤120 karakter) cevapta üst sınır */
export const READ_MAX_HONEST_MS = 14_000;

/**
 * clamp(2000 + 110 x karakter, 4000, 12000; honest üst 14000) x hız katsayısı.
 * Karakter = kod noktası (Türkçe harf / emoji iki birim sayılmaz).
 */
export function readingMs(text: string, opts: { honest?: boolean; speed?: BubbleSpeed } = {}): number {
  const len = Array.from(text).length;
  const max = opts.honest ? READ_MAX_HONEST_MS : READ_MAX_MS;
  const base = Math.min(max, Math.max(READ_MIN_MS, READ_BASE_MS + READ_PER_CHAR_MS * len));
  return Math.round(base * SPEED_FACTOR[opts.speed ?? "normal"]);
}

/** Geçersiz ayar değeri normal'e döner (store'dan gelen). */
export function cleanSpeed(raw: unknown): BubbleSpeed {
  return raw === "short" || raw === "long" ? raw : "normal";
}

// ---------------------------------------------------------------- hover durması

/** imleç balondan ayrılınca en az bu kadar daha kalır */
export const LEAVE_MS = 2_000;

export interface BubbleTimer {
  phase: "open" | "hover" | "closed";
  /** okuma süresinin bittiği an (ms); hover bunu ileri itmez */
  deadline: number;
  /** kapanma anı (ms); hover'da null */
  closeAt: number | null;
}

export type BubbleEvent = "enter" | "leave" | "click" | "tick";

/** Balon açıldı: now + okuma süresi. */
export function openBubble(now: number, ms: number): BubbleTimer {
  return { phase: "open", deadline: now + ms, closeAt: now + ms };
}

/**
 * enter: imleç balonda, kapanmaz. leave: max(okuma bitişi, şimdi + 2 sn)'de kapanır. click: hemen kapanır.
 * tick: süre dolduysa kapanır. close: bu olayla kapandı (bir kez true; kapalıyken olaylar yok sayılır).
 */
export function bubbleStep(t: BubbleTimer, ev: BubbleEvent, now: number): { timer: BubbleTimer; close: boolean } {
  if (t.phase === "closed") return { timer: t, close: false };
  const closed = (): { timer: BubbleTimer; close: boolean } => ({ timer: { ...t, phase: "closed", closeAt: null }, close: true });
  switch (ev) {
    case "click":
      return closed();
    case "enter":
      return { timer: { ...t, phase: "hover", closeAt: null }, close: false };
    case "leave":
      if (t.phase !== "hover") return { timer: t, close: false };
      return { timer: { ...t, phase: "open", closeAt: Math.max(t.deadline, now + LEAVE_MS) }, close: false };
    case "tick":
      if (t.phase === "open" && t.closeAt !== null && now >= t.closeAt) return closed();
      return { timer: t, close: false };
  }
}
