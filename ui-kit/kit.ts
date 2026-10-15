// Dunno UI kiti yardımcıları: DOM'suz HTML üreticileri (masaüstü ve studio ortak). Stil: kit.css.
// Metin parametreleri her zaman kaçışlanır.
import { bubbleWidth, steppedPolygon, THOUGHT_DOTS } from "./bubble";

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Silkscreen'de olmayan Türkçe harfler. */
export const TR_GLYPHS = /[ıİşŞğĞçÇöÖüÜ]/;

/** Piksel fontlu öğe için ek sınıf: metin Türkçe harf içeriyorsa " no-px" (gövde fontuna düşer), yoksa "". */
export function noPx(text: string): string {
  return TR_GLYPHS.test(text) ? " no-px" : "";
}

/** Kalp piksel haritası (handoff §3): K kontur, H dolgu. */
const HEART = [".KK.KK.", "KHHKHHK", "KHHHHHK", ".KHHHK.", "..KHK..", "...K..."];

/** Tek piksel kalp (7x6), varsayılan 3x (landing ask.exe: 21x18). */
export function heartHtml(full: boolean, scale = 3): string {
  const rects = HEART.flatMap((row, y) =>
    [...row].flatMap((c, x) =>
      c === "." ? [] : [`<rect x="${x}" y="${y}" width="1" height="1" class="${c === "K" ? "k" : "f"}"></rect>`],
    ),
  ).join("");
  const cls = full ? "heart" : "heart heart-empty";
  return `<svg class="${cls}" viewBox="0 0 7 6" width="${7 * scale}" height="${6 * scale}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
}

/** Günlük hak kalpleri. */
export function heartsHtml(left: number, total: number, label: string, scale = 3): string {
  const hearts = Array.from({ length: total }, (_, i) => heartHtml(i < left, scale)).join("");
  return `<div class="hearts" role="img" aria-label="${esc(label)}">${hearts}</div>`;
}

/** Başlık çubuğundaki kapat kontrolü (landing .ctl + X). */
export function ctlCloseHtml(label = "close"): string {
  return ctlHtml("close", label);
}

export type CtlKind = "minimize" | "close";
const CTL_PATH: Record<CtlKind, string> = { minimize: "M3 9h6", close: "M3 3l6 6M9 3l-6 6" };

/** Başlık çubuğu piksel kontrolü (landing .ctl): küçült "_" ya da kapat "x". */
export function ctlHtml(kind: CtlKind, label: string = kind): string {
  return `<button type="button" class="ctl" data-ctl="${kind}" aria-label="${esc(label)}"><svg viewBox="0 0 12 12" width="12" height="12" shape-rendering="crispEdges" aria-hidden="true"><path d="${CTL_PATH[kind]}" stroke-width="2"></path></svg></button>`;
}

/** Piksel ünlem ikon kutusu (landing hata kartları). */
export const alertIconHtml = `<span class="alert-ico" aria-hidden="true"><svg viewBox="0 0 6 6" width="12" height="12" shape-rendering="crispEdges"><rect x="2" y="0" width="2" height="4"></rect><rect x="2" y="5" width="2" height="1"></rect></svg></span>`;

export const sepDotsHtml = `<hr class="sep-dots" />`;

export const dotsHtml = `<span class="dots"><span>.</span><span>.</span><span>.</span></span>`;

export type BarVariant = "" | "err" | "idle" | "blue";

/**
 * .win penceresi: başlık çubuğu (küçük harf .exe adı) + gövde HTML'i (kaçışlanmaz, çağıran üretir).
 * ctls: başlık çubuğu kontrolleri (varsayılan sadece kapat; close:false hiçbiri).
 */
export function winHtml(
  title: string,
  bodyHtml: string,
  opts: { bar?: BarVariant; close?: boolean; ctls?: CtlKind[] } = {},
): string {
  const bar = opts.bar ? `bar bar-${opts.bar}` : "bar";
  const kinds = opts.ctls ?? (opts.close === false ? [] : ["close" as const]);
  const ctl = kinds.length ? `<span class="bar-ctls">${kinds.map((k) => ctlHtml(k)).join("")}</span>` : "";
  return `<div class="win"><div class="${bar}"><span class="bar-title${noPx(title)}">${esc(title)}</span>${ctl}</div>${bodyHtml}</div>`;
}

export interface SegOption {
  value: string;
  label: string;
}

/** Segmented seçici (aria-pressed); tıklamayı çağıran bağlar (data-value). */
export function segmentedHtml(label: string, options: SegOption[], value: string): string {
  const btns = options
    .map((o) => {
      // seçenek metni gövde fontunda (kit .seg font-family: inherit); Türkçe harf sorunu yok
      const on = o.value === value;
      return `<button type="button" class="seg${on ? " seg-on" : ""}" aria-pressed="${on}" data-value="${esc(o.value)}">${esc(o.label)}</button>`;
    })
    .join("");
  return `<div class="segs" role="group" aria-label="${esc(label)}">${btns}</div>`;
}

/**
 * Kademeli kaydırıcı (SPEC 09 K8b, pet boyutu): native range (klavye + ekran okuyucu), sadece tam kademelere oturur
 * (step 1, değer = seçenek sırası). Altında kademe adları; seçili ad koyu. Kare başparmak, yuvarlak köşe yok.
 */
export function stepSliderHtml(label: string, options: SegOption[], value: string): string {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  const ticks = options
    .map((o, k) => `<span class="step-tick${k === i ? " step-tick-on" : ""}" data-value="${esc(o.value)}">${esc(o.label)}</span>`)
    .join("");
  return `<div class="step" data-slider-group="${esc(label)}">
    <input type="range" class="step-range" min="0" max="${options.length - 1}" step="1" value="${i}" data-slider="${esc(label)}" data-values="${esc(options.map((o) => o.value).join(","))}" aria-label="${esc(label)}" aria-valuetext="${esc(options[i]?.label ?? "")}" />
    <div class="step-ticks">${ticks}</div>
  </div>`;
}

/** Kaydırıcı konumu -> seçenek değeri (data-values sırası); sınır dışı en yakın uca. */
export function stepValue(values: string, index: number): string {
  const list = values.split(",");
  return list[Math.min(list.length - 1, Math.max(0, Math.round(index)))];
}

/** ask.exe satırları. */
export function youHtml(text: string): string {
  return `<div class="msg msg-you">${esc(text)}</div>`;
}
export function dunnoHtml(text: string): string {
  return `<div class="msg msg-dunno"><b>dunno:</b> ${esc(text)}</div>`;
}
export function thinkingHtml(who = "dunno", verb = "is thinking"): string {
  return `<div class="msg msg-think"><b>${esc(who)}</b> ${esc(verb)}${dotsHtml}</div>`;
}

/** Balon şekli (SPEC 09 K4): basamaklı piksel köşe (bubble.ts STEP/CORNER); kontur katmanı ve iç dolgu aynı çokgen (dolgu 2 px içeride). */
const BUBBLE_SHAPE = steppedPolygon();

/** Düşünce noktası: 1 px basamaklı piksel daire, 1 px --ink kontur + beyaz iç (4 px'te de beyaz görünür). */
function dotHtml(d: number): string {
  const corner = d >= 8 ? [2, 1] : [1];
  return `<i class="thought-dot" style="width:${d}px;height:${d}px;clip-path:${steppedPolygon(1, corner)}"><b style="clip-path:${steppedPolygon(1, corner, 1)}"></b></i>`;
}

const bubbleBody = (text: string, shape: string) =>
  `<div class="bubble-edge" style="clip-path:${shape}"><div class="bubble-fill" style="clip-path:${shape}">${esc(text)}</div></div>`;

/**
 * Çizgi roman konuşma balonu: genişlik metne göre (oran korunur); kuyruğu yerleştiren kap çizer (pet'e doğru).
 * shape: köşe karşılaştırması için başka bir steppedPolygon (varsayılan BUBBLE_SHAPE).
 */
export function speechBubbleHtml(text: string, extraClass = "", shape = BUBBLE_SHAPE): string {
  return `<div class="speech-bubble${extraClass ? ` ${extraClass}` : ""}" style="width:${bubbleWidth(text.length)}px">${bubbleBody(text, shape)}</div>`;
}

/** Düşünce balonu: konuşma balonuyla aynı gövde, kuyruk yerine balondan pet'e doğru küçülen 3 piksel daire (diyagonal). */
export function thoughtBubbleHtml(text: string, extraClass = "", shape = BUBBLE_SHAPE): string {
  const dots = THOUGHT_DOTS.map(dotHtml).join("");
  return `<div class="thought-bubble${extraClass ? ` ${extraClass}` : ""}" style="width:${bubbleWidth(text.length)}px">${bubbleBody(text, shape)}<span class="thought-dots" aria-hidden="true">${dots}</span></div>`;
}

export function toastHtml(text: string): string {
  return `<div role="status" class="bub toast">${esc(text)}</div>`;
}

/** Piksel anahtar (aç/kapa): role=switch, aria-checked; tıklamayı çağıran bağlar (data-switch). */
export function switchHtml(name: string, on: boolean, label: string): string {
  return `<button type="button" class="pswitch" role="switch" aria-checked="${on}" aria-label="${esc(label)}" data-switch="${esc(name)}"></button>`;
}

/** Piksel kum saati (soru temposu kilidi, SPEC 06 Q4). Kum hg-sand, çerçeve ink; 2 sn'de bir döner (azaltılmış harekette durur). */
export const hourglassIconHtml = `<svg class="hg-ico" viewBox="0 0 7 7" width="21" height="21" shape-rendering="crispEdges" aria-hidden="true"><rect x="0" y="0" width="7" height="1"></rect><rect x="1" y="1" width="1" height="1"></rect><rect x="5" y="1" width="1" height="1"></rect><rect class="hg-sand" x="2" y="1" width="3" height="1"></rect><rect x="2" y="2" width="1" height="1"></rect><rect x="4" y="2" width="1" height="1"></rect><rect class="hg-sand" x="3" y="2" width="1" height="1"></rect><rect x="3" y="3" width="1" height="1"></rect><rect x="2" y="4" width="1" height="1"></rect><rect x="4" y="4" width="1" height="1"></rect><rect class="hg-sand" x="3" y="4" width="1" height="1"></rect><rect x="1" y="5" width="1" height="1"></rect><rect x="5" y="5" width="1" height="1"></rect><rect class="hg-sand" x="2" y="5" width="3" height="1"></rect><rect x="0" y="6" width="7" height="1"></rect></svg>`;

/** Piksel kilit ikonu (kilitli parça). */
export const lockIconHtml = `<svg class="lock-ico" viewBox="0 0 7 8" width="14" height="16" shape-rendering="crispEdges" aria-hidden="true"><rect x="2" y="0" width="3" height="1"></rect><rect x="1" y="1" width="1" height="3"></rect><rect x="5" y="1" width="1" height="3"></rect><rect x="0" y="3" width="7" height="5"></rect><rect class="lock-hole" x="3" y="5" width="1" height="2"></rect></svg>`;
