import { describe, expect, it } from "vitest";

import { RACES } from "@/data/library/races";
import { getCharacterImmunities } from "@/lib/utils/characters/character-race-effects";
import { extractRaceImmunities } from "@/lib/utils/races/race-effects";
import { racePassiveData } from "@/scripts/seed-library-lib";

describe("race immunities", () => {
  it("library races (with abilities) yield no text-parsed immunities", () => {
    for (const race of RACES) {
      const row = { ...racePassiveData(race), id: "r", name: race.name };

      expect(extractRaceImmunities(row as never), race.key).toEqual([]);
      expect(getCharacterImmunities({ immunities: [] }, row as never), race.key).toEqual([]);
    }
  });

  it("legacy races without abilities still parse the description", () => {
    expect(extractRaceImmunities({ passiveAbility: { description: "Імунітет до вогню" }, abilities: [] } as never)).toContain("вогню");
  });
});
