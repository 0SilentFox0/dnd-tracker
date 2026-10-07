/**
 * Розрахунок урону при попаданні: база, модифікатори, критичний ефект, опір
 */

import { calculateDamageWithModifiers } from "../../damage";
import { heroAttackDamageParts, heroDamageContext } from "../../damage/hero-damage";
import { applyBalanceDamageMultiplier } from "../../damage/balance-multiplier";
import { applyHeroDmDamageMultiplier } from "../../damage/hero-dm-multiplier";
import { applyResistance } from "../../resistance";
import type { DamageCalculationResult } from "../../types/damage-calculations";
import { applyCriticalEffect } from "..";
import { applyResistanceForAdditional } from "./damage";

import { AttackType, ParticipantSourceType } from "@/lib/constants/battle";
import type { CriticalEffect } from "@/lib/constants/critical-effects";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import { attackAbilityLabel, getAttackAbilityModifier } from "@/lib/utils/common/calculations";
import { maxOf, parseDice, parseDiceLenient, rollGroups } from "@/lib/utils/common/dice";
import type { BattleParticipant, DamageStep } from "@/types/battle";
import type { BattleAttack } from "@/types/battle";

export interface ComputeHitDamageParams {
  attacker: BattleParticipant;
  target: BattleParticipant;
  attack: BattleAttack;
  damageRolls: number[];
  allParticipants: BattleParticipant[];
  attackRoll: { isCritical: boolean; criticalEffect?: CriticalEffect };
  damageMultiplier?: number;
  currentRound: number;
  actionModifiers?: StaticEffect[];
  bonusPercent?: number;
  rng?: () => number;
}

export interface ComputeHitDamageResult {
  damageCalculation: DamageCalculationResult;
  physicalDamage: number;
  totalFinalDamage: number;
  resistanceResult: { finalDamage: number; breakdown: string[] };
  additionalDamageBreakdown: string[];
  dmgMult: number;
  statModifier: number;
  updatedAttacker: BattleParticipant;
  updatedTarget: BattleParticipant;
  criticalEffectApplied?: CriticalEffect;
  damageSteps: DamageStep[];
  oldHp: number;
}

export function computeHitDamage(params: ComputeHitDamageParams): ComputeHitDamageResult {
  const {
    attacker,
    target,
    attack,
    damageRolls,
    allParticipants,
    attackRoll,
    damageMultiplier,
    currentRound,
  } = params;

  let updatedAttacker = { ...attacker };

  let updatedTarget = { ...target };

  const baseDamage = damageRolls.reduce((sum, roll) => sum + roll, 0);

  const statModifier =
    getAttackAbilityModifier(updatedAttacker.abilities, attack.type);

  const additionalDamageModifiers: Array<{ type: string; value: number }> = [];

  const damageCalculation = calculateDamageWithModifiers(
    updatedAttacker,
    baseDamage,
    statModifier,
    attack.type as AttackType,
    {
      allParticipants,
      additionalDamage: additionalDamageModifiers,
      ...heroDamageContext(updatedAttacker, attack, damageRolls),
      actionModifiers: params.actionModifiers,
      statLabel: attackAbilityLabel(updatedAttacker.abilities, attack.type),
    },
  );

  let criticalEffectApplied: CriticalEffect | undefined;

  if (attackRoll.isCritical && attackRoll.criticalEffect) {
    criticalEffectApplied = attackRoll.criticalEffect;

    if (criticalEffectApplied.effect.target === "target") {
      updatedTarget = applyCriticalEffect(
        updatedTarget,
        criticalEffectApplied,
        currentRound,
        updatedTarget,
      );
    } else if (criticalEffectApplied.effect.target === "self") {
      updatedAttacker = applyCriticalEffect(
        updatedAttacker,
        criticalEffectApplied,
        currentRound,
      );
    }
  }

  let physicalDamage = damageCalculation.totalDamage;

  const damageSteps: DamageStep[] = [...damageCalculation.steps];

  if (criticalEffectApplied?.effect.type === "double_damage") {
    physicalDamage *= 2;
    damageSteps.push({ label: criticalEffectApplied.name, side: "attacker", kind: "multiplier", value: 2, after: physicalDamage });
  }

  if (criticalEffectApplied?.effect.type === "max_damage") {
    const before = physicalDamage;

    const { formula, weaponDice } = heroAttackDamageParts(updatedAttacker, attack);

    const weaponFlat = updatedAttacker.basicInfo.sourceType === ParticipantSourceType.CHARACTER ? (parseDice(weaponDice)?.flat ?? 0) : 0;

    physicalDamage = maxOf(parseDiceLenient(formula)) + weaponFlat + statModifier;
    damageSteps.push({ label: criticalEffectApplied.name, side: "attacker", kind: "flat", value: physicalDamage - before, after: physicalDamage });
  }

  if (criticalEffectApplied?.effect.type === "additional_damage") {
    const extra = rollGroups([{ count: 1, size: 6 }], params.rng)[0];

    physicalDamage += extra;
    damageSteps.push({ label: criticalEffectApplied.name, side: "attacker", kind: "flat", value: extra, after: physicalDamage });
  }

  const heroDm = applyHeroDmDamageMultiplier(
    updatedAttacker,
    attack.type as AttackType,
    physicalDamage,
  );

  physicalDamage = heroDm.damage;

  if (heroDm.breakdownLine) {
    damageCalculation.breakdown.push("──────────");
    damageCalculation.breakdown.push(heroDm.breakdownLine);
    damageSteps.push({ label: "Коефіцієнт DM", side: "attacker", kind: "multiplier", value: heroDm.multiplier, after: physicalDamage });
  }

  const balance = applyBalanceDamageMultiplier(updatedAttacker, physicalDamage);

  if (balance.multiplier !== 1) {
    physicalDamage = balance.damage;
    damageCalculation.breakdown.push("──────────");
    damageCalculation.breakdown.push(`× ${balance.multiplier.toFixed(2)} (рівний бій) = ${physicalDamage}`);
    damageSteps.push({ label: "Рівний бій", side: "attacker", kind: "multiplier", value: balance.multiplier, after: physicalDamage });
  }

  if (params.bonusPercent) {
    const factor = 1 + params.bonusPercent / 100;

    physicalDamage = Math.floor(physicalDamage * factor);
    damageSteps.push({ label: "Контратака", side: "attacker", kind: "multiplier", value: factor, after: physicalDamage });
  }

  const dmgMult =
    damageMultiplier !== undefined && damageMultiplier >= 0 ? damageMultiplier : 1;

  const physicalDamageForTarget = Math.floor(physicalDamage * dmgMult);

  const resistanceResult = applyResistance(
    updatedTarget,
    physicalDamageForTarget,
    attack.damageType ?? "physical",
    { participants: allParticipants },
  );

  const { totalAdditionalDamage, additionalDamageBreakdown } = applyResistanceForAdditional(
    updatedTarget,
    damageCalculation.additionalDamage,
    dmgMult,
    allParticipants,
  );

  const totalFinalDamage = resistanceResult.finalDamage + totalAdditionalDamage;

  if (dmgMult !== 1) damageSteps.push({ label: "Частка шкоди", side: "attacker", kind: "multiplier", value: dmgMult, after: physicalDamageForTarget });

  damageSteps.push(...resistanceResult.steps);

  if (totalAdditionalDamage > 0) damageSteps.push({ label: "Додаткова шкода", side: "attacker", kind: "flat", value: totalAdditionalDamage, after: totalFinalDamage });

  const oldHp = updatedTarget.combatStats.currentHp;

  return {
    damageCalculation,
    physicalDamage,
    totalFinalDamage,
    resistanceResult,
    additionalDamageBreakdown,
    dmgMult,
    statModifier,
    updatedAttacker,
    updatedTarget,
    criticalEffectApplied,
    damageSteps,
    oldHp,
  };
}
