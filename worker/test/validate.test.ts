import { describe, expect, it } from "vitest";
import { MAX_QUESTION_CHARS, validateAsk } from "../src/lib/validate";

const SECRET = "my secret question about zebras";
const BASE = { question: "hi", mode: "polite", lang: "en", deviceId: "3f2b9c1e-7a4d-4e8f-9b21-0c6d5e4f3a2b" };

describe("validateAsk", () => {
  it("accepts a valid request and trims the question", () => {
    expect(validateAsk({ ...BASE, question: "  hi  ", mode: "street", lang: "tr" })).toEqual({
      ok: true,
      value: { question: "hi", mode: "street", lang: "tr", deviceId: BASE.deviceId, kind: "pool_hint", qtype: "other" },
    });
  });

  it("rejects non-object bodies", () => {
    expect(validateAsk(null).ok).toBe(false);
    expect(validateAsk("hi").ok).toBe(false);
  });

  it("rejects missing or non-string question", () => {
    expect(validateAsk({ ...BASE, question: undefined })).toEqual({ ok: false, error: "invalid question" });
    expect(validateAsk({ ...BASE, question: 42 })).toEqual({ ok: false, error: "invalid question" });
  });

  it("rejects empty question", () => {
    expect(validateAsk({ ...BASE, question: "   " })).toEqual({ ok: false, error: "empty question" });
  });

  it("accepts exactly 200 characters and rejects 201", () => {
    expect(validateAsk({ ...BASE, question: "x".repeat(MAX_QUESTION_CHARS) }).ok).toBe(true);
    expect(validateAsk({ ...BASE, question: "x".repeat(MAX_QUESTION_CHARS + 1) })).toEqual({
      ok: false,
      error: "question too long",
    });
  });

  it("counts emoji as one character", () => {
    expect(validateAsk({ ...BASE, question: "🦆".repeat(MAX_QUESTION_CHARS) }).ok).toBe(true);
  });

  it("rejects missing or unknown mode", () => {
    expect(validateAsk({ ...BASE, mode: undefined })).toEqual({ ok: false, error: "invalid mode" });
    expect(validateAsk({ ...BASE, mode: "uncensored" })).toEqual({ ok: false, error: "invalid mode" });
  });

  it("rejects missing or unknown lang", () => {
    expect(validateAsk({ ...BASE, lang: undefined })).toEqual({ ok: false, error: "invalid lang" });
    expect(validateAsk({ ...BASE, lang: "de" })).toEqual({ ok: false, error: "invalid lang" });
    expect(validateAsk({ ...BASE, lang: "TR" })).toEqual({ ok: false, error: "invalid lang" });
  });

  it("requires a sane device id", () => {
    for (const deviceId of [undefined, 123, "", "short", "x".repeat(65), "has space 123", "äöü-12345", "a/b/c/d/e"]) {
      expect(validateAsk({ ...BASE, deviceId })).toEqual({ ok: false, error: "invalid device id" });
    }
    for (const deviceId of ["abcd1234", "x".repeat(64), "dev_Id-01"]) {
      expect(validateAsk({ ...BASE, deviceId }).ok).toBe(true);
    }
  });

  it("never puts the question into the error message", () => {
    const results = [
      validateAsk({ ...BASE, question: SECRET, mode: "rude" }),
      validateAsk({ ...BASE, question: SECRET, lang: "xx" }),
      validateAsk({ ...BASE, question: SECRET, deviceId: "?" }),
      validateAsk({ ...BASE, question: SECRET.repeat(10) }),
    ];
    for (const r of results) {
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).not.toContain("zebras");
    }
  });
});
