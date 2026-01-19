/**
 * Утиліти для роботи з імунітетами та опором в бою
 */

import { BattleParticipant } from "@/lib/types/battle";
import { findRacialAbilityByPattern, extractResistanceValue } from "./battle-resistance-helpers";
import { BATTLE_CONSTANTS } from "@/lib/constants/battle";

/**
 * Результат застосування імунітетів/опору
 */
export interface ResistanceResult {
  finalDamage: number;
  immunityApplied: boolean;
  resistanceApplied: boolean;
  breakdown: string[];
}

/**
 * Перевіряє чи є імунітет до типу урону
 * @param target - ціль атаки
 * @param damageType - тип урону (fire, poison, physical, тощо)
 * @returns true якщо є імунітет
 */
export function hasImmunity(
  target: BattleParticipant,
  damageType: string
): boolean {
  return findRacialAbilityByPattern(target, damageType, "immunity") !== undefined;
}

/**
 * Отримує значення опору (resistance) до типу урону (від 0 до 1)
 * Наприклад, 0.5 = 50% опір (урон зменшується вдвічі)
 * @param target - ціль атаки
 * @param damageType - тип урону
 * @returns значення опору (0 = немає опору, 0.5 = 50% опір, 1 = повний імунітет)
 */
export function getResistance(
  target: BattleParticipant,
  damageType: string
): number {
  const racial = findRacialAbilityByPattern(target, damageType, "resistance");
  
  if (!racial) {
    return 0; // Немає опору
  }

  return extractResistanceValue(racial) || 0;
}

/**
 * Застосовує імунітети та опір до урону
 * @param target - ціль атаки
 * @param damage - початковий урон
 * @param damageType - тип урону
 * @returns результат з фінальним уроном та breakdown
 */
export function applyResistance(
  target: BattleParticipant,
  damage: number,
  damageType: string
): ResistanceResult {
  const breakdown: string[] = [];
  let finalDamage = damage;

  // Перевіряємо імунітет
  if (hasImmunity(target, damageType)) {
    finalDamage = 0;
    breakdown.push(`${damage} ${damageType} → ІМУНІТЕТ (0 урону)`);
    return {
      finalDamage: 0,
      immunityApplied: true,
      resistanceApplied: false,
      breakdown,
    };
  }

  // Перевіряємо опір
  const resistance = getResistance(target, damageType);
  if (resistance > 0) {
    const resistancePercent = Math.round(resistance * 100);
    const reducedDamage = Math.floor(damage * (1 - resistance));
    finalDamage = reducedDamage;
    breakdown.push(
      `${damage} ${damageType} → -${resistancePercent}% опір (${finalDamage} урону)`
    );
    return {
      finalDamage,
      immunityApplied: false,
      resistanceApplied: true,
      breakdown,
    };
  }

  // Немає імунітету або опору
  breakdown.push(`${damage} ${damageType} урону`);
  return {
    finalDamage,
    immunityApplied: false,
    resistanceApplied: false,
    breakdown,
  };
}

/**
 * Застосовує імунітети/опір для масиву типів урону
 * Корисно для складних атак з кількома типами урону
 * @param target - ціль атаки
 * @param damageByType - об'єкт з типами урону та значеннями
 * @returns результат з фінальним уроном та breakdown
 */
export function applyResistanceToMultipleDamage(
  target: BattleParticipant,
  damageByType: Record<string, number>
): ResistanceResult {
  const breakdown: string[] = [];
  let totalFinalDamage = 0;
  let hasImmunity = false;
  let hasResistance = false;

  for (const [damageType, damage] of Object.entries(damageByType)) {
    if (damage <= 0) continue;

    const result = applyResistance(target, damage, damageType);
    totalFinalDamage += result.finalDamage;
    
    if (result.immunityApplied) {
      hasImmunity = true;
    }
    if (result.resistanceApplied) {
      hasResistance = true;
    }
    
    breakdown.push(...result.breakdown);
  }

  return {
    finalDamage: totalFinalDamage,
    immunityApplied: hasImmunity,
    resistanceApplied: hasResistance,
    breakdown,
  };
}
