import { describe, expect, it } from "vitest";

import { battleSpeed, coreTrait } from "../monster-core-traits";

import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { baseMovement } from "@/lib/utils/battle/grid/path";

describe("battleSpeed", () => {
  it("takes the fastest of walk/fly, else swim, climb, burrow", () => {
    expect(battleSpeed({ walk: 0, fly: 40 })).toBe(40);
    expect(battleSpeed({ walk: 30, fly: 20 })).toBe(30);
    expect(battleSpeed({ walk: 0, swim: 30 })).toBe(30);
    expect(battleSpeed({ climb: 20, burrow: 10 })).toBe(20);
    expect(battleSpeed({})).toBe(0);
  });

  it("a fly-only unit has movement cells in battle", () => {
    const p = makeParticipant({ id: "f" });

    expect(baseMovement({ ...p, combatStats: { ...p.combatStats, speed: battleSpeed({ walk: 0, fly: 30 }) } })).toBe(6);
  });
});

describe("coreTrait", () => {
  it("ignores unrelated traits and regeneration without a number", () => {
    expect(coreTrait("Pack Tactics", "x")).toBeUndefined();
    expect(coreTrait("Regeneration", "heals a lot")).toBeUndefined();
  });
});
