import { describe, expect, it } from "vitest";
import { isFollowUp } from "./followup";
import { detectTone } from "./tone";

describe("ton (SPEC 17 L1)", () => {
  const cases: [string, string][] = [
    ["moralim bozuk", "sad"],
    ["bugün berbat bir gün :(", "sad"],
    ["i feel bad today", "sad"],
    ["SENDEN NEFRET EDIYORUM", "angry"],
    ["sinir oldum ya", "angry"],
    ["this is so annoying!!!", "angry"],
    ["ahahaha kopdum", "joking"],
    ["lol what", "joking"],
    ["teşekkürler canım", "kind"],
    ["you're so sweet", "kind"],
    ["paris nerede", "neutral"],
    ["anlamadım aq", "neutral"],
  ];
  for (const [text, tone] of cases) it(`${text} -> ${tone}`, () => expect(detectTone(text)).toBe(tone));
  it("niyetten gelen ton: iltifat nazik, hakaret kızgın", () => {
    expect(detectTone("çok zekisin", "compliment")).toBe("kind");
    expect(detectTone("malsın", "insult")).toBe("angry");
  });
  it("üzüntü önce gelir (yumuşak taraf güvenli)", () => expect(detectTone("çok üzgünüm haha")).toBe("sad"));
});

describe("takip sorusu (SPEC 17 L2)", () => {
  for (const q of ["neden?", "niye", "nasıl yani", "ciddi misin", "emin misin?", "gerçekten mi", "why?", "really?", "are you sure", "how so"])
    it(`${q} takip`, () => expect(isFollowUp(q)).toBe(true));
  for (const q of ["neden gökyüzü mavi", "paris nerede", "why is the sky blue", "", "ciddi misin sen benimle dalga mı geçiyorsun"])
    it(`${q || "(boş)"} takip değil`, () => expect(isFollowUp(q)).toBe(false));
});
