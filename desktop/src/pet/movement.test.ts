import { describe, expect, it } from "vitest";
import {
  facingFor,
  isDrag,
  MIN_WALK,
  pickNext,
  pickTarget,
  runAwayTarget,
  stepToward,
} from "./movement";
import { EdgePath } from "./path";

const path = new EdgePath(1920, 1040, 144, 144, 96); // sol 0-800, alt 800-2576, sağ 2576-3376
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe("stepToward", () => {
  it("sabit hızla ilerler", () => {
    expect(stepToward(0, 100, 40, 500)).toEqual({ s: 20, arrived: false });
    expect(stepToward(100, 0, 40, 500)).toEqual({ s: 80, arrived: false });
  });
  it("hedefi aşmaz", () => {
    expect(stepToward(95, 100, 40, 500)).toEqual({ s: 100, arrived: true });
  });
});

describe("facingFor", () => {
  it("yol yönüne göre bakar, durunca korur", () => {
    expect(facingFor(1, "left")).toBe("right");
    expect(facingFor(-1, "right")).toBe("left");
    expect(facingFor(0, "left")).toBe("left");
  });
});

describe("tıklama / sürükleme eşiği", () => {
  it("4 px'e kadar tıklama", () => {
    expect(isDrag(0, 0)).toBe(false);
    expect(isDrag(3, 2)).toBe(false); // ~3.6
    expect(isDrag(4, 0)).toBe(false);
  });
  it("eşik üstü sürükleme", () => {
    expect(isDrag(5, 0)).toBe(true);
    expect(isDrag(3, 3)).toBe(true); // ~4.24
  });
});

describe("runAwayTarget", () => {
  const mid = 1600; // alt kenar ortası

  it("alt kenarda imleç soldaysa sağa kaçar", () => {
    expect(runAwayTarget(path, mid, -1, 0)).toBe(mid + 220);
  });
  it("alt kenarda imleç sağdaysa sola kaçar", () => {
    expect(runAwayTarget(path, mid, 1, -1)).toBe(mid - 220);
  });
  it("sol kenarda imleç üstteyse aşağı (s artar) kaçar", () => {
    expect(runAwayTarget(path, 300, 0, -1)).toBe(520);
  });
  it("sağ kenarda imleç üstteyse aşağı (s azalır) kaçar", () => {
    expect(runAwayTarget(path, 3000, 0, -1)).toBe(2780);
  });
  it("imleç tam karşıdaysa geniş tarafa kaçar", () => {
    expect(runAwayTarget(path, 100, 0, 0)).toBe(320);
    expect(runAwayTarget(path, 3300, 0, 0)).toBe(3080);
  });
  it("yolun ucuna sıkışınca öbür yana kaçar", () => {
    // sağ kenarın tepesinde, imleç aşağıda -> yukarı kaçamaz
    expect(runAwayTarget(path, path.length, 0, 1)).toBe(path.length - 220);
  });
});

describe("hedef ve karar seçimi", () => {
  it("hedef en az MIN_WALK uzakta", () => {
    const rng = seq(0.1, 0.5);
    const t = pickTarget(path, 1600, rng);
    expect(Math.abs(t - 1600)).toBeGreaterThanOrEqual(MIN_WALK);
  });
  it("çoğunlukla alt kenarı seçer", () => {
    const t = pickTarget(path, 0, seq(0.1, 0.25));
    expect(path.pointAt(t).edge).toBe("bottom");
  });
  it("rng dağılımına göre eylem seçer", () => {
    expect(pickNext(path, 1600, seq(0.1, 0.1, 0.9)).kind).toBe("walk");
    expect(pickNext(path, 1600, seq(0.6, 0.5)).kind).toBe("idle");
    expect(pickNext(path, 1600, seq(0.7)).kind).toBe("shrug");
    expect(pickNext(path, 1600, seq(0.8, 0.5)).kind).toBe("sleep"); // uyku daha sık (%22)
    expect(pickNext(path, 1600, seq(0.95, 0.5)).kind).toBe("sleep");
  });
  it("dinlenme 8-20 sn", () => {
    expect(pickNext(path, 1600, seq(0.6, 0))).toEqual({ kind: "idle", ms: 8_000 });
    expect(pickNext(path, 1600, seq(0.6, 1))).toEqual({ kind: "idle", ms: 20_000 });
  });
});

