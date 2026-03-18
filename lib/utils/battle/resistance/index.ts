/**
 * Утиліти для роботи з імунітетами та опором в бою.
 * Враховує опір з расових здібностей та зі скілів (extras.resistances.physical / spell).
 */

import { getParticipantExtras } from "../participant";
import { extractResistanceValue, findRacialAbilityByPattern } from "./helpers";

import { BattleParticipant } from "@/types/battle";

const PHYSICAL_DAMAGE_TYPES = ["slashing", "piercing", "bludgeoning", "physical"];

function isPhysicalDamageType(damageType: string): boolean {
  return PHYSICAL_DAMAGE_TYPES.includes(damageType.toLowerCase());
}

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
 * Отримує значення опору (resistance) до типу урону з расових здібностей (від 0 до 1).
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
 * Повертає сумарний відсоток опору (0–100): скіли (extras.resistances) + расовий опір, кеп 100%.
 * Для фізичних типів урону використовується extras.resistances.physical, для spell — .spell.
 */
export function getCombinedResistancePercent(
  target: BattleParticipant,
  damageType: string,
): number {
  const extras = getParticipantExtras(target);

  const resistances = extras.resistances ?? {};

  let skillPercent = 0;

  if (damageType.toLowerCase() === "spell") {
    skillPercent = resistances.spell ?? 0;
  } else if (isPhysicalDamageType(damageType)) {
    skillPercent = resistances.physical ?? 0;
  }

  const racialResistance = getResistance(target, damageType);

  const racialPercent = Math.round(racialResistance * 100);

  const total = Math.min(100, skillPercent + racialPercent);

  return total;
}

/**
 * Застосовує імунітети та опір до урону (расовий + скіловий з extras.resistances).
 * Для фізичних типів (slashing, piercing, bludgeoning, physical) враховується extras.resistances.physical,
 * для spell — extras.resistances.spell; потім додається расовий опір за damageType (кеп 100%).
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

  const resistancePercent = getCombinedResistancePercent(target, damageType);

  if (resistancePercent > 0) {
    const factor = 1 - resistancePercent / 100;

    finalDamage = Math.floor(damage * factor);
    breakdown.push(
      `${damage} ${damageType} → -${resistancePercent}% опір (${finalDamage} урону)`,
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

export { extractResistanceValue, findRacialAbilityByPattern } from "./helpers";
