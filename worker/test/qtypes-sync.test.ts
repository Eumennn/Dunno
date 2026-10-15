// SPEC 09 K8: worker'ın soru tipleri ve ters tablo, istemci (desktop classify.ts) ve content/pool/inverse.md ile aynı.
import { describe, expect, it } from "vitest";
import inverseMd from "../../content/pool/inverse.md?raw";
import classifySrc from "../../desktop/src/talk/classify.ts?raw";
import { INVERSE, renderPoolLine, typedPoolAnswer } from "../src/lib/pool";
import { QTYPES, validateAsk } from "../src/lib/validate";
import poolTr from "../../content/pool/pool_tr.json";

describe("question types and inverse table", () => {
  it("QTYPES equal the desktop classifier", () => {
    const block = /export const QTYPES = \[([\s\S]*?)\] as const;/.exec(classifySrc)![1];
    const desktop = [...block.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
    expect([...QTYPES]).toEqual(desktop);
  });

  it("INVERSE equals content/pool/inverse.md", () => {
    const rows = [...inverseMd.matchAll(/^\| `([a-z_]+)` \| [^|]+ \| `answer:([a-z_]+)` \|/gm)].map((m) => [m[1], m[2]]);
    expect(Object.fromEntries(rows)).toEqual(INVERSE);
  });

  it("new types pass validation; inverse types answer from the opposite pool", () => {
    const base = { question: "hi", mode: "polite", lang: "tr", deviceId: "honest-device-01", kind: "honest" };
    expect(validateAsk({ ...base, qtype: "to_where" })).toMatchObject({ ok: true, value: { qtype: "to_where" } });
    const fromWhere = (poolTr as unknown as Record<string, string>[]).filter((l) => l.trigger === "answer:from_where").map((l) => renderPoolLine(l.tr, "polite"));
    expect(fromWhere.length).toBeGreaterThan(0);
    for (let i = 0; i < 10; i++) expect(fromWhere).toContain(typedPoolAnswer("tr", "polite", "to_where"));
  });
});
