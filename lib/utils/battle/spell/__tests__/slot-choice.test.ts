import { describe, expect, it } from "vitest";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { rowLines } from "@/lib/utils/battle/log/__tests__/event-text";
import { computeSpellPower, spellAttackBonus } from "@/lib/utils/battle/spell/power";
import { resolveChosenSlot } from "@/lib/utils/battle/spell/slot";
import type { BattleParticipant } from "@/types/battle";

const caster = (spellSlots: BattleParticipant["spellcasting"]["spellSlots"]): BattleParticipant => {
  const base = createMockParticipant();

  return { ...base, spellcasting: { ...base.spellcasting, spellSlots } };
};

describe("resolveChosenSlot", () => {
  it("pact slot casts at pact level", () => {
    expect(resolveChosenSlot(caster({ pact: { level: 3, max: 2, current: 1 } }), 1, "pact")).toEqual({ ok: true, castLevel: 3 });
  });

  it("a higher slot casts at its circle", () => {
    expect(resolveChosenSlot(caster({ "5": { max: 1, current: 1 } }), 3, "5")).toEqual({ ok: true, castLevel: 5 });
  });

  it("rejects a lower slot", () => {
    expect(resolveChosenSlot(caster({ "1": { max: 2, current: 2 } }), 2, "1")).toMatchObject({ ok: false });
  });

  it("rejects an empty slot", () => {
    expect(resolveChosenSlot(caster({ "3": { max: 1, current: 0 } }), 1, "3")).toMatchObject({ ok: false });
  });

  it("rejects a missing slot", () => {
    expect(resolveChosenSlot(caster({}), 1, "4")).toMatchObject({ ok: false });
  });
});

describe("computeSpellPower addAbilityMod", () => {
  const base = createMockParticipant();

  const wizard = (damageModel?: "5e") => ({
    ...base,
    abilities: { ...base.abilities, ...(damageModel && { damageModel }), modifiers: { ...base.abilities.modifiers, intelligence: 3 } },
    spellcasting: { ...base.spellcasting, spellcastingAbility: "intelligence" as const },
  });

  const power = (c: BattleParticipant, addAbilityMod: boolean) => computeSpellPower({ caster: c, groupId: null, rolls: [4], participants: [c], addAbilityMod });

  it("adds the spellcasting modifier in 5e only", () => {
    expect(power(wizard("5e"), true).damage).toBe(7);
    expect(rowLines(power(wizard("5e"), true).breakdown)).toContain("Мод. INT +3");
    expect(power(wizard("5e"), false).damage).toBe(4);
    expect(power(wizard(), true).damage).toBe(4);
  });
});

describe("weapon object for a non-caster", () => {
  const base = createMockParticipant();

  const fighter: BattleParticipant = { ...base, abilities: { ...base.abilities, damageModel: "5e", proficiencyBonus: 2, modifiers: { ...base.abilities.modifiers, strength: 1, dexterity: 4 } }, spellcasting: { ...base.spellcasting, spellcastingAbility: undefined, spellAttackBonus: undefined } };

  it("takes the better of STR/DEX for damage and attack bonus", () => {
    const power = computeSpellPower({ caster: fighter, groupId: null, rolls: [4], participants: [fighter], addAbilityMod: true });

    expect(power.damage).toBe(8);
    expect(rowLines(power.breakdown)).toContain("Мод. DEX +4");
    expect(spellAttackBonus(fighter, true)).toBe(6);
    expect(spellAttackBonus(fighter)).toBe(2);
  });
});

it("monster spellcasting may use a physical ability from its statblock", () => {
  const base = createMockParticipant();

  const caster: BattleParticipant = { ...base, abilities: { ...base.abilities, damageModel: "5e", modifiers: { ...base.abilities.modifiers, constitution: 5 } }, spellcasting: { ...base.spellcasting, spellcastingAbility: "constitution" } };

  const power = computeSpellPower({ caster, groupId: null, rolls: [4], participants: [caster], addAbilityMod: true });

  expect(rowLines(power.breakdown)).toContain("Мод. CON +5");
});
