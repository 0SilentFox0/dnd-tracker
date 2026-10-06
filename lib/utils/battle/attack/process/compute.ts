/**
 * Розрахунок урону при попаданні: база, модифікатори, критичний ефект, опір
 */

import { calculateDamageWithModifiers } from "../../damage";
import { heroDamageContext, maxDamageCritDice } from "../../damage/hero-damage";
import { applyHeroDmDamageMultiplier } from "../../damage/hero-dm-multiplier";
import { applyResistance } from "../../resistance";
import type { DamageCalculationResult } from "../../types/damage-calculations";
import { applyCriticalEffect } from "..";
import { applyResistanceForAdditional } from "./damage";

import { AttackType } from "@/lib/constants/battle";
import type { CriticalEffect } from "@/lib/constants/critical-effects";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import { attackAbilityLabel, getAttackAbilityModifier } from "@/lib/utils/common/calculations";
import { rollDice } from "@/lib/utils/common/dice";
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

    physicalDamage = maxDamageCritDice(updatedAttacker, attack) + statModifier;
    damageSteps.push({ label: criticalEffectApplied.name, side: "attacker", kind: "flat", value: physicalDamage - before, after: physicalDamage });
  }

  if (criticalEffectApplied?.effect.type === "additional_damage") {
    const extra = rollDice("1d6");

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
