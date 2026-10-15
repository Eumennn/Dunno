// My Dunno Card (SPEC 17 R9, strateji §12): paylaşılabilir piksel kart. Veri saf (cardData), çizim canvas'ta (drawCard).
// Kartta kişisel veri yok: level, form, kaos/tembellik yüzdesi, birlikte gün, etkileşim sayısı, gizli dünyalar.
// Ağ yok: "kopyala" panoya YAZAR (okumaz), "kaydet" Rust ile Resimler/Dunno klasörüne PNG.
import type { Lang } from "../lines/types";
import { COMPANION_STRINGS } from "./strings";
import type { CompanionView } from "./view";

export interface CardData {
  title: string;
  form: string;
  rows: [string, string][];
  footer: string;
}

export const CARD_W = 300;
export const CARD_H = 180;

export function cardData(lang: Lang, v: CompanionView, worlds: { open: number; total: number }): CardData {
  const t = COMPANION_STRINGS[lang];
  const lazy = lang === "tr" ? "tembellik" : "lazy";
  return {
    title: "DUNNO",
    form: t.forms[v.form],
    rows: [
      [t.level, String(v.level)],
      [t.stats.chaos, `${v.stats.chaos}%`],
      [lazy, `${100 - v.stats.energy}%`],
      [t.together(v.daysTogether), ""],
      [t.interactions(v.interactions), ""],
      [t.secretWorlds(worlds.open, worlds.total), ""],
    ],
    footer: "the ai that teaches you nothing.",
  };
}

export interface CardColors {
  ink: string;
  main: string;
  cream: string;
  light: string;
}

/** Kartı çizer (keskin piksel: yumuşatma kapalı). sprite: o anki pet görüntüsü (yoksa çizilmez). */
export function drawCard(ctx: CanvasRenderingContext2D, d: CardData, colors: CardColors, font: string, sprite: CanvasImageSource | null, frame = false): void {
  const { ink, main, cream, light } = colors;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = cream;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  // pencere çerçevesi + başlık çubuğu (dunno.exe dili), sert gölge yok (kart kendisi kenara kadar)
  ctx.fillStyle = ink;
  ctx.fillRect(0, 0, CARD_W, 2);
  ctx.fillRect(0, CARD_H - 2, CARD_W, 2);
  ctx.fillRect(0, 0, 2, CARD_H);
  ctx.fillRect(CARD_W - 2, 0, 2, CARD_H);
  ctx.fillStyle = main;
  ctx.fillRect(2, 2, CARD_W - 4, 22);
  ctx.fillStyle = ink;
  ctx.fillRect(2, 24, CARD_W - 4, 2);
  ctx.font = `12px ${font}`;
  ctx.textBaseline = "middle";
  ctx.fillText("my_dunno.card", 10, 14);
  // sol: pet görüntüsü
  ctx.fillStyle = light;
  ctx.fillRect(10, 34, 96, 96);
  ctx.fillStyle = ink;
  ctx.fillRect(10, 130, 96, 2);
  if (sprite) ctx.drawImage(sprite, 10, 34, 96, 96);
  ctx.font = `bold 16px ${font}`;
  ctx.fillText(d.title, 116, 44);
  ctx.font = `12px ${font}`;
  ctx.fillText(d.form, 116, 62);
  let y = 80;
  for (const [k, val] of d.rows) {
    ctx.fillText(k, 116, y);
    if (val) {
      const w = ctx.measureText(val).width;
      ctx.fillText(val, CARD_W - 12 - w, y);
    }
    y += 14;
  }
  ctx.font = `10px ${font}`;
  ctx.fillText(d.footer, 10, CARD_H - 14);
  // yetenek ağacı "altın çerçeve" (level 8): iç kenarda ikinci kontur, köşelerde piksel çentik
  if (frame) {
    ctx.fillStyle = main;
    ctx.fillRect(4, 28, CARD_W - 8, 2);
    ctx.fillRect(4, CARD_H - 6, CARD_W - 8, 2);
    ctx.fillRect(4, 28, 2, CARD_H - 32);
    ctx.fillRect(CARD_W - 6, 28, 2, CARD_H - 32);
    ctx.fillStyle = ink;
    for (const [x, y] of [[4, 28], [CARD_W - 8, 28], [4, CARD_H - 8], [CARD_W - 8, CARD_H - 8]]) ctx.fillRect(x, y, 4, 4);
  }
}
