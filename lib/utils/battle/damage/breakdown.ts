/**
 * Утиліта для обчислення breakdown урону (для превью в UI).
 */

import {
  getDiceAverage,
  getTotalDiceCount,
  mergeDiceFormulas,
} from "../balance";
import {
  checkTriggerCondition,
  getPassiveAbilitiesByTrigger,
} from "../triggers";
import type {
  ComputeDamageBreakdownParams,
  DamageBreakdownMultiTargetResult,
  DamageBreakdownResult,
  DamageBreakdownTargetResult,
} from "../types/damage-breakdown";
import { getDefenderResistanceBreakdown } from "./breakdown-helpers";
import { calculateDamageWithModifiersImpl } from "./impl";

import { AttackType } from "@/lib/constants/battle";
import { getHeroDamageDiceForLevel } from "@/lib/constants/hero-scaling";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

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

  const statModifier = isMelee
    ? Math.floor((attacker.abilities.strength - 10) / 2)
    : Math.floor((attacker.abilities.dexterity - 10) / 2);

  const isHero = attacker.basicInfo.sourceType === "character";

  const heroLevelPart = isHero ? attacker.abilities.level : 0;

  const heroDiceNotation = isHero
    ? getHeroDamageDiceForLevel(attacker.abilities.level, attackTypeSafe)
    : "";

  const weaponDiceCount = getTotalDiceCount(attack.damageDice ?? "");

  const heroDiceCount = getTotalDiceCount(heroDiceNotation);

  const fullDiceCount = weaponDiceCount + heroDiceCount;

  const clientSentFullRolls =
    isHero && fullDiceCount > 0 && damageRolls.length === fullDiceCount;

  const heroDicePart =
    heroDiceNotation && !clientSentFullRolls
      ? getDiceAverage(heroDiceNotation)
      : 0;

  const onAttackAbilities = getPassiveAbilitiesByTrigger(attacker, "on_attack");

  const additionalDamageModifiers: Array<{ type: string; value: number }> = [];

  for (const ability of onAttackAbilities) {
    if (
      checkTriggerCondition(ability.trigger, attacker, {
        target,
        allParticipants,
      })
    ) {
      if (ability.effect.type === "additional_damage") {
        const modifierType =
          (ability.effect as { damageType?: string }).damageType || "fire";

        const modifierValue = ability.effect.value || 0;

        additionalDamageModifiers.push({
          type: modifierType,
          value: modifierValue,
        });
      }
    }
  }

  const weaponDiceNotationForBreakdown = clientSentFullRolls
    ? mergeDiceFormulas(attack.damageDice ?? "", heroDiceNotation)
    : undefined;

  const heroDiceNotationForBreakdown = clientSentFullRolls
    ? ""
    : heroDiceNotation;

  const damageCalculation = calculateDamageWithModifiersImpl(
    attacker,
    baseDamage,
    statModifier,
    attackTypeSafe,
    {
      allParticipants,
      additionalDamage: additionalDamageModifiers,
      heroLevelPart,
      heroDicePart,
      heroDiceNotation: heroDiceNotationForBreakdown,
      weaponDiceNotation:
        weaponDiceNotationForBreakdown || attack.damageDice || undefined,
    },
  );

  let totalDamage = damageCalculation.totalDamage;

  const breakdown = [...damageCalculation.breakdown];

  if (isCritical) {
    totalDamage *= 2;
    breakdown.push(`──────────`);
    breakdown.push(`× 2 (крит) = ${totalDamage} урону`);
  }

  const damageType = attack.damageType ?? "physical";

  const { targetBreakdown, finalDamage } = getDefenderResistanceBreakdown(
    target,
    damageType,
    totalDamage,
  );

  return {
    breakdown,
    totalDamage,
    targetBreakdown,
    finalDamage,
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

  const dicePerTarget = getTotalDiceCount(params.attack.damageDice ?? "");

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

      const { targetBreakdown, finalDamage } = getDefenderResistanceBreakdown(
        target,
        damageType,
        single.totalDamage,
      );

      targetsResult.push({
        targetId: target.basicInfo.id,
        targetName: target.basicInfo.name,
        targetBreakdown,
        finalDamage,
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

    const { targetBreakdown, finalDamage } = getDefenderResistanceBreakdown(
      target,
      damageType,
      damageForTarget,
    );

    targetsResult.push({
      targetId: target.basicInfo.id,
      targetName: target.basicInfo.name,
      targetBreakdown,
      finalDamage,
    });
  }

  return {
    breakdown: single.breakdown,
    totalDamage: single.totalDamage,
    targets: targetsResult,
  };
}
