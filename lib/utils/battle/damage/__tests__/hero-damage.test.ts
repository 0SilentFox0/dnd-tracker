import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import type { CriticalEffect } from "@/lib/constants/critical-effects";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { computeHitDamage } from "@/lib/utils/battle/attack/process/compute";
import { computeDamageBreakdown } from "@/lib/utils/battle/damage";
import { averageAttackDamage } from "@/lib/utils/battle/damage/average";
import { heroAttackDamageParts, heroDamageContext, maxDamageCritDice } from "@/lib/utils/battle/damage/hero-damage";
import { damageDiceSlots } from "@/lib/utils/battle/view";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const base = createMockParticipant();

const hero = createMockParticipant({ abilities: { ...base.abilities, level: 5 } });

const unit = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "u1", sourceType: "unit" } });

const target = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "t1", side: ParticipantSide.ENEMY } });

const sword: BattleAttack = { id: "s", name: "Меч", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d8+2", damageType: "slashing" };

const maxDamage: CriticalEffect = { id: 2, name: "Максимальний урон", description: "", type: "success", effect: { type: "max_damage" } };

const hit = (attacker: BattleParticipant, attack: BattleAttack, rolls: number[], crit = false) =>
  computeHitDamage({
    attacker,
    target,
    attack,
    damageRolls: rolls,
    allParticipants: [attacker, target],
    attackRoll: crit ? { isCritical: true, criticalEffect: maxDamage } : { isCritical: false },
    currentRound: 1,
  }).physicalDamage;

const preview = (attacker: BattleParticipant, rolls: number[]) =>
  computeDamageBreakdown({ attacker, target, attack: sword, damageRolls: rolls, allParticipants: [attacker, target] }).finalDamage;

describe("шкода атаки: числа до дедупу", () => {
  it("герой 5 рівня, один кидок — кубики рівня середнім: 5 + 7 + 5 + 2", () => {
    expect(hit(hero, sword, [5])).toBe(19);
    expect(preview(hero, [5])).toBe(19);
  });

  it("герой кинув зброю й кубики рівня разом: сума кидків + 5 + 2", () => {
    expect(hit(hero, sword, [5, 3, 4])).toBe(19);
    expect(preview(hero, [5, 3, 4])).toBe(19);
    expect(hit(hero, sword, [6, 6, 8])).toBe(27);
  });

  it("середня шкода й слоти кубиків", () => {
    expect(averageAttackDamage(hero, sword, [hero]).total).toBe(20);
    expect(averageAttackDamage(unit, sword, [unit]).total).toBe(8);
    expect(damageDiceSlots(hero, sword)).toEqual([6, 6, 8]);
    expect(damageDiceSlots(unit, sword)).toEqual([8]);
    expect(damageDiceSlots(unit, { ...sword, damageDice: "" })).toEqual([6]);
  });

  it("юніт: кидки + характеристика", () => {
    expect(hit(unit, sword, [5])).toBe(7);
    expect(hit(unit, { ...sword, damageDice: "" }, [3])).toBe(5);
  });

  it("крит «Максимальний урон»: перша група зброї + її модифікатор + характеристика, без зброї — 1d6", () => {
    expect(hit(unit, sword, [5], true)).toBe(12);
    expect(hit(hero, sword, [5], true)).toBe(12);
    expect(hit(unit, { ...sword, damageDice: "2d6" }, [5, 5], true)).toBe(14);
    expect(hit(unit, { ...sword, damageDice: "" }, [3], true)).toBe(8);
  });
});

describe("heroAttackDamageParts", () => {
  it("герой: зброя + кубики рівня", () => {
    expect(heroAttackDamageParts(hero, sword)).toEqual({ weaponDice: "1d8+2", heroDice: "2d6", formula: "2d6+1d8" });
  });

  it("не герой: лише зброя", () => {
    expect(heroAttackDamageParts(unit, sword)).toEqual({ weaponDice: "1d8+2", heroDice: "", formula: "1d8+2" });
  });
});

describe("heroDamageContext", () => {
  it("один кидок героя — кубики рівня середнім", () => {
    expect(heroDamageContext(hero, sword, [5])).toEqual({ heroLevelPart: 5, heroDicePart: 7, heroDiceNotation: "2d6", weaponDiceNotation: "1d8+2" });
  });

  it("повні кидки героя — об'єднана формула, без середнього", () => {
    expect(heroDamageContext(hero, sword, [5, 3, 4])).toEqual({ heroLevelPart: 5, heroDicePart: 0, heroDiceNotation: "", weaponDiceNotation: "2d6+1d8" });
  });

  it("юніт", () => {
    expect(heroDamageContext(unit, sword, [5])).toEqual({ heroLevelPart: 0, heroDicePart: 0, heroDiceNotation: "", weaponDiceNotation: "1d8+2" });
    expect(heroDamageContext(unit, { ...sword, damageDice: "" }, [3]).weaponDiceNotation).toBeUndefined();
  });
});

describe("maxDamageCritDice", () => {
  it("максимум першої групи зброї з модифікатором, без зброї — 6", () => {
    expect(maxDamageCritDice(unit, sword)).toBe(10);
    expect(maxDamageCritDice(unit, { ...sword, damageDice: "2d6" })).toBe(12);
    expect(maxDamageCritDice(unit, { ...sword, damageDice: "" })).toBe(6);
  });
});
