import { describe, expect, it } from "vitest";

import { seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { applyLevelGain } from "@/lib/utils/characters/level-up/apply-level-gain";
import { calculateSpellSlotGain } from "@/lib/utils/spells/spell-slots";

const scores = { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 };

const campaign = { maxLevel: 20 };

const progression = { spellSlotProgression: [{ level: 1, slots: 20 }] };

describe("applyLevelGain", () => {
  it("+1 до випадкової характеристики за кожен отриманий рівень", () => {
    const r = applyLevelGain({ character: { ...scores, spellSlots: {} }, race: null, campaign, fromLevel: 3, toLevel: 5, rng: seq(0, 0.99) });

    expect(r.gained).toEqual(["strength", "charisma"]);
    expect(r.abilityScores).toEqual({ ...scores, strength: 11, charisma: 11 });
  });

  it("стеля 30: характеристика на стелі не обирається; усі на стелі — без +1", () => {
    const capped = applyLevelGain({ character: { ...scores, strength: 30, spellSlots: {} }, race: null, campaign, fromLevel: 3, toLevel: 4, rng: () => 0 });

    expect(capped.gained).toEqual(["dexterity"]);
    expect(capped.abilityScores.strength).toBe(30);

    const all = { strength: 30, dexterity: 30, constitution: 30, intelligence: 30, wisdom: 30, charisma: 30 };

    const none = applyLevelGain({ character: { ...all, spellSlots: {} }, race: null, campaign, fromLevel: 3, toLevel: 4, rng: () => 0 });

    expect(none.gained).toEqual([]);
    expect(none.abilityScores).toEqual(all);
  });

  it("слоти — приріст з прогресії раси поверх наявних; ручні слоти лишаються", () => {
    const r = applyLevelGain({
      character: { ...scores, spellSlots: { "1": { max: 3, current: 1 }, universal: { max: 2, current: 2 } } },
      race: progression,
      campaign,
      fromLevel: 3,
      toLevel: 4,
      rng: () => 0,
    });

    expect(r.spellSlots).toEqual({ "1": { max: 4, current: 2 }, universal: { max: 2, current: 2 } });
  });

  it("без прогресії раси — фіксована таблиця, з 1-го рівня не падає", () => {
    const r = applyLevelGain({ character: { ...scores, spellSlots: {} }, race: null, campaign, fromLevel: 1, toLevel: 2, rng: () => 0 });

    expect(r.spellSlots).toEqual({ "1": { max: 1, current: 1 } });
  });

  it("вхід не мутується", () => {
    const character = { ...scores, spellSlots: { "1": { max: 3, current: 1 } } };

    applyLevelGain({ character, race: progression, campaign, fromLevel: 3, toLevel: 4, rng: () => 0 });

    expect(character).toEqual({ ...scores, spellSlots: { "1": { max: 3, current: 1 } } });
  });
});

describe("calculateSpellSlotGain", () => {
  it("таблиця без прогресії: ключі, яких немає на старому рівні, не ламають розрахунок", () => {
    expect(calculateSpellSlotGain(1, 5, 20, [])).toEqual({ "1": { max: 1, current: 1 }, "2": { max: 1, current: 1 }, "4": { max: 1, current: 1 } });
  });
});
