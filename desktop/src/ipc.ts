// TS -> Rust komutları ve Rust -> TS olayları burada tiplenir (karşılığı: src-tauri/src/commands.rs, window.rs).
// Konum birimi: birincil ekran çalışma alanına göre mantıksal piksel.
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { Rect } from "./layout";

export interface WorkArea {
  width: number;
  height: number;
  scale: number;
  /** workarea://changed: sürüklerken başka monitöre geçildi, imlecin yeni alandaki mantıksal konumu (SPEC 10 CL5) */
  cursor?: { x: number; y: number } | null;
}

/** İmlecin pet'e göre durumu; ham konum içermez. */
export interface CursorState {
  over: boolean;
  near: boolean;
  /** yakındayken imlecin pet merkezine göre yönü (-1, 0, 1) */
  dx: number;
  dy: number;
  /** imleç pet dışındaki bir yüzeyin (balon, ask.exe) üstünde (SPEC 07 FB5 hover durması) */
  pop?: boolean;
}

/** Tıklamayı alan bölgeler (pencereye göre, mantıksal piksel). İlki pet kutusu. Dışarısı tıklamayı arkaya geçirir. */
export function setHitRects(rects: Rect[]): Promise<void> {
  return invoke("set_hit_rects", { rects });
}

/** Pet'in o anki karesinin dolu piksel rect'leri (pencereye göre, mantıksal; SPEC 08 SZ1c). Tıklama sadece bunlarda. */
export function setPetMask(rects: Rect[]): Promise<void> {
  return invoke("set_pet_mask", { rects });
}

/** Sürüklerken pencere tıklamayı bırakmasın. */
export function setCapture(on: boolean): Promise<void> {
  return invoke("set_capture", { on });
}

export function getWorkArea(): Promise<WorkArea | null> {
  return invoke("get_work_area");
}

/** Pencerenin sol üst köşesini taşır. */
export function moveWindow(x: number, y: number): Promise<void> {
  return invoke("move_window", { x, y });
}

/** Klavye gereken anlarda pencere odak alır; false ile bırakır. */
export function setInteractive(on: boolean): Promise<void> {
  return invoke("set_interactive", { on });
}

/** Açılır yüzey: pencereyi çalışma alanına göre mantıksal kutuya taşı + boyutla (UP1). */
export function setWindowBox(x: number, y: number, w: number, h: number): Promise<void> {
  return invoke("set_window_box", { x, y, w, h });
}

/** Toplantı koruması: pet'i gizler ya da odak çalmadan geri getirir. */
export function setPetVisible(visible: boolean): Promise<void> {
  return invoke("set_pet_visible", { visible });
}

/** Teşhis anahtarları (ortam değişkenleri DUNNO_FREEZE_MOVEMENT, DUNNO_NO_CURSOR_WATCH). */
export interface DebugFlags {
  freezeMovement: boolean;
  noCursorWatch: boolean;
}

export function getDebugFlags(): Promise<DebugFlags> {
  return invoke("get_debug_flags");
}

export function onCursorState(cb: (s: CursorState) => void): Promise<UnlistenFn> {
  return listen<CursorState>("cursor://state", (e) => cb(e.payload));
}

/** FB10-3: kullanıcı başka yerde klavyeyle yazıyor (Rust: son giriş ilerledi, imleç yerinde). Sadece değişince. */
export function onTyping(cb: (typing: boolean) => void): Promise<UnlistenFn> {
  return listen<boolean>("pet://typing", (e) => cb(e.payload));
}

export function onWorkAreaChanged(cb: (wa: WorkArea) => void): Promise<UnlistenFn> {
  return listen<WorkArea>("workarea://changed", (e) => cb(e.payload));
}
