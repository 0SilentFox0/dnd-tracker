/**
 * Розрахунок урону при попаданні: база, модифікатори, критичний ефект, опір
 */

import {
  getDiceAverage,
  getTotalDiceCount,
  mergeDiceFormulas,
} from "../../balance";
import { calculateDamageWithModifiers } from "../../damage";
import { applyHeroDmDamageMultiplier } from "../../damage/hero-dm-multiplier";
import { applyResistance } from "../../resistance";
import { checkTriggerCondition, getPassiveAbilitiesByTrigger } from "../../triggers";
import type { DamageCalculationResult } from "../../types/damage-calculations";
import { applyCriticalEffect } from "..";
import { applyResistanceForAdditional } from "./damage";

import { AttackType } from "@/lib/constants/battle";
import type { CriticalEffect } from "@/lib/constants/critical-effects";
import { getHeroDamageDiceForLevel } from "@/lib/constants/hero-scaling";
import type { BattleParticipant } from "@/types/battle";
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
    attack.type === AttackType.MELEE
      ? Math.floor((updatedAttacker.abilities.strength - 10) / 2)
      : Math.floor((updatedAttacker.abilities.dexterity - 10) / 2);

  const isHero = updatedAttacker.basicInfo.sourceType === "character";

  const heroLevelPart = isHero ? updatedAttacker.abilities.level : 0;

  const heroDiceNotation = isHero
    ? getHeroDamageDiceForLevel(updatedAttacker.abilities.level, attack.type as AttackType)
    : "";

  const weaponDiceCount = getTotalDiceCount(attack.damageDice ?? "");

  const heroDiceCount = getTotalDiceCount(heroDiceNotation);

  const fullDiceCount = weaponDiceCount + heroDiceCount;

  const clientSentFullRolls = isHero && fullDiceCount > 0 && damageRolls.length === fullDiceCount;

  const heroDicePart =
    heroDiceNotation && !clientSentFullRolls ? getDiceAverage(heroDiceNotation) : 0;

  const onAttackAbilities = getPassiveAbilitiesByTrigger(updatedAttacker, "on_attack");

  const additionalDamageModifiers: Array<{ type: string; value: number }> = [];

  for (const ability of onAttackAbilities) {
    if (
      checkTriggerCondition(ability.trigger, updatedAttacker, {
        target: updatedTarget,
        allParticipants,
      })
    ) {
      if (ability.effect.type === "additional_damage") {
        const modifierType = (ability.effect as { damageType?: string }).damageType || "fire";

        additionalDamageModifiers.push({
          type: modifierType,
          value: ability.effect.value || 0,
        });
      }
    }
  }

  const weaponDiceNotationForBreakdown = clientSentFullRolls
    ? mergeDiceFormulas(attack.damageDice ?? "", heroDiceNotation)
    : undefined;

  const heroDiceNotationForBreakdown = clientSentFullRolls ? "" : heroDiceNotation;

  const damageCalculation = calculateDamageWithModifiers(
    updatedAttacker,
    baseDamage,
    statModifier,
    attack.type as AttackType,
    {
      allParticipants,
      additionalDamage: additionalDamageModifiers,
      heroLevelPart,
      heroDicePart,
      heroDiceNotation: heroDiceNotationForBreakdown,
      weaponDiceNotation: weaponDiceNotationForBreakdown || attack.damageDice || undefined,
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

  if (criticalEffectApplied?.effect.type === "double_damage") physicalDamage *= 2;

  if (criticalEffectApplied?.effect.type === "max_damage") {
    const diceMatch = attack.damageDice?.match(/(\d+)d(\d+)([+-]\d+)?/);

    const count = diceMatch ? parseInt(diceMatch[1], 10) : 1;

    const size = diceMatch ? parseInt(diceMatch[2], 10) : 6;

    const diceMod = diceMatch?.[3] ? parseInt(diceMatch[3], 10) : 0;

    physicalDamage = count * size + diceMod + statModifier;
  }

  if (criticalEffectApplied?.effect.type === "additional_damage") {
    physicalDamage += Math.floor(Math.random() * 6) + 1;
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
  }

  const dmgMult =
    damageMultiplier !== undefined && damageMultiplier >= 0 ? damageMultiplier : 1;

  const physicalDamageForTarget = Math.floor(physicalDamage * dmgMult);

  const resistanceResult = applyResistance(
    updatedTarget,
    physicalDamageForTarget,
    attack.damageType ?? "physical",
  );

  const { totalAdditionalDamage, additionalDamageBreakdown } = applyResistanceForAdditional(
    updatedTarget,
    damageCalculation.additionalDamage,
    dmgMult,
  );

  const totalFinalDamage = resistanceResult.finalDamage + totalAdditionalDamage;

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
    oldHp,
  };
}
