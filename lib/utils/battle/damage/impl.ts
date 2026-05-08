/**
 * Реалізація повного розрахунку урону з усіма модифікаторами
 */

import {
  calculatePercentBonus,
  formatFlatBonusBreakdown,
  formatPercentBonusBreakdown,
} from "../common";
import type { DamageCalculationResult } from "../types/damage-calculations";
import { calculateArtifactDamageBonus, calculatePassiveAbilityDamageBonus } from "./bonuses";
import {
  calculateSkillDamageFlatBonus,
  calculateSkillDamagePercentBonus,
  getSkillDamageFlatBreakdownEntries,
  getSkillDamagePercentBreakdownEntries,
} from "./skill";
import { getSkillsForDamageBonus } from "./skill-resolve";

import { AttackType, BATTLE_CONSTANTS } from "@/lib/constants/battle";
import type { BattleParticipant } from "@/types/battle";

export function calculateDamageWithModifiersImpl(
  attacker: BattleParticipant,
  baseDamage: number,
  statModifier: number,
  attackType: AttackType,
  context?: {
    allParticipants?: BattleParticipant[];
    additionalDamage?: Array<{ type: string; value: number }>;
    heroLevelPart?: number;
    heroDicePart?: number;
    heroDiceNotation?: string;
    weaponDiceNotation?: string;
  },
): DamageCalculationResult {
  const breakdown: string[] = [];

  const heroLevelPart = context?.heroLevelPart ?? 0;

  const heroDicePart = context?.heroDicePart ?? 0;

  const heroDiceNotation = context?.heroDiceNotation;

  const statLabel = attackType === AttackType.MELEE ? "STR" : "DEX";

  const baseWithStat = Math.max(
    BATTLE_CONSTANTS.MIN_DAMAGE,
    baseDamage + heroLevelPart + heroDicePart + statModifier,
  );

  breakdown.push(`Сума кубиків: ${baseDamage}`);

  if (heroLevelPart > 0 || heroDicePart > 0) {
    breakdown.push(`+ бонус ${statModifier} (${statLabel})`);

    const levelAndDice = heroLevelPart + heroDicePart;

    const levelLabel =
      heroDicePart > 0 && heroDiceNotation
        ? `рівень + кубики за рівнем (${heroDiceNotation})`
        : heroDicePart > 0
          ? "рівень + кубики за рівнем"
          : "рівень";

    breakdown.push(`+ ${levelAndDice} (${levelLabel})`);
    breakdown.push(`= ${baseWithStat} (база)`);
  } else {
    breakdown.push(`+ бонус ${statModifier} (${statLabel})`);
    breakdown.push(`= ${baseWithStat} (база)`);
  }

  const skillPercent = calculateSkillDamagePercentBonus(attacker, attackType);

  const hasApplicableSkills = getSkillsForDamageBonus(attacker, attackType).length > 0;

  const skillPercentEntries = getSkillDamagePercentBreakdownEntries(attacker, attackType);

  if (skillPercentEntries.length > 0) {
    for (const e of skillPercentEntries) {
      breakdown.push(`Бонус зі скілів: +${e.percent}% (${e.name})`);
    }
  } else if (hasApplicableSkills) {
    breakdown.push("Бонус зі скілів: +0%");
  }

  const skillFlat = calculateSkillDamageFlatBonus(attacker, attackType);

  const skillFlatEntries = getSkillDamageFlatBreakdownEntries(attacker, attackType);

  if (skillFlatEntries.length > 0) {
    for (const e of skillFlatEntries) {
      breakdown.push(`Flat бонус зі скілів: +${e.flat} (${e.name})`);
    }
  } else if (hasApplicableSkills) {
    breakdown.push("Flat бонус зі скілів: +0");
  }

  const artifactBonuses = calculateArtifactDamageBonus(attacker, attackType);

  if (artifactBonuses.percent > 0) breakdown.push(`Бонус артефакту: +${artifactBonuses.percent}%`);

  if (artifactBonuses.flat > 0) breakdown.push(`Бонус артефакту: +${artifactBonuses.flat}`);

  if (artifactBonuses.percent === 0 && artifactBonuses.flat === 0) {
    breakdown.push("Бонус артефакту: 0");
  }

  const passiveBonuses = calculatePassiveAbilityDamageBonus(attacker, context);

  const passivePercentBreakdown = formatPercentBonusBreakdown(
    "Бонус з пасивних здібностей",
    passiveBonuses.percent,
  );

  if (passivePercentBreakdown) breakdown.push(passivePercentBreakdown);

  const passiveFlatBreakdown = formatFlatBonusBreakdown(
    "Flat бонус з пасивок",
    passiveBonuses.flat,
  );

  if (passiveFlatBreakdown) breakdown.push(passiveFlatBreakdown);

  const totalPercent =
    skillPercent + artifactBonuses.percent + passiveBonuses.percent;

  const percentBonusDamage = calculatePercentBonus(baseWithStat, totalPercent);

  const totalFlat = skillFlat + artifactBonuses.flat + passiveBonuses.flat;

  const totalBeforeFloor = baseWithStat + percentBonusDamage + totalFlat;

  const totalDamage = Math.floor(totalBeforeFloor);

  breakdown.push(`──────────`);
  breakdown.push(`Сума ${totalBeforeFloor.toFixed(1)} = ${totalDamage} шкоди`);

  return {
    baseDamage: baseWithStat,
    skillPercentBonus: skillPercent,
    skillFlatBonus: skillFlat,
    artifactPercentBonus: artifactBonuses.percent,
    artifactFlatBonus: artifactBonuses.flat,
    passiveAbilityBonus: passiveBonuses.percent + passiveBonuses.flat,
    additionalDamage: context?.additionalDamage || [],
    totalDamage,
    breakdown,
  };
}
