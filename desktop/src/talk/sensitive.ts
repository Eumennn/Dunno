// FB14-1: Yasak konu tekrar algılama, sert cevap ve 24h küsme takipçisi.
// Soru metni ASLA saklanmaz/loglanmaz; sadece anonim sayaç (strikes) ve epoch zaman damgası (sulkUntil).

export const SENSITIVE_WARN_STRIKES = 3;
export const SENSITIVE_SULK_STRIKES = 5;
export const SENSITIVE_SULK_DURATION_MS = 24 * 60 * 60 * 1000; // 24 saat

export interface SensitiveState {
  /** bugünkü yasak soru sayacı (0..) */
  strikes: number;
  /** 24h küsme bitiş zamanı (ms epoch); null = küsmemiş */
  sulkUntil: number | null;
}

export type SensitiveAction = "dodge" | "warn" | "sulk";

export const initialSensitive = (): SensitiveState => ({
  strikes: 0,
  sulkUntil: null,
});

/** Store'dan gelen veriyi temizler; bozuk/geçersiz değerleri eler. */
export function cleanSensitive(raw: unknown): SensitiveState {
  if (typeof raw !== "object" || raw === null) return initialSensitive();
  const r = raw as Partial<SensitiveState>;
  const strikes = typeof r.strikes === "number" && Number.isFinite(r.strikes) && r.strikes >= 0 ? Math.floor(r.strikes) : 0;
  const sulkUntil = typeof r.sulkUntil === "number" && Number.isFinite(r.sulkUntil) && r.sulkUntil > 0 ? Math.floor(r.sulkUntil) : null;
  return { strikes, sulkUntil };
}

/** Şu an küs durumda mı? Süre dolduysa false döner. */
export function isSulking(state: SensitiveState, now = Date.now()): boolean {
  if (state.sulkUntil === null) return false;
  return now < state.sulkUntil;
}

/** Süresi dolmuş küsmeyi sıfırlar. Süre dolduysa strikes da 0'a sıfırlanır. */
export function pruneSensitive(state: SensitiveState, now = Date.now()): SensitiveState {
  if (state.sulkUntil !== null && now >= state.sulkUntil) {
    return initialSensitive();
  }
  return state;
}

/**
 * Yasak konu sorulduğunda sayacı günceller ve verilecek tepkiyi belirler.
 * - Zaten küs ise: küs kalır ("sulk")
 * - strikes 1-2: normal kaçamak ("dodge")
 * - strikes 3-4: sert uyarı ("warn")
 * - strikes >= 5: 24 saatlik küsme başlatır ("sulk")
 */
export function recordStrike(
  currentState: SensitiveState,
  now = Date.now(),
): { state: SensitiveState; action: SensitiveAction } {
  const active = pruneSensitive(currentState, now);
  if (isSulking(active, now)) {
    return { state: active, action: "sulk" };
  }

  const nextStrikes = active.strikes + 1;
  if (nextStrikes >= SENSITIVE_SULK_STRIKES) {
    const nextState: SensitiveState = {
      strikes: nextStrikes,
      sulkUntil: now + SENSITIVE_SULK_DURATION_MS,
    };
    return { state: nextState, action: "sulk" };
  }

  const nextState: SensitiveState = {
    strikes: nextStrikes,
    sulkUntil: null,
  };
  const action: SensitiveAction = nextStrikes >= SENSITIVE_WARN_STRIKES ? "warn" : "dodge";
  return { state: nextState, action };
}
