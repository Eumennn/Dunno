// SPEC 18 Faz 4: uygulamayla gelen paketler (content/packs/<id>/, SPEC 12 veri modu biçimi). Kod yok.
//  - kozmetik (tek seferlik, lisans "packs"): halloween, cyberpunk
//  - premium dünya (Pro): space, office
// Renkler ana palet / themes.json paletlerinden; laflar marka dili (küçük harf, ≤ 60, ünlem/emoji yok). PLACEHOLDER: tasarımcı onayı bekler.
// Kullanım: node scripts/gen-packs.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../../content/packs/", import.meta.url).pathname;

export const PACKS = [
  {
    id: "halloween",
    requires: "pack",
    name: { tr: "cadılar bayramı", en: "halloween" },
    description: { tr: "balkabağı rengi, ürkütücü olmayan laflar", en: "pumpkin colors, not-scary lines" },
    theme: { id: "halloween_pumpkin", name: { tr: "balkabağı", en: "pumpkin" }, colors: { body: "#B5713F", shade: "#8E5330", light: "#F2A65A", belly: "#FFD29A" } },
    bubbles: { fill: "#2B1E2F", ink: "#FFD29A" },
    lines: [
      ["interaction:click", "boo. korkmadın değil mi. ben de", "boo. you weren't scared. me neither"],
      ["interaction:click", "şeker yoksa şaka da yok", "no candy, no trick"],
      ["interaction:drag", "beni süpürgeyle taşı bari", "at least carry me on a broom"],
      ["time:night", "gece oldu. ben zaten hep böyleyim", "it's night. i always look like this"],
      ["time:night", "kapı çalarsa açma. şeker isteyecekler", "don't open the door. they want candy"],
      ["time:evening", "kostümün hazır mı. ben hep kostümdeyim", "costume ready. i'm always in one"],
      ["idle:10", "balkabağı oyuyordum. bitmedi", "i was carving a pumpkin. not done"],
      ["idle:30", "hayalet gibi bekliyorum. sessizce", "waiting like a ghost. quietly"],
      ["random", "örümcek ağı değil, tozdu bu", "that's not a cobweb, it's dust"],
      ["random", "korku filmi açma. ben uyuyamam", "don't put on a horror movie. i won't sleep"],
      ["random", "cadı şapkası bana yakışır mıydı", "would a witch hat suit me"],
      ["random", "şeker kasem boş. senin yüzünden", "my candy bowl is empty. your fault"],
      ["app:browser", "kostüm fikri mi arıyorsun. ben ol", "looking for costume ideas. be me"],
      ["app:excel", "şeker bütçesi tablosu. ciddi", "a candy budget sheet. serious"],
      ["app:game", "korku oyunu mu. ışığı aç", "horror game. turn on the lights"],
    ],
  },
  {
    id: "cyberpunk",
    requires: "pack",
    name: { tr: "siberpunk", en: "cyberpunk" },
    description: { tr: "neon gece rengi, krom laflar", en: "neon night colors, chrome lines" },
    theme: { id: "cyberpunk_neon", name: { tr: "neon gece", en: "neon night" }, colors: { body: "#6676C2", shade: "#4C5AA4", light: "#6EC5E9", belly: "#D9E0F6" } },
    bubbles: { fill: "#2B1E2F", ink: "#6EC5E9" },
    lines: [
      ["interaction:click", "bağlantı kuruldu. veri yok", "connection made. no data"],
      ["interaction:click", "beni hackleme. zaten bozuğum", "don't hack me. already broken"],
      ["interaction:drag", "beni ağ üstünden taşıdın", "you moved me over the network"],
      ["time:night", "şehir uyumaz. ben uyurum", "the city never sleeps. i do"],
      ["time:morning", "sabah protokolü başlatılamadı", "morning protocol failed to start"],
      ["idle:10", "sistem beklemede. ben de", "system idle. me too"],
      ["idle:30", "yükleme yüzde 3. kahve al", "loading 3 percent. get coffee"],
      ["random", "krom kaplama bilgi getirmez", "chrome plating brings no knowledge"],
      ["random", "neon ışık altında da bilmiyorum", "still no idea under neon light"],
      ["random", "emekli bir yapay zekâyım. o kadar", "i'm an ai. a retired one"],
      ["random", "dijital ruhum çevrimdışı", "my digital soul is offline"],
      ["random", "ağdan çıktım, geri dönmem", "i left the grid. not going back"],
      ["app:vscode", "kod yazıyorsun. ben ağdan izliyorum", "you code. i watch from the grid"],
      ["app:terminal", "yeşil yazılar. çok havalı. anlamıyorum", "green text. very cool. no idea"],
      ["app:browser", "veri akışı. reklam akışı yani", "data stream. ad stream, really"],
    ],
  },
  {
    id: "space",
    requires: "pro",
    name: { tr: "uzay dünyası", en: "space world" },
    description: { tr: "dunno yörüngede. hâlâ bir şey bilmiyor", en: "dunno in orbit. still knows nothing" },
    theme: { id: "space_orbit", name: { tr: "yörünge", en: "orbit" }, colors: { body: "#6475B0", shade: "#4E5D94", light: "#94A4D8", belly: "#D9E0F6" } },
    bubbles: { fill: "#D9E0F6", ink: "#2B1E2F" },
    lines: [
      ["interaction:click", "yer çekimi yok. dürtme yine de", "zero gravity. still no poking"],
      ["interaction:drag", "beni başka gezegene mi taşıyorsun", "moving me to another planet"],
      ["time:morning", "güneş doğdu. bugün on beş kez daha doğacak", "sunrise. fifteen more today"],
      ["time:night", "burada hep gece. alıştım", "it's always night here. used to it"],
      ["idle:10", "yörüngede dönüyorum. sen de dön", "orbiting. you should too"],
      ["idle:30", "uzay boşluğu. senin gibi sessiz", "the void. as quiet as you"],
      ["random", "kara delik değil, şarj kablosu", "not a black hole, a charging cable"],
      ["random", "astronot değilim. kostüm aldım", "not an astronaut. bought the suit"],
      ["random", "yıldızlara baktım. bir şey anlamadım", "looked at the stars. understood nothing"],
      ["random", "ay'a gittim. kimse yoktu", "went to the moon. nobody home"],
      ["random", "uzayda kimse soru sormaz. güzel", "nobody asks questions in space. nice"],
      ["random", "sinyal zayıf. bahane güçlü", "weak signal. strong excuse"],
      ["app:excel", "yakıt hesabı mı. ben bilmem", "fuel math. not my thing"],
      ["app:browser", "uzay fotoğrafı mı. hepsi siyah", "space photos. all black"],
      ["app:game", "uzay oyunu mu. ben zaten oradayım", "space game. i'm already there"],
    ],
  },
  {
    id: "office",
    requires: "pro",
    name: { tr: "ofis dünyası", en: "office world" },
    description: { tr: "dunno bir şirketin başında. toplantı yapıyor", en: "dunno runs a company. holds meetings" },
    theme: { id: "office_ceo", name: { tr: "yönetim katı", en: "top floor" }, colors: { body: "#CFA070", shade: "#A8754A", light: "#ECD0AE", belly: "#F7EBDD" } },
    bubbles: { fill: "#F7EBDD", ink: "#2B1E2F" },
    lines: [
      ["interaction:click", "toplantıdayım. dürtme", "in a meeting. no poking"],
      ["interaction:drag", "beni terfi ettirmeden taşıma", "don't move me without a promotion"],
      ["time:morning", "sabah toplantısı. ben gelmeyeceğim", "morning meeting. i won't attend"],
      ["time:noon", "öğle arası. üç saat sürer", "lunch break. three hours"],
      ["time:evening", "mesai bitti. ben hiç başlamadım", "shift is over. i never started"],
      ["idle:10", "verimlilik raporu: sıfır", "productivity report: zero"],
      ["idle:30", "bu toplantı bir e-posta olabilirdi", "this meeting could've been an email"],
      ["random", "strateji değiştirdik. hâlâ bilmiyorum", "new strategy. still no idea"],
      ["random", "sinerji. ne demek bilmiyorum", "synergy. no idea what it means"],
      ["random", "maaşına zam yok. bana var", "no raise for you. one for me"],
      ["random", "vizyonum net: öğle yemeği", "my vision is clear: lunch"],
      ["random", "çeyrek sonu. ben de bittim", "quarter end. so am i"],
      ["app:excel", "bu tabloda kâr yok. bende de", "no profit in this sheet. none in me"],
      ["app:powerpoint", "otuz slayt, bir fikir. o da benim değil", "thirty slides, one idea. not mine"],
      ["app:browser", "pazar araştırması mı, video mu", "market research or videos"],
    ],
  },
];

const json = (dir, p, v) => {
  mkdirSync(join(dir, p, ".."), { recursive: true });
  writeFileSync(join(dir, p), JSON.stringify(v, null, 2) + "\n");
};

function main() {
  for (const p of PACKS) {
    const dir = join(root, p.id);
    json(dir, "manifest.json", {
      schema: 1,
      id: p.id,
      name: p.name,
      version: "1.0.0",
      author: "dunno",
      description: p.description,
      permissions: ["themes", "reactions", "bubbles"],
      contents: { themes: [`themes/${p.theme.id}.json`], reactions: { tr: "reactions/tr.json", en: "reactions/en.json" }, bubbles: "bubbles.json" },
    });
    json(dir, `themes/${p.theme.id}.json`, p.theme);
    json(dir, "bubbles.json", p.bubbles);
    for (const lang of ["tr", "en"]) {
      json(
        dir,
        `reactions/${lang}.json`,
        p.lines.map(([trigger, tr, en], i) => ({ id: `${p.id}_${String(i + 1).padStart(2, "0")}`, trigger, intent: `${p.id} pack line (placeholder)`, [lang]: lang === "tr" ? tr : en })),
      );
    }
  }
  writeFileSync(join(root, "packs.json"), JSON.stringify({ packs: PACKS.map(({ id, requires, name, description }) => ({ id, requires, name, description })) }, null, 2) + "\n");
  console.log(`wrote ${PACKS.length} packs to ${root}`);
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("scripts/gen-packs.mjs")) main();
