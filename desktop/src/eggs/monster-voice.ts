// Canavar modu sesi (SPEC 14): aynı kategoriler, daha kalın ve hırıltılı (testere dalga, düşük perde, uzun hece). Metinden bağımsız kalır.
import { PROFILES, VOICE_CATEGORIES, type VoiceCategory, type VoiceProfile } from "../voice/voice";

const low = (p: VoiceProfile): VoiceProfile => ({
  ...p,
  base: [Math.max(80, Math.round(p.base[0] * 0.42)), Math.max(90, Math.round(p.base[1] * 0.42))],
  dur: [Math.min(200, Math.round(p.dur[0] * 1.3)), Math.min(200, Math.round(p.dur[1] * 1.3))],
  wave: "sawtooth",
  contour: Math.min(p.contour, 0.9),
});

export const MONSTER_PROFILES: Record<VoiceCategory, VoiceProfile> = Object.fromEntries(
  VOICE_CATEGORIES.map((c) => [c, low(PROFILES[c])]),
) as Record<VoiceCategory, VoiceProfile>;
