// Worker'ın yasak kelime listesi, laf havuzunun tek kaynağıyla (content/pool/banned_*.txt) aynı kalmalı.
import { describe, expect, it } from "vitest";
import bannedEn from "../../content/pool/banned_en.txt?raw";
import bannedTr from "../../content/pool/banned_tr.txt?raw";
import { FORBIDDEN_WORDS } from "../src/lib/lines";

const parse = (text: string) =>
  text
    .split(/\r?\n/)
    .map((l) => l.replace(/#.*$/, "").trim().toLowerCase())
    .filter((l) => l !== "")
    .sort();

describe("banned words", () => {
  it("match content/pool/banned_tr.txt and banned_en.txt", () => {
    expect([...FORBIDDEN_WORDS.tr].sort()).toEqual(parse(bannedTr));
    expect([...FORBIDDEN_WORDS.en].sort()).toEqual(parse(bannedEn));
  });
});
