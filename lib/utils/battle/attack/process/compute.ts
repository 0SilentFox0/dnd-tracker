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
import type { DamageCalculationResult } from "../../types/damage-calculations";
import { applyCriticalEffect } from "..";
import { applyResistanceForAdditional } from "./damage";

import { AttackType } from "@/lib/constants/battle";
import type { CriticalEffect } from "@/lib/constants/critical-effects";
import { getHeroDamageDiceForLevel } from "@/lib/constants/hero-scaling";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import { attackAbilityLabel, getAttackAbilityModifier } from "@/lib/utils/common/calculations";
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

  const additionalDamageModifiers: Array<{ type: string; value: number }> = [];

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
    const diceMatch = attack.damageDice?.match(/(\d+)d(\d+)([+-]\d+)?/);

    const count = diceMatch ? parseInt(diceMatch[1], 10) : 1;

    const size = diceMatch ? parseInt(diceMatch[2], 10) : 6;

    const diceMod = diceMatch?.[3] ? parseInt(diceMatch[3], 10) : 0;

    const before = physicalDamage;

    physicalDamage = count * size + diceMod + statModifier;
    damageSteps.push({ label: criticalEffectApplied.name, side: "attacker", kind: "flat", value: physicalDamage - before, after: physicalDamage });
  }

  if (criticalEffectApplied?.effect.type === "additional_damage") {
    const extra = Math.floor(Math.random() * 6) + 1;

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
