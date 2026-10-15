// Hatırlatıcı metinleri (FB7). Marka sesi: küçük harf, ünlem yok, kuru; ama alarm GERÇEKTEN çalışır (dunno'nun tek işe yarar yanı).
// PLACEHOLDER: tasarımcı onayı bekler.
export interface ReminderStrings {
  set: (when: string, label: string) => string;
  noTime: string;
  full: (n: number) => string;
  list: (items: string[]) => string;
  cleared: (n: number) => string;
  fire: (label: string) => string;
  missed: (label: string, when: string) => string;
  card: string;
  empty: string;
  hint: string;
  remove: string;
}

const q = (s: string) => (s ? `"${s}"` : "");

export const REMINDER_STRINGS: Record<"tr" | "en", ReminderStrings> = {
  tr: {
    set: (w, l) => (l ? `tamam. ${w}, ${q(l)}. unutursam şaşırma` : `tamam. ${w}. neyin alarmı, sen bilirsin`),
    noTime: "ne zaman. '15:30'da' ya da '10 dk sonra' de",
    full: (n) => `en fazla ${n} alarm tutarım. hafızam yok`,
    list: (i) => (i.length ? `alarmlar: ${i.join(", ")}` : "alarm yok. rahatız"),
    cleared: (n) => (n ? `${n} alarm sildim. özgürsün` : "silecek alarm yok"),
    fire: (l) => (l ? `saat geldi: ${l}. hatırlattım. teşekkür bekleme` : "alarm. neyin alarmıydı, bilmiyorum"),
    missed: (l, w) => `${w} alarmını kaçırdık${l ? `: ${l}` : ""}. ikimiz de uyuyorduk`,
    card: "alarms.txt",
    empty: "alarm yok. bana sor: \"15:30'da toplantı diye hatırlat\"",
    hint: "sadece bu bilgisayarda. dunno kapalıysa çalmaz",
    remove: "sil",
  },
  en: {
    set: (w, l) => (l ? `fine. ${w}, ${q(l)}. don't be shocked if i forget` : `fine. ${w}. alarm for what, your call`),
    noTime: "when. say 'at 3:30' or 'in 10 minutes'",
    full: (n) => `i hold ${n} alarms max. no memory`,
    list: (i) => (i.length ? `alarms: ${i.join(", ")}` : "no alarms. we're chill"),
    cleared: (n) => (n ? `deleted ${n}. you're free` : "nothing to delete"),
    fire: (l) => (l ? `it's time: ${l}. reminded you. no thanks needed` : "alarm. no idea what for"),
    missed: (l, w) => `we missed the ${w} alarm${l ? `: ${l}` : ""}. we were both asleep`,
    card: "alarms.txt",
    empty: "no alarms. ask me: \"remind me to stretch in 20 minutes\"",
    hint: "this computer only. doesn't ring if dunno is closed",
    remove: "delete",
  },
};
