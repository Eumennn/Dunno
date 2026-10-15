import { describe, expect, it } from "vitest";
import { STRINGS } from "../i18n";
import type { AppStatus } from "../ipc-app";
import { aboutHtml, frameHtml, homeHtml, setMacAx, settingsHtml, statsHtml, TABS, tabLabel } from "./view";

const status: AppStatus = {
  state: "sleep",
  facing: "right",
  left: 2,
  total: 3,
  mode: "street",
  lang: "tr",
  frequency: "high",
  autostart: true,
  muted: false,
  inMeeting: false,
  manualMeeting: true,
  stats: null,
  wardrobe: null,
  bubbleSpeed: "long",
  size: 50,
  fart: false,
  tabTitles: true,
  telemetry: false,
  testMode: { on: false, tempoOff: false },
};

describe("about.txt güncelleme hatası (FB12)", () => {
  it("elle kontrol olmadıysa sebep yazılır", () => {
    const html = aboutHtml(STRINGS.tr, "0.1.5", { available: null, busy: false, upToDate: false, error: "error sending request" });
    expect(html).toContain("bakamadım");
    expect(html).toContain("error sending request");
    expect(aboutHtml(STRINGS.tr, "0.1.5", { available: null, busy: false, upToDate: true })).not.toContain("bakamadım");
  });
});

describe("dunno.exe görünümleri", () => {
  it("çerçeve: başlık dunno.exe, sekmeler landing pencere adlarıyla", () => {
    const html = frameHtml(STRINGS.en, "settings", "<p>x</p>");
    expect(html).toContain('<div class="bar app-bar" data-drag><span>dunno.exe</span>');
    expect(TABS.map((x) => tabLabel(x, STRINGS.en))).toEqual(["home", "pet.txt", "wardrobe.exe", "workshop.exe", "settings.exe", "stats.txt", "about.txt"]);
    expect(html).toContain('class="app-tab app-tab-on" role="tab" aria-selected="true" data-tab="settings"');
  });

  it("home: kalan hak, durum adı, anahtarlar", () => {
    const html = homeHtml(STRINGS.tr, status);
    expect(html).toContain("2 / 3 doğru cevap hakkı");
    expect(html).toContain("sonrası: işe yaramaz cevaplar");
    expect(html).toContain("uyuyor");
    // tek piksel anahtar + açıklama satırı
    expect(html).toContain('role="switch" aria-checked="true" aria-label="toplantıdayım" data-switch="meeting"');
    expect(html).toContain('role="switch" aria-checked="false" aria-label="bugün sus" data-switch="mute_today"');
    expect(html).toContain("yarın sabaha kadar uyur");
    expect(html).toContain("toplantı bitene ya da sen kapatana kadar saklanır");
    // today.txt: yenilenme saati + laf sayısı (sayaç yoksa tire)
    expect(html).toContain("yarın 00:00&#39;da yenilenir");
    expect(html).toContain("bugün atılan laf: -");
    expect(html).toContain('data-action="summon"');
    expect(html).toContain('data-action="send_edge"');
  });

  it("settings.exe: ayarların seçili hâli", () => {
    const html = settingsHtml(STRINGS.en, status);
    expect(html).toContain('class="seg seg-on" aria-pressed="true" data-value="street"');
    expect(html).toContain('class="seg seg-on" aria-pressed="true" data-value="high"');
    expect(html).toContain('role="switch" aria-checked="true" aria-label="start with windows" data-switch="autostart"');
    expect(html).toContain("questions are not affected");
  });

  it("ödeme -> lisans: lisans sistemi açıkken sipariş formu; abonelik sonu ve bitişi yazılır", async () => {
    const { proHtml } = await import("./view");
    const on = proHtml(STRINGS.tr, { ...status, pro: { tier: "free", enabled: true, tail: null, sim: false } });
    expect(on).toContain('id="pro-order"');
    expect(on).toContain('id="pro-email"');
    expect(on).toContain('data-action="pro_claim"');
    const sub = proHtml(STRINGS.tr, { ...status, pro: { tier: "pro", enabled: true, tail: "a1b2c3", sim: false, until: "2026-11-10", expired: false } });
    expect(sub).toContain("abonelik 2026-11-10 tarihine kadar");
    expect(sub).not.toContain('id="pro-order"');
    const ended = proHtml(STRINGS.tr, { ...status, pro: { tier: "free", enabled: true, tail: "a1b2c3", sim: false, until: "2026-10-01", expired: true } });
    expect(ended).toContain("abonelik bitti");
  });

  it("FB7 alarms.txt: boşken nasıl kurulacağı, doluyken zaman + etiket + sil", () => {
    expect(homeHtml(STRINGS.tr, status)).toContain("toplantı diye hatırlat");
    const at = new Date(Date.now() + 3_600_000).toISOString();
    const html = homeHtml(STRINGS.tr, { ...status, reminders: [{ id: "rem_abc", at, label: "<çay>" }] });
    expect(html).toContain('data-action="reminder_delete" data-id="rem_abc"');
    expect(html).toContain("&#60;çay&#62;");
  });

  it("FB6 sayaç izni: sadece telemetryAsk iken, iki açık seçenek", () => {
    expect(homeHtml(STRINGS.tr, status)).not.toContain("telemetry_answer");
    const html = homeHtml(STRINGS.tr, { ...status, telemetryAsk: true });
    expect(html).toContain('data-action="telemetry_answer" data-value="false"');
    expect(html).toContain('data-action="telemetry_answer" data-value="true"');
    expect(html).toContain("soru metni, başlık, kim olduğun asla");
  });

  it("settings.exe kategorileri (FB6): menü + sadece seçili kategori", () => {
    const snd = settingsHtml(STRINGS.tr, status, [], undefined, undefined, "sound");
    expect(snd).toContain('data-setcat="sound"');
    expect(snd).toContain('class="set-nav__item set-nav__on" role="tab" aria-selected="true" tabindex="0" data-setcat="sound"');
    expect(snd).toContain('data-switch="voice"');
    expect(snd).toContain('data-switch="fart"');
    expect(snd).not.toContain('data-switch="autostart"');
    const gen = settingsHtml(STRINGS.tr, status, [], undefined, undefined, "general");
    expect(gen).toContain('data-switch="autostart"');
    expect(gen).not.toContain('data-switch="telemetry"');
  });

  it("home: önizleme durumu (anahtar değişince) ve laf sayısı", () => {
    const withLines = { ...status, stats: { day: "d", today: { questions: 0, clicks: 0, drags: 0, sleepMinutes: 0, topApp: null, lines: 4 }, total: { questions: 0, clicks: 0, drags: 0, sleepMinutes: 0, topApp: null } } };
    const html = homeHtml(STRINGS.en, withLines as AppStatus, "shh");
    expect(html).toContain("keeping quiet");
    expect(html).toContain("lines said today: 4");
  });

  it("sekmeler klavyeyle gezilir: sadece aktif sekme tab sırasında", () => {
    const html = frameHtml(STRINGS.en, "stats", "");
    expect(html).toContain('tabindex="0" class="app-tab app-tab-on"');
    expect(html.match(/tabindex="-1"/g)).toHaveLength(6);
  });

  it("stats.txt: sayı yokken tire, gizlilik notu", () => {
    expect(statsHtml(STRINGS.en, null)).toContain("<td>-</td>");
    const c = (questions: number) => ({ questions, clicks: 4, drags: 2, sleepMinutes: 12, lines: 3, topApp: null, apps: [], honest: 2, farts: 1 });
    const week = Array.from({ length: 7 }, (_, i) => ({ day: `2026-09-2${7 + i > 9 ? "" : ""}${i}`, questions: i, clicks: 0, lines: 0 }));
    const html = statsHtml(STRINGS.en, { day: "2026-10-03", today: c(1), total: c(9), week, since: "2026-09-27", activeDays: 5 });
    expect(html).toContain("7 days (5 active)");
    expect((html.match(/class="st-bar"/g) ?? []).length).toBe(7);
    expect(html).toContain("<td>12 min</td>");
    expect(html).toContain("<td>none</td>");
    expect(html).toContain("none of it goes anywhere");
  });

  it("about.txt: sürüm ve iletişim", () => {
    const html = aboutHtml(STRINGS.tr, "0.1.0");
    expect(html).toContain("sürüm 0.1.0");
    expect(html).toContain("dunnothebean@gmail.com");
  });

  it("marka sesi: arayüz metinlerinde ünlem yok, küçük harf", () => {
    for (const lang of ["tr", "en"] as const) {
      const t = STRINGS[lang];
      // tüm metinler: iç içe nesneler ve şablon fonksiyonları (örnek argümanla) dahil
      const collect = (v: unknown): string[] =>
        typeof v === "string"
          ? [v]
          : typeof v === "function"
            ? collect((v as (x: unknown) => unknown)(3))
            : v && typeof v === "object"
              ? Object.values(v).flatMap(collect)
              : [];
      const texts = collect(t);
      for (const s of texts as string[]) {
        expect(s).not.toContain("!");
        expect(s).toBe(s.toLocaleLowerCase(lang));
      }
    }
  });

  it("settings.exe: macOS erişilebilirlik izni satırı sadece durum biliniyorsa ve sekme adları açıksa (SPEC 19 M4)", () => {
    const priv = (s: AppStatus) => settingsHtml(STRINGS.tr, s, [], undefined, undefined, "privacy");
    expect(priv(status)).not.toContain("erişilebilirlik izni");
    setMacAx("missing");
    expect(priv({ ...status, tabTitles: true })).toContain('data-action="ax_request"');
    expect(priv({ ...status, tabTitles: false })).not.toContain("erişilebilirlik izni");
    setMacAx("granted");
    const on = priv({ ...status, tabTitles: true });
    expect(on).toContain("verildi");
    expect(on).not.toContain('data-action="ax_request"');
    setMacAx(null);
  });

  it("settings.exe: balon süresi; test modu bölümü sadece açıkken (SPEC 07 FB2/FB5)", () => {
    const off = settingsHtml(STRINGS.tr, status);
    expect(off).toContain("balon süresi");
    expect(off).toContain('aria-checked="false" aria-label="osuruk" data-switch="fart"'); // SPEC 09 K3
    expect(off).toContain('data-switch="tab_titles"'); // SPEC 09 K7
    expect(off).toContain('aria-checked="false" aria-label="kullanım sayılarını gönder" data-switch="telemetry"'); // SPEC 10 CL6: varsayılan kapalı
    expect(off).toContain("başlığı okur, unutur. hiçbir yere göndermez.");
    // boyut: kademeli kaydırıcı (SPEC 09 K8b), normal = 3. kademe (index 2)
    expect(off).toContain('min="0" max="100" step="1" value="50" data-slider="size"');
    expect(off).toContain('data-range-value="size">50<');
    expect(off).toContain('class="seg seg-on" aria-pressed="true" data-value="long"');
    expect(off).not.toContain("data-test=");
    const on = settingsHtml(STRINGS.tr, { ...status, testMode: { on: true, tempoOff: true } });
    expect(on).toContain("test modu");
    expect(on).toContain('data-test="edge" data-target="top_left"');
    expect(on).toContain('data-test="trigger" data-id="poke_100"');
    expect(on).toContain("soru temposu: kapalı");
    expect(on).toContain("toplantıyı bitir"); // manualMeeting: true
    expect(on).toContain('data-test="off"');
    expect(on).toContain('data-test="fart"'); // SPEC 09 K3c
  });

  it("about.txt: sürüm satırı 5 tık hedefi", () => {
    expect(aboutHtml(STRINGS.en, "0.1.0")).toContain('data-tap="version"');
    expect(aboutHtml(STRINGS.tr, "0.1.0")).toContain('data-action="welcome">karşılamayı tekrar oynat</button>'); // SPEC 10 CL4
  });

  it("about.txt güncelleme (SPEC 10 CL1): kontrol düğmesi, yeni sürüm + kur, elle kontrolde güncel notu", () => {
    expect(aboutHtml(STRINGS.tr, "0.1.0")).toContain('data-action="update_check">güncellemeleri kontrol et</button>');
    const found = aboutHtml(STRINGS.tr, "0.1.0", { available: "0.2.0", busy: false, upToDate: false });
    expect(found).toContain("yeni sürüm: 0.2.0");
    expect(found).toContain('data-action="update_install">kur</button>');
    expect(aboutHtml(STRINGS.en, "0.1.0", { available: null, busy: false, upToDate: true })).toContain("this is the latest. so this is it");
    expect(aboutHtml(STRINGS.en, "0.1.0", { available: null, busy: true, upToDate: false })).toContain("disabled>looking</button>");
  });
});

