import { describe, expect, it } from "vitest";
import type { Player } from "../player/player";
import { MOVE_INTERVAL_MS, PetController } from "./controller";

const fakePlayer = { setState: () => {}, setFacing: () => {} } as unknown as Player;
const geo = { workArea: { width: 1920, height: 1040, scale: 1 }, boxW: 64, boxH: 64, offsetX: 88, offsetY: 156 };

function run(opts: { frozen?: boolean; seconds: number; rng?: () => number }) {
  let now = 0;
  const moves: [number, number, number][] = [];
  const pet = new PetController({
    player: fakePlayer,
    moveWindow: (x, y) => moves.push([now, x, y]),
    setCapture: () => {},
    onClick: () => {},
    clock: () => now,
    rng: opts.rng ?? (() => 0.1), // hep yürü (walk), hedef alt kenarda
    frozen: opts.frozen,
  });
  pet.setGeometry(geo);
  moves.length = 0; // açılış konumu hariç
  for (; now < opts.seconds * 1000; now += 16) pet.tick(); // ~60 fps rAF
  return moves;
}

describe("pencere taşıma hızı (TASK-BUG-CARET)", () => {
  it("yürürken saniyede en fazla ~12.5 SetWindowPos", () => {
    const moves = run({ seconds: 60 });
    expect(moves.length).toBeGreaterThan(0);
    const perSecond = moves.length / 60;
    expect(perSecond).toBeLessThanOrEqual(1000 / MOVE_INTERVAL_MS);
    for (let i = 1; i < moves.length; i++) {
      expect(moves[i][0] - moves[i - 1][0]).toBeGreaterThanOrEqual(MOVE_INTERVAL_MS);
    }
  });

  it("her taşıma en az 1 px değişim", () => {
    const moves = run({ seconds: 60 });
    for (let i = 1; i < moves.length; i++) {
      const [, x0, y0] = moves[i - 1];
      const [, x1, y1] = moves[i];
      expect(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))).toBeGreaterThanOrEqual(1);
    }
  });

  it("yürüme hızında (18 px/s) taşıma sıklığı ~18/s'nin altında kalır", () => {
    const moves = run({ seconds: 60 });
    expect(moves.length / 60).toBeLessThanOrEqual(12.5);
  });

  it("frozen (DUNNO_FREEZE_MOVEMENT): kendiliğinden hiç taşınmaz", () => {
    expect(run({ frozen: true, seconds: 120 })).toEqual([]);
  });
});

describe("kenarda duruş yönü (UP7)", () => {
  function dropAt(screenDx: number, peeks?: { n: number }) {
    let now = 0;
    const seen: { state: string; facing: string } = { state: "", facing: "right" };
    const player = {
      setState: (s: string) => (seen.state = s),
      setFacing: (f: string) => (seen.facing = f),
    } as unknown as Player;
    const pet = new PetController({
      player,
      moveWindow: () => {},
      setCapture: () => {},
      onClick: () => {},
      clock: () => now,
      rng: () => 0.99, // dinlenmeden sonra uyku: test süresince yürümez
      onPeek: () => peeks && peeks.n++,
    });
    pet.setGeometry(geo);
    // sağ alt köşeden sürükle, kenara bırak
    pet.pointerDown(0, 0);
    pet.pointerMove(screenDx, -400);
    pet.pointerUp();
    for (; now < 1_000; now += 16) pet.tick();
    return seen;
  }

  it("sol kenara bırakılınca peek + ayna (duvar ekranın solunda)", () => {
    expect(dropAt(-1_900)).toEqual({ state: "peek", facing: "left" });
  });

  it("sağ kenara bırakılınca peek, ayna yok (duvar sağda)", () => {
    expect(dropAt(0)).toEqual({ state: "peek", facing: "right" });
  });

  it("peek başlangıcı bir kez bildirilir (SPEC 09 K9 edge başarımı)", () => {
    const peeks = { n: 0 };
    dropAt(0, peeks);
    expect(peeks.n).toBe(1);
  });
});

describe("test modu kenara gönder (SPEC 07 FB2)", () => {
  function pinned() {
    let now = 0;
    const seen = { state: "", facing: "" };
    const moves: [number, number][] = [];
    const player = {
      setState: (s: string) => (seen.state = s),
      setFacing: (f: string) => (seen.facing = f),
    } as unknown as Player;
    const pet = new PetController({
      player,
      moveWindow: (x, y) => moves.push([x, y]),
      setCapture: () => {},
      onClick: () => {},
      clock: () => now,
      rng: () => 0.1,
    });
    pet.setGeometry(geo);
    const tickFor = (ms: number) => {
      for (const end = now + ms; now < end; now += 16) pet.tick();
    };
    return { pet, seen, moves, tickFor };
  }

  it("pinAt: üst kenar (yol dışı) konumunda, verilen poz ve yönle kalır", () => {
    const { pet, seen, tickFor } = pinned();
    pet.pinAt(900, 0, "peek", "left");
    tickFor(30_000);
    expect(pet.petBox()).toMatchObject({ x: 900, y: 0 });
    expect(seen).toEqual({ state: "peek", facing: "left" });
    pet.pose("talk"); // dışarıdan poz pin'i bozmaz
    pet.react("shrug");
    expect(seen.state).toBe("peek");
  });

  it("unpin: yola oturur ve normal davranışa döner", () => {
    const { pet, tickFor } = pinned();
    pet.pinAt(900, 0, "peek", "left");
    pet.unpin();
    tickFor(2_000);
    expect(pet.petBox().y).toBeGreaterThan(0);
  });
});

describe("pet boyutu yürüme hızı (SPEC 08)", () => {
  function walked(factor: number) {
    let now = 0;
    const moves: [number, number][] = [];
    const pet = new PetController({
      player: fakePlayer,
      moveWindow: (x, y) => moves.push([x, y]),
      setCapture: () => {},
      onClick: () => {},
      clock: () => now,
      rng: () => 0.1,
    });
    pet.setGeometry(geo);
    pet.setSpeedFactor(factor);
    // açılıştaki 3 sn dinlenmeden sonra yürür (rng 0.1): hız sabit, mesafe süreyle orantılı
    for (; now < 3_016; now += 16) pet.tick();
    const start = pet.petBox().x;
    for (; now < 4_016; now += 16) pet.tick();
    return Math.abs(pet.petBox().x - start);
  }

  it("çarpan 2 iken aynı sürede iki kat yol", () => {
    const one = walked(1);
    const two = walked(2);
    expect(one).toBeGreaterThan(0);
    expect(two / one).toBeCloseTo(2, 1);
  });
});

describe("yay uçuşu (SPEC 10 CL2)", () => {
  function flyRun(act: (pet: PetController) => void) {
    let now = 0;
    const moves: [number, number, number][] = [];
    const states: string[] = [];
    const player = { setState: (st: string) => states.push(st), setFacing: () => {} } as unknown as Player;
    const pet = new PetController({
      player,
      moveWindow: (x, y) => moves.push([now, x, y]),
      setCapture: () => {},
      onClick: () => {},
      clock: () => now,
      rng: () => 0.99,
    });
    pet.setGeometry(geo);
    moves.length = 0;
    states.length = 0;
    act(pet);
    const started = now;
    let landed = -1;
    for (; now < 3_000; now += 16) {
      pet.tick();
      if (landed < 0 && !pet.flying) landed = now - started;
    }
    return { moves, states, landed, pet };
  }

  it("çağır: 600-900 ms'de alt kenarın ortasına, yol yukarı kavisli, uçarken dragged, inişte yaylanıp oturur", () => {
    const r = flyRun((pet) => pet.summon());
    expect(r.landed).toBeGreaterThanOrEqual(600);
    expect(r.landed).toBeLessThanOrEqual(900 + 16);
    expect(r.states[0]).toBe("dragged");
    const ys = r.moves.map(([, , y]) => y);
    const restY = ys[ys.length - 1];
    expect(Math.min(...ys)).toBeLessThan(restY - 40); // yay
    // uçuşta 80 ms sınırı yok: akıcı (en az ~30 konum)
    expect(r.moves.filter(([t]) => t <= r.landed).length).toBeGreaterThan(30);
    // yaylanma (FB5): inişten sonra 2 px yukarı (ölçek 1), sonra 1 px, sonra yerinde; görev çubuğuna hiç inmez
    const after = r.moves.filter(([t]) => t > r.landed).map(([, , y]) => y);
    expect(after).toContain(restY - 2);
    expect(after).toContain(restY - 1);
    expect(Math.max(...after)).toBe(restY);
    expect(r.pet.petBox().x).toBe((geo.workArea.width - geo.boxW) / 2);
  });

  it("kenara gönder: yan kenara uçar, peek ile iner", () => {
    const r = flyRun((pet) => pet.sendToEdge());
    expect(r.states).toContain("peek");
    expect(r.pet.edge()).toBe("right");
  });

  it("sürükle-bırak sonrası en yakın yol noktasına uçarak oturur", () => {
    const r = flyRun((pet) => {
      // duvar dibinde bırak (havada ortada bırakılınca paraşüt: ayrı test)
      pet.pointerDown(0, 0);
      pet.pointerMove(-1_850, -500);
      pet.pointerUp();
    });
    expect(r.landed).toBeGreaterThanOrEqual(600);
    expect(r.pet.flying).toBe(false);
  });
});

describe("karşılama uçuşları (SPEC 10 CL4)", () => {
  function setup() {
    let now = 0;
    const states: string[] = [];
    const player = { setState: (st: string) => states.push(st), setFacing: () => {} } as unknown as Player;
    const pet = new PetController({ player, moveWindow: () => {}, setCapture: () => {}, onClick: () => {}, clock: () => now, rng: () => 0.99 });
    pet.setGeometry(geo);
    const run = (ms: number) => {
      const end = now + ms;
      for (; now < end; now += 16) pet.tick();
    };
    return { pet, states, run };
  }

  it("ortaya uçar ve verilen pozda bekler; köşeye uçup uyur", async () => {
    const { pet, states, run } = setup();
    let landed = false;
    void pet.flyToPoint(900, 400, "talk").then(() => (landed = true));
    run(1_000);
    await Promise.resolve();
    expect(landed).toBe(true);
    expect(pet.petBox()).toMatchObject({ x: 900, y: 400 });
    expect(states.at(-1)).toBe("talk");
    let home = false;
    void pet.flyHomeAndSleep(pet.welcomeArea()!.bottomStart, 10_000).then(() => (home = true));
    run(1_000);
    await Promise.resolve();
    expect(home).toBe(true);
    expect(states.at(-1)).toBe("sleep");
    expect(pet.petBox().x).toBe(0);
  });

  it("FB5: köşeye uçarken balon kapanıp relayout olsa da (setGeometry) inişte ortaya ışınlanmaz", async () => {
    const { pet, run } = setup();
    void pet.flyToPoint(900, 400, "talk");
    run(1_000);
    await Promise.resolve();
    const a = pet.welcomeArea()!;
    void pet.flyHomeAndSleep(a.bottomEnd, 10_000);
    run(200); // havada, ortaya yakın
    pet.setGeometry(geo); // balon kapandı -> restore -> relayout
    run(1_000);
    expect(pet.petBox()).toMatchObject({ x: a.xMax, y: a.yMax });
    run(3_000); // uyurken de köşede kalır
    expect(pet.petBox()).toMatchObject({ x: a.xMax, y: a.yMax });
  });

  it("karşılama uçuşunda yakalanırsa bekleyen çözülür (takılmaz)", async () => {
    const { pet, run } = setup();
    let landed = false;
    void pet.flyToPoint(900, 400, "talk").then(() => (landed = true));
    run(100);
    pet.pointerDown(0, 0);
    pet.pointerMove(30, 30);
    await Promise.resolve();
    expect(landed).toBe(true);
    pet.pointerUp();
  });
});

describe("FB5: balon açıkken hareket", () => {
  it("windowAt verilirse pencere ona göre taşınır, inişte onSettle çağrılır", () => {
    let now = 0;
    const moves: [number, number][] = [];
    let settled = 0;
    const pet = new PetController({
      player: fakePlayer,
      moveWindow: (x, y) => moves.push([x, y]),
      setCapture: () => {},
      onClick: () => {},
      clock: () => now,
      rng: () => 0.99,
      windowAt: (b) => ({ x: b.x - 10, y: b.y - 300 }),
      onSettle: () => settled++,
    });
    pet.setGeometry(geo);
    pet.summon();
    for (; now < 2_000; now += 16) pet.tick();
    const b = pet.petBox();
    expect(moves.at(-1)).toEqual([b.x - 10, b.y - 300]);
    expect(settled).toBe(1);
  });
});

describe("çoklu monitör sürükleme (SPEC 10 CL5)", () => {
  it("sürüklerken monitör değişince pet imlecin altına geçer, sürükleme yeni alanda sürer, bırakınca o alanda oturur", () => {
    let now = 0;
    const moves: [number, number][] = [];
    const pet = new PetController({
      player: fakePlayer,
      moveWindow: (x, y) => moves.push([x, y]),
      setCapture: () => {},
      onClick: () => {},
      clock: () => now,
      rng: () => 0.99,
    });
    pet.setGeometry(geo);
    pet.pointerDown(5_000, 500);
    pet.pointerMove(5_100, 500); // sürükleme başladı (sağ monitöre doğru)
    // Rust: imleç sağdaki %150 monitöre geçti -> yeni alan (1706x920 mantıksal), imleç (40, 300)
    const right = { workArea: { width: 1706, height: 920, scale: 1.5 }, boxW: 64, boxH: 64, offsetX: 88, offsetY: 156 };
    pet.setGeometry(right);
    pet.dragOnto(40, 300);
    expect(pet.petBox()).toMatchObject({ x: 8, y: 268 });
    // monitörler arası ekran koordinatı sıçraması (ör. 5100 -> 7000) pet'i fırlatmaz: ilk hareket yeni başlangıç
    pet.pointerMove(7_000, 900);
    expect(pet.petBox()).toMatchObject({ x: 8, y: 268 });
    pet.pointerMove(7_020, 900);
    expect(pet.petBox()).toMatchObject({ x: 28, y: 268 });
    pet.pointerUp();
    for (; now < 2_000; now += 16) pet.tick();
    expect(pet.edge()).toBe("left"); // yeni alanın sol kenarına oturdu
    expect(pet.petBox().x).toBe(0);
  });

  it("monitör çıkarılınca (alan değişir) pet yeni alanın yoluna oturur", () => {
    const pet = new PetController({ player: fakePlayer, moveWindow: () => {}, setCapture: () => {}, onClick: () => {}, clock: () => 0, rng: () => 0.99 });
    pet.setGeometry({ ...geo, workArea: { width: 2560, height: 1400, scale: 1 } });
    pet.setGeometry(geo);
    const b = pet.petBox();
    expect(b.x).toBeLessThanOrEqual(geo.workArea.width - geo.boxW);
    expect(b.y).toBeLessThanOrEqual(geo.workArea.height - geo.boxH);
  });
});

describe("paraşütlü iniş (Plan v2 CL2 ek)", () => {
  function drop(dx: number, dy: number) {
    let now = 0;
    const moves: [number, number, number][] = [];
    const chute: [number, boolean][] = [];
    const pet = new PetController({
      player: fakePlayer,
      moveWindow: (x, y) => moves.push([now, x, y]),
      setCapture: () => {},
      onClick: () => {},
      onChute: (open) => chute.push([now, open]),
      clock: () => now,
      rng: () => 0.99,
    });
    pet.setGeometry(geo);
    pet.pointerDown(0, 0);
    pet.pointerMove(dx, dy);
    pet.pointerUp();
    const t0 = now;
    let landed = -1;
    for (; now < 6_000; now += 16) {
      pet.tick();
      if (landed < 0 && !pet.flying) landed = now - t0;
    }
    return { pet, moves, chute, landed };
  }

  it("ekran ortasında bırakılınca paraşüt açılır, yay uçuşundan yavaş iner, altta oturur, paraşüt kapanır", () => {
    const r = drop(-900, -600);
    expect(r.landed).toBeGreaterThan(1_100);
    expect(r.chute.map(([, o]) => o)).toEqual([true, false]);
    expect(r.pet.edge()).toBe("bottom");
    // süzülürken taşıma ~30 Hz (sürekli değil)
    const during = r.moves.filter(([t]) => t > 0 && t < r.landed);
    expect(during.length).toBeGreaterThan(30);
    for (let i = 1; i < during.length; i++) expect(during[i][0] - during[i - 1][0]).toBeGreaterThanOrEqual(32);
  });

  it("duvar dibinde bırakılınca paraşüt yok (yay)", () => {
    const r = drop(-1_850, -400);
    expect(r.chute).toEqual([]);
    expect(r.pet.edge()).toBe("left");
  });
});

describe("geri geri yürüyüş (SPEC 14 glitch dünyası)", () => {
  function walkFacings(moonwalk: boolean) {
    let now = 0;
    let state = "";
    const out: { shown: string; dx: number }[] = [];
    let facing = "right";
    const player = { setState: (s: string) => (state = s), setFacing: (f: string) => (facing = f) } as unknown as Player;
    let lastX: number | null = null;
    const pet = new PetController({
      player,
      moveWindow: (x) => {
        if (state === "walk" && lastX !== null && x !== lastX) out.push({ shown: facing, dx: x - lastX });
        lastX = x;
      },
      setCapture: () => {},
      onClick: () => {},
      clock: () => now,
      rng: () => 0.1,
      moonwalk: () => moonwalk,
    });
    pet.setGeometry(geo);
    for (; now < 60_000; now += 16) pet.tick();
    return out;
  }
  const facesMotion = (o: { shown: string; dx: number }) => (o.dx > 0 ? o.shown === "right" : o.shown === "left");

  it("normalde yüzü yürüdüğü yöne; glitch'te ters", () => {
    const normal = walkFacings(false);
    const moon = walkFacings(true);
    expect(normal.length).toBeGreaterThan(5);
    expect(moon.length).toBeGreaterThan(5);
    expect(normal.every(facesMotion)).toBe(true);
    expect(moon.every((o) => !facesMotion(o))).toBe(true);
  });
});

describe("SPEC 17 eğlenceli animasyonlar", () => {
  function make() {
    let now = 0;
    const states: string[] = [];
    const anims: string[] = [];
    const moves: [number, number][] = [];
    const player = {
      setState: (st: string, o?: { onDone?: () => void }) => {
        states.push(st);
        // tek seferlik: hemen bitir (oynatıcı sahte)
        if (o?.onDone) setTimeout(o.onDone, 0);
      },
      setFacing: () => {},
    } as unknown as Player;
    const pet = new PetController({
      player,
      moveWindow: (x, y) => moves.push([x, y]),
      setCapture: () => {},
      onClick: () => {},
      clock: () => now,
      rng: () => 0.99,
      onAnim: (a) => anims.push(a),
    });
    pet.setGeometry(geo);
    const run = (ms: number) => {
      const end = now + ms;
      for (; now < end; now += 16) pet.tick();
    };
    return { pet, states, anims, moves, run };
  }

  it("konuşurken (tutulu) tepki bekler, bırakınca oynar; ses efekti tetiklenir", () => {
    const { pet, states, anims, run } = make();
    pet.hold("talk", true);
    pet.queueReact("dance");
    run(200);
    expect(states).not.toContain("dance");
    pet.hold("talk", false);
    run(100);
    expect(states).toContain("dance");
    expect(anims).toContain("dance");
  });

  it("zıplama pencereyi alt kenarda yukarı kaldırır, sonra yerine indirir", () => {
    const { pet, moves, run } = make();
    run(50);
    const baseY = moves.at(-1)![1];
    pet.queueReact("jump");
    run(400);
    expect(Math.min(...moves.map(([, y]) => y))).toBeLessThan(baseY - 5);
    run(800);
    expect(moves.at(-1)![1]).toBe(baseY);
  });
});
