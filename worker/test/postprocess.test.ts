import { describe, expect, it } from "vitest";
import { MAX_ANSWER_CHARS, postprocess } from "../src/lib/postprocess";

describe("postprocess", () => {
  it("lowercases", () => {
    expect(postprocess("It's TUESDAY.", "en")).toBe("it's tuesday.");
  });

  it("lowercases with the right locale", () => {
    expect(postprocess("I KNOW", "en")).toBe("i know");
    expect(postprocess("BILMIYORUM İSTANBUL", "tr")).toBe("bılmıyorum istanbul");
  });

  it("removes exclamation marks", () => {
    expect(postprocess("fish!!", "en")).toBe("fish");
    expect(postprocess("¡no! nope！", "en")).toBe("no nope");
  });

  it("removes emoji including joiners, skin tones and flags", () => {
    expect(postprocess("probably a duck 🦆", "en")).toBe("probably a duck");
    expect(postprocess("meh 👍🏽 👨‍👩‍👧 🇫🇷 ❤️", "en")).toBe("meh");
  });

  it("strips dunno prefix, wrapping quotes and extra lines", () => {
    expect(postprocess('dunno: "tuesday."', "en")).toBe("tuesday.");
    expect(postprocess("\n\nfish.\nhere is a real answer", "en")).toBe("fish.");
  });

  it("truncates long text to the limit on a word boundary", () => {
    const out = postprocess(
      "the answer is obviously a very long sentence that keeps going way past sixty characters",
      "en",
    );
    expect(out).toBe("the answer is obviously a very long sentence that keeps");
    expect(Array.from(out ?? "").length).toBeLessThanOrEqual(MAX_ANSWER_CHARS);
  });

  it("hard cuts a long single word", () => {
    expect(postprocess("a".repeat(100), "en")).toBe("a".repeat(MAX_ANSWER_CHARS));
  });

  it("keeps [K] as is", () => {
    expect(postprocess("who the [K] asks that", "en")).toBe("who the [K] asks that");
    expect(postprocess("bunu kim sorar ya [K]", "tr")).toBe("bunu kim sorar ya [K]");
  });

  it("normalizes [k] and model-written *** to [K], keeps *shrugs*", () => {
    expect(postprocess("FISH. [k] FISH", "en")).toBe("fish. [K] fish");
    expect(postprocess("*shrugs* in ***", "en")).toBe("*shrugs* in [K]");
  });

  it("never leaves a half [K] after truncation", () => {
    const out = postprocess(`${"a".repeat(58)} [K] more`, "en");
    expect(out).toBe("a".repeat(58));
    const hard = postprocess(`${"b".repeat(58)}[K]`, "en");
    expect(hard).toBe("b".repeat(58));
  });

  it("returns null when nothing usable is left", () => {
    expect(postprocess("", "en")).toBeNull();
    expect(postprocess("   \n  ", "tr")).toBeNull();
    expect(postprocess("👍👍!!", "en")).toBeNull();
    expect(postprocess("[K]", "en")).toBeNull();
    expect(postprocess("*** [k]!", "tr")).toBeNull();
  });
});
