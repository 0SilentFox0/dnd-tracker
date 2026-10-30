import { describe, expect, it } from "vitest";

import { withRecommendedScores } from "../recommended-scores";

import { defaultCharacterFormData } from "@/lib/utils/characters/form/defaults";
import type { CharacterFormData } from "@/types/characters";
import type { GameClassData } from "@/types/classes";

const wizard = { id: "w", spellcastingAbility: "intelligence", savingThrows: ["intelligence", "wisdom"] } as GameClassData;

const fighter = { id: "f", spellcastingAbility: null, savingThrows: ["strength", "constitution"] } as GameClassData;

const byId = { w: wizard, f: fighter };

const withClass = (data: CharacterFormData, classId: string): CharacterFormData => ({ ...data, basicInfo: { ...data.basicInfo, classes: [{ classId, level: 1 }] } });

describe("withRecommendedScores", () => {
  it("fills default scores when a class is picked", () => {
    const next = withRecommendedScores(defaultCharacterFormData, withClass(defaultCharacterFormData, "w"), byId);

    expect(next.abilityScores).toMatchObject({ intelligence: 15, wisdom: 14, constitution: 13, dexterity: 12, charisma: 10, strength: 8, primaryAbility: "intelligence" });
  });

  it("re-recommends when the class changes and nothing was edited", () => {
    const asWizard = withRecommendedScores(defaultCharacterFormData, withClass(defaultCharacterFormData, "w"), byId);

    const asFighter = withRecommendedScores(asWizard, withClass(asWizard, "f"), byId);

    expect(asFighter.abilityScores).toMatchObject({ strength: 15, constitution: 14, primaryAbility: "strength" });
  });

  it("keeps manually edited scores", () => {
    const edited = { ...defaultCharacterFormData, abilityScores: { ...defaultCharacterFormData.abilityScores, strength: 18 } };

    expect(withRecommendedScores(edited, withClass(edited, "w"), byId).abilityScores).toEqual(edited.abilityScores);
  });

  it("falls back to the archetype without classes", () => {
    const next = withRecommendedScores(defaultCharacterFormData, { ...defaultCharacterFormData, basicInfo: { ...defaultCharacterFormData.basicInfo, archetype: "rogue" } }, {});

    expect(next.abilityScores).toMatchObject({ dexterity: 15, intelligence: 14 });
  });
});
