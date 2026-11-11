import { describe, expect, it } from "vitest";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { buildCharacterSheet, type SheetInput } from "@/lib/utils/characters/sheet";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { woundsMax } from "@/systems/wfrp/rules/characteristics/derive";
import { CharacteristicsSchema } from "@/systems/wfrp/rules/characteristics/schema";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";
import { SHEET_SLOT } from "@/systems/wfrp/rules/slots";

const characteristics = CharacteristicsSchema.parse({ base: { s: 40, t: 35, wp: 30 }, move: 4, fate: 3, skillAdvances: { "melee:flail": 5, lore: 0, "lore:old-world": 2 } });

function input(over: Partial<SheetInput> = {}, resources?: unknown): SheetInput {
  return {
    participant: createMockParticipant(),
    viewer: { isDM: true, isOwner: false },
    maxLevel: 20,
    character: {
      id: "c", name: "Hans", avatar: null, level: 1, class: "Hero", subclass: null, race: "Human", alignment: null,
      strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
      armorClass: 10, savingThrows: {}, skills: {}, languages: [], proficiencies: {}, spellcastingAbility: null, archetype: null,
      primaryAbility: null, background: null, goals: [], characteristics, resources,
    },
    raceIcon: null,
    immunities: [],
    artifacts: [],
    spells: [],
    personalSkill: null,
    progression: { freePoints: 0, level: 1, seenLevel: null },
    ...over,
  };
}

describe("buildCharacterSheet system", () => {
  it("d20 without rules is homm with no wfrp block", () => {
    const sheet = buildCharacterSheet(input());

    expect(sheet.system).toBe("homm");
    expect(sheet.systemSlot).toBeUndefined();
    expect(sheet.abilities).toHaveLength(6);
  });

  it("d20 with default rules equals no rules apart from system", () => {
    const { system: a, ...withRules } = buildCharacterSheet(input({ rules: DEFAULT_RULES }));

    const { system: b, ...without } = buildCharacterSheet(input());

    expect(a).toBe(b);
    expect(withRules).toEqual(without);
  });

  it("wfrp builds the characteristics block and empties d20 fields", () => {
    const sheet = buildCharacterSheet(input({ rules: WFRP_RULES }, { fortune: 1 }));

    const block = SHEET_SLOT.read(sheet.systemSlot);

    expect(sheet.system).toBe("wfrp");
    expect(block?.characteristics).toHaveLength(10);
    expect(block?.wounds.max).toBe(woundsMax(characteristics));
    expect(block?.move).toEqual({ value: 4, walkYd: 8, runYd: 16 });
    expect(block?.fate).toBe(3);
    expect(block?.fortune).toBe(1);
    expect(block?.skills.find((s) => s.key === "dodge")?.trained).toBe(true);
    expect(block?.skills.find((s) => s.key === "channelling")?.trained).toBe(false);
    expect(block?.skills.find((s) => s.key === "melee" && s.spec === "flail")?.advances).toBe(5);
    expect(sheet.abilities).toEqual([]);
    expect(sheet.saves).toEqual([]);
    expect(sheet.skills).toEqual([]);
  });

  it("fortune falls back to fate and trained skills come first", () => {
    const sheet = buildCharacterSheet(input({ rules: WFRP_RULES }));

    const block = SHEET_SLOT.read(sheet.systemSlot);

    expect(block?.fortune).toBe(3);

    const flags = block!.skills.map((s) => s.trained);

    expect(flags).toEqual([...flags].sort((a, b) => Number(b) - Number(a)));
  });
});
