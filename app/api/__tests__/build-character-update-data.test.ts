import { describe, expect, it } from "vitest";

import { buildCharacterUpdateData } from "@/app/api/campaigns/[id]/characters/[characterId]/build-character-update-data";

const character = {
  level: 3,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
  maxHp: 20,
  currentHp: 20,
  hitDice: "1d8",
  spellcastingAbility: null,
  spellSaveDC: null,
  spellAttackBonus: null,
  spellSlots: {},
  immunities: [],
  skills: {},
  experience: 0,
  seenLevel: null,
};

describe("buildCharacterUpdateData", () => {
  it("підвищення через пряме level фіксує seenLevel = старий рівень", () => {
    expect(buildCharacterUpdateData({ character, data: { level: 4 }, xpMultiplier: 1 }).seenLevel).toBe(3);
  });

  it("seenLevel уже є — не змінює", () => {
    expect(buildCharacterUpdateData({ character: { ...character, seenLevel: 2 }, data: { level: 4 }, xpMultiplier: 1 }).seenLevel).toBeUndefined();
  });

  it("не пише skillTreeProgress з тіла; зниження рівня скидає прогрес", () => {
    expect(buildCharacterUpdateData({ character, data: { skillTreeProgress: { t: { unlockedSkills: ["x"] } } }, xpMultiplier: 1 }).skillTreeProgressUpdate).toBeUndefined();
    expect(buildCharacterUpdateData({ character, data: { level: 2 }, xpMultiplier: 1 }).skillTreeProgressUpdate).toEqual({});
  });
});
