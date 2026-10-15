// FB10-2: dunno.exe büyüyünce (ekranı kaplayınca, tam ekran) arayüz orantılı büyür; düzen tasarlandığı ~1100x720 boyutu görür.
// Webview yakınlaştırması (Ctrl+ gibi): innerWidth küçülür, piksel yoğunluğu artar, sprite'lar yine tam sayı ölçekte çizilir.

export const ZOOM_BASE = { w: 1100, h: 720 } as const;
export const ZOOM_MAX = 2;

/** Yakınlaştırmasız CSS boyutu -> yakınlaştırma (0.1 adım, 1'in altına inmez). Küçük kenar belirler: alçak pencerede taşmasın. */
export function zoomFor(width: number, height: number): number {
  if (!(width > 0 && height > 0)) return 1;
  const z = Math.min(width / ZOOM_BASE.w, height / ZOOM_BASE.h);
  return Math.max(1, Math.min(ZOOM_MAX, Math.floor(z * 10 + 1e-9) / 10));
}
