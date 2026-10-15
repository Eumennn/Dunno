import { describe, expect, it } from "vitest";
import { hhmm, parseReminder } from "./parse";

const now = new Date(2026, 9, 10, 14, 0); // 14:00
const set = (s: string) => {
  const r = parseReminder(s, now);
  if (r?.kind !== "set") throw new Error(`not set: ${s} -> ${JSON.stringify(r)}`);
  return { time: hhmm(r.at), day: r.at.getDate(), label: r.label };
};

describe("hatırlatıcı komutları (FB7)", () => {
  it("Türkçe göreli", () => {
    expect(set("10 dk sonra çay alarmı kur")).toEqual({ time: "14:10", day: 10, label: "çay" });
    expect(set("yarım saat sonra hatırlat: çamaşırlar")).toMatchObject({ time: "14:30", label: "çamaşırlar" });
    expect(set("1 saat 20 dakika sonra toplantı diye hatırlat")).toEqual({ time: "15:20", day: 10, label: "toplantı" });
    expect(set("beş dakika sonra beni uyar")).toMatchObject({ time: "14:05", label: "" });
  });

  it("Türkçe mutlak, yarın, akşam", () => {
    expect(set("saat 15:30'da toplantı diye hatırlatıcı kur")).toEqual({ time: "15:30", day: 10, label: "toplantı" });
    expect(set("16.45'te ilaç değil vitamin hatırlat")).toMatchObject({ time: "16:45" });
    expect(set("yarın sabah 7'de alarm kur")).toEqual({ time: "07:00", day: 11, label: "" });
    expect(set("akşam 8'de 'annemi ara' hatırlat")).toEqual({ time: "20:00", day: 10, label: "annemi ara" });
    // 9'da: sabah 9 geçti, akşam 9 bugün ilerde
    expect(set("9'da dizi isimli alarm kur")).toEqual({ time: "21:00", day: 10, label: "dizi" });
    // 13:00 geçti: yarın
    expect(set("13:00'te öğle yemeği hatırlat")).toMatchObject({ time: "13:00", day: 11 });
  });

  it("English", () => {
    expect(set("remind me to stretch in 20 minutes")).toEqual({ time: "14:20", day: 10, label: "stretch" });
    expect(set("set an alarm for 7:30 am called gym")).toEqual({ time: "07:30", day: 11, label: "gym" });
    expect(set("remind me at 3pm to call the plumber")).toEqual({ time: "15:00", day: 10, label: "call the plumber" });
    expect(set("alarm in an hour and a half")).toMatchObject({ time: "15:30" });
    expect(set("remind me tomorrow at 9 about the report")).toEqual({ time: "09:00", day: 11, label: "the report" });
  });

  it("liste, iptal, zamansız, alakasız", () => {
    expect(parseReminder("alarmları göster", now)).toEqual({ kind: "list" });
    expect(parseReminder("show my reminders", now)).toEqual({ kind: "list" });
    expect(parseReminder("çay alarmını iptal et", now)).toMatchObject({ kind: "clear" });
    expect(parseReminder("cancel all alarms", now)).toEqual({ kind: "clear", label: null });
    expect(parseReminder("bana bir şey hatırlat", now)).toEqual({ kind: "no_time" });
    expect(parseReminder("paris nerede", now)).toBeNull();
    expect(parseReminder("saat kaç", now)).toBeNull();
    // 7 günden ileri yok
    expect(parseReminder("200 saat sonra hatırlat", now)).toEqual({ kind: "no_time" });
  });
});
