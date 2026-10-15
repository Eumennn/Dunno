// SPEC 13: uygulamaya geçince tepki kuralları (saf).
import { describe, expect, it } from "vitest";
import { APP_COOLDOWN_MS, checkReact, DWELL_MS, GLOBAL_COOLDOWN_MS, initialAppReact, LOW_COOLDOWN_SCALE, markSpoken, noteContext, reactKey } from "./app-react";

const always = () => 0;
const never = () => 0.99;

describe("uygulama tepkisi (SPEC 13)", () => {
  it("etiket: site kategorisi uygulamadan önce; ikisi de yoksa null", () => {
    expect(reactKey(["app:browser", "site:video", "time:night"])).toBe("site:video");
    expect(reactKey(["app:excel", "idle:10"])).toBe("app:excel");
    expect(reactKey(["time:night"])).toBeNull();
  });

  it("dwell dolmadan konuşmaz; dolunca bir kez zar atar", () => {
    let s = noteContext(initialAppReact(), "app:excel", 0);
    expect(checkReact(s, DWELL_MS - 1, "normal", always).fire).toBeNull();
    const r = checkReact(s, DWELL_MS, "normal", always);
    expect(r.fire).toBe("app:excel");
    s = r.state;
    // aynı ziyarette ikinci zar yok
    expect(checkReact(s, DWELL_MS + 10_000, "normal", always).fire).toBeNull();
  });

  it("zar tutmazsa bu ziyarette bir daha denemez; başka uygulamaya geçip dönünce yeni ziyaret", () => {
    let s = noteContext(initialAppReact(), "app:excel", 0);
    s = checkReact(s, DWELL_MS, "normal", never).state;
    expect(checkReact(s, DWELL_MS * 3, "normal", always).fire).toBeNull();
    s = noteContext(s, "app:word", DWELL_MS * 3);
    s = noteContext(s, "app:excel", DWELL_MS * 4);
    expect(checkReact(s, DWELL_MS * 5, "normal", always).fire).toBe("app:excel");
  });

  it("aynı etiket gelince ziyaret sıfırlanmaz (bağlam olayları tekrar gelir)", () => {
    const s = noteContext(initialAppReact(), "app:excel", 0);
    expect(noteContext(s, "app:excel", 20_000)).toBe(s);
  });

  it("genel ve uygulama başına bekleme süreleri; az sıklıkta iki kat", () => {
    let s = noteContext(initialAppReact(), "app:excel", 0);
    s = markSpoken(checkReact(s, DWELL_MS, "normal", always).state, "app:excel", DWELL_MS);
    // genel bekleme: başka uygulama da susar
    s = noteContext(s, "app:word", DWELL_MS);
    expect(checkReact(s, DWELL_MS * 2 + 1, "normal", always).fire).toBeNull();
    expect(checkReact(s, DWELL_MS + GLOBAL_COOLDOWN_MS, "normal", always).fire).toBe("app:word");
    // aynı uygulama: 40 dk
    let e = noteContext(s, "app:excel", DWELL_MS + GLOBAL_COOLDOWN_MS);
    expect(checkReact(e, DWELL_MS * 2 + GLOBAL_COOLDOWN_MS, "normal", always).fire).toBeNull();
    e = noteContext(noteContext(e, null, 0), "app:excel", APP_COOLDOWN_MS + DWELL_MS);
    expect(checkReact(e, APP_COOLDOWN_MS + DWELL_MS * 2, "normal", always).fire).toBe("app:excel");
    // az: genel bekleme iki kat
    const low = noteContext(markSpoken(initialAppReact(), "app:word", 0), "app:excel", 0);
    expect(checkReact(low, GLOBAL_COOLDOWN_MS + 1, "low", always).fire).toBeNull();
    expect(checkReact(low, GLOBAL_COOLDOWN_MS * LOW_COOLDOWN_SCALE, "low", always).fire).toBe("app:excel");
  });

  it("sıklık: az < normal < çok olasılık", () => {
    const s = noteContext(initialAppReact(), "app:excel", 0);
    const at = (f: "low" | "normal" | "high", r: number) => checkReact(s, DWELL_MS, f, () => r).fire !== null;
    expect([at("low", 0.3), at("normal", 0.3), at("high", 0.3)]).toEqual([false, true, true]);
    expect([at("low", 0.5), at("normal", 0.5), at("high", 0.5)]).toEqual([false, false, true]);
  });
});
