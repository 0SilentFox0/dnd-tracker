/**
 * Допоміжні функції для роботи з расовими здібностями та імунітетами
 */

import { BattleParticipant, RacialAbility } from "@/lib/types/battle";
import { BATTLE_CONSTANTS } from "@/lib/constants/battle";

/**
 * Знаходить расову здібність за патерном
 * @param target - учасник бою
 * @param damageType - тип урону
 * @param patternType - тип патерну ("immunity" | "resistance")
 * @returns расова здібність або undefined
 */
export function findRacialAbilityByPattern(
  target: BattleParticipant,
  damageType: string,
  patternType: "immunity" | "resistance"
): RacialAbility | undefined {
  const damageTypeLower = damageType.toLowerCase();

  for (const racial of target.racialAbilities) {
    const abilityId = racial.id.toLowerCase();
    const abilityName = racial.name.toLowerCase();

    // Перевіряємо загальні патерни
    const hasPattern = patternType === "immunity"
      ? (abilityId.includes("immunity") || abilityName.includes("імунітет") || abilityName.includes("immunity"))
      : (abilityId.includes("resistance") || abilityName.includes("опір") || abilityName.includes("resistance"));

    if (hasPattern) {
      // Перевіряємо конкретний тип урону
      if (abilityId.includes(damageTypeLower) || abilityName.includes(damageTypeLower)) {
        return racial;
      }

      // Спеціальні випадки для вогню та отрути
      if (damageTypeLower === "fire" && (abilityId.includes("fire") || abilityName.includes("вогонь"))) {
        return racial;
      }
      if (damageTypeLower === "poison" && (abilityId.includes("poison") || abilityName.includes("отрута"))) {
        return racial;
      }
      if (damageTypeLower === "physical" && (abilityId.includes("physical") || abilityName.includes("фізичний"))) {
        return racial;
      }
    }
  }

  return undefined;
}

/**
 * Отримує значення опору з расової здібності
 * @param racial - расова здібність
 * @returns значення опору (0-1) або undefined
 */
export function extractResistanceValue(racial: RacialAbility): number | undefined {
  const effect = racial.effect as Record<string, unknown>;
  
  if (typeof effect !== "object" || effect === null) {
    return undefined;
  }

  // Можливі формати: { value: 0.5 }, { percent: 50 }, { resistance: 50 }
  const value = (effect.value as number) ||
               ((effect.percent as number) ? (effect.percent as number) / 100 : undefined) ||
               ((effect.resistance as number) ? (effect.resistance as number) / 100 : undefined);

  if (value !== undefined && value > 0) {
    return Math.min(
      BATTLE_CONSTANTS.MAX_RESISTANCE,
      Math.max(BATTLE_CONSTANTS.MIN_RESISTANCE, value)
    );
  }

  // Якщо немає значення, але є опір, за замовчуванням з константи
  return BATTLE_CONSTANTS.DEFAULT_RESISTANCE_PERCENT / 100;
}
