// Test modu metinleri (SPEC 07 FB2). Geliştirici aracı ama marka sesinde: küçük harf, kuru, ünlemsiz, emojisiz.
// placeholder: tasarımcı onayı bekler (REPORT-spec07 listesi).
import type { Lang } from "../lines/types";
import type { EdgeTarget } from "./edges";

export interface TestModeStrings {
  /** 5. tıkta açılınca toast */
  toastOn: string;
  /** kapatınca toast */
  toastOff: string;
  /** settings.exe içindeki bölüm başlığı */
  title: string;
  /** bölümün altındaki not */
  note: string;
  /** kilitler yok sayılıyor bilgisi (wardrobe.exe'de de görünür) */
  allOpen: string;
  triggerTitle: string;
  /** "{name}" başarım adı */
  trigger: string;
  /** başarım zaten açık */
  triggered: string;
  resetQuota: string;
  quotaReset: string;
  tempoOff: string;
  tempoOn: string;
  meetingStart: string;
  meetingEnd: string;
  sendTitle: string;
  edges: Record<EdgeTarget, string>;
  close: string;
  /** SPEC 15: Pro simülasyonu (lisanssız Pro özelliklerini denemek) */
  proSimOn: string;
  proSimOff: string;
}

export const TESTMODE_STRINGS: Record<Lang, TestModeStrings> = {
  tr: {
    toastOn: "test modu. kimseye söyleme",
    toastOff: "test modu kapandı. hiç olmadı say",
    title: "test modu",
    note: "ilerlemen silinmedi. sadece kilitleri görmezden geliyorum",
    allOpen: "her şey açık. hak etmedin ama olsun",
    triggerTitle: "başarım tetikle",
    trigger: "tetikle: {name}",
    triggered: "zaten açık",
    resetQuota: "doğru cevap hakkını sıfırla",
    quotaReset: "üç hak geri geldi. bu sefer boşa harcama",
    tempoOff: "soru temposu: kapalı",
    tempoOn: "soru temposu: açık",
    meetingStart: "toplantı başlat",
    meetingEnd: "toplantıyı bitir",
    sendTitle: "kenara gönder",
    edges: {
      left: "sol",
      right: "sağ",
      top: "üst",
      bottom: "alt",
      top_left: "sol üst",
      top_right: "sağ üst",
      bottom_left: "sol alt",
      bottom_right: "sağ alt",
    },
    close: "test modunu kapat",
    proSimOn: "pro simülasyonu: aç",
    proSimOff: "pro simülasyonu: kapat",
  },
  en: {
    toastOn: "test mode. don't tell anyone",
    toastOff: "test mode off. it never happened",
    title: "test mode",
    note: "your progress is still there. i'm just ignoring the locks",
    allOpen: "everything's open. you didn't earn it. fine",
    triggerTitle: "trigger an achievement",
    trigger: "trigger: {name}",
    triggered: "already open",
    resetQuota: "reset honest answers",
    quotaReset: "three answers back. try not to waste them",
    tempoOff: "question pace: off",
    tempoOn: "question pace: on",
    meetingStart: "start a meeting",
    meetingEnd: "end the meeting",
    sendTitle: "send to edge",
    edges: {
      left: "left",
      right: "right",
      top: "top",
      bottom: "bottom",
      top_left: "top left",
      top_right: "top right",
      bottom_left: "bottom left",
      bottom_right: "bottom right",
    },
    close: "turn test mode off",
    proSimOn: "pro simulation: on",
    proSimOff: "pro simulation: off",
  },
};

/** "{name}" yerine başarım adını koyar (adlar i18n.ts'teki başarım metinlerinden gelir). */
export function triggerLabel(lang: Lang, name: string): string {
  return TESTMODE_STRINGS[lang].trigger.replace("{name}", name);
}

