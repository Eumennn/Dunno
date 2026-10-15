// S3 kabul kriteri: "excel + 03:00 + street" doğru trigger ve adaylar; K7 sekme farkındalığı; K8 ters cevaplar ve Dunnolama.
import { describe, expect, it } from "vitest";
import poolEn from "../../content/pool/pool_en.json";
import poolTr from "../../content/pool/pool_tr.json";
import { LineEngine, mergeLines, renderText } from "@desktop/lines/engine";
import { answerType, classify } from "@desktop/talk/classify";
import {
  activeFor,
  askNote,
  dunnolaPreview,
  matchWindowSite,
  qtypeLive,
  qtypeNote,
  tryContext,
  type TryInput,
} from "./try";

const lines = mergeLines(poolTr, poolEn);
const base: TryInput = { app: null, hour: 14, idle: 0, batteryLow: false, interaction: null, mode: "polite", lang: "tr" };
let seed = 7;
const rng = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

describe("excel + 03:00 + street", () => {
  const r = tryContext({ ...base, app: "excel", hour: 3, mode: "street" }, lines, rng);

  it("context is app + the rust time slot, app wins", () => {
    expect(r.active).toEqual(["app:excel", "time:late_night"]);
    expect(r.meeting).toBe(false);
    expect(r.winner).toBe("app:excel");
  });

  it("candidates are the 20 turkish excel lines (SPEC 13 derin havuz) rendered for street", () => {
    expect(r.candidates).toHaveLength(20);
    expect(r.candidates.every((c) => c.id.startsWith("tr_excel_"))).toBe(true);
    expect(r.candidates.find((c) => c.id === "tr_excel_03")!.text).toBe("birleştirilmiş hücre. cesur tercih, *** cesur");
  });

  it("10 draws, all from the candidates, no repeats", () => {
    expect(r.draws).toHaveLength(10);
    const texts = new Set(r.candidates.map((c) => c.text));
    for (const d of r.draws) expect(texts.has(d)).toBe(true);
    expect(new Set(r.draws).size).toBe(10);
  });
});

describe("other situations", () => {
  it("polite hides the {K:} tail", () => {
    const r = tryContext({ ...base, app: "excel", hour: 3, mode: "polite" }, lines, rng);
    expect(r.candidates.find((c) => c.id === "tr_excel_03")!.text).toBe("birleştirilmiş hücre. cesur tercih");
  });

  it("no app: the time slot wins (14:00 is noon in the rust table)", () => {
    const r = tryContext(base, lines, rng);
    expect(r.active).toEqual(["time:noon"]);
    expect(r.winner).toBe("time:noon");
  });

  it("idle and battery join the context, priority still app > time > idle > battery", () => {
    expect(activeFor({ ...base, app: "vscode", idle: 30, batteryLow: true })).toEqual([
      "app:vscode",
      "time:noon",
      "idle:30",
      "battery:low",
    ]);
  });

  it("an interaction is spoken on its own", () => {
    const r = tryContext({ ...base, app: "excel", interaction: "spam_click", lang: "en" }, lines, rng);
    expect(r.active).toEqual(["interaction:spam_click"]);
    expect(r.winner).toBe("interaction:spam_click");
  });

  it("a meeting app silences everything", () => {
    for (const app of ["zoom", "teams", "webex"]) {
      const r = tryContext({ ...base, app, hour: 10 }, lines, rng);
      expect(r.meeting).toBe(true);
      expect(r.active).toEqual(["time:morning"]);
      expect(r.winner).toBeNull();
      expect(r.draws).toEqual([]);
    }
  });
});

describe("SPEC 09 K7 window/tab awareness", () => {
  it("matches window titles to site:* categories and prioritizes site:* > app:* > time:*", () => {
    expect(matchWindowSite("YouTube - LoFi Hip Hop")).toEqual({ site: "video", silent: false });
    expect(matchWindowSite("Stack Overflow - TypeError")).toEqual({ site: "code", silent: false });
    expect(activeFor({ ...base, app: "browser", windowTitle: "YouTube - Video", hour: 14 })).toEqual([
      "site:video",
      "app:browser",
      "time:noon",
    ]);
  });

  it("never speaks on adult or gambling window titles", () => {
    const r = tryContext({ ...base, app: "browser", windowTitle: "Canlı Bahis Casino Rulet", hour: 22 }, lines, rng);
    expect(r.silentSite).toBe(true);
    expect(r.winner).toBeNull();
    expect(r.draws).toEqual([]);
  });
});

describe("askNote", () => {
  it("says plainly where an answer came from", () => {
    expect(askNote("pool")).toContain("anahtarı yok");
    expect(askNote("pool")).toContain("havuzundan");
    expect(askNote("llm")).toContain("llm");
    expect(askNote("offline")).toContain("kapalı");
    expect(askNote("limit")).toContain("429");
  });
});

describe("ask.exe question type (SPEC 06 Q2)", () => {
  const pick = (question: string, lang: "tr" | "en") => {
    const qtype = classify(question);
    const engine = new LineEngine({ lines, rng: () => 0.5 });
    const text = engine.answer(lang, "polite", qtype);
    const own = lines.filter((l) => l.trigger === `answer:${qtype}` && l[lang]).map((l) => renderText(l[lang]!, "polite"));
    return { qtype, text, own, has: engine.hasTrigger(`answer:${qtype}`, lang) };
  };

  it("answers from the classified type's own pool, in both languages", () => {
    for (const [question, lang, type] of [
      ["bu şarkıyı kim söylüyor", "tr", "who"],
      ["paris nerede", "tr", "where"],
      ["2+2 kaç", "tr", "math"],
      ["selam", "tr", "greeting"],
      ["who invented the light bulb", "en", "who"],
      ["should i quit my job", "en", "advice"],
      ["you are stupid", "en", "insult"],
    ] as const) {
      const r = pick(question, lang);
      expect(r.qtype, question).toBe(type);
      expect(r.has).toBe(true);
      expect(r.own, question).toContain(r.text);
    }
  });

  it("type note", () => {
    expect(qtypeNote("who", true)).toBe("tip: who · answer:who havuzundan");
    expect(qtypeNote("who", false)).toBe("tip: who · answer:who boş, answer:generic yedeği");
    expect(qtypeNote("other", false)).toBe("tip: other · answer:generic havuzundan");
  });
});

describe("ask.exe inverse answers (SPEC 09 K8)", () => {
  it("shows the type and the inverse match", () => {
    expect(qtypeNote("to_where", true, "from_where")).toBe("tip: to_where · ters: from_where · answer:from_where havuzundan");
    expect(qtypeLive("good_morning", answerType("good_morning"))).toBe("tip: good_morning · ters: good_night");
    expect(qtypeLive("thanks", answerType("thanks"))).toBe("tip: thanks");
  });

  it("real pool: an inverse question is answered from the opposite pool, in both languages", () => {
    for (const [question, lang, type, pool] of [
      ["nereye gidiyoruz", "tr", "to_where", "from_where"],
      ["günaydınnn", "tr", "good_morning", "good_night"],
      ["görüşürüz", "tr", "bye", "greeting"],
      ["where are you from", "en", "from_where", "to_where"],
      ["thanks", "en", "thanks", "thanks"],
    ] as const) {
      const qtype = classify(question);
      expect(qtype, question).toBe(type);
      expect(answerType(qtype)).toBe(pool);
      const text = new LineEngine({ lines, rng: () => 0.3 }).answer(lang, "polite", answerType(qtype));
      const own = lines.filter((l) => l.trigger === `answer:${pool}` && l[lang]).map((l) => renderText(l[lang]!, "polite"));
      expect(own, question).toContain(text);
    }
  });
});

describe("dunnolaPreview (left-click text selection)", () => {
  it("classifies code errors, IBAN/money, and long text walls", () => {
    const code = dunnolaPreview("TypeError: Cannot read properties of undefined", "polite", "tr");
    expect(code?.category).toBe("selection:code_or_error");
    expect(code?.lazyRewrite).toContain("dunnolama özeti:");

    const iban = dunnolaPreview("TR33 0006 1005 1978 6457 8413 26 - 4500 TL", "street", "tr");
    expect(iban?.category).toBe("selection:money_iban_price");
    expect(iban?.response).toContain("***");
  });
});
