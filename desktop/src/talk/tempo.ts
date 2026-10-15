// Soru temposu (SPEC 06 Q4, saf): ardışık sorular arası en az 20 sn; 2 dk içinde 4. soru -> "yavaş" + 60 sn kilit.
// Sadece zaman damgaları (ms), soru metni yok. Saat çağıran tarafından verilir.

export const COOLDOWN_MS = 20_000;
export const BURST_WINDOW_MS = 120_000;
/** pencere içinde izin verilen soru sayısı; bir fazlası kilit */
export const BURST_MAX = 3;
export const LOCK_MS = 60_000;

export interface Tempo {
  /** pencere içindeki soruların gönderilme anları (ms) */
  asks: number[];
  /** kilit bitişi (ms); 0 = kilit yok */
  lockUntil: number;
}

export type Gate = { kind: "ok" } | { kind: "cooldown" | "locked"; waitMs: number };

export const initialTempo = (): Tempo => ({ asks: [], lockUntil: 0 });

/** Soru kutusu açılabilir mi: kilitte ya da son sorudan 20 sn geçmediyse bekleme süresi. */
export function gate(t: Tempo, now: number): Gate {
  if (now < t.lockUntil) return { kind: "locked", waitMs: t.lockUntil - now };
  const last = t.asks.at(-1);
  if (last !== undefined && now - last < COOLDOWN_MS) return { kind: "cooldown", waitMs: COOLDOWN_MS - (now - last) };
  return { kind: "ok" };
}

/** Gönderilen soruyu işler. 2 dk içinde 4. soru: cevap yerine "yavaş", 60 sn kilit (soru sayılmaz). */
export function record(t: Tempo, now: number): { tempo: Tempo; tooFast: boolean } {
  const asks = t.asks.filter((x) => now - x < BURST_WINDOW_MS);
  if (asks.length >= BURST_MAX) return { tempo: { asks, lockUntil: now + LOCK_MS }, tooFast: true };
  return { tempo: { asks: [...asks, now], lockUntil: t.lockUntil }, tooFast: false };
}

/** Kilit ekranındaki saniye (yukarı yuvarlanır, en az 1). */
export const waitSeconds = (ms: number): number => Math.max(1, Math.ceil(ms / 1000));
