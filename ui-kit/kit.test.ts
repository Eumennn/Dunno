import { describe, expect, it } from "vitest";
import {
  ctlCloseHtml,
  dunnoHtml,
  ctlHtml,
  esc,
  noPx,
  switchHtml,
  heartHtml,
  heartsHtml,
  segmentedHtml,
  stepSliderHtml,
  stepValue,
  thinkingHtml,
  toastHtml,
  winHtml,
  youHtml,
} from "./kit";

describe("ui-kit html", () => {
  it("kaçışlar", () => {
    expect(esc(`<b a="1">&'`)).toBe("&#60;b a=&#34;1&#34;&#62;&#38;&#39;");
    expect(youHtml("<script>")).not.toContain("<script>");
    expect(toastHtml("a&b")).toContain("a&#38;b");
  });

  it("kalp: 7x6 harita, 3x, renk sınıfla (hex yok)", () => {
    const h = heartHtml(true);
    expect(h).toContain('width="21" height="18"');
    expect(h.match(/<rect/g)).toHaveLength(27);
    expect(h).not.toMatch(/#[0-9a-f]{3,6}/i);
    expect(heartHtml(false)).toContain("heart-empty");
  });

  it("kalan hak kadar dolu kalp", () => {
    const h = heartsHtml(1, 3, "1 of 3 questions left today");
    expect(h.match(/class="heart"/g)).toHaveLength(1);
    expect(h.match(/heart-empty/g)).toHaveLength(2);
    expect(h).toContain('aria-label="1 of 3 questions left today"');
  });

  it("segmented: seçili olan seg-on + aria-pressed", () => {
    const s = segmentedHtml("mood", [{ value: "polite", label: "polite" }, { value: "street", label: "street ***" }], "street");
    expect(s).toContain('class="seg" aria-pressed="false" data-value="polite"');
    expect(s).toContain('class="seg seg-on" aria-pressed="true" data-value="street"');
  });

  it("pencere: bar çeşidi ve kapat kontrolü", () => {
    expect(winHtml("ask.exe", "<p>x</p>")).toContain('<div class="bar"><span class="bar-title">ask.exe</span>');
    expect(winHtml("error.exe", "", { bar: "err", close: false })).toBe(
      '<div class="win"><div class="bar bar-err"><span class="bar-title">error.exe</span></div></div>',
    );
    const two = winHtml("setup.exe", "", { ctls: ["minimize", "close"] });
    expect(two.indexOf('data-ctl="minimize"')).toBeLessThan(two.indexOf('data-ctl="close"'));
    expect(ctlHtml("minimize")).toContain('d="M3 9h6"');
    expect(ctlCloseHtml()).toContain('class="ctl"');
  });

  it("sohbet satırları landing sınıflarıyla", () => {
    expect(dunnoHtml("no idea")).toBe('<div class="msg msg-dunno"><b>dunno:</b> no idea</div>');
    expect(thinkingHtml()).toContain('class="dots"');
  });

  it("Türkçe harf öğe bazında gövde fontuna düşer", () => {
    expect(noPx("dunno.exe")).toBe("");
    expect(noPx("home")).toBe("");
    expect(noPx("today.txt")).toBe("");
    for (const s of ["ağız", "konuşma sıklığı", "İPTAL", "çık", "dönüş", "üç"]) expect(noPx(s)).toBe(" no-px");
    expect(winHtml("ayarlar.exe", "")).toContain('class="bar-title"');
    expect(winHtml("çöp.exe", "")).toContain('class="bar-title no-px"');
  });

  it("anahtar: role=switch + aria-checked, metin kaçışlı", () => {
    expect(switchHtml("mute_today", true, "bugün sus")).toBe(
      '<button type="button" class="pswitch" role="switch" aria-checked="true" aria-label="bugün sus" data-switch="mute_today"></button>',
    );
    expect(switchHtml("x", false, '"a"')).toContain('aria-checked="false" aria-label="&#34;a&#34;"');
  });
});

describe("stepSliderHtml (SPEC 09 K8b)", () => {
  const opts = ["a", "b", "c"].map((v) => ({ value: v, label: `l${v}` }));
  it("native range, tam kademe, seçili ad işaretli", () => {
    const h = stepSliderHtml("size", opts, "b");
    expect(h).toContain('type="range" class="step-range" min="0" max="2" step="1" value="1"');
    expect(h).toContain('data-values="a,b,c"');
    expect(h).toContain('aria-valuetext="lb"');
    expect(h).toContain('class="step-tick step-tick-on" data-value="b"');
  });
  it("stepValue kademeye yuvarlar, uçlara sıkıştırır", () => {
    expect(stepValue("a,b,c", 1)).toBe("b");
    expect(stepValue("a,b,c", 1.6)).toBe("c");
    expect(stepValue("a,b,c", -3)).toBe("a");
    expect(stepValue("a,b,c", 9)).toBe("c");
  });
});
