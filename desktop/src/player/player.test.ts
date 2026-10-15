import { describe, expect, it, vi } from "vitest";
import { Player, pixelScale, type Surface } from "./player";
import { parseSheet } from "./sheet";

const sheet = parseSheet({
  frames: [0, 1, 2, 3].map((i) => ({ frame: { x: i * 48, y: 0, w: 48, h: 48 }, duration: 100 })),
  meta: {
    frameTags: [
      { name: "idle", from: 0, to: 1 },
      { name: "shrug", from: 2, to: 3 },
    ],
  },
});

function setup() {
  const calls: string[] = [];
  const draws: number[][] = [];
  const ctx = {
    imageSmoothingEnabled: true,
    setTransform: () => calls.push("setTransform"),
    clearRect: () => calls.push("clearRect"),
    translate: (x: number, y: number) => calls.push(`translate(${x},${y})`),
    scale: (x: number, y: number) => calls.push(`scale(${x},${y})`),
    drawImage: (...args: unknown[]) => {
      calls.push("drawImage");
      draws.push((args.slice(1) as number[]).map(Number));
    },
  };
  const surface: Surface = {
    width: 0,
    height: 0,
    getContext: () => ctx as unknown as CanvasRenderingContext2D,
  };
  let now = 1000;
  const clock = { set: (t: number) => (now = t), fn: () => now };
  const player = new Player(surface, sheet, {} as CanvasImageSource, clock.fn);
  return { player, surface, ctx, calls, draws, clock };
}

describe("pixelScale", () => {
  it("tam sayı cihaz ölçeği verir", () => {
    expect(pixelScale(3, 1)).toBe(3);
    expect(pixelScale(3, 1.5)).toBe(4.5); // FB4-2: yarım piksel
    expect(pixelScale(2, 1.25)).toBe(2.5);
    expect(pixelScale(1, 0.5)).toBe(1);
  });
});

describe("Player", () => {
  it("canvas'ı tam sayı ölçekle boyutlar, CSS boyutunu döner", () => {
    const { player, surface } = setup();
    expect(player.resize(3, 1)).toEqual({ w: 144, h: 144 });
    expect([surface.width, surface.height]).toEqual([144, 144]);
    player.resize(3, 1.5);
    expect(surface.width).toBe(216); // 48 * 4.5 (FB4-2: yarım piksel ölçek)
  });

  it("enjekte saate göre kare seçer ve yumuşatmayı kapatır", () => {
    const { player, ctx, draws, clock } = setup();
    player.resize(3, 1);
    player.setState("idle");
    player.tick();
    expect(draws.at(-1)?.[0]).toBe(0); // kaynak x: kare 0
    expect(ctx.imageSmoothingEnabled).toBe(false);
    clock.set(1150);
    player.tick();
    expect(draws.at(-1)?.[0]).toBe(48); // kare 1
    clock.set(1210);
    player.tick();
    expect(draws.at(-1)?.[0]).toBe(0); // döngü
  });

  it("kare değişmedikçe yeniden çizmez", () => {
    const { player, draws, clock } = setup();
    player.resize(3, 1);
    player.setState("idle");
    player.tick();
    clock.set(1050);
    player.tick();
    expect(draws).toHaveLength(1);
  });

  it("hedef boyutu ölçekle çarpar", () => {
    const { player, draws } = setup();
    player.resize(3, 1);
    player.setState("idle");
    player.tick();
    expect(draws[0]).toEqual([0, 0, 48, 48, 0, 0, 144, 144]);
  });

  it("sola bakınca yatay aynalar", () => {
    const { player, calls } = setup();
    player.resize(3, 1);
    player.setState("idle");
    player.tick();
    expect(calls).not.toContain("scale(-1,1)");
    player.setFacing("left");
    player.tick();
    const i = calls.lastIndexOf("drawImage");
    expect(calls.slice(i - 2, i)).toEqual(["translate(144,0)", "scale(-1,1)"]);
  });

  it("tek seferlik bitince onDone'u bir kez çağırır", () => {
    const { player, clock } = setup();
    const onDone = vi.fn();
    player.resize(3, 1);
    player.setState("shrug", { loop: false, onDone });
    player.tick();
    clock.set(1199);
    player.tick();
    expect(onDone).not.toHaveBeenCalled();
    clock.set(1200);
    player.tick();
    clock.set(1500);
    player.tick();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("aynı durumu tekrar istemek baştan başlatmaz, restart başlatır", () => {
    const { player, draws, clock } = setup();
    player.resize(3, 1);
    player.setState("idle");
    clock.set(1150);
    player.setState("idle");
    player.tick();
    expect(draws.at(-1)?.[0]).toBe(48);
    player.setState("idle", { restart: true });
    player.tick();
    expect(draws.at(-1)?.[0]).toBe(0);
  });

  it("olmayan durumu reddeder", () => {
    expect(() => setup().player.setState("dance")).toThrow(/no tag/);
  });
});
