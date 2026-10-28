import type {
  ComputeDamageBreakdownParams,
  DamageBreakdownResult,
} from "../types/damage-breakdown";
import { applyBalanceDamageMultiplier } from "./balance-multiplier";
import { getDefenderResistanceBreakdown } from "./breakdown-helpers";
import { heroAttackDamageParts, heroDamageContext } from "./hero-damage";
import { applyHeroDmDamageMultiplier } from "./hero-dm-multiplier";
import { calculateDamageWithModifiersImpl } from "./impl";
import { applyWeaponFlat } from "./weapon-flat";

import { AttackType } from "@/lib/constants/battle";
import { attackAbilityLabelFor, attackDamageModifier, isFiveE } from "@/lib/utils/battle/attack/ability";
import { critDoublesDice } from "@/lib/utils/battle/attack/crit-dice";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { diceCount } from "@/lib/utils/common/dice";
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
    rules,
  } = params;

  const doubleDice = critDoublesDice(rules, isCritical);

  const set = doubleDice ? diceCount(heroAttackDamageParts(attacker, attack).formula) : 0;

  const hasSecondSet = set > 0 && damageRolls.length >= 2 * set;

  const sum = (rolls: number[]) => rolls.reduce((total, roll) => total + roll, 0);

  const baseDamage = doubleDice && set > 0 && !hasSecondSet ? sum(damageRolls) * 2 : sum(damageRolls);

  const contextRolls = hasSecondSet ? damageRolls.slice(0, set) : damageRolls;

  const typeStr = String(attack.type ?? "").toLowerCase();

  const isMelee = typeStr === AttackType.MELEE;

  const attackTypeSafe: AttackType = isMelee
    ? AttackType.MELEE
    : AttackType.RANGED;

  const statModifier = attackDamageModifier(attacker, attack, allParticipants);

  const additionalDamageModifiers: Array<{ type: string; value: number }> = [];

  const damageCalculation = calculateDamageWithModifiersImpl(
    attacker,
    baseDamage,
    statModifier,
    attackTypeSafe,
    {
      allParticipants,
      targetId: target.basicInfo.id,
      additionalDamage: additionalDamageModifiers,
      ...heroDamageContext(attacker, attack, contextRolls),
      ...(isFiveE(attacker) && { statLabel: attackAbilityLabelFor(attacker, attack) }),
    },
  );

  let totalDamage = damageCalculation.totalDamage;

  const breakdown = [...damageCalculation.breakdown];

  const steps: DamageStep[] = [...damageCalculation.steps];

  if (isCritical && !doubleDice) {
    totalDamage *= 2;
    breakdown.push(`──────────`);
    breakdown.push(`× 2 (крит) = ${totalDamage} урону`);
    steps.push({ label: "Критичне влучання", side: "attacker", kind: "multiplier", value: 2, after: totalDamage });
  }

  const flat = applyWeaponFlat(totalDamage, attack);

  totalDamage = flat.damage;

  if (flat.step && flat.line) {
    breakdown.push(`──────────`);
    breakdown.push(flat.line);
    steps.push(flat.step);
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
    steps.push({ label: "Архетип", side: "attacker", kind: "multiplier", value: heroDm.multiplier, after: totalDamage });
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
    undefined,
    attackKindOf(attack.type),
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
