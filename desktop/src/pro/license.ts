// Pro lisans durumu (SPEC 15): doğrulama Rust'ta (license.rs, çevrimdışı Ed25519). Anahtar sadece Rust komutuna gider; olaylarla
// pencereler arasında taşınmaz, store'a yazılmaz, ağa gitmez.
import { invoke } from "@tauri-apps/api/core";

export interface LicenseStatus {
  pro: boolean;
  /** lisans kimliğinin son 6 hanesi */
  tail: string | null;
  /** bu derlemede lisans sistemi açık mı (açık anahtar gömülü mü) */
  enabled: boolean;
  error: string | null;
  /** SPEC 18: sahip olunan tek seferlik kozmetik paketler */
  packs?: string[];
  /** abonelik sonu (YYYY-MM-DD); süresizse null */
  until?: string | null;
  /** abonelik süresi geçti (Pro kapalı, yenileme denenir) */
  expired?: boolean;
}

export const NO_LICENSE: LicenseStatus = { pro: false, tail: null, enabled: false, error: null, packs: [] };
const inTauri = () => "__TAURI_INTERNALS__" in window;

export async function licenseStatus(): Promise<LicenseStatus> {
  if (!inTauri()) return NO_LICENSE;
  return invoke<LicenseStatus>("license_status").catch(() => NO_LICENSE);
}

export async function licenseActivate(key: string): Promise<LicenseStatus> {
  if (!inTauri()) return { ...NO_LICENSE, error: "disabled" };
  return invoke<LicenseStatus>("license_activate", { key }).catch(() => ({ ...NO_LICENSE, error: "format" }));
}

export async function licenseRemove(): Promise<LicenseStatus> {
  if (!inTauri()) return NO_LICENSE;
  return invoke<LicenseStatus>("license_remove").catch(() => NO_LICENSE);
}

/** Kayıtlı lisans metni (yenileme için; süresi geçmiş abonelik dahil). Yoksa null. */
export async function licenseToken(): Promise<string | null> {
  if (!inTauri()) return null;
  return invoke<string | null>("license_token").catch(() => null);
}
