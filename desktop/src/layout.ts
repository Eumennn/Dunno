// Pencere içi yerleşim (mantıksal piksel). Pet boyutu ve pencere ölçüleri size/size.ts'te (SPEC 08); açılış 2x: tauri.conf 96x84.

/** Açılış boyutu (varsayılan "küçük" = 2x) ve tauri.conf penceresi; çalışırken size/size.ts windowLayout kullanılır. */
export const SPRITE_SCALE = 2;
export const BASE_WINDOW = { w: 96, h: 84 } as const;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Pet kutusu: yatayda ortalı, altta. Üstte kalan alan balon payı. */
export function petRect(winW: number, winH: number, w: number, h: number): Rect {
  return { x: Math.floor((winW - w) / 2), y: winH - h, w, h };
}

/** Hit rect'i ekranda çizilen kutudan üretir; kesirli kenarlar dışa yuvarlanır. */
export function hitRectOf(box: { left: number; top: number; right: number; bottom: number }): Rect {
  const x = Math.floor(box.left);
  const y = Math.floor(box.top);
  return { x, y, w: Math.ceil(box.right) - x, h: Math.ceil(box.bottom) - y };
}
