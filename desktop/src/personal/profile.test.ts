// SPEC 16: Kişisel Dunno (Pro + açık rıza). Girdi süzgeci (sır/hassas), rıza, sil, davranış, şablonlar (marka), gizlilik.
import { describe, expect, it } from "vitest";
import templates from "../../../content/personal/templates.json";
import bannedTr from "../../assets/banned_tr.txt?raw";
import bannedEn from "../../assets/banned_en.txt?raw";
import { renderText } from "../lines/engine";
import { findBanned, findExplicitSwear, parseBanned } from "../lines/pool-check";
import { isForbidden } from "../talk/classify";
import { parseUiAction } from "../ipc-app";
import profileSrc from "./profile.ts?raw";
import mainSrc from "../main.ts?raw";
import telemetrySrc from "../telemetry.ts?raw";
import {
  appName,
  cleanEntry,
  cleanPersonal,
  consent,
  emptyProfile,
  fillable,
  forget,
  initialPersonal,
  ITEM_MAX,
  MAX_CHARS,
  NAME_MAX,
  personalLine,
  sanitizeProfile,
  sliderBehavior,
  SLIDERS,
  type Template,
} from "./profile";

const banned = { tr: parseBanned(bannedTr), en: parseBanned(bannedEn) };

describe("girdi süzgeci (SPEC 16)", () => {
  it("sır/kimlik bilgisi reddedilir", () => {
    for (const s of [
      "mert@example.com",
      "https://site.example/x",
      "www.example.com",
      "0532 123 45 67",
      "4111-1111-1111-1111",
      "sk-abcdef1234567890",
      "ghp_aaaaaaaaaaaaaaaaaaaa",
      "şifrem kedi123",
      "my password is cat",
      "AbCdEfGhIjKlMnOpQrStUvWxYz012345",
    ]) {
      expect(cleanEntry(s, 64, () => false), s).toEqual({ reject: "secret" });
    }
  });

  it("hassas konu (yasak listesi) reddedilir; normal girdi küçük harfe iner", () => {
    expect(isForbidden("ilaç saatim")).toBe(true);
    expect(cleanEntry("ilaç saatim", 40, isForbidden)).toEqual({ reject: "sensitive" });
    expect(cleanEntry("  Kahve   BİTTİ ", 40, isForbidden)).toEqual({ value: "kahve bitti" });
    expect(cleanEntry("x".repeat(NAME_MAX + 1), NAME_MAX, isForbidden)).toEqual({ reject: "too_long" });
  });

  it("profil: virgülle liste, en fazla 8, tekrarsız; kaydırıcı 0..4; reddedilen alan profile girmez", () => {
    const r = sanitizeProfile(
      {
        preferred_name: "Mert",
        inside_jokes: "kahve bitti, kahve bitti, pazartesi, ,",
        recurring_topics: ["sınav", "mert@x.com"],
        explicit_preferences: Array.from({ length: 12 }, (_, i) => `p${i}`),
        sliders: { quiet_chatty: 4, calm_chaotic: 9, sweet_teasing: 1.5 },
        evil: "<script>",
      },
      isForbidden,
    );
    expect(r.profile.preferred_name).toBe("mert");
    expect(r.profile.inside_jokes).toEqual(["kahve bitti", "pazartesi"]);
    expect(r.profile.recurring_topics).toEqual(["sınav"]);
    expect(r.rejected["recurring_topics.1"]).toBe("secret");
    expect(r.profile.explicit_preferences).toHaveLength(8);
    expect(r.profile.sliders).toEqual({ ...emptyProfile().sliders, quiet_chatty: 4 });
    expect(Object.keys(r.profile).sort()).toEqual(["common_workflows", "explicit_preferences", "inside_jokes", "preferred_name", "recurring_topics", "sliders"]);
  });
});

describe("rıza ve silme (SPEC 16)", () => {
  it("varsayılan kapalı; rıza zamanı olmayan kayıt kapalı ve boş döner", () => {
    expect(initialPersonal()).toEqual({ on: false, consentAt: null, profile: emptyProfile() });
    expect(cleanPersonal({ on: true, profile: { preferred_name: "mert" } }, isForbidden)).toEqual(initialPersonal());
    expect(cleanPersonal(undefined, isForbidden).on).toBe(false);
    const c = consent(new Date("2026-10-07T10:00:00Z"));
    expect(c.on && c.consentAt === "2026-10-07T10:00:00.000Z").toBe(true);
    const saved = cleanPersonal({ ...c, profile: { preferred_name: "mert", recurring_topics: ["mert@x.com"] } }, isForbidden);
    expect(saved.profile.preferred_name).toBe("mert");
    expect(saved.profile.recurring_topics).toEqual([]); // eski kayıttaki sır da süzülür
  });

  it("kapat = sil: profil kalmaz", () => {
    expect(forget()).toEqual(initialPersonal());
  });
});

describe("davranış ve şablonlar (SPEC 16)", () => {
  it("kaydırıcılar mod davranış sınırında (0.5..2), uçlar farklı", () => {
    for (const v of [0, 2, 4]) {
      const p = { ...emptyProfile(), sliders: Object.fromEntries(SLIDERS.map((s) => [s, v])) as never };
      const b = sliderBehavior(p);
      expect(b.chattiness >= 0.5 && b.chattiness <= 2 && b.restScale >= 0.5 && b.restScale <= 2).toBe(true);
    }
    const quiet = sliderBehavior({ ...emptyProfile(), sliders: { ...emptyProfile().sliders, quiet_chatty: 0 } });
    const chatty = sliderBehavior({ ...emptyProfile(), sliders: { ...emptyProfile().sliders, quiet_chatty: 4 } });
    expect(chatty.chattiness).toBeGreaterThan(quiet.chattiness);
  });

  it("şablon dosyası: iki dil, geçerli etiket, marka kuralları; en uzun girdilerle bile ≤60 ya da atlanır", () => {
    const list = templates as Template[];
    expect(new Set(list.map((t) => t.id)).size).toBe(list.length);
    const longName = "x".repeat(NAME_MAX);
    for (const t of list) {
      for (const lang of ["tr", "en"] as const) {
        const text = t[lang]!;
        expect(text, t.id).toBeTruthy();
        expect(text, t.id).toBe(text.toLocaleLowerCase(lang).replace(/\{k:/g, "{K:"));
        expect(text, t.id).not.toMatch(/!/);
        expect(findBanned(text, lang, banned), t.id).toBeNull();
        expect(findExplicitSwear(text.replace(/\{K:/g, " "), lang), t.id).toBeNull();
        // {K:} dışında *** / aq yok
        expect(text.replace(/\{K:[^}]*\}/g, ""), t.id).not.toMatch(/\*\*\*|\baq\b/);
        // kısa girdilerle ≤ 60
        const filled = text.replace(/\{name\}/g, longName).replace(/\{app\}/g, "dosya gezgini").replace(/\{(joke|topic|workflow|pref)\}/g, "kahve bitti");
        for (const m of ["polite", "street"] as const) expect(Array.from(renderText(filled, m)).length, `${t.id} ${lang} ${m}`).toBeLessThanOrEqual(MAX_CHARS);
      }
      for (const tag of t.tags ?? []) expect(["sweet", "tease", "roast", "absurd", "robotic"]).toContain(tag);
    }
  });

  it("laf: sadece dolabilen şablon; ad + uygulama etiketi doldurulur; uzun şaka 60'ı aşarsa atlanır", () => {
    const list = templates as Template[];
    expect(personalLine(list, "tr", emptyProfile(), null, () => 0.5)).toBeNull();
    const p = { ...emptyProfile(), preferred_name: "mert" };
    const r = personalLine(list, "tr", p, appName("tr", "excel"), () => 0.01)!;
    expect(r.text).toContain("mert");
    expect(fillable("{joke} demiştin", p, null)).toBe(false);
    const long = { ...emptyProfile(), inside_jokes: ["x".repeat(ITEM_MAX)] };
    const only = [{ id: "j", tr: "{joke}. hâlâ gülüyorum. içimden ve dışımdan" }];
    expect(personalLine(only, "tr", long, null, () => 0.5)).toBeNull();
    expect(appName("tr", "file_explorer")).toBe("dosya gezgini");
    expect(appName("en", "excel")).toBe("excel");
  });
});

describe("gizlilik (SPEC 16)", () => {
  it("ipc: aç / kapat / kaydet", () => {
    expect(parseUiAction({ action: "personal_on" })).toEqual({ action: "personal_on" });
    expect(parseUiAction({ action: "personal_off" })).toEqual({ action: "personal_off" });
    expect(parseUiAction({ action: "personal_save", profile: { preferred_name: "mert" } })).toEqual({ action: "personal_save", profile: { preferred_name: "mert" } });
    expect(parseUiAction({ action: "personal_save", profile: "x" })).toBeNull();
  });

  it("profil modülü ağ/IPC/telemetri kullanmaz; telemetri kişisel veri bilmez; pet sadece uygulama etiketini verir", () => {
    expect(profileSrc).not.toMatch(/fetch\(|XMLHttpRequest|invoke\(|sendBeacon|WebSocket|telemetry/);
    expect(telemetrySrc).not.toMatch(/personal|profile|preferred_name/i);
    // main.ts: kişisel laf sadece "app:" etiketinden; başlık/sekme metni kişisel modüle girmez
    const hook = mainSrc.slice(mainSrc.indexOf("personal: () =>"), mainSrc.indexOf(": null,", mainSrc.indexOf("personal: () =>")));
    expect(hook).toContain('startsWith("app:")');
    expect(hook).not.toMatch(/title|tab_title|site:/i);
  });
});
