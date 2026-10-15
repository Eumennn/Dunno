// Dev önizleme (SPEC 11): kategori x 2 varyasyon, aralarda 400 ms sessizlik; OfflineAudioContext ile oynatıcının aynı zarfıyla render,
// WAV base64 olarak window.__wav'a (headless betik dosyaya yazar). Sayfada da çalınabilir.
import { babbleMs, planBabble, VOICE_CATEGORIES, VOLUME_GAIN } from "../voice/voice";

const RATE = 22_050;
const GAP_MS = 400;

function wav(samples: Float32Array): string {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, RATE, true);
  v.setUint32(28, RATE * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, samples.length * 2, true);
  samples.forEach((s, i) => v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 0x7fff, true));
  let bin = "";
  new Uint8Array(buf).forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

async function main(): Promise<void> {
  const clips = VOICE_CATEGORIES.flatMap((c) => [0, 1].map((v) => ({ c, plan: planBabble(c, v) })));
  const total = clips.reduce((t, x) => t + babbleMs(x.plan) + GAP_MS, 0) / 1000 + 0.2;
  const ctx = new OfflineAudioContext(1, Math.ceil(total * RATE), RATE);
  let t = 0.1;
  const list: string[] = [];
  for (const { c, plan } of clips) {
    list.push(`${t.toFixed(2)}s ${c}`);
    for (const s of plan) {
      const start = t + s.at / 1000;
      const end = start + s.dur / 1000;
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = s.wave;
      osc.frequency.setValueAtTime(s.freq, start);
      osc.frequency.linearRampToValueAtTime(s.to, end);
      const peak = VOLUME_GAIN.medium * s.vol * 4; // dosyada duyulsun diye normalize
      amp.gain.setValueAtTime(0, start);
      amp.gain.linearRampToValueAtTime(peak, start + 0.006);
      amp.gain.setValueAtTime(peak, Math.max(start + 0.006, end - 0.02));
      amp.gain.linearRampToValueAtTime(0, end);
      osc.connect(amp).connect(ctx.destination);
      osc.start(start);
      osc.stop(end + 0.01);
    }
    t += (babbleMs(plan) + GAP_MS) / 1000;
  }
  const out = await ctx.startRendering();
  (window as unknown as { __wav: string; __list: string[] }).__wav = wav(out.getChannelData(0));
  (window as unknown as { __list: string[] }).__list = list;
  document.querySelector("#voice")!.textContent = list.join("\n");
}
void main();
