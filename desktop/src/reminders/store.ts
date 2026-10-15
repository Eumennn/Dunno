// Hatırlatıcı listesi (FB7, saf): sadece bu cihazda (store "reminders"), ağa gitmez. Etiket kullanıcının bilerek yazdığı kısa metin.
import { hhmm } from "./parse";

export interface Reminder {
  id: string;
  /** ISO */
  at: string;
  label: string;
}

export const REMINDERS_KEY = "reminders";
/** aynı anda en fazla (beceri ağacında "alarm.exe+" düğümü açılınca daha çok) */
export const FREE_MAX = 3;
export const PERK_MAX = 10;
/** kapalıyken kaçırılan alarm bu kadar eskiyse sessizce düşer */
export const STALE_MS = 12 * 3_600_000;

export function cleanReminders(raw: unknown): Reminder[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Reminder => typeof r === "object" && r !== null && typeof r.id === "string" && typeof r.at === "string" && !Number.isNaN(Date.parse(r.at)) && typeof r.label === "string")
    .map((r) => ({ id: r.id.slice(0, 24), at: new Date(r.at).toISOString(), label: r.label.slice(0, 60) }))
    .slice(0, PERK_MAX)
    .sort((a, b) => a.at.localeCompare(b.at));
}

export function addReminder(list: readonly Reminder[], at: Date, label: string, max: number, id: string): { list: Reminder[]; ok: boolean } {
  if (list.length >= max) return { list: [...list], ok: false };
  const next = [...list, { id, at: at.toISOString(), label }].sort((a, b) => a.at.localeCompare(b.at));
  return { list: next, ok: true };
}

/** zamanı gelenler (çalınacak), çok eskiyenler (düşer), kalanlar */
export function dueReminders(list: readonly Reminder[], now: Date): { due: Reminder[]; stale: Reminder[]; rest: Reminder[] } {
  const t = now.getTime();
  const due: Reminder[] = [];
  const stale: Reminder[] = [];
  const rest: Reminder[] = [];
  for (const r of list) {
    const at = Date.parse(r.at);
    if (at > t) rest.push(r);
    else if (t - at > STALE_MS) stale.push(r);
    else due.push(r);
  }
  return { due, stale, rest };
}

/** etiketle (içeren) ya da hepsini sil */
export function clearReminders(list: readonly Reminder[], label: string | null): { list: Reminder[]; removed: number } {
  const keep = label ? list.filter((r) => !r.label.includes(label) && !label.includes(r.label || "\u0000")) : [];
  return { list: keep, removed: list.length - keep.length };
}

/** "15:30" bugünse, "yarın 09:00" / "cmt 09:00" değilse */
export function whenLabel(at: Date, now: Date, lang: "tr" | "en"): string {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((day(at) - day(now)) / 86_400_000);
  if (diff === 0) return hhmm(at);
  if (diff === 1) return `${lang === "tr" ? "yarın" : "tomorrow"} ${hhmm(at)}`;
  const names = lang === "tr" ? ["paz", "pzt", "sal", "çar", "per", "cum", "cmt"] : ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return `${names[at.getDay()]} ${hhmm(at)}`;
}
