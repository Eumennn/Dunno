// Ses stilleri (SPEC 15, başarım ilerlemesiyle açılır): aynı kategori + varyasyon planı, profil dönüşümü. Metinden bağımsız kalır.
// Sınırlar mod ses profilleriyle aynı (mods.ts checkProfile): perde 80..1200 Hz, hece 20..200 ms.
import type { VoiceCategory, VoiceProfile } from "../voice/voice";
import type { VoiceStyleId } from "./entitlements";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(v)));
const scale = (p: VoiceProfile, pitch: number, dur: number): VoiceProfile => ({
  ...p,
  base: [clamp(p.base[0] * pitch, 80, 1200), clamp(p.base[1] * pitch, 80, 1200)],
  dur: [clamp(p.dur[0] * dur, 20, 200), clamp(p.dur[1] * dur, 20, 200)],
});

const STYLE: Record<Exclude<VoiceStyleId, "classic">, (p: VoiceProfile) => VoiceProfile> = {
  tiny: (p) => scale(p, 1.3, 0.85),
  deep: (p) => scale(p, 0.7, 1.15),
  robot: (p) => ({ ...p, wave: "square", glide: [1, 1], contour: 1 }),
};

export function styleProfiles(style: VoiceStyleId, base: Record<VoiceCategory, VoiceProfile>): Record<VoiceCategory, VoiceProfile> {
  if (style === "classic") return base;
  const f = STYLE[style];
  return Object.fromEntries(Object.entries(base).map(([c, p]) => [c, f(p)])) as Record<VoiceCategory, VoiceProfile>;
}
