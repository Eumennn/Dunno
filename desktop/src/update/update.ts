// Güncelleme kararları (SPEC 10 CL1, saf): günde en fazla bir sessiz kontrol, yeni sürüm başına tek bildirim.
// Kontrol ve kurulum Rust'ta (src-tauri/src/updates.rs, imzalı latest.json); burası "ne zaman" ve "haber verilir mi".
// Store'a sadece gün ve sürüm yazılır.

export const UPDATE_KEY = "update";

export interface UpdateState {
  /** son kontrol günü (yerel YYYY-MM-DD) */
  checkedDay: string | null;
  /** bildirimi yapılmış sürüm (aynı sürüm için bir daha toast yok) */
  notified: string | null;
}

export function initialUpdateState(): UpdateState {
  return { checkedDay: null, notified: null };
}

export function cleanUpdateState(raw: unknown): UpdateState {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const day = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const ver = (v: unknown) => (typeof v === "string" && parseVersion(v) ? v : null);
  return { checkedDay: day(r.checkedDay), notified: ver(r.notified) };
}

/** "1.2.3" -> [1,2,3]; geçersizse null (ön ek "v" kabul). */
export function parseVersion(v: string): [number, number, number] | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(v.trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** remote, current'tan yeni mi (geçersiz sürüm: hayır). */
export function isNewer(remote: string, current: string): boolean {
  const a = parseVersion(remote);
  const b = parseVersion(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}

/** Bugün sessiz kontrol yapılsın mı (günde bir). */
export function shouldCheck(s: UpdateState, today: string): boolean {
  return s.checkedDay !== today;
}

/**
 * Kontrol sonucu: found = uç noktanın dediği yeni sürüm (yoksa null). Dönen notify: toast gösterilsin mi.
 * Bildirim sürüm başına bir kez; daha yeni bir sürüm gelirse yine bir kez.
 */
export function afterCheck(s: UpdateState, today: string, found: string | null, current: string): { state: UpdateState; notify: boolean } {
  const fresh = found !== null && isNewer(found, current);
  const notify = fresh && found !== s.notified;
  return { state: { checkedDay: today, notified: notify ? found : s.notified }, notify };
}
