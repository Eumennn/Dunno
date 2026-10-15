import { describe, expect, it } from "vitest";
import type { Facing } from "../player/player";
import { facingForEdge, restStateFor, type ScreenEdge } from "./facing";
import { PET_STATES, type PetState } from "./state";

const EDGES: ScreenEdge[] = ["left", "right", "bottom", "top"];

describe("facingForEdge (UP7)", () => {
  // [durum, kenar, son yön, beklenen]
  const table: [PetState, ScreenEdge, Facing, Facing][] = [
    // peek: duvar ekran kenarında
    ["peek", "left", "right", "left"],
    ["peek", "left", "left", "left"],
    ["peek", "right", "left", "right"],
    ["peek", "right", "right", "right"],
    // sleep: kenara sırtını verir
    ["sleep", "left", "left", "right"],
    ["sleep", "right", "right", "left"],
    ["sleep", "bottom", "left", "left"],
    ["sleep", "bottom", "right", "right"],
    // walk / run_away: hareket yönü
    ["walk", "left", "left", "left"],
    ["walk", "bottom", "right", "right"],
    ["walk", "right", "left", "left"],
    ["run_away", "bottom", "left", "left"],
    ["run_away", "right", "right", "right"],
  ];
  it.each(table)("%s @ %s (son %s) -> %s", (state, edge, last, want) => {
    expect(facingForEdge(state, edge, last)).toBe(want);
  });

  it("simetrik pozlar hiçbir kenarda aynalanmaz", () => {
    for (const state of ["idle", "talk", "shrug", "shh", "dragged", "sulk"] as PetState[]) {
      for (const edge of EDGES) for (const last of ["left", "right"] as Facing[]) expect(facingForEdge(state, edge, last)).toBe("right");
    }
  });

  it("her durum her kenarda bir yön verir", () => {
    for (const state of PET_STATES) for (const edge of EDGES) expect(["left", "right"]).toContain(facingForEdge(state, edge, "right"));
  });
});

describe("restStateFor", () => {
  it("yan kenarda peek, alt ve üstte idle (üstte peek yok)", () => {
    expect(restStateFor("left")).toBe("peek");
    expect(restStateFor("right")).toBe("peek");
    expect(restStateFor("bottom")).toBe("idle");
    expect(restStateFor("top")).toBe("idle");
  });
});
