// Hatırlatıcı / alarm komutları (FB7, saf): ask.exe'ye yazılan "15:30'da toplantı diye hatırlat", "10 dk sonra çay alarmı kur",
// "remind me to stretch in 20 minutes", "set an alarm for 7:30" gibi cümleler. Tamamen yerel: metin sunucuya/LLM'e gitmez,
// günün 3 doğru cevap hakkını yemez. Sadece açık niyet kelimesi varsa (hatırlat, alarm, remind...) komut sayılır.

export type ReminderCommand =
  | { kind: "set"; at: Date; label: string }
  | { kind: "list" }
  | { kind: "clear"; label: string | null }
  /** niyet var ama zaman anlaşılmadı */
  | { kind: "no_time" };

/** en fazla bu kadar ileri (gün) */
export const MAX_AHEAD_DAYS = 7;
export const LABEL_MAX = 40;

/** Türkçe harfleri de kelime sayan sınır (JS \b sadece ASCII: "alarmı"nın ı'sında yanılır) */
const words = (list: string, flags = "gu") => new RegExp(`(?<![\\p{L}\\d])(?:${list})(?![\\p{L}\\d])`, flags);
const TR_INTENT = /(hat[ıi]rlat|alarm|uyand[ıi]r|haber ver|uyar(?![\p{L}])|hatırlatıcı|hatirlatici)/u;
const EN_INTENT = /\b(remind\w*|alarms?|wake me)\b/;
const LIST = /(alarmlar[ıi]?|hat[ıi]rlat[ıi]c[ıi]lar[ıi]?|hat[ıi]rlatmalar[ıi]?)\s*(g[öo]ster|listele|neler|ne var|var m[ıi])|\b(list|show)\b.*\b(alarms|reminders)\b|\bmy (alarms|reminders)\b|^(alarms|reminders)\??$/;
const CLEAR = /(iptal|sil|kald[ıi]r|kapat|vazge[çc])|\b(cancel|delete|remove|clear|stop)\b/;

const TR_NUM: Record<string, number> = { bir: 1, iki: 2, "üç": 3, uc: 3, "dört": 4, dort: 4, "beş": 5, bes: 5, "altı": 6, alti: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10, "on beş": 15, yirmi: 20, otuz: 30, "kırk": 40, "kırk beş": 45, elli: 50 };
const EN_NUM: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fifteen: 15, twenty: 20, thirty: 30, "forty five": 45, fifty: 50 };

const numOf = (w: string): number | null => {
  const t = w.trim();
  if (/^\d+$/.test(t)) return Number(t);
  return TR_NUM[t] ?? EN_NUM[t] ?? null;
};

const UNIT_MS = (u: string): number | null =>
  /^(sn|saniye|sec|secs|second|seconds)$/.test(u) ? 1_000 : /^(dk|dak|dakika|min|mins|minute|minutes)$/.test(u) ? 60_000 : /^(sa|saat|h|hr|hrs|hour|hours)$/.test(u) ? 3_600_000 : null;

interface TimeHit {
  at: Date;
  /** metinden çıkarılacak parça(lar) */
  spans: string[];
}

/** göreli: "10 dk sonra", "1 saat 20 dakika sonra", "yarım saat sonra", "in 20 minutes", "in an hour and a half" */
function relative(s: string, now: Date): TimeHit | null {
  const tr = /((?:(?:\d+|bir|iki|üç|uc|dört|dort|beş|bes|altı|alti|yedi|sekiz|dokuz|on beş|on|yirmi|otuz|kırk beş|kırk|elli|yarım)\s*(?:sn|saniye|dk|dak|dakika|sa|saat)\s*(?:ve\s*)?)+)\s*(?:sonra|içinde|icinde)/;
  const m = tr.exec(s);
  if (m) {
    let ms = 0;
    for (const p of m[1].matchAll(/(\d+|bir|iki|üç|uc|dört|dort|beş|bes|altı|alti|yedi|sekiz|dokuz|on beş|on|yirmi|otuz|kırk beş|kırk|elli|yarım)\s*(sn|saniye|dk|dak|dakika|sa|saat)/g)) {
      const u = UNIT_MS(p[2]);
      const n = p[1] === "yarım" ? 0.5 : numOf(p[1]);
      if (u && n !== null) ms += n * u;
    }
    if (ms > 0) return { at: new Date(now.getTime() + ms), spans: [m[0]] };
  }
  const en = /\bin\s+((?:(?:\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty|forty five|fifty|half an?)\s*(?:seconds?|secs?|minutes?|mins?|hours?|hrs?|h)\b\s*(?:and\s*(?:a\s*half)?\s*)?)+)/;
  const e = en.exec(s);
  if (e) {
    let ms = 0;
    for (const p of e[1].matchAll(/(\d+|an?|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty|forty five|fifty|half an?)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?|h)\b/g)) {
      const u = UNIT_MS(p[2]);
      const n = p[1].startsWith("half") ? 0.5 : numOf(p[1]);
      if (u && n !== null) ms += n * u;
    }
    if (/and a half/.test(e[1])) {
      const last = [...e[1].matchAll(/(seconds?|secs?|minutes?|mins?|hours?|hrs?|h)/g)].at(-1);
      if (last) ms += 0.5 * (UNIT_MS(last[1]) ?? 0);
    }
    if (ms > 0) return { at: new Date(now.getTime() + ms), spans: [e[0]] };
  }
  return null;
}

/** mutlak: "saat 15:30'da", "15.30", "9'da", "akşam 8'de", "yarın sabah 7'de", "at 3pm", "7:30 am", "tomorrow at 9" */
function absolute(s: string, now: Date): TimeHit | null {
  const spans: string[] = [];
  const tomorrow = /\b(yar[ıi]n|tomorrow)\b/.exec(s);
  if (tomorrow) spans.push(tomorrow[0]);
  const part = /\b(sabah|öğle|ogle|öğleden sonra|ogleden sonra|akşam|aksam|gece|morning|afternoon|evening|tonight|night)\b/.exec(s);
  if (part) spans.push(part[0]);
  const re = /(?:\bsaat\s*|\bat\s+)?\b([01]?\d|2[0-3])(?:[:.]([0-5]\d))?\s*(am|pm|a\.m\.|p\.m\.)?(?:'?\s*(?:da|de|ta|te|ya|ye|a|e)\b)?/g;
  let hit: RegExpExecArray | null = null;
  for (const m of s.matchAll(re)) {
    const explicit = m[2] !== undefined || m[3] !== undefined || /saat|at\s/.test(m[0]) || /'/.test(m[0]) || /(da|de|ta|te)\b/.test(m[0]);
    if (!explicit) continue;
    hit = m;
    break;
  }
  if (!hit) return null;
  spans.push(hit[0]);
  let h = Number(hit[1]);
  const min = hit[2] ? Number(hit[2]) : 0;
  const ap = hit[3]?.replace(/\./g, "");
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  const p = part?.[1];
  if (!ap && p && /(öğleden sonra|ogleden sonra|akşam|aksam|afternoon|evening|tonight)/.test(p) && h < 12) h += 12;
  if (!ap && p && /(gece|night)/.test(p) && h >= 6 && h < 12) h += 12;
  const at = new Date(now);
  at.setSeconds(0, 0);
  at.setHours(h, min);
  if (tomorrow) at.setDate(at.getDate() + 1);
  else if (at.getTime() <= now.getTime()) {
    // saat belirsizse (am/pm yok, 12'den küçük) ve öğleden sonraki ilk karşılık bugün ilerideyse onu al
    if (!ap && !p && h < 12 && at.getTime() + 12 * 3_600_000 > now.getTime()) at.setHours(h + 12);
    else at.setDate(at.getDate() + 1);
  }
  return { at, spans };
}

const NOISE_TR = words(
  "bana|beni|lütfen|lutfen|bir|bi|için|icin|diye|isimli|adlı|adli|adında|adinda|kur|ekle|ayarla|koy|yap|hatırlatıcısı|hatırlatıcı|hatirlatici|hatırlatması|hatırlatma|hatırlatır mısın|hatırlat|hatirlat|alarmını|alarmı|alarm|uyandır|uyandir|haber ver|uyar|saat|sonra|dakika|dk|saniye|sn|yarın|yarin|sabah|akşam|aksam|gece|öğleden sonra|ogleden sonra|öğle|ogle|olarak|mısın|misin|musun|müsün|kurar mısın|eder misin",
);
const NOISE_EN = words("please|me|to|remind|reminder|set|an|a|alarm|for|called|named|about|at|in|on|tomorrow|wake|up|minutes|minute|mins|min|hours|hour|hrs|hr|seconds|second|secs|sec|morning|afternoon|evening|tonight|that|can|you|could");

/** etiket: tırnak içi ya da "X diye / X isimli / X için / to X" ; yoksa zaman ve komut kelimeleri atılmış kalan */
export function labelOf(text: string, spans: readonly string[]): string {
  // tırnak: başında boşluk/başlangıç olmalı ("8'de" kesme işareti tırnak sayılmaz)
  const q = /(?:^|\s)["“'‘]([^"“”'‘’]{1,60})["”'’]/.exec(text);
  if (q) return clip(q[1]);
  let s = text;
  for (const sp of spans) s = s.replace(sp, " ");
  const named = /(.{1,60}?)\s+(diye|isimli|adlı|adli|adında|adinda)\b/.exec(s);
  if (named) s = named[1];
  else {
    const toX = /\b(?:to|about|called|named)\s+(.{1,60})/.exec(s);
    if (toX && EN_INTENT.test(text)) s = toX[1];
  }
  s = s.replace(NOISE_TR, " ");
  if (EN_INTENT.test(text)) s = s.replace(NOISE_EN, " ");
  s = s.replace(/['’](?:da|de|ta|te|ya|ye|a|e)(?![\p{L}])/gu, " ").replace(/[?.!,:;]+/g, " ").replace(/\s+/g, " ").trim();
  return clip(s);
}

const clip = (s: string) => Array.from(s.trim()).slice(0, LABEL_MAX).join("").trim();

export function parseReminder(raw: string, now: Date): ReminderCommand | null {
  const s = raw.toLocaleLowerCase("tr").replace(/\s+/g, " ").trim();
  if (!s) return null;
  const intent = TR_INTENT.test(s) || EN_INTENT.test(s);
  if (!intent) return null;
  if (LIST.test(s)) return { kind: "list" };
  if (CLEAR.test(s) && !/sonra|in \d|\bat\b|\d[:.]\d/.test(s)) {
    const label = labelOf(raw.toLocaleLowerCase("tr"), []).replace(/\b(iptal|et|sil|kaldır|kaldir|kapat|vazgeç|vazgec|hepsini|tümünü|tumunu|cancel|delete|remove|clear|stop|all|my|the|alarms?|reminders?)\b/g, " ").replace(/\s+/g, " ").trim();
    return { kind: "clear", label: label || null };
  }
  const t = relative(s, now) ?? absolute(s, now);
  if (!t) return { kind: "no_time" };
  if (t.at.getTime() - now.getTime() > MAX_AHEAD_DAYS * 86_400_000 || t.at.getTime() <= now.getTime()) return { kind: "no_time" };
  return { kind: "set", at: t.at, label: labelOf(s, t.spans) };
}

/** "15:30" (yerel) */
export const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
