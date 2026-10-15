import { describe, expect, it } from "vitest";
import { bubbleWidth, cornerPath, steppedPolygon, THOUGHT_DOTS } from "./bubble";

describe("çizgi roman balonu geometrisi (SPEC 09 K4)", () => {
  it("köşe: sol kenardan üst kenara basamaklı, sadece yatay/dikey adımlar", () => {
    const p = cornerPath(2, [2, 1]);
    expect(p).toEqual([
      [0, 4],
      [2, 4],
      [2, 2],
      [4, 2],
      [4, 0],
    ]);
    for (let i = 1; i < p.length; i++) {
      const dx = p[i][0] - p[i - 1][0];
      const dy = p[i][1] - p[i - 1][1];
      expect(dx === 0 || dy === 0, `adım ${i} çapraz`).toBe(true);
    }
  });

  it("çokgen: dört köşe aynı profil (varsayılan [3,2,1]: 28 nokta), border-radius yok, iç katman kontur kadar içeride", () => {
    const outer = steppedPolygon();
    expect(outer.startsWith("polygon(")).toBe(true);
    expect(outer.split(",").length).toBe(28);
    expect(outer).toContain("0px 6px");
    expect(outer).toContain("calc(100% - 6px) 0px"); // sağ üst
    expect(outer).toContain("100% calc(100% - 6px)"); // sağ alt
    expect(steppedPolygon(2, [2, 1]).split(",").length).toBe(20);
    const inner = steppedPolygon(2, [2, 1], 2);
    expect(inner).toContain("2px 6px");
    expect(inner).toContain("calc(100% - 2px) calc(100% - 6px)");
  });

  it("genişlik: kısa metin tek satır, uzun metin genişler ama oran korunur (w/h <= 3)", () => {
    const lineH = 20;
    const pad = 24;
    let prev = 0;
    for (const n of [4, 12, 30, 60, 90, 120]) {
      const w = bubbleWidth(n);
      expect(w, `${n} karakter`).toBeGreaterThanOrEqual(prev);
      prev = w;
      const lines = Math.ceil((n * 7.6) / (w - pad));
      const h = lines * lineH + pad;
      if (w < 300) expect(w / h, `${n} karakter oranı`).toBeLessThanOrEqual(3.2);
    }
    expect(bubbleWidth(4)).toBe(64); // en dar
    expect(bubbleWidth(500)).toBe(300); // en geniş
  });

  it("düşünce balonu: pet'e doğru küçülen 3 daire", () => {
    expect(THOUGHT_DOTS).toHaveLength(3);
    expect([...THOUGHT_DOTS].sort((a, b) => b - a)).toEqual([...THOUGHT_DOTS]);
  });
});

describe("balon HTML (kit)", () => {
  it("konuşma ve düşünce: basamaklı clip-path, metne göre genişlik, border-radius yok, metin kaçışlı", async () => {
    const { speechBubbleHtml, thoughtBubbleHtml } = await import("./kit");
    const s = speechBubbleHtml("<b>salı</b>");
    expect(s).toContain('class="speech-bubble"');
    expect(s).toContain(`width:${bubbleWidth("<b>salı</b>".length)}px`);
    expect(s).toContain("clip-path:polygon(");
    expect(s).toContain("&#60;b&#62;");
    expect(s).not.toContain("radius");
    const t = thoughtBubbleHtml("hmm", "pet-bub");
    expect(t).toContain('class="thought-bubble pet-bub"');
    expect(t.match(/class="thought-dot"/g)).toHaveLength(3);
    expect(t).toContain("width:8px;height:8px");
  });
});
