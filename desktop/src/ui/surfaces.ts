// Pet penceresindeki yüzeylerin HTML'i (saf, DOM'suz): landing'in dili, ui-kit sınıflarıyla.
// konuşma = .bub · soru kutusu = ask.exe · ilk açılış = setup.exe · limit / bugün sus = error.exe · bildirim = toast
import {
  alertIconHtml,
  dunnoHtml,
  esc,
  heartsHtml,
  hourglassIconHtml,
  noPx,
  segmentedHtml,
  sepDotsHtml,
  speechBubbleHtml,
  thinkingHtml,
  thoughtBubbleHtml,
  toastHtml,
  winHtml,
  youHtml,
} from "@ui-kit/kit";
import { LANG_NAMES, PICK_LANG, type UiStrings } from "../i18n";
import type { Lang, Mode } from "../settings";

/** Konuşma balonu (SPEC 09 K4: çizgi roman balonu, basamaklı piksel köşe; kuyruğu kap çizer). */
export function speechHtml(text: string): string {
  return speechBubbleHtml(text, "pet-bub");
}

/** Düşünce balonu (SPEC 09 K4): kuyruk yerine pet'e doğru küçülen 3 piksel daire. */
export function thoughtHtml(text: string): string {
  return thoughtBubbleHtml(text, "pet-bub");
}

export function petToastHtml(text: string): string {
  return toastHtml(text).replace('class="bub toast"', 'class="bub toast pet-toast"');
}

/** error.exe (landing hata kartı): ! ikon kutusu + kalın başlık + metin + [ ok ]. */
export function errorHtml(title: string, text: string, ok: string): string {
  const body = `<div class="pet-pad pet-err">
      <div class="pet-err__head">${alertIconHtml}<strong>${esc(title)}</strong></div>
      <p class="pet-err__text">${esc(text)}</p>
      <div class="pet-err__row"><button class="pbtn pbtn-sm" type="button" data-ok>${esc(ok)}</button></div>
    </div>`;
  return winHtml("error.exe", body, { bar: "err" });
}

/** think: kesik çizgili "dunno düşünüyor…" balonu; verb değişebilir (SPEC 06 Q5) */
export type AskLog = { who: "you" | "dunno"; text: string } | { who: "think"; verb?: string };

/** ask.exe: araç çubuğu (polite | street *** + kalpler) + (sohbet satırları) + (soru formu). */
export function askHtml(t: UiStrings, mode: Mode, left: number, total: number, log: AskLog[], form: boolean, wide = false): string {
  const lines = log
    .map((m) => (m.who === "think" ? thinkingHtml("dunno", m.verb ?? t.thinkingVerb) : m.who === "you" ? youHtml(m.text) : dunnoHtml(m.text)))
    .join("");
  const body = [
    `<div class="pet-ask__head">${segmentedHtml("mode", [{ value: "polite", label: t.modePolite }, { value: "street", label: t.modeStreet }], mode)}${heartsHtml(left, total, t.heartsLabel(left), 2)}</div>`,
    lines ? `<div class="pet-ask__log" aria-live="polite">${lines}</div>` : "",
    form
      ? `<form class="pet-ask__form"><input class="field" type="text" maxlength="200" autocomplete="off" spellcheck="false" placeholder="${esc(t.askPlaceholder)}" aria-label="${esc(t.askPlaceholder)}" /><button class="pbtn pbtn-blue pbtn-sm" type="submit">${esc(t.askSend)}</button></form>`
      : "",
  ].join("");
  const html = winHtml("ask.exe", body);
  // uzun (honest, ≤ ~120 karakter) cevap 2 satıra sığsın diye geniş pencere
  return wide ? html.replace('<div class="win">', '<div class="win pet-ask--wide">') : html;
}

/** ask.exe tempo kilidi (SPEC 06 Q4): kalpler + kum saati + "biraz bekle" + kalan saniye (data-wait yerinde güncellenir). */
export function askWaitHtml(t: UiStrings, left: number, total: number, seconds: number): string {
  const body = `<div class="pet-ask__head pet-ask__head--end">${heartsHtml(left, total, t.heartsLabel(left), 2)}</div>
    <div class="pet-ask__wait" role="status">${hourglassIconHtml}<p><strong>${esc(t.waitTitle)}</strong> <span class="mono" data-wait>${esc(t.waitSeconds(seconds))}</span></p></div>`;
  return winHtml("ask.exe", body);
}

/** setup.exe: dil + ağız seçimi, [ evet ] / [ bilmiyorum ]. */
export function setupHtml(t: UiStrings, lang: Lang, mode: Mode): string {
  const body = `
    <div class="pet-pad pet-setup">
      <p class="pet-setup__q">${esc(t.setupQuestion)}</p>
      <p class="pet-setup__blurb">${esc(t.setupBlurb)}</p>
      ${sepDotsHtml}
      <p class="pet-setup__label px${noPx(PICK_LANG)}">${esc(PICK_LANG)}</p>
      ${segmentedHtml("lang", [{ value: "tr", label: LANG_NAMES.tr }, { value: "en", label: LANG_NAMES.en }], lang)}
      <p class="pet-setup__label px${noPx(t.setupMode)}">${esc(t.setupMode)}</p>
      ${segmentedHtml("mode", [{ value: "polite", label: t.modePolite }, { value: "street", label: t.modeStreet }], mode)}
      ${sepDotsHtml}
      <div class="pet-setup__row">
        <button class="pbtn pbtn-sm pbtn-blue" type="button" data-choice="yes">${esc(t.setupYes)}</button>
        <button class="pbtn pbtn-sm" type="button" data-choice="dunno">${esc(t.setupDunno)}</button>
      </div>
    </div>`;
  return winHtml("setup.exe", body, { ctls: ["minimize", "close"] });
}
