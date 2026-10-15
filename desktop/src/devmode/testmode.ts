// Gizli test modu (SPEC 07 FB2, saf): about.txt sürüm satırına 5 tık -> aç/kapat. Geliştirici aracı; kullanıcı da açabilir.
// Açıkken: tüm tema/aksesuarlar seçilebilir (başarım ilerlemesi SİLİNMEZ, sadece kilit yok sayılır), başarım tek tek tetiklenir,
// günlük doğru cevap hakkı sıfırlanır, soru temposu kapatılabilir. Kapatınca her şey normale döner (kilitli seçim geri alınır).
// DOM/Tauri yok; saat dışarıdan verilir. Store'a düz JSON: TESTMODE_KEY altında TestMode.
import { gate, type Gate, type Tempo } from "../talk/tempo";
import { ACHIEVEMENTS, fillTo, type AchievementId, type Unlock } from "../wardrobe/achievements";
import { ACCESSORIES, applyEvent, COSTUMES, settleSelection, type WardrobeState } from "../wardrobe/wardrobe";

export const TESTMODE_KEY = "testMode";

export interface TestMode {
  on: boolean;
  /** soru temposu (20 sn bekleme, 60 sn kilit) kapalı; sadece on iken etkili */
  tempoOff: boolean;
  /** SPEC 15: Pro simülasyonu (lisanssız Pro özelliklerini denemek için; sadece on iken, sadece cihazda) */
  proSim?: boolean;
}

export const initialTestMode = (): TestMode => ({ on: false, tempoOff: false });

/** Store'dan gelen bozuk/eksik değer kapalı moda döner. */
export function cleanTestMode(raw: unknown): TestMode {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  // tempo bayrağı sadece mod açıkken anlamlı; kapalıyken temiz durum
  return r.on === true ? { on: true, tempoOff: r.tempoOff === true, ...(r.proSim === true ? { proSim: true } : {}) } : initialTestMode();
}

// ---------------------------------------------------------------- 5 tık

export const TAP_COUNT = 5;
/** 5 tık bu pencerede (ilk tıktan son tıka) olmalı */
export const TAP_WINDOW_MS = 3_000;

export interface Taps {
  /** penceredeki tık anları (ms) */
  at: number[];
}

export const initialTaps = (): Taps => ({ at: [] });

/**
 * Sürüm satırına bir tık. fired: 5. tık pencere içinde geldi (çağıran test modunu aç/kapat yapar, sayaç sıfırlanır).
 * left: tetiklenmeye kalan tık (ipucu göstermek isteyen için).
 */
export function tap(t: Taps, now: number): { taps: Taps; fired: boolean; left: number } {
  const at = [...t.at.filter((x) => now - x < TAP_WINDOW_MS && x <= now), now];
  if (at.length >= TAP_COUNT) return { taps: initialTaps(), fired: true, left: TAP_COUNT };
  return { taps: { at }, fired: false, left: TAP_COUNT - at.length };
}

/** 5 tık sonrası: aç/kapat. Kapatırken tempo bayrağı da kapanır. */
export function toggle(m: TestMode): TestMode {
  return m.on ? initialTestMode() : { on: true, tempoOff: false };
}

// ---------------------------------------------------------------- kilitler

/** Tüm parçalar (test modunda hepsi açık). themeIds: themes.json sırası. */
export function allUnlocks(themeIds: readonly string[]): Unlock[] {
  return [
    ...themeIds.map((id) => ({ kind: "theme" as const, id })),
    ...ACCESSORIES.map((id) => ({ kind: "accessory" as const, id })),
    ...COSTUMES.map((id) => ({ kind: "costume" as const, id })),
  ];
}

/** isUnlocked/select/wardrobeView'a verilecek override: test modunda her şey, değilse undefined (normal kural). */
export function unlockOverride(m: TestMode, themeIds: readonly string[]): Unlock[] | undefined {
  return m.on ? allUnlocks(themeIds) : undefined;
}

/**
 * Test modu kapanınca: kilitli seçim (test modunda giyilmiş) açık olana döner. İlerleme olduğu gibi kalır.
 * Açıkken seçim dokunulmaz.
 */
export function onTestModeChange(s: WardrobeState, m: TestMode): WardrobeState {
  return m.on ? s : settleSelection(s);
}

// ---------------------------------------------------------------- başarım tetikle

/**
 * Test modu "başarım tetikle": sayaç hedefe getirilir ve olay achievements.step'ten geçer, yani açılım
 * normal yoldan pending'e düşer (toast aynı akıştan). Zaten açıksa değişmez. Test modu kapalıysa hiçbir şey yapmaz.
 */
export function triggerAchievement(
  s: WardrobeState,
  id: AchievementId,
  now: Date,
  m: TestMode,
): { state: WardrobeState; unlocked: AchievementId[] } {
  if (!m.on || s.progress.unlocked[id] || !ACHIEVEMENTS.some((a) => a.id === id)) return { state: s, unlocked: [] };
  const filled = { ...s, progress: fillTo(id, s.progress, now) };
  // nötr olay: sadece eşik kontrolü (open, aynı gün tekrar sayılmaz)
  return applyEvent(filled, { type: "open" }, now);
}

// ---------------------------------------------------------------- tempo

/** Soru kutusu kapısı: test modunda tempo kapalıysa her zaman ok. */
export function testGate(t: Tempo, now: number, m: TestMode): Gate {
  return m.on && m.tempoOff ? { kind: "ok" } : gate(t, now);
}

/** "yavaş" kilidi sayılsın mı (talker record() sonucunu bununla süzer). */
export const tempoActive = (m: TestMode): boolean => !(m.on && m.tempoOff);
