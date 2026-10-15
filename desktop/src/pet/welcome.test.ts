import { describe, expect, it } from "vitest";
import { playWelcome, welcomePlan, type WelcomePet } from "./welcome";

const area = { xMax: 1856, yMax: 976, bottomStart: 976, bottomEnd: 2832 };

describe("karşılama (SPEC 10 CL4)", () => {
  it("plan: sağ kenardan bakış, orta, rastgele alt köşe", () => {
    const l = welcomePlan(area, () => 0.1);
    expect(l.peek).toEqual({ x: 1856, y: 488 });
    expect(l.center).toEqual({ x: 928, y: 488 });
    // FB4-4: köşenin tam üstü değil, alt kenarda %12 içeride (976 + 1856 * 0.12; 2832 - 1856 * 0.12)
    expect(l.corner).toEqual({ s: 1199, side: "left" });
    expect(welcomePlan(area, () => 0.9).corner).toEqual({ s: 2609, side: "right" });
  });

  it("sıra: peek -> ortaya uçuş -> laf -> köşeye uçup uyku; tutma sonunda bırakılır", async () => {
    const log: string[] = [];
    const pet: WelcomePet = {
      pinAt: (x, y, st) => log.push(`pin ${x},${y} ${st}`),
      flyToPoint: async (x, y, pose) => void log.push(`fly ${x},${y} ${pose}`),
      flyHomeAndSleep: async (s, ms) => void log.push(`home ${s} sleep ${ms}`),
      hold: (r, on) => log.push(`hold ${r} ${on}`),
    };
    await playWelcome(pet, area, "merhaba", {
      say: async (t) => void log.push(`say ${t}`),
      sleep: async (ms) => void log.push(`wait ${ms}`),
      rng: () => 0.9,
      voice: () => log.push("voice"),
    });
    expect(log).toEqual([
      "hold welcome true",
      "pin 1856,488 peek",
      "wait 1400",
      "fly 928,488 talk",
      "voice",
      "say merhaba",
      "home 2609 sleep 45000",
      "hold welcome false",
    ]);
  });
});
