// SPEC 09 K7: sekme/pencere başlığı -> kategori (sadece bellekte), site:* lafları.
import { describe, expect, it } from "vitest";
import cases from "../../../content/context/sites.cases.json";
import contentSites from "../../../content/context/sites.json";
import sitesJson from "../../assets/sites.json";
import { LineEngine, mergeLines } from "../lines/engine";
import { POOL_TARGETS, SITE_CATEGORIES } from "../lines/pool-check";
import pooltr from "../../../content/pool/pool_tr.json";
import poolen from "../../../content/pool/pool_en.json";
import { loadSites, normalizeTitle, siteMatch, siteOf, siteTrigger } from "./sites";

const { categories, errors } = loadSites(sitesJson);

describe("sites.json", () => {
  it("valid; only adult (adult + gambling) is silent and it is checked first; SPEC 17 game/site categories before the general ones", () => {
    expect(errors).toEqual([]);
    const specific = SITE_CATEGORIES.filter((c) => c !== "game_store" && (c.startsWith("game_") || c.startsWith("web_")));
    expect(specific.length).toBe(27);
    expect(categories.map((c) => c.id)).toEqual([
      "adult",
      "music",
      ...specific,
      "maps",
      "mail",
      "ai_chat",
      "code",
      "docs",
      "game_store",
      "shopping",
      "news",
      "learning",
      "social",
      "video",
      "search",
    ]);
    expect(categories.filter((c) => c.silent).map((c) => c.id)).toEqual(["adult"]);
  });

  it("the categories that talk are exactly the pool targets, each with >= 10 TR + 10 EN lines; adult has none", () => {
    expect(categories.filter((c) => !c.silent).map((c) => c.id).sort()).toEqual([...SITE_CATEGORIES].sort());
    const lines = mergeLines(pooltr, poolen);
    for (const c of SITE_CATEGORIES) {
      expect(POOL_TARGETS[`site:${c}`]).toBeGreaterThanOrEqual(10); // SPEC 13: video ve code derin (20)
      for (const lang of ["tr", "en"] as const) {
        expect(lines.filter((l) => l.trigger === `site:${c}` && l[lang]).length, `${c} ${lang}`).toBeGreaterThanOrEqual(10);
      }
    }
    expect(lines.some((l) => l.trigger === "site:adult")).toBe(false);
  });

  it("lines never name a brand (keys stay in sites.json)", () => {
    const brands = categories.flatMap((c) => c.keys).filter((k) => k.length >= 4);
    const generic = new Set(["music", "maps", "mail", "inbox", "search", "arama", "haber", "news", "watch", "video", "feed", "sale", "cart", "sepet", "ders", "kurs", "course", "lesson", "dizi", "izle", "bolum", "radio", "radyo", "podcast", "harita", "haritalar", "belge", "document", "dokuman", "akis", "egitim", "sozluk", "dictionary", "ansiklopedi", "encyclopedia", "tutorial", "episode", "trailer", "fragman", "repo", "repository", "breaking", "manset", "headlines", "gazete", "newspaper", "playlist", "muzik", "directions", "street view", "yol tarifi", "spreadsheet", "wishlist", "istek listesi", "eposta", "webmail", "indirim", "odeme", "checkout", "shopping", "alisveris", "sepetim", "game store", "oyun magazasi", "ai chat", "pull request", "merge request", "yapay zeka sohbet", "adult content", "yetiskin icerik", "son dakika", "film izle", "calma listesi", "gelen kutusu", "adsiz dokuman", "untitled document", "dokumanlar", "e tablolar"]);
    const named = brands.filter((k) => !generic.has(k));
    for (const l of mergeLines(pooltr, poolen).filter((x) => x.trigger.startsWith("site:"))) {
      for (const lang of ["tr", "en"] as const) {
        if (!l[lang]) continue;
        const text = ` ${normalizeTitle(l[lang]!)} `;
        for (const b of named) expect(text.includes(` ${b} `), `${l.id}: ${b}`).toBe(false);
      }
    }
  });
});

describe("title -> category", () => {
  const table: [string, string | null, boolean?][] = [
    ["Funny cats compilation - YouTube", "web_youtube"],
    ["Some Video - Vimeo", "video"],
    ["YouTube Music", "music"],
    ["Spotify – Web Player: Music for everyone", "music"],
    ["Inbox (3) - someone - Gmail", "mail"],
    ["Gelen Kutusu - Outlook", "mail"],
    ["Google Maps", "maps"],
    ["kedi mamasi - Google'da Ara", "search"],
    ["Untitled document - Google Docs", "docs"],
    ["owner/project: Pull Request #12 - GitHub", "code"],
    ["ChatGPT", "ai_chat"],
    ["Steam'de İndirim", "game_store"],
    ["Sepetim | Trendyol", "shopping"],
    ["Amazon.com.tr: Kulaklık", "shopping"],
    ["SON DAKİKA HABERLERİ", "news"],
    ["Vikipedi, özgür ansiklopedi", "web_wikipedia"],
    ["Coursera | Online Courses", "learning"],
    ["Instagram", "web_instagram"],
    ["Facebook", "social"],
    ["Netflix", "web_netflix"],
    // SPEC 17 oyunlar (pencere başlığı)
    ["League of Legends (TM) Client", "game_lol"],
    ["VALORANT", "game_valorant"],
    ["Minecraft 1.21.4", "game_minecraft"],
    ["Counter-Strike 2", "game_cs2"],
    ["Canlı Bahis - En Yüksek Oranlar", "adult", true],
    ["Online Casino", "adult", true],
    ["poker kuralları", "adult", true],
    // kelime sınırı: anahtar başka kelimenin içinde eşleşmez
    ["better ideas for alphabet soup", null],
    ["araba kiralama", null],
    ["Visual Studio Code", null],
    ["", null],
  ];
  for (const [title, cat, silent] of table) {
    it(`${title || "(empty)"} -> ${cat}`, () => {
      const m = siteMatch(title, categories);
      expect(m?.category ?? null).toBe(cat);
      if (cat) expect(m!.silent).toBe(silent === true);
    });
  }

  it("null/undefined title, and the default table via siteOf", () => {
    expect(siteMatch(null, categories)).toBeNull();
    expect(siteMatch(undefined, categories)).toBeNull();
    expect(siteOf("Gmail")).toEqual({ category: "mail", silent: false });
  });

  it("only the category leaves the function, never the title", () => {
    const m = siteMatch("my secret tab title - YouTube", categories)!;
    expect(Object.keys(m).sort()).toEqual(["category", "silent"]);
    expect(JSON.stringify(m)).not.toMatch(/secret|tab|title/);
  });

  it("trigger: site:<category>; silent categories give no trigger", () => {
    expect(siteTrigger(siteMatch("Netflix", categories))).toBe("site:web_netflix");
    expect(siteTrigger(siteMatch("Twitch", categories))).toBe("site:web_twitch");
    expect(siteTrigger(siteMatch("Online Casino", categories))).toBeNull();
    expect(siteTrigger(null)).toBeNull();
  });

  it("engine: a site line wins over app and time lines", () => {
    const lines = mergeLines(pooltr, poolen);
    const e = new LineEngine({ lines, rng: () => 0 });
    const said = e.pick(["app:excel", "time:night", "site:shopping"], "en", "polite")!;
    expect(said.trigger).toBe("site:shopping");
  });
});

describe("loader rejects bad entries", () => {
  it("bad id, duplicate, missing silent, empty keys", () => {
    const r = loadSites({
      categories: [
        { id: "Video", silent: false, keys: ["x"] },
        { id: "ok", silent: false, keys: ["x"] },
        { id: "ok", silent: false, keys: ["y"] },
        { id: "nosilent", keys: ["x"] },
        { id: "nokeys", silent: true, keys: [] },
        { id: "blank", silent: false, keys: ["  !! "] },
      ],
    });
    expect(r.categories.map((c) => c.id)).toEqual(["ok"]);
    expect(r.errors).toEqual([
      "Video: id must be snake_case",
      "ok: duplicate id",
      "nosilent: silent must be true or false",
      "nokeys: keys required",
      "blank: empty key",
    ]);
    expect(loadSites(null)).toEqual({ categories: [], errors: ["categories must be an array"] });
  });
});

// SPEC 09 K7b: Rust (src-tauri/src/context/sites.rs) aynı tabloyla aynı sonucu vermeli; ortak örnekler iki tarafta da test edilir.

describe("ortak örnekler (TS = Rust)", () => {
  it("content/context/sites.cases.json", () => {
    const table = loadSites(contentSites).categories;
    expect(cases.length).toBeGreaterThanOrEqual(20);
    for (const c of cases as { title: string; category: string | null; silent: boolean }[]) {
      const m = siteMatch(c.title, table);
      expect(m?.category ?? null, c.title).toBe(c.category);
      expect(m?.silent ?? false, c.title).toBe(c.silent);
    }
  });
});
