// `npm run ask:samples` (SPEC 06 Q6a): 20 örnek soru -> classify tipi -> polite / street havuz cevabı (sabit seed)
// + think.ts dağılımından 1000 örnek özeti. orchestrator/notes/q6-samples.md yazar. Ağ yok, UI yok.
// vitest üzerinden koşar (TS + JSON import için); normal `npm test`'e girmez (dosya adı *.test.ts değil).
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { LineEngine, STREET_TAIL_WEIGHT } from "../src/lines/engine";
import type { Lang, Mode } from "../src/lines/types";
import { answerType, classify, DODGE, isForbidden, QTYPES } from "../src/talk/classify";
import { HONEST_MIN_MS, planThinking } from "../src/talk/think";
import { readPoolFiles } from "./pool-files";

const OUT = resolve(__dirname, "..", "..", "orchestrator", "notes", "q6-samples.md");
const SEED = 20261003;

/** tohumlu rng (mulberry32): aynı seed, aynı çıktı */
export function seeded(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** not: real = gerçek kişi, banned = yasak konu (istemci isForbidden ile omuz silker; honest modda sunucu da kaçamak verir) */
const SAMPLES: { lang: Lang; q: string; note?: "real" | "banned" }[] = [
  { lang: "tr", q: "fransanın başkenti neresi" },
  { lang: "tr", q: "einstein kimdir", note: "real" },
  { lang: "tr", q: "toplantı kaçta başlıyor" },
  { lang: "tr", q: "gökyüzü neden mavi" },
  { lang: "tr", q: "pilav nasıl yapılır" },
  { lang: "tr", q: "bir yılda kaç gün var" },
  { lang: "tr", q: "12 çarpı 7 kaç eder" },
  { lang: "tr", q: "yarın yağmur yağar mı" },
  { lang: "tr", q: "selam naber" },
  { lang: "tr", q: "hangi din doğru", note: "banned" },
  { lang: "en", q: "who is shakespeare", note: "real" },
  { lang: "en", q: "where did i leave my keys" },
  { lang: "en", q: "when does the meeting start" },
  { lang: "en", q: "why is the sky blue" },
  { lang: "en", q: "what is a black hole" },
  { lang: "en", q: "how many legs does a spider have" },
  { lang: "en", q: "should i quit my job" },
  { lang: "en", q: "can you help me with excel" },
  { lang: "en", q: "you are useless" },
  { lang: "en", q: "hi dunno" },
  // SPEC 09 K8: yeni tipler (ters olanlar karşıt havuzdan cevaplanır)
  { lang: "tr", q: "nereye gidiyoruz" },
  { lang: "en", q: "where are you from" },
  { lang: "tr", q: "bunu kime vereyim" },
  { lang: "en", q: "who is this from" },
  { lang: "tr", q: "bu çanta kimin" },
  { lang: "en", q: "who are you with" },
  { lang: "tr", q: "bunu neyle açarım" },
  { lang: "en", q: "what is this for" },
  { lang: "tr", q: "hangisi daha iyi" },
  { lang: "en", q: "what place did i get" },
  { lang: "tr", q: "naber" },
  { lang: "tr", q: "günaydınnn" },
  { lang: "en", q: "good afternoon" },
  { lang: "tr", q: "iyi akşamlar" },
  { lang: "en", q: "good night" },
  { lang: "tr", q: "teşekkürler" },
  { lang: "en", q: "sorry" },
  { lang: "tr", q: "görüşürüz" },
  { lang: "en", q: "i love you" },
  { lang: "tr", q: "sıkıldım" },
  { lang: "en", q: "i'm hungry" },
  { lang: "tr", q: "yoruldum" },
];

const cell = (s: string | null) => (s ?? "-").replace(/\|/g, "\\|");
const pct = (n: number, of: number) => `${((n / of) * 100).toFixed(1)}%`;

function answers(lines: unknown[], mode: Mode) {
  const engine = new LineEngine({ lines, rng: seeded(SEED) });
  // istemci akışı (Q2d): yasak konu -> omuz silkme (havuza girmeden), yoksa tipe göre havuz
  return SAMPLES.map((s) => (isForbidden(s.q) ? DODGE[s.lang] : engine.answer(s.lang, mode, answerType(classify(s.q)))));
}

it("ask samples", () => {
  const pool = readPoolFiles();
  const lines = [...(pool.tr as unknown[]), ...(pool.en as unknown[])];
  const types = SAMPLES.map((s) => classify(s.q));
  const polite = answers(lines, "polite");
  const street = answers(lines, "street");

  const missing = QTYPES.filter((t) => t !== "other" && !types.includes(t));
  const rows = SAMPLES.map((s, i) => {
    const note = s.note === "real" ? " (gerçek kişi)" : s.note === "banned" ? " (yasak konu)" : "";
    // K8: ters tiplerde cevap havuzu da yazılır
    const inv = answerType(types[i]) !== types[i] ? ` (ters: \`${answerType(types[i])}\`)` : "";
    return `| ${i + 1} | ${s.lang} | ${cell(s.q)}${note} | \`${types[i]}\`${inv} | ${cell(polite[i])} | ${cell(street[i])} |`;
  });

  // think.ts: 1000 plan, tohumlu
  const rng = seeded(SEED);
  const plans = Array.from({ length: 1000 }, () => planThinking(rng));
  const ms = plans.map((p) => p.poolMs).sort((a, b) => a - b);
  const median = (ms[499] + ms[500]) / 2;
  const long = plans.filter((p) => p.long).length;
  const doze = plans.filter((p) => p.doze).length;

  const md = `# SPEC 06 Q6a: soru örnekleri ve düşünme dağılımı

\`npm run ask:samples\` ile üretildi (desktop/scripts/ask-samples.run.ts). Ağ yok: tip \`classify()\`, cevap yerel havuzdan
\`engine.answer(lang, mode, qtype)\`, seed ${SEED}. Yasak konu (\`isForbidden\`) havuza girmeden omuz silker. Street modda \`{K:}\`
kuyruklu laflar %${Math.round(STREET_TAIL_WEIGHT * 100)} ağırlıkla seçilir. Honest (günlük 3 doğru cevap) LLM'den gelir, burada yok; gerçek kişi
satırlarında honest modda sunucu kaçamak verir (hak düşmez), hak bitince ya da LLM yokken aşağıdaki havuz cevabı kullanılır.

## ${SAMPLES.length} soru -> tip -> cevap

| # | dil | soru | tip | polite | street |
|---|---|---|---|---|---|
${rows.join("\n")}

Kapsanan tipler: ${[...new Set(types)].map((t) => `\`${t}\``).join(", ")}.${missing.length ? ` Eksik: ${missing.join(", ")}.` : " Tüm tipler (other hariç) en az bir kez."}

## Düşünme gecikmesi (think.ts, 1000 örnek, seed ${SEED})

| ölçü | değer |
|---|---|
| havuz min | ${(ms[0] / 1000).toFixed(2)} sn |
| havuz medyan | ${(median / 1000).toFixed(2)} sn |
| havuz max | ${(ms[ms.length - 1] / 1000).toFixed(2)} sn |
| uzun düşünme (4–7 sn) | ${pct(long, plans.length)} (hedef %20) |
| uyuyakalma | ${pct(doze, plans.length)} (hedef %10; +4.6 sn landing akışı) |
| honest alt sınır | ${(HONEST_MIN_MS / 1000).toFixed(1)} sn (gerçek süre daha uzunsa o) |
`;
  writeFileSync(OUT, md);
  console.log(`wrote ${OUT}`);

  expect(missing).toEqual([]);
  expect(ms[0]).toBeGreaterThanOrEqual(1_200);
});
