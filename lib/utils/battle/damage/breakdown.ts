import type {
  ComputeDamageBreakdownParams,
  DamageBreakdownResult,
} from "../types/damage-breakdown";
import { applyBalanceDamageMultiplier } from "./balance-multiplier";
import { getDefenderResistanceBreakdown } from "./breakdown-helpers";
import { heroDamageContext } from "./hero-damage";
import { applyHeroDmDamageMultiplier } from "./hero-dm-multiplier";
import { calculateDamageWithModifiersImpl } from "./impl";

import { AttackType } from "@/lib/constants/battle";
import { getAttackAbilityModifier } from "@/lib/utils/common/calculations";
import type { DamageStep } from "@/types/battle";

export type {
  ComputeDamageBreakdownParams,
  DamageBreakdownResult,
} from "../types/damage-breakdown";

export function computeDamageBreakdown(
  params: ComputeDamageBreakdownParams,
): DamageBreakdownResult {
  const {
    attacker,
    target,
    attack,
    damageRolls,
    allParticipants,
    isCritical = false,
  } = params;

  const baseDamage = damageRolls.reduce((sum, roll) => sum + roll, 0);

  const typeStr = String(attack.type ?? "").toLowerCase();

  const isMelee = typeStr === AttackType.MELEE;

  const attackTypeSafe: AttackType = isMelee
    ? AttackType.MELEE
    : AttackType.RANGED;

  const statModifier = getAttackAbilityModifier(attacker.abilities, isMelee ? AttackType.MELEE : AttackType.RANGED);

  const additionalDamageModifiers: Array<{ type: string; value: number }> = [];

  const damageCalculation = calculateDamageWithModifiersImpl(
    attacker,
    baseDamage,
    statModifier,
    attackTypeSafe,
    {
      allParticipants,
      additionalDamage: additionalDamageModifiers,
      ...heroDamageContext(attacker, attack, damageRolls),
    },
  );

  let totalDamage = damageCalculation.totalDamage;

  const breakdown = [...damageCalculation.breakdown];

  const steps: DamageStep[] = [...damageCalculation.steps];

  if (isCritical) {
    totalDamage *= 2;
    breakdown.push(`──────────`);
    breakdown.push(`× 2 (крит) = ${totalDamage} урону`);
    steps.push({ label: "Критичне влучання", side: "attacker", kind: "multiplier", value: 2, after: totalDamage });
  }

  const heroDm = applyHeroDmDamageMultiplier(
    attacker,
    attackTypeSafe,
    totalDamage,
  );

  totalDamage = heroDm.damage;

  if (heroDm.breakdownLine) {
    breakdown.push(`──────────`);
    breakdown.push(heroDm.breakdownLine);
    steps.push({ label: "Коефіцієнт DM", side: "attacker", kind: "multiplier", value: heroDm.multiplier, after: totalDamage });
  }

  const balance = applyBalanceDamageMultiplier(attacker, totalDamage);

  if (balance.multiplier !== 1) {
    totalDamage = balance.damage;
    breakdown.push(`──────────`);
    breakdown.push(`× ${balance.multiplier.toFixed(2)} (рівний бій) = ${totalDamage}`);
    steps.push({ label: "Рівний бій", side: "attacker", kind: "multiplier", value: balance.multiplier, after: totalDamage });
  }

  const damageType = attack.damageType ?? "physical";

  const { targetBreakdown, finalDamage, targetSteps } = getDefenderResistanceBreakdown(
    target,
    damageType,
    totalDamage,
  );

  steps.push(...targetSteps);

  return {
    breakdown,
    totalDamage,
    targetBreakdown,
    finalDamage,
    steps,
  };
}
