// SPEC 14: gizli dünyalar + canavar modu kuralları (saf), temalar, ses, gizlilik.
import eggsSrc from "./eggs.ts?raw";
import assetsSrc from "./assets.ts?raw";
import voiceSrc from "./monster-voice.ts?raw";
import telemetrySrc from "../telemetry.ts?raw";
import { describe, expect, it } from "vitest";
import worlds from "../../../content/eggs/worlds.json";
import { checkThemeUi, contrast, loadThemes } from "../wardrobe/themes";
import { PROFILES, VOICE_CATEGORIES } from "../voice/voice";
import { parseUiAction } from "../ipc-app";
import { checkProfile } from "../mods/mods";
import { MONSTER_PROFILES } from "./monster-voice";
import {
  BURST_WINDOW_MS,
  chooseWorld,
  cleanEggs,
  eggLook,
  eggTrigger,
  initialEggs,
  initialTracker,
  MONSTER_BUBBLE,
  MONSTER_WINDOW_MS,
  notePoke,
  setMonster,
  WORLD_AT,
  type EggState,
} from "./eggs";

/** n dürtme, aralarında gap ms */
function pokes(s: EggState, n: number, start: number, gap: number) {
  let st = s;
  let tr = initialTracker();
  const events: ReturnType<typeof notePoke>[] = [];
  for (let i = 0; i < n; i++) {
    const r = notePoke(st, tr, start + i * gap);
    st = r.state;
    tr = r.tracker;
    events.push(r);
  }
  return { state: st, tracker: tr, events };
}

describe("gizli dünyalar (SPEC 14)", () => {
  it("100. dürtmede kağıt, 1000.'de glitch açılır, birer kez", () => {
    const r = pokes(initialEggs(), 1000, 0, 5_000); // yavaş: sağanak yok
    const opened = r.events.flatMap((e, i) => (e.unlocked ? [[i + 1, e.unlocked]] : []));
    expect(opened).toEqual([
      [WORLD_AT.paper, "paper"],
      [WORLD_AT.glitch, "glitch"],
    ]);
    expect(r.state.worlds).toEqual(["paper", "glitch"]);
    // açılmak seçmek değil: dünya normal kalır (zorlama yok)
    expect(r.state.world).toBe("normal");
    expect(r.state.monster).toBe(false);
  });

  it("açılmamış dünya seçilemez; canavar bulunmadan açılamaz", () => {
    const s = initialEggs();
    expect(chooseWorld(s, "glitch").world).toBe("normal");
    expect(chooseWorld({ ...s, worlds: ["paper"] }, "paper").world).toBe("paper");
    expect(setMonster(s, true).monster).toBe(false);
    expect(setMonster({ ...s, monsterFound: true }, true).monster).toBe(true);
  });

  it("kayıt onarımı: stats.txt toplamından geri kalmaz, eşiği geçen dünya açılır, bozuk değerler sıfırlanır", () => {
    expect(cleanEggs(undefined, 137)).toEqual({ pokes: 137, worlds: ["paper"], world: "normal", monster: false, monsterFound: false });
    expect(cleanEggs({ pokes: -5, worlds: ["x"], world: "glitch", monster: true }).world).toBe("normal");
    expect(cleanEggs({ pokes: 5, worlds: ["x"], world: "glitch", monster: true }).monster).toBe(false);
    expect(cleanEggs({ pokes: 2000, world: "glitch", monster: true, monsterFound: true })).toEqual({
      pokes: 2000,
      worlds: ["paper", "glitch"],
      world: "glitch",
      monster: true,
      monsterFound: true,
    });
  });
});

describe("canavar modu (SPEC 14)", () => {
  it("20 sn içinde 3 dürtme sağanağı (4 dürtme / 2 sn) açar, aynısı kapatır", () => {
    // her sağanak 4 hızlı dürtme, sağanaklar arası 3 sn
    let s = initialEggs();
    let tr = initialTracker();
    const burst = (at: number) => {
      for (let i = 0; i < 4; i++) {
        const r = notePoke(s, tr, at + i * 150);
        s = r.state;
        tr = r.tracker;
        if (r.monsterToggled) return true;
      }
      return false;
    };
    expect([burst(0), burst(3_000), burst(6_000)]).toEqual([false, false, true]);
    expect(s.monster).toBe(true);
    expect(s.monsterFound).toBe(true);
    expect([burst(30_000), burst(33_000), burst(36_000)]).toEqual([false, false, true]);
    expect(s.monster).toBe(false);
    expect(s.monsterFound).toBe(true);
  });

  it("yavaş dürtme ya da aralıklı sağanaklar açmaz", () => {
    expect(pokes(initialEggs(), 60, 0, BURST_WINDOW_MS / 3).events.some((e) => e.monsterToggled)).toBe(true); // sürekli hızlı = sağanaklar
    expect(pokes(initialEggs(), 60, 0, BURST_WINDOW_MS).events.some((e) => e.monsterToggled)).toBe(false);
    // üç sağanak ama 20 sn'ye sığmıyor
    let s = initialEggs();
    let tr = initialTracker();
    let toggled = false;
    for (const at of [0, MONSTER_WINDOW_MS / 2 + 1, MONSTER_WINDOW_MS + 2]) {
      for (let i = 0; i < 4; i++) {
        const r = notePoke(s, tr, at + i * 100);
        s = r.state;
        tr = r.tracker;
        toggled ||= r.monsterToggled;
      }
    }
    expect(toggled).toBe(false);
  });

  it("görünüm önceliği canavar > dünya > dolap; gizli havuz payı", () => {
    const s = { ...initialEggs(), worlds: ["paper", "glitch"] as EggState["worlds"], monsterFound: true };
    expect(eggLook(s)).toEqual({ theme: null, costume: null });
    expect(eggTrigger(s)).toBeNull();
    expect(eggLook({ ...s, world: "paper" })).toEqual({ theme: "egg_paper", costume: null });
    expect(eggTrigger({ ...s, world: "glitch" })).toEqual({ trigger: "egg:glitch", share: 0.4 });
    expect(eggLook({ ...s, world: "paper", monster: true })).toEqual({ theme: "egg_monster", costume: "egg_monster" });
    expect(eggTrigger({ ...s, world: "paper", monster: true })?.trigger).toBe("egg:monster");
  });

  it("canavar sesi: aynı kategoriler, daha kalın, testere; mod sınırları içinde", () => {
    for (const c of VOICE_CATEGORIES) {
      expect(MONSTER_PROFILES[c].base[1]).toBeLessThan(PROFILES[c].base[0] + 1);
      expect(MONSTER_PROFILES[c].wave).toBe("sawtooth");
      expect(checkProfile(MONSTER_PROFILES[c])).toEqual([]);
    }
  });

  it("canavar balonu okunur (kontrast >= 4.5), ana paletten", () => {
    expect(contrast(MONSTER_BUBBLE.fill, MONSTER_BUBBLE.ink)).toBeGreaterThan(4.5);
    expect([MONSTER_BUBBLE.fill, MONSTER_BUBBLE.ink]).toEqual(["#2B1E2F", "#FFF1D6"]);
  });
});

describe("gizli temalar + ipc + gizlilik (SPEC 14)", () => {
  it("dünya ve canavar temaları geçerli, UI kontrastı geçer, id'ler egg_ önekli", () => {
    const r = loadThemes(worlds);
    expect(r.errors).toEqual([]);
    expect(r.file!.themes.map((t) => t.id)).toEqual(["egg_paper", "egg_glitch", "egg_monster"]);
    for (const t of r.file!.themes) expect(checkThemeUi(t)).toEqual([]);
  });

  it("ipc: dünya + canavar", () => {
    expect(parseUiAction({ action: "egg_world", value: "paper" })).toEqual({ action: "egg_world", value: "paper" });
    expect(parseUiAction({ action: "egg_world", value: "moon" })).toBeNull();
    expect(parseUiAction({ action: "monster", value: true })).toEqual({ action: "monster", value: true });
    expect(parseUiAction({ action: "monster", value: 1 })).toBeNull();
    // SPEC 15
    expect(parseUiAction({ action: "personality", value: "calm" })).toEqual({ action: "personality", value: "calm" });
    expect(parseUiAction({ action: "personality", value: "angry" })).toBeNull();
    expect(parseUiAction({ action: "bubble_style", value: "ink" })).toEqual({ action: "bubble_style", value: "ink" });
    expect(parseUiAction({ action: "voice_style", value: "robot" })).toEqual({ action: "voice_style", value: "robot" });
    expect(parseUiAction({ action: "preset", id: "buzz" })).toEqual({ action: "preset", id: "buzz" });
    expect(parseUiAction({ action: "preset", id: "nope" })).toBeNull();
    expect(parseUiAction({ action: "license_changed", key: "DUNNO1.x.y" })).toEqual({ action: "license_changed" });
    expect(parseUiAction({ action: "test", op: "pro", on: true })).toEqual({ action: "test", op: "pro", on: true });
  });

  it("gizli veri toplama yok: eggs modülleri ağ/IPC/telemetri kullanmaz", () => {
    for (const [f, src] of [["eggs.ts", eggsSrc], ["assets.ts", assetsSrc], ["monster-voice.ts", voiceSrc]]) {
      expect(src, f).not.toMatch(/fetch\(|XMLHttpRequest|invoke\(|telemetry|navigator\.sendBeacon|WebSocket/);
    }
    expect(telemetrySrc).not.toMatch(/egg|monster|world/i);
  });
});
