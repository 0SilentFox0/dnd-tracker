import { describe, expect, it } from "vitest";

import { getCharacterImmunities } from "@/lib/utils/characters/character-race-effects";
import { getUnitImmunities } from "@/lib/utils/races/race-effects";
import type { Unit } from "@/types/units";

describe("race immunities", () => {
  it("only unit.immunities count; race passive text no longer adds immunities", () => {
    const race = { passiveAbility: "Імунітет до вогню", abilities: [] };

    expect(getUnitImmunities({ immunities: ["страху"], race } as unknown as Unit)).toEqual(["страху"]);
    expect(getUnitImmunities({ immunities: [] } as unknown as Unit)).toEqual([]);
  });

  it("character immunities come from the character only", () => {
    expect(getCharacterImmunities({ immunities: ["отруєння"] })).toEqual(["отруєння"]);
    expect(getCharacterImmunities({ immunities: null })).toEqual([]);
  });
});
