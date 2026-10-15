import { describe, expect, it } from "vitest";
import { buildMessages, SYSTEM_PROMPT } from "../src/lib/prompt";

describe("prompt", () => {
  it("system prompt is identical for every lang and mode (cache friendly)", () => {
    const systems = [
      buildMessages("a", "polite", "en"),
      buildMessages("b", "street", "en"),
      buildMessages("c", "polite", "tr"),
      buildMessages("d", "street", "tr"),
    ].map((m) => m[0]);
    for (const s of systems) expect(s).toEqual({ role: "system", content: SYSTEM_PROMPT });
  });

  it("puts lang, mode and question into the user message", () => {
    const [, user] = buildMessages("neden gökyüzü mavi", "street", "tr");
    expect(user).toEqual({ role: "user", content: "lang: tr\nmode: street\nquestion: neden gökyüzü mavi" });
  });

  it("states the hard rules", () => {
    for (const rule of ["60 characters", "lowercase", "no exclamation", "no emoji", "[K]", "forbidden topics"]) {
      expect(SYSTEM_PROMPT).toContain(rule);
    }
  });
});
