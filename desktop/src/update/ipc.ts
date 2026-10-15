// Güncelleme komutları (karşılığı: src-tauri/src/updates.rs). Sadece sürüm ve not döner.
import { invoke } from "@tauri-apps/api/core";

export interface UpdateInfo {
  version: string;
  notes: string | null;
}

export interface CheckResult {
  info: UpdateInfo | null;
  /** FB12: kontrol yapılamadı (ağ, zaman aşımı, imza...); elle kontrolde about.txt'de gösterilir */
  error: string | null;
}

/** Yeni sürüm var mı. */
export function checkUpdate(): Promise<CheckResult> {
  return invoke<UpdateInfo | null>("update_check").then(
    (info) => ({ info, error: null }),
    (e) => ({ info: null, error: String(e).slice(0, 140) }),
  );
}

/** İndir, doğrula, kur, yeniden başlat. Başarısızsa hata metni (başarılıysa uygulama yeniden başlar). */
export function installUpdate(): Promise<string | null> {
  return invoke("update_install").then(
    () => null,
    (e) => String(e).slice(0, 140),
  );
}
