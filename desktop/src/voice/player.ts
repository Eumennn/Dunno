// Dunno sesi oynatıcı (SPEC 11): voice.ts hece planını Web Audio ile çalar. Ses dosyası yok, mikrofon yok.
// Her hece: osilatör (kare/üçgen/testere) + kısa atak/bırakma zarfı (tık sesi olmasın) + perde kayması.
// AudioContext ilk çalmada açılır; tarayıcı kilitlediyse ilk kullanıcı dokunuşunda sürdürülür.
import type { Syllable } from "./voice";

const ATTACK_S = 0.006;
const RELEASE_S = 0.02;

export class VoicePlayer {
  private ctx: AudioContext | null = null;

  /** Kullanıcı dokunuşunda çağrılır (otomatik oynatma kilidi varsa açar). */
  unlock(): void {
    void this.context()?.resume().catch(() => undefined);
  }

  /** Planı çalar; gain: genel düzey (VOLUME_GAIN). Hata sessiz (ses yoksa konuşma yine sürer). */
  play(plan: readonly Syllable[], gain: number): void {
    const ctx = this.context();
    if (!ctx || !plan.length || gain <= 0) return;
    if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
    const t0 = ctx.currentTime + 0.01;
    for (const s of plan) {
      const start = t0 + s.at / 1000;
      const end = start + s.dur / 1000;
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = s.wave;
      osc.frequency.setValueAtTime(s.freq, start);
      osc.frequency.linearRampToValueAtTime(s.to, end);
      const peak = gain * s.vol;
      amp.gain.setValueAtTime(0, start);
      amp.gain.linearRampToValueAtTime(peak, start + ATTACK_S);
      amp.gain.setValueAtTime(peak, Math.max(start + ATTACK_S, end - RELEASE_S));
      amp.gain.linearRampToValueAtTime(0, end);
      osc.connect(amp).connect(ctx.destination);
      osc.start(start);
      osc.stop(end + 0.01);
    }
  }

  private context(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      this.ctx = new AudioContext();
    } catch {
      return null;
    }
    return this.ctx;
  }
}
