// FB9 kurulum metinleri. placeholder: tasarımcının metni gelene kadar (CLAUDE.md "laf ve arayüz metinlerini uydurma").
// Marka: küçük harf, ünlem yok, kısa. Düğmeler landing'deki indirme penceresiyle aynı: [ yes ] / [ dunno ] ikisi de kurar.

export type SetupLang = "tr" | "en";

export interface SetupStrings {
  barTitle: string;
  close: string;
  welcomeTitle: string;
  updateTitle: string;
  welcomeBody: string;
  yes: string;
  dunno: string;
  /** {v} sürüm */
  meta: string;
  installing: string;
  /** [ dunno ] seçildiyse kurulumun ilk satırı */
  dunnoPicked: string;
  /** kurulurken sırayla */
  lines: readonly string[];
  doneTitle: string;
  doneBody: string;
  launch: string;
  /** "şimdi aç" olmadı (kurulum yine de tamam) */
  launchFail: string;
  finish: string;
  failTitle: string;
  failBody: string;
  retry: string;
  empty: string;
  /** FB11 kaldırıcı */
  uBarTitle: string;
  uTitle: string;
  uBody: string;
  uData: string;
  uYes: string;
  uNo: string;
  uRemoving: string;
  uLines: readonly string[];
  uDoneTitle: string;
  uDoneBody: string;
}

export const SETUP_STRINGS: Record<SetupLang, SetupStrings> = {
  tr: {
    barTitle: "dunno_setup.exe",
    close: "kapat",
    welcomeTitle: "dunno masaüstüne kurulsun mu?",
    updateTitle: "dunno güncellensin mi?",
    welcomeBody: "ekranının bir köşesini ve sabrının çoğunu alır. hiçbir şey yapmaz. özellik bu.",
    yes: "[ evet ]",
    dunno: "[ dunno ]",
    meta: "sürüm {v} · sadece senin kullanıcın için · yönetici izni istemez",
    installing: "kuruluyor",
    dunnoPicked: "harika cevap. yine de kuruyoruz.",
    lines: [
      "dosyalar kopyalanıyor. o izliyor.",
      "masaüstünde yer açılıyor.",
      "kısayol çiziliyor. biraz eğri oldu.",
      "neredeyse. o hep neredeyse der.",
    ],
    doneTitle: "kuruldu.",
    doneBody: "masaüstünde ve başlat menüsünde. kaçamaz.",
    launch: "dunno'yu şimdi aç",
    launchFail: "açamadım. başlat menüsünden dunno'yu aç, orada.",
    finish: "[ bitir ]",
    failTitle: "bir şey bozuldu.",
    failBody: "o değil. muhtemelen. bir daha dene ya da kapat.",
    retry: "[ tekrar ]",
    empty: "bu kurulumun içi boş. geliştirici derlemesi.",
    uBarTitle: "dunno_uninstall.exe",
    uTitle: "dunno kaldırılsın mı?",
    uBody: "masaüstünden gider. sessizce. çoğunlukla.",
    uData: "ayarlarını ve anılarını da sil",
    uYes: "[ kaldır ]",
    uNo: "[ vazgeç ]",
    uRemoving: "kaldırılıyor",
    uLines: ["eşyalarını topluyor.", "kısayolları söküyor.", "son bir kez etrafa bakıyor."],
    uDoneTitle: "gitti.",
    uDoneBody: "tamamen. belki. arada aklına gelir.",
  },
  en: {
    barTitle: "dunno_setup.exe",
    close: "close",
    welcomeTitle: "install dunno on your desktop?",
    updateTitle: "update dunno?",
    welcomeBody: "he'll take up one corner of your screen and most of your patience. he does nothing. that's the feature.",
    yes: "[ yes ]",
    dunno: "[ dunno ]",
    meta: "version {v} · just for your user · no admin needed",
    installing: "installing",
    dunnoPicked: "great answer. installing anyway.",
    lines: [
      "copying files. he's watching.",
      "making room on your desktop.",
      "drawing the shortcut. it came out crooked.",
      "almost. he always says almost.",
    ],
    doneTitle: "installed.",
    doneBody: "on your desktop and in the start menu. no escape.",
    launch: "open dunno now",
    launchFail: "couldn't open him. find dunno in the start menu.",
    finish: "[ finish ]",
    failTitle: "something broke.",
    failBody: "not him. probably. try again or close.",
    retry: "[ try again ]",
    empty: "this setup is empty. developer build.",
    uBarTitle: "dunno_uninstall.exe",
    uTitle: "uninstall dunno?",
    uBody: "he leaves your desktop. quietly. mostly.",
    uData: "also delete his settings and memories",
    uYes: "[ uninstall ]",
    uNo: "[ never mind ]",
    uRemoving: "uninstalling",
    uLines: ["packing his stuff.", "taking down the shortcuts.", "one last look around."],
    uDoneTitle: "gone.",
    uDoneBody: "completely. probably. he'll cross your mind.",
  },
};

export const setupLang = (navLang: string | undefined): SetupLang => (navLang?.toLowerCase().startsWith("tr") ? "tr" : "en");
