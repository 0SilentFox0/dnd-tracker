/**
 * Утиліта для обчислення breakdown урону (для превью в UI).
 */

import type {
  ComputeDamageBreakdownParams,
  DamageBreakdownMultiTargetResult,
  DamageBreakdownResult,
  DamageBreakdownTargetResult,
} from "../types/damage-breakdown";
import { getDefenderResistanceBreakdown } from "./breakdown-helpers";
import { heroDamageContext } from "./hero-damage";
import { applyHeroDmDamageMultiplier } from "./hero-dm-multiplier";
import { calculateDamageWithModifiersImpl } from "./impl";

import { AttackType } from "@/lib/constants/battle";
import { getAttackAbilityModifier } from "@/lib/utils/common/calculations";
import { diceCount } from "@/lib/utils/common/dice";
import type { BattleAttack, BattleParticipant, DamageStep } from "@/types/battle";

export type {
  ComputeDamageBreakdownParams,
  DamageBreakdownMultiTargetResult,
  DamageBreakdownResult,
  DamageBreakdownTargetResult,
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

  const isMelee = typeStr === "melee";

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

/**
 * Обчислює breakdown урону для кількох цілей (AOE або multi-target ranged).
 * Для multi-target ranged: кожна ціль отримує окремий кидок (damageRolls[i*dicePerTarget..(i+1)*dicePerTarget]).
 */
export function computeDamageBreakdownMultiTarget(params: {
  attacker: BattleParticipant;
  targets: BattleParticipant[];
  attack: BattleAttack;
  damageRolls: number[];
  allParticipants: BattleParticipant[];
  isCritical?: boolean;
}): DamageBreakdownMultiTargetResult {
  if (params.targets.length === 0) {
    return { breakdown: [], totalDamage: 0, targets: [] };
  }

  const isAoe = params.attack.targetType === "aoe";

  const isMultiTargetRanged =
    !isAoe &&
    params.attack.type === AttackType.RANGED &&
    (params.attacker.combatStats.maxTargets ?? 1) > 1 &&
    params.targets.length > 1;

  const dicePerTarget = diceCount(params.attack.damageDice ?? "");

  const hasPerTargetRolls =
    isMultiTargetRanged &&
    dicePerTarget > 0 &&
    params.damageRolls.length >= params.targets.length * dicePerTarget;

  if (isMultiTargetRanged && hasPerTargetRolls) {
    const targetsResult: DamageBreakdownTargetResult[] = [];

    let totalDamage = 0;

    let breakdown: string[] = [];

    for (let i = 0; i < params.targets.length; i++) {
      const target = params.targets[i];

      const rollsForTarget = params.damageRolls.slice(
        i * dicePerTarget,
        (i + 1) * dicePerTarget,
      );

      const single = computeDamageBreakdown({
        attacker: params.attacker,
        target,
        attack: params.attack,
        damageRolls: rollsForTarget,
        allParticipants: params.allParticipants,
        isCritical: params.isCritical,
      });

      if (i === 0) breakdown = single.breakdown;

      totalDamage += single.totalDamage;

      const damageType = params.attack.damageType ?? "physical";

      const { targetBreakdown, finalDamage, targetSteps } = getDefenderResistanceBreakdown(
        target,
        damageType,
        single.totalDamage,
      );

      targetsResult.push({
        targetId: target.basicInfo.id,
        targetName: target.basicInfo.name,
        targetBreakdown,
        finalDamage,
        steps: [...single.steps.filter((st) => st.side === "attacker"), ...targetSteps],
      });
    }

    return {
      breakdown,
      totalDamage,
      targets: targetsResult,
    };
  }

  const firstTarget = params.targets[0];

  const single = computeDamageBreakdown({
    attacker: params.attacker,
    target: firstTarget,
    attack: params.attack,
    damageRolls: params.damageRolls,
    allParticipants: params.allParticipants,
    isCritical: params.isCritical,
  });

  const damageType = params.attack.damageType ?? "physical";

  const dist = params.attack.damageDistribution;

  const n = params.targets.length;

  const targetsResult: DamageBreakdownTargetResult[] = [];

  for (let i = 0; i < params.targets.length; i++) {
    const target = params.targets[i];

    const dmgMult = dist && dist[i] != null ? (dist[i] as number) / 100 : 1 / n;

    const damageForTarget = Math.floor(single.totalDamage * dmgMult);

    const { targetBreakdown, finalDamage, targetSteps } = getDefenderResistanceBreakdown(
      target,
      damageType,
      damageForTarget,
    );

    const attackerSteps = single.steps.filter((st) => st.side === "attacker");

    const share: DamageStep[] = dmgMult === 1 ? [] : [{ label: "Частка шкоди", side: "attacker", kind: "multiplier", value: dmgMult, after: damageForTarget }];

    targetsResult.push({
      targetId: target.basicInfo.id,
      targetName: target.basicInfo.name,
      targetBreakdown,
      finalDamage,
      steps: [...attackerSteps, ...share, ...targetSteps],
    });
  }

  return {
    breakdown: single.breakdown,
    totalDamage: single.totalDamage,
    targets: targetsResult,
  };
}
