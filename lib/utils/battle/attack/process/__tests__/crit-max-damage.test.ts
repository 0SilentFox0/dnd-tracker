import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { CRITICAL_SUCCESS_EFFECTS, type CriticalEffect } from "@/lib/constants/critical-effects";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { computeHitDamage } from "@/lib/utils/battle/attack/process/compute";
import { heroAttackDamageParts } from "@/lib/utils/battle/damage/hero-damage";
import { getAttackAbilityModifier } from "@/lib/utils/common/calculations";
import { diceMax } from "@/lib/utils/common/dice";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const maxCrit = CRITICAL_SUCCESS_EFFECTS.find((e) => e.effect.type === "max_damage") as CriticalEffect;

const club: BattleAttack = { id: "c", name: "Палиця", type: AttackType.MELEE, attackBonus: 0, damageDice: "2d6+1d4", damageType: "bludgeoning" };

const target = makeParticipant({ id: "t", side: ParticipantSide.ENEMY, hp: 99, maxHp: 99 });

const crit = (attacker: BattleParticipant) =>
  computeHitDamage({ attacker, target, attack: club, damageRolls: [1, 1, 1], allParticipants: [attacker, target], attackRoll: { isCritical: true, criticalEffect: maxCrit }, currentRound: 1 }).physicalDamage;

describe("крит max_damage", () => {
  it("юніт: максимум усіх груп кубиків зброї", () => {
    const p = makeParticipant({ id: "u" });

    const unit = { ...p, basicInfo: { ...p.basicInfo, sourceType: "unit" as const } };

    expect(crit(unit)).toBe(16 + getAttackAbilityModifier(unit.abilities, AttackType.MELEE));
  });

  it("герой: зброя плюс кубики рівня", () => {
    const p = makeParticipant({ id: "h", level: 5 });

    const hero = { ...p, abilities: { ...p.abilities, meleeMultiplier: 1 } };

    expect(crit(hero)).toBe(diceMax(heroAttackDamageParts(hero, club).formula) + getAttackAbilityModifier(hero.abilities, AttackType.MELEE));
  });
});
