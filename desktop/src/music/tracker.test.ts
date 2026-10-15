import { describe, expect, it } from "vitest";
import { initialMusic, MARATHON_MS, MUSIC_COOLDOWN_MS, stepMusic } from "./tracker";

const at = (min: number, h = 14) => new Date(2026, 9, 10, h, 0, 0, 0).getTime() + min * 60_000;
const play = (track: number) => ({ app: "spotify", playing: true, track });

describe("müzik tepkileri (FB8)", () => {
  it("aynı şarkı bugün 3. kez başlayınca repeat; bekleme süresi var", () => {
    const s = initialMusic(new Date(at(0)));
    const seq = [1, 2, 1, 2, 1];
    const out = seq.map((tr, i) => stepMusic(s, play(tr), new Date(at(i * 4))));
    expect(out).toEqual([null, null, null, null, "interaction:music_repeat"]);
    expect(stepMusic(s, play(3), new Date(at(21)))).toBeNull();
  });

  it("2 dakikada 4 şarkı değişimi skip", () => {
    const s = initialMusic(new Date(at(0)));
    const out = [1, 2, 3, 4].map((tr, i) => stepMusic(s, play(tr), new Date(at(0) + i * 20_000)));
    expect(out.at(-1)).toBe("interaction:music_skip");
  });

  it("2 saat kesintisiz marathon (günde bir); duraklama sayacı sıfırlar; gece", () => {
    const s = initialMusic(new Date(at(0)));
    stepMusic(s, play(1), new Date(at(0)));
    expect(stepMusic(s, play(1), new Date(at(0) + MARATHON_MS))).toBe("interaction:music_marathon");
    expect(stepMusic(s, play(1), new Date(at(0) + MARATHON_MS + MUSIC_COOLDOWN_MS + 1))).toBeNull();
    const n = initialMusic(new Date(at(0, 2)));
    expect(stepMusic(n, play(9), new Date(at(0, 2)))).toBe("interaction:music_night");
    const p = initialMusic(new Date(at(0)));
    stepMusic(p, play(1), new Date(at(0)));
    stepMusic(p, { ...play(1), playing: false }, new Date(at(60)));
    expect(stepMusic(p, play(1), new Date(at(61) + MARATHON_MS - 60_000 * 61))).toBeNull();
  });
});
