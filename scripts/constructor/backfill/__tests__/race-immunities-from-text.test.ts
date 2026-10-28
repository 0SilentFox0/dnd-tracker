import { describe, expect, it } from "vitest";

import { parseRaceImmunityText, raceImmunityAbility } from "../race-immunities-from-text";

import { AbilitySchema } from "@/lib/utils/abilities/schema";

describe("race immunities backfill", () => {
  it("legacy races without abilities parse the description", () => {
    expect(parseRaceImmunityText({ passiveAbility: { description: "Імунітет до вогню" } })).toContain("вогню");
  });

  it("race with non-empty abilities and immunity text → null (as today: text ignored)", () => {
    expect(raceImmunityAbility({ passiveAbility: "Імунітет до вогню", abilities: [{ id: "x" }] })).toBeNull();
  });

  it("race without abilities and with «імунітет до вогню» → fire resistance ability", () => {
    const a = raceImmunityAbility({ passiveAbility: "Імунітет до вогню", abilities: [] });

    expect(JSON.stringify(a)).toContain("fire");
  });

  it("returns a plain valid ability with a fixed id", () => {
    const a = raceImmunityAbility({ passiveAbility: "Імунітет до вогню", abilities: [] });

    expect(a).not.toBeNull();
    expect(() => AbilitySchema.parse(a)).not.toThrow();
    expect(a).toMatchObject({ id: "constructor-race-immunities" });
    expect(a).not.toHaveProperty("source");
    expect(a).not.toHaveProperty("key");
  });

  it("text without immunities → null", () => {
    expect(raceImmunityAbility({ passiveAbility: "Швидкий", abilities: [] })).toBeNull();
  });
});
