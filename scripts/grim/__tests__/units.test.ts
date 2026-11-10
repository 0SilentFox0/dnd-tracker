import { describe, expect, it } from "vitest";

import { rebuildTrait, unitIssues, unitWounds } from "../units";

import { DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems";
import { BREATH_DEFAULT_RANGE_FT, RANGED_DEFAULT_RANGE_FT } from "@/lib/utils/rules/systems/wfrp/traits/constants";

const all40 = { ...DEFAULT_CHARACTERISTICS.base, ws: 40, bs: 40, s: 40, t: 40, i: 40, ag: 40, dex: 40, int: 40, wp: 40, fel: 40 };

describe("unitWounds", () => {
  it("applies size, swarm and hardy", () => {
    expect(unitWounds(all40, { size: "average", notes: new Set() })).toBe(16);
    expect(unitWounds(all40, { size: "large", notes: new Set(["hardy"]) })).toBe(36);
    expect(unitWounds({ ...all40, t: 20 }, { size: "little", notes: new Set(["swarm"]) })).toBe(10);
    expect(unitWounds(all40, { size: "tiny", notes: new Set() })).toBe(1);
    expect(unitWounds(all40, { size: "small", notes: new Set() })).toBe(12);
    expect(unitWounds(all40, { size: "monstrous", notes: new Set() })).toBe(128);
  });
});

describe("rebuildTrait", () => {
  it("returns the recipe output for a known id and null otherwise", () => {
    expect(rebuildTrait({ id: "ward", name: "Ward 9+", effects: [{ kind: "wfrpWard", value: 9 }] })).toEqual({ id: "ward", name: "Ward 9+", trigger: { event: "passive" }, effects: [{ kind: "wfrpWard", value: 9 }] });

    const sling = { id: "ranged", name: "Sling +3", effects: [{ kind: "wfrpAttack", attack: "ranged", damage: 3, rangeFt: 120 }] };

    expect(rebuildTrait(sling)).toEqual({ ...sling, trigger: { event: "passive" } });
    expect(rebuildTrait({ id: "terror", name: "Terror 1", effects: [] })).toBeNull();
  });

  it.each([["breath", BREATH_DEFAULT_RANGE_FT], ["ranged", RANGED_DEFAULT_RANGE_FT]])("defaults a missing %s range to the recipe default", (id, rangeFt) => {
    const trait = rebuildTrait({ id, name: "Attack +5", effects: [{ kind: "wfrpAttack", attack: id, damage: 5 }] }) as { effects: Array<{ rangeFt: number }> };

    expect(trait.effects[0].rangeFt).toBe(rangeFt);
  });
});

describe("unitIssues", () => {
  it("is empty for a valid row", () => {
    const row = { name: "Ash Hound", level: 2, maxHp: 11, speed: 42, initiative: 40, gridSize: 1, statblock: { creatureType: "Beasts" }, characteristics: { base: { ws: 38, bs: 5, s: 30, t: 30, i: 40, ag: 40, dex: 5, int: 12, wp: 25, fel: 5 }, move: 7 }, abilities: [{ id: "bite", name: "Bite +4", trigger: { event: "passive" }, effects: [{ kind: "wfrpAttack", attack: "bite", damage: 4 }] }] };

    expect(unitIssues(row)).toEqual([]);
  });

  it("rejects an unknown key inside characteristics.base", () => {
    const row = { name: "Ash Hound", level: 2, maxHp: 11, speed: 42, initiative: 40, gridSize: 1, statblock: { creatureType: "Beasts" }, characteristics: { base: { ws: 38, bs: 5, s: 30, t: 30, i: 40, ag: 40, dex: 5, int: 12, wp: 25, fel: 5, corruption: 3 }, move: 7 }, abilities: [] };

    expect(unitIssues(row)).toContain("characteristics.base has unknown keys (corruption)");
  });
});
