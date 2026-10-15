import { describe, expect, it } from "vitest";
import { ARC_MAX, bounceAt, BOUNCE_MS, chuteAt, chuteOpen, dropKind, flightAt, flightMs, planChute, planFlight, smoothstep, towardEdge } from "./flight";

const bounds = { maxX: 1856, maxY: 976 };

describe("smoothstep / süre (SPEC 10 CL2)", () => {
  it("3t² − 2t³, uçlar sabit, monoton", () => {
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(1)).toBe(1);
    expect(smoothstep(0.5)).toBe(0.5);
    expect(smoothstep(-1)).toBe(0);
    let prev = 0;
    for (let t = 0; t <= 1; t += 0.01) {
      expect(smoothstep(t)).toBeGreaterThanOrEqual(prev);
      prev = smoothstep(t);
    }
  });
  it("600-900 ms", () => {
    expect(flightMs(0)).toBe(600);
    expect(flightMs(400)).toBe(700);
    expect(flightMs(5_000)).toBe(900);
  });
});

describe("planFlight / flightAt", () => {
  it("baştan başlar, tam hedefte biter, tam sayı piksel", () => {
    const f = planFlight({ x: 1800, y: 976 }, { x: 928, y: 976 }, bounds);
    expect(flightAt(f, 0)).toEqual({ x: 1800, y: 976 });
    expect(flightAt(f, 1)).toEqual({ x: 928, y: 976 });
    for (let t = 0; t <= 1; t += 0.05) {
      const p = flightAt(f, t);
      expect(Number.isInteger(p.x) && Number.isInteger(p.y)).toBe(true);
    }
  });

  it("yay yukarı kalkar (aynı yükseklikte iki nokta arasında ortası daha yukarıda)", () => {
    const f = planFlight({ x: 1800, y: 976 }, { x: 928, y: 976 }, bounds);
    // ikinci dereceden bezier: tepe, kontrol noktası yüksekliğinin yarısı (180 px kontrol -> ~90 px yay)
    expect(flightAt(f, 0.5).y).toBeLessThan(976 - 80);
    expect(976 - f.ctrl.y).toBeLessThanOrEqual(ARC_MAX);
  });

  it("çalışma alanından taşmaz (köşeden köşeye, sol kenardan alta, kısa mesafe)", () => {
    const cases = [
      [{ x: 0, y: 0 }, { x: 1856, y: 976 }],
      [{ x: 0, y: 40 }, { x: 0, y: 900 }],
      [{ x: 1856, y: 500 }, { x: 1856, y: 520 }],
      [{ x: 10, y: 976 }, { x: 0, y: 488 }],
    ] as const;
    for (const [a, b] of cases) {
      const f = planFlight(a, b, bounds);
      for (let t = 0; t <= 1; t += 0.02) {
        const p = flightAt(f, t);
        expect(p.x >= 0 && p.x <= bounds.maxX && p.y >= 0 && p.y <= bounds.maxY, JSON.stringify([a, b, t, p])).toBe(true);
      }
    }
  });

  it("negatif koordinatlı alan (sol monitör) için minY ve 0..maxX göreli kalır", () => {
    const f = planFlight({ x: 5, y: 300 }, { x: 5, y: 600 }, { maxX: 100, minY: 200, maxY: 700 });
    expect(f.ctrl.y).toBeGreaterThanOrEqual(200);
  });
});

describe("iniş yaylanması", () => {
  it("1-2 kare, tam sayı, sonra 0", () => {
    expect(bounceAt(0)).toBe(-2);
    expect(bounceAt(90)).toBe(-1);
    expect(bounceAt(BOUNCE_MS)).toBe(0);
    expect(bounceAt(-5)).toBe(0);
  });
  it("FB5: yaylanma kenarı hiç geçmez (görev çubuğunun altına / ekran dışına inmez)", () => {
    for (let ms = 0; ms <= BOUNCE_MS + 10; ms += 5) expect(bounceAt(ms)).toBeLessThanOrEqual(0);
  });
  it("kenara doğru yön", () => {
    expect(towardEdge("bottom")).toEqual({ x: 0, y: 1 });
    expect(towardEdge("left")).toEqual({ x: -1, y: 0 });
    expect(towardEdge("right")).toEqual({ x: 1, y: 0 });
  });
});

describe("paraşütlü iniş (Plan v2 CL2 ek)", () => {
  it("havada ve duvardan uzak bırakılınca paraşüt, kenarda/altta yay", () => {
    expect(dropKind({ x: 900, y: 300 }, bounds)).toBe("chute");
    expect(dropKind({ x: 20, y: 300 }, bounds)).toBe("arc");
    expect(dropKind({ x: 1840, y: 300 }, bounds)).toBe("arc");
    expect(dropKind({ x: 900, y: 960 }, bounds)).toBe("arc");
  });

  it("yavaş: yay uçuşundan uzun (1.1-3.4 sn), hedef dikey olarak alt kenar", () => {
    const c = planChute({ x: 900, y: 200 }, bounds);
    expect(c.to).toEqual({ x: 900, y: 976 });
    expect(c.ms).toBeGreaterThan(flightMs(776));
    expect(c.ms).toBeLessThanOrEqual(3_400);
    expect(planChute({ x: 900, y: 900 }, bounds).ms).toBe(1_100);
  });

  it("tam piksel, hep aşağı, alan içinde, salınım sönüp tam hedefe iner; paraşüt düşüşten sonra açılır", () => {
    const c = planChute({ x: 3, y: 100 }, bounds);
    let prevY = -1;
    for (let t = 0; t <= 1; t += 0.01) {
      const p = chuteAt(c, t, bounds);
      expect(Number.isInteger(p.x) && Number.isInteger(p.y)).toBe(true);
      expect(p.y).toBeGreaterThanOrEqual(prevY);
      expect(p.x >= 0 && p.x <= bounds.maxX && p.y <= bounds.maxY).toBe(true);
      prevY = p.y;
    }
    expect(chuteAt(c, 1, bounds)).toEqual(c.to);
    expect(Math.abs(chuteAt(c, 0.99, bounds).x - c.to.x)).toBeLessThanOrEqual(1);
    expect(chuteOpen(0.05)).toBe(false);
    expect(chuteOpen(0.5)).toBe(true);
    expect(chuteOpen(1)).toBe(false);
  });
});
