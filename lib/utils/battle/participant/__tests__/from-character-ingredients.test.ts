import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant/from-character";
import { refreshFromSource } from "@/lib/utils/battle/participant/refresh-from-source";
import { parseRules } from "@/lib/utils/rules/schema";
import type { IngredientStock } from "@/types/battle";

const character = {
  id: "ch1", campaignId: "c1", name: "Герой", race: "Людина", class: "Воїн", level: 5,
  strength: 12, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10,
  armorClass: 12, speed: 30, initiative: 0, morale: 0, controlledBy: "u1", immunities: [], knownSpells: [],
  equipment: {}, skillTreeProgress: {}, personalSkillId: null, archetype: "warrior", classes: [],
  inventory: { equipped: {}, stash: [], attuned: [], gold: 10, silver: 0, copper: 0, items: [{ id: "d1", name: "Diamond", quantity: 2, worthGp: 50 }] },
};

const build = (rules: object) => {
  const context = {
    skillTreeByRace: {}, mainSkills: [], spells: [], allSkills: [], racesByName: { "Людина": null }, campaign: { maxLevel: 20 },
    skillsById: {}, artifactsById: {}, artifactSetsById: {}, artifactSetMemberIds: {}, rules: parseRules(rules),
  } as never;

  return createBattleParticipantFromCharacter(character as never, "b1", ParticipantSide.ALLY, undefined, context);
};

describe("hero ingredient stock", () => {
  it("is built from the inventory only when spellIngredients is enabled", async () => {
    const on = await build({ spellIngredients: { enabled: true } });

    expect(on.battleData.ingredientStock).toEqual({ items: [{ id: "d1", key: "diamond", name: "Diamond", worthGp: 50, qty: 2, used: 0 }], purseCp: 1000, usedCp: 0 });
    expect((await build({})).battleData.ingredientStock).toBeUndefined();
  });

  it("refreshFromSource keeps used and usedCp, takes fresh quantities", async () => {
    const fresh = await build({ spellIngredients: { enabled: true } });

    const spent: IngredientStock = { items: [{ id: "d1", key: "diamond", name: "Diamond", worthGp: 50, qty: 5, used: 4 }], purseCp: 1000, usedCp: 300 };

    const live = { ...fresh, battleData: { ...fresh.battleData, ingredientStock: spent } };

    expect(refreshFromSource(live, fresh).battleData.ingredientStock).toEqual({ items: [{ id: "d1", key: "diamond", name: "Diamond", worthGp: 50, qty: 2, used: 2 }], purseCp: 1000, usedCp: 300 });
  });
});
