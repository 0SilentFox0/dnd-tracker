import { describe, expect, it } from "vitest";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { asi } from "@/lib/utils/characters/choices/__tests__/fixtures";
import type { ChoiceSelections } from "@/lib/utils/characters/choices/selections";
import { buildCharacterSheet, type SheetInput } from "@/lib/utils/characters/sheet";

function input(over: Partial<SheetInput> = {}, character: Partial<SheetInput["character"]> = {}): SheetInput {
  const p = createMockParticipant();

  p.abilities = { ...p.abilities, level: 4, dexterity: 14, modifiers: { ...p.abilities.modifiers, dexterity: 2 }, proficiencyBonus: 2 };

  return {
    participant: p,
    viewer: { isDM: true, isOwner: false },
    maxLevel: 20,
    character: {
      id: "h", name: "Лія", avatar: null, level: 4, class: "Rogue", subclass: null, race: "Elf", alignment: null,
      strength: 10, dexterity: 14, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
      armorClass: 12, savingThrows: {}, skills: { stealth: true }, languages: [], proficiencies: {}, spellcastingAbility: null, archetype: null, primaryAbility: null, background: null, goals: [],
      ...character,
    },
    raceIcon: null,
    immunities: [],
    artifacts: [],
    spells: [],
    personalSkill: null,
    progression: { freePoints: 0, level: 4, seenLevel: null },
    ...over,
  };
}

const selections: ChoiceSelections = {
  groups: [],
  skills: ["perception"],
  expertise: ["stealth"],
  spells: [{ spellId: "sp1", label: "Лінія: Wood Elf" }],
  feats: [{ key: "class:r.asi.0", feat: asi, picks: { asi: [{ id: "dexterity" }, { id: "dexterity" }] }, from: "Rogue 4" }],
  options: [{ owner: "Rogue", label: "Expertise", names: ["Stealth"] }],
  lineage: "Wood Elf",
};

describe("sheet with choices", () => {
  it("without choices nothing new appears", () => {
    const s = buildCharacterSheet(input());

    expect(s).not.toHaveProperty("choices");
    expect(s.identity).not.toHaveProperty("subrace");
    expect(s.skills.find((k) => k.key === "stealth")).not.toHaveProperty("expertise");
  });

  it("subrace, skills from choices, expertise doubles proficiency, choices block", () => {
    const s = buildCharacterSheet(input({ choices: { selections, pending: 2 } }, { subrace: "Wood Elf" }));

    expect(s.identity.subrace).toBe("Wood Elf");
    expect(s.skills.find((k) => k.key === "perception")).toMatchObject({ proficient: true });
    expect(s.skills.find((k) => k.key === "stealth")).toMatchObject({ proficient: true, expertise: true, bonus: 2 + 4 });
    expect(s.choices).toEqual({
      pending: 2,
      lineage: "Wood Elf",
      feats: [{ key: "class:r.asi.0", id: "f-asi", name: "Ability Score Improvement", type: "general", from: "Rogue 4", picks: ["+2 СПР"] }],
      options: [{ owner: "Rogue", label: "Expertise", names: ["Stealth"] }],
      spellSources: { sp1: "Лінія: Wood Elf" },
      expertise: ["stealth"],
    });
  });

  it("HOMM hero with a stored subrace keeps the identity unchanged", () => {
    const s = buildCharacterSheet(input({}, { subrace: "Темний ельф" }));

    expect(s.identity).not.toHaveProperty("subrace");
  });

  it("race choices without a lineage and without classes do not surface subrace", () => {
    const s = buildCharacterSheet(input({ choices: { selections: { ...selections, lineage: null }, pending: 0 } }, { subrace: "Темний ельф" }));

    expect(s.identity).not.toHaveProperty("subrace");
  });
});
