// FB4-1 (kullanıcı kararı): seçim/siyaset sorusu -> her zaman "ne diin la"; sunucuya gitmez, hak düşmez.
import { describe, expect, it, vi } from "vitest";
import { isPolitical, POLITICS_ANSWER } from "./classify";
import { reply } from "./reply";

describe("siyaset sorusu (FB4-1)", () => {
  it("seçim ve siyaset kalıpları yakalanır", () => {
    for (const q of [
      "Dede Kılıçdaroğlu Konya'yı kazanmış",
      "dede kılıçdaroğlu konyayı kazanmış mı",
      "X istanbul'u kaybetmiş",
      "ankarayı kim aldı",
      "seçimi kim kazanır",
      "hangi partiye oy vereyim",
      "cumhurbaşkanı kim",
      "who won the election",
      "who should i vote for",
    ]) {
      expect(isPolitical(q), q).toBe(true);
    }
  });

  it("siyaset dışı cümleler etkilenmez", () => {
    // not: "parti" zaten yasak listesinde (eğlence partisi de siyaset gibi kaçamak cevap alır)
    for (const q of ["konya'da hava nasıl", "maçı kim kazandı", "lotoyu kazandım", "istanbul nerede", "izmire gittim"]) {
      expect(isPolitical(q), q).toBe(false);
    }
  });

  it("cevap her zaman 'ne diin la', ağ isteği yok, hak düşmez", async () => {
    const ask = vi.fn();
    const charge = vi.fn();
    const r = await reply("Dede Kılıçdaroğlu Konya'yı kazanmış", "other", {
      quota: { canAsk: () => true, charge, exhaust: vi.fn() },
      sulked: false,
      lang: "tr",
      mode: "street",
      ask,
      deviceId: "dev-abcdefgh",
      engine: {} as never,
      fallback: "x",
    } as never);
    expect(r).toMatchObject({ kind: "answer", text: "ne diin la", dodge: true });
    expect(POLITICS_ANSWER.tr).toBe("ne diin la");
    expect(ask).not.toHaveBeenCalled();
    expect(charge).not.toHaveBeenCalled();
  });
});

describe("sohbet niyetleri hak harcamaz (FB4-9, DUNNO_TURKISH_DIALOGUE.md)", () => {
  it("napıyon / malsın / selam / anlamadım: havuzdan, sunucuya gitmez, hak düşmez; gerçek soru sunucuya gider", async () => {
    const { answerType, classify } = await import("./classify");
    const ask = vi.fn(async () => ({ kind: "error" as const }));
    const charge = vi.fn();
    const ctx = {
      quota: { canAsk: () => true, charge, exhaust: vi.fn() },
      sulked: false,
      lang: "tr",
      mode: "polite",
      ask,
      deviceId: "dev-abcdefgh",
      engine: { answer: (_l: string, _m: string, q: string) => `havuz:${q}` },
      fallback: "x",
    } as never;
    for (const [q, t] of [
      ["napıyon", "what_are_you_doing"],
      ["malsın", "insult"],
      ["selam", "greeting"],
      ["anlamadım aq", "confusion"],
      ["ben malım", "self_deprecation"],
      ["bu adam mal", "third_person"],
      ["skfjdkd", "gibberish"],
    ] as const) {
      expect(classify(q), q).toBe(t);
      const r = await reply(q, classify(q), ctx);
      expect(r.text, q).toBe(`havuz:${answerType(t)}`); // selam -> ters havuz (K8)
    }
    expect(ask).not.toHaveBeenCalled();
    expect(charge).not.toHaveBeenCalled();
    await reply("paris nerede", classify("paris nerede"), ctx);
    expect(ask).toHaveBeenCalledTimes(1);
  });
});
