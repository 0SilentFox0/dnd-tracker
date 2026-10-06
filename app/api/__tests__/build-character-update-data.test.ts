import { describe, expect, it } from "vitest";

import { buildCharacterUpdateData } from "@/app/api/campaigns/[id]/characters/[characterId]/build-character-update-data";

const character = {
  level: 3,
  experience: 0,
  seenLevel: null,
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
  spellSlots: { "1": { max: 3, current: 1 } },
  immunities: [],
};

const base = { xpMultiplier: 1, campaign: { maxLevel: 20 }, race: null, rng: () => 0 };

describe("buildCharacterUpdateData", () => {
  it("підвищення через пряме level фіксує seenLevel = старий рівень", () => {
    expect(buildCharacterUpdateData({ ...base, character, data: { level: 4 } }).seenLevel).toBe(3);
  });

  it("seenLevel уже є — не змінює", () => {
    expect(buildCharacterUpdateData({ ...base, character: { ...character, seenLevel: 2 }, data: { level: 4 } }).seenLevel).toBeUndefined();
  });

  it("не пише skillTreeProgress з тіла; зниження рівня скидає прогрес", () => {
    expect(buildCharacterUpdateData({ ...base, character, data: { skillTreeProgress: { t: { unlockedSkills: ["x"] } } } }).skillTreeProgressUpdate).toBeUndefined();
    expect(buildCharacterUpdateData({ ...base, character, data: { level: 2 } }).skillTreeProgressUpdate).toEqual({});
  });

  it("без зміни рівня — ні слотів, ні характеристик", () => {
    const r = buildCharacterUpdateData({ ...base, character, data: { level: 3, strength: 12 } });

    expect(r).toMatchObject({ finalLevel: 3, gained: [] });
    expect(r.spellSlots).toBeUndefined();
    expect(r.abilityScores).toBeUndefined();
  });

  it("без level і experience у тілі рівень не рахується з XP", () => {
    expect(buildCharacterUpdateData({ ...base, character: { ...character, experience: 999_999 }, data: { name: "x" } }).finalLevel).toBe(3);
  });

  it("підвищення: +1 на рівень поверх значень із тіла, слоти — приріст за таблицею", () => {
    const r = buildCharacterUpdateData({ ...base, character, data: { level: 5, strength: 12 } });

    expect(r.abilityScores).toMatchObject({ strength: 14, dexterity: 10 });
    expect(r.gained).toEqual(["strength", "strength"]);
    expect(r.spellSlots).toEqual({ "1": { max: 3, current: 1 }, "2": { max: 1, current: 1 }, "4": { max: 1, current: 1 } });
  });

  it("зниження: таблиця, current обрізається, universal лишається", () => {
    const r = buildCharacterUpdateData({
      ...base,
      character,
      data: { level: 1, spellSlots: { "1": { max: 3, current: 3 }, universal: { max: 1, current: 0 } } },
    });

    expect(r.spellSlots).toEqual({ "1": { max: 2, current: 2 }, universal: { max: 1, current: 0 } });
  });
});
