import { describe, expect, it } from "vitest";

import { createMockParticipant } from "./mock-participant";

import { AttackType } from "@/lib/constants/battle";
import { getHeroDamageDiceForLevel } from "@/lib/constants/hero-scaling";
import { averageAttackDamage } from "@/lib/utils/battle/damage/average";
import { weaponPreview } from "@/lib/utils/battle/view";
import { diceAverage } from "@/lib/utils/common/dice";
import type { BattleAttack } from "@/types/battle";

const sword = { id: "s", name: "Меч", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d8" } as BattleAttack;

describe("averageAttackDamage", () => {
  it("герой: кубики зброї + рівень + кубики рівня + характеристика, × коеф. ДМа", () => {
    const p = createMockParticipant();

    p.abilities = { ...p.abilities, level: 10, strength: 14, meleeMultiplier: 1 };

    const expected = Math.floor(4.5 + 10 + diceAverage(getHeroDamageDiceForLevel(10, AttackType.MELEE)) + 2);

    expect(averageAttackDamage(p, sword, [p]).total).toBe(expected);

    p.abilities.meleeMultiplier = 2;
    expect(averageAttackDamage(p, sword, [p]).total).toBe(Math.floor(expected * 2));
  });

  it("weaponPreview у бою показує те саме число, що й реальний удар у середньому", () => {
    const p = createMockParticipant();

    p.abilities = { ...p.abilities, level: 10 };
    expect(weaponPreview(p, sword, [p]).estimate).toBe(averageAttackDamage(p, sword, [p]).total);
  });
});
