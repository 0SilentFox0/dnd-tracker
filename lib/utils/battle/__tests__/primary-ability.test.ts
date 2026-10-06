import { describe, expect, it } from "vitest";

import { createMockParticipant } from "./mock-participant";

import { AttackType } from "@/lib/constants/battle";
import { calculateAttackBonus } from "@/lib/utils/battle/attack";
import { getAttackAbilityModifier, spellcastingDerived } from "@/lib/utils/common/calculations";
import type { BattleAttack } from "@/types/battle";

const sword = { id: "s", name: "Меч", type: AttackType.MELEE, attackBonus: 1, damageDice: "1d8" } as BattleAttack;

const bow = { id: "b", name: "Лук", type: AttackType.RANGED, attackBonus: 0, damageDice: "1d8" } as BattleAttack;

describe("primaryAbility", () => {
  const scores = { strength: 10, dexterity: 18, constitution: 10, intelligence: 16, wisdom: 10, charisma: 10 };

  it("без основної: ближня — СИЛ, дальня — СПР", () => {
    expect(getAttackAbilityModifier(scores, AttackType.MELEE)).toBe(0);
    expect(getAttackAbilityModifier(scores, AttackType.RANGED)).toBe(4);
  });

  it("основна діє на будь-яку атаку", () => {
    expect(getAttackAbilityModifier({ ...scores, primaryAbility: "dexterity" }, AttackType.MELEE)).toBe(4);
    expect(getAttackAbilityModifier({ ...scores, primaryAbility: "intelligence" }, AttackType.RANGED)).toBe(3);
  });

  it("calculateAttackBonus бере основну + майстерність + бонус зброї", () => {
    const p = createMockParticipant();

    p.abilities = { ...p.abilities, strength: 10, dexterity: 18, primaryAbility: "dexterity", proficiencyBonus: 9 };

    expect(calculateAttackBonus(p, sword)).toBe(4 + 9 + 1);
    expect(calculateAttackBonus(p, bow)).toBe(4 + 9);
  });

  it("СЛ і атака заклинанням від рівня", () => {
    expect(spellcastingDerived(30, "intelligence", scores)).toEqual({ saveDC: 8 + 9 + 3, attackBonus: 9 + 3 });
    expect(spellcastingDerived(30, null, scores)).toBeNull();
  });
});
