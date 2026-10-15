// Tray menüsü köprüsü (karşılığı: src-tauri/src/tray.rs). Rust ayar yazmaz: menü tıklaması
// `tray://action` olayı olur, TS ayarı günceller ve updateTrayState ile menüyü senkronlar.
// İstisnalar Rust'ta hallolur: "toplantıdayım" doğrudan izleyiciye gider, autostart eklentiyle açılıp kapanır,
// "çıkış" olay beklemeden uygulamayı kapatır (quit olayı yine de gelir, iş yapmaya gerek yok).
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { Frequency, Lang, Mode } from "./lines/types";

export const EVENT_TRAY = "tray://action";

export type TrayAction =
  | { action: "mode"; value: Mode }
  | { action: "frequency"; value: Frequency }
  | { action: "lang"; value: Lang }
  | { action: "mute_today"; value: boolean }
  | { action: "meeting"; value: boolean }
  | { action: "autostart"; value: boolean }
  /** SPEC 17: tray "dunno sesi" */
  | { action: "voice"; value: boolean }
  | { action: "quit" };

/** Menünün göstermesi gereken durum (ayarlardan). */
export interface TrayState {
  mode: Mode;
  muted: boolean;
  frequency: Frequency;
  lang: Lang;
  autostart: boolean;
  manualMeeting: boolean;
  /** SPEC 17 */
  voice?: boolean;
}

const MODES: readonly string[] = ["polite", "street"];
const FREQUENCIES: readonly string[] = ["low", "normal", "high"];
const LANGS: readonly string[] = ["tr", "en"];
const FLAGS: readonly string[] = ["mute_today", "meeting", "autostart", "voice"];

/** Olay yükünü doğrular; tanınmayan yük null (yok sayılır). */
export function parseTrayAction(raw: unknown): TrayAction | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { action, value } = raw as { action?: unknown; value?: unknown };
  if (action === "quit") return { action: "quit" };
  if (action === "mode" && typeof value === "string" && MODES.includes(value)) return { action, value: value as Mode };
  if (action === "frequency" && typeof value === "string" && FREQUENCIES.includes(value)) {
    return { action, value: value as Frequency };
  }
  if (action === "lang" && typeof value === "string" && LANGS.includes(value)) return { action, value: value as Lang };
  if (typeof action === "string" && FLAGS.includes(action) && typeof value === "boolean") {
    return { action, value } as TrayAction;
  }
  return null;
}

export function onTrayAction(cb: (a: TrayAction) => void): Promise<UnlistenFn> {
  return listen<unknown>(EVENT_TRAY, (e) => {
    const action = parseTrayAction(e.payload);
    if (action) cb(action);
  });
}

/** Açılışta ve her ayar değişiminde çağır; menü işaretleri, dili ve "toplantıdayım" durumu güncellenir. */
export function updateTrayState(state: TrayState): Promise<void> {
  return invoke("update_tray_state", { state });
}
