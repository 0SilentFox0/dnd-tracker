import { describe, expect, it } from "vitest";

import { spellDice5e } from "../dice";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { casterSpellDice } from "@/lib/utils/battle/spell/caster-dice";

describe("spellDice5e", () => {
  const fireBolt = { dice: 1, level: 0, dieSides: 10 };

  it.each([
    [4, 1],
    [5, 2],
    [11, 3],
    [17, 4],
  ])("cantrip at level %i gives %i dice", (lvl, count) => {
    expect(spellDice5e(fireBolt, lvl, 0)).toEqual({ count, sides: 10 });
  });

  it("upcast adds dice per circle", () => {
    expect(spellDice5e({ dice: 8, level: 3, dieSides: 6, upcastDice: 1 }, 9, 5)).toEqual({ count: 10, sides: 6 });
  });

  it("default d6, no upcast field gives base dice", () => {
    expect(spellDice5e({ dice: 3, level: 1 }, 5, 3)).toEqual({ count: 3, sides: 6 });
  });

  it("zero dice stays zero", () => {
    expect(spellDice5e({ dice: 0, level: 0 }, 17, 0)).toEqual({ count: 0, sides: 6 });
  });
});

describe("casterSpellDice", () => {
  const homm = createMockParticipant();

  it("HOMM branch ignores castLevel", () => {
    expect(casterSpellDice(homm, { dice: 3, groupId: null, level: 1 }, 5)).toEqual(casterSpellDice(homm, { dice: 3, groupId: null }));
  });

  it("5e caster uses spellDice5e", () => {
    const wizard = { ...homm, abilities: { ...homm.abilities, damageModel: "5e" as const, level: 5 } };

    expect(casterSpellDice(wizard, { dice: 8, groupId: null, level: 3, upcastDice: 1 }, 4)).toEqual({ count: 9, sides: 6 });
  });

  it("fixed dice ignore upcast in 5e while HOMM keeps its original formula", () => {
    const monster = { ...homm, abilities: { ...homm.abilities, damageModel: "5e" as const, level: 17 } };

    const spell = { dice: 2, groupId: null, level: 1, dieSides: 8, upcastDice: 2, fixedDice: true };

    expect(casterSpellDice(monster, spell, 5)).toEqual({ count: 2, sides: 8 });
    expect(casterSpellDice(homm, spell, 5)).toEqual(casterSpellDice(homm, { dice: 2, groupId: null, level: 1 }));
  });

  it("fixed SRD cantrip dice do not scale for a CR 17 monster", () => {
    const monster = { ...homm, abilities: { ...homm.abilities, damageModel: "5e" as const, level: 17 } };

    expect(casterSpellDice(monster, { dice: 1, groupId: null, level: 0, dieSides: 10, fixedDice: true })).toEqual({ count: 1, sides: 10 });
  });
});
