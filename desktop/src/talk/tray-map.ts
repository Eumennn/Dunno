// Tray <-> ayarlar eşlemesi (saf).
import type { TrayAction, TrayState } from "../ipc-tray";
import { isMuted, localDate, type Settings } from "../settings";

/** Tray aksiyonunun ayarlara yansıması; ayar dışı aksiyonlarda (meeting, quit) null. */
export function settingsPatchFor(a: TrayAction, now: Date): Partial<Omit<Settings, "deviceId">> | null {
  switch (a.action) {
    case "mode":
      return { mode: a.value };
    case "frequency":
      return { frequency: a.value };
    case "lang":
      return { lang: a.value };
    case "autostart":
      return { autostart: a.value };
    case "voice":
      return { voice: a.value };
    case "mute_today":
      // bugün dahil susar; yerel gün değişince isMuted kendiliğinden false olur
      return { muteUntil: a.value ? localDate(now) : null };
    case "meeting":
    case "quit":
      return null;
  }
}

export function trayStateOf(s: Readonly<Settings>, now: Date, manualMeeting: boolean): TrayState {
  return {
    mode: s.mode,
    muted: isMuted(s, now),
    frequency: s.frequency,
    lang: s.lang,
    autostart: s.autostart,
    manualMeeting,
    voice: s.voice,
  };
}
