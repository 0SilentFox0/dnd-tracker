import type {
  ComputeDamageBreakdownParams,
  DamageBreakdownResult,
} from "../types/damage-breakdown";
import { applyBalanceDamageMultiplier } from "./balance-multiplier";
import { getDefenderResistanceBreakdown } from "./breakdown-helpers";
import { heroAttackDamageParts, heroDamageContext } from "./hero-damage";
import { applyHeroDmDamageMultiplier } from "./hero-dm-multiplier";
import { calculateDamageWithModifiersImpl } from "./impl";
import { multiplierRow, ruleRow } from "./rows";
import { applyWeaponFlat } from "./weapon-flat";

import { AttackType } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { attackAbilityFor, attackDamageModifier, isFiveE } from "@/lib/utils/battle/attack/ability";
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
      ...(isFiveE(attacker) && { statKey: attackAbilityFor(attacker, attack) }),
    },
  );

  let totalDamage = damageCalculation.totalDamage;

  const breakdown = [...damageCalculation.breakdown];

  const steps: DamageStep[] = [...damageCalculation.steps];

  if (isCritical && !doubleDice) {
    totalDamage *= 2;
    breakdown.push(ruleRow(), multiplierRow(textRef("battleLog.damage.rows.crit"), 2, totalDamage));
    steps.push({ label: textRef("battleLog.damage.steps.crit"), side: "attacker", kind: "multiplier", value: 2, after: totalDamage });
  }

  const flat = applyWeaponFlat(totalDamage, attack);

  totalDamage = flat.damage;

  if (flat.step && flat.rows) {
    breakdown.push(...flat.rows);
    steps.push(flat.step);
  }

  const heroDm = applyHeroDmDamageMultiplier(
    attacker,
    attackTypeSafe,
    totalDamage,
  );

  totalDamage = heroDm.damage;

  if (heroDm.breakdownRow) {
    breakdown.push(ruleRow(), heroDm.breakdownRow);
    steps.push({ label: textRef("battleLog.damage.steps.archetype"), side: "attacker", kind: "multiplier", value: heroDm.multiplier, after: totalDamage });
  }

  const balance = applyBalanceDamageMultiplier(attacker, totalDamage);

  if (balance.multiplier !== 1) {
    totalDamage = balance.damage;
    breakdown.push(ruleRow(), multiplierRow(textRef("battleLog.damage.rows.fairBattle"), balance.multiplier.toFixed(2), totalDamage));
    steps.push({ label: textRef("battleLog.damage.steps.fairBattle"), side: "attacker", kind: "multiplier", value: balance.multiplier, after: totalDamage });
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
