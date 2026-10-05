/**
 * Імунітети та опір у бою — з прапорців resistance уніфікованих умінь.
 */

import { BATTLE_CONSTANTS } from "@/lib/constants/battle";
import { findFlags } from "@/lib/utils/abilities/engine/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/participants";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import { BattleParticipant } from "@/types/battle";

const PHYSICAL_DAMAGE_TYPES = ["slashing", "piercing", "bludgeoning", "physical"];

export interface ResistanceOptions {
  participants?: BattleParticipant[];
  fromSpell?: boolean;
  /** модифікатори поточної дії для цілі (фаза before) */
  extra?: StaticEffect[];
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

function matchesDamageType(flagType: string, damageType: string, fromSpell: boolean): boolean {
  const t = damageType.toLowerCase();

  const f = flagType.toLowerCase();

  return f === t || (f === "physical" && PHYSICAL_DAMAGE_TYPES.includes(t)) || (f === "spell" && (fromSpell || t === "spell" || t === "magic"));
}

function matchingResistances(target: BattleParticipant, damageType: string, opts: ResistanceOptions = {}) {
  return findFlags(withSelf(opts.participants ?? [], target), target.basicInfo.id, "resistance", opts.extra).filter((f) =>
    matchesDamageType(f.damageType, damageType, opts.fromSpell === true),
  );
}

export function hasImmunity(target: BattleParticipant, damageType: string, opts?: ResistanceOptions): boolean {
  return matchingResistances(target, damageType, opts).some((f) => f.percent >= 100);
}

/** Сумарний відсоток опору (0–100) з прапорців resistance. */
export function getCombinedResistancePercent(target: BattleParticipant, damageType: string, opts?: ResistanceOptions): number {
  const total = matchingResistances(target, damageType, opts).reduce((sum, f) => sum + f.percent, 0);

  return Math.min(BATTLE_CONSTANTS.RESISTANCE_PERCENT_CAP, total);
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
  damageType: string,
  opts?: ResistanceOptions,
): ResistanceResult {
  const breakdown: string[] = [];

  let finalDamage = damage;

  // Перевіряємо імунітет
  if (hasImmunity(target, damageType, opts)) {
    finalDamage = 0;
    breakdown.push(`${damage} ${damageType} → ІМУНІТЕТ (0 урону)`);

    return {
      finalDamage: 0,
      immunityApplied: true,
      resistanceApplied: false,
      breakdown,
    };
  }

  const resistancePercent = getCombinedResistancePercent(target, damageType, opts);

  if (resistancePercent > 0) {
    const factor = 1 - resistancePercent / BATTLE_CONSTANTS.PERCENT_DIVISOR;

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
  damageByType: Record<string, number>,
  opts?: ResistanceOptions,
): ResistanceResult {
  const breakdown: string[] = [];

  let totalFinalDamage = 0;

  let hasImmunity = false;

  let hasResistance = false;

  for (const [damageType, damage] of Object.entries(damageByType)) {
    if (damage <= 0) continue;

    const result = applyResistance(target, damage, damageType, opts);

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

