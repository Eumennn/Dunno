import { describe, expect, it } from "vitest";
import { petTabHtml } from "./app-view";
import { cardData } from "./card";
import { demoCompanion } from "./demo";
import { companionView, FREE_MEMORIES } from "./view";

describe("pet.txt (R8) + kart (R9)", () => {
  it("Free: son 3 anı açık, gerisi 'burada bir şey oldu'; yol seçimi yok", () => {
    const v = companionView(demoCompanion("demon"), "free");
    expect(v.memories.filter((m) => !m.locked)).toHaveLength(FREE_MEMORIES);
    expect(v.choices).toEqual([]);
    const html = petTabHtml("tr", v, "free", { open: 1, total: 2 });
    expect(html).toContain("burada bir şey oldu.");
    expect(html).not.toContain('data-action="evolve_choose"');
    expect(html).toContain("iblis");
    expect(html).toContain("???");
  });

  it("Pro: tam anılar + kardeş dallar seçilebilir", () => {
    const v = companionView(demoCompanion("demon"), "pro");
    expect(v.memories.every((m) => !m.locked)).toBe(true);
    const html = petTabHtml("en", v, "pro", { open: 2, total: 2 });
    expect(html).toContain('data-form="gremlin"');
    expect(html).toContain('data-form="demon"');
  });

  it("kart: strateji §12 alanları, kişisel veri yok", () => {
    const d = cardData("en", companionView(demoCompanion("cloud"), "free"), { open: 1, total: 2 });
    expect(d.title).toBe("DUNNO");
    const text = JSON.stringify(d);
    expect(text).toContain("27");
    expect(text).toContain("together for 43 days");
    expect(text).toContain("secret worlds 1/2");
    expect(text).not.toMatch(/excel|browser/);
  });
});
