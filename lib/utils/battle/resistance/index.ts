/**
 * Імунітети та опір у бою — з прапорців resistance уніфікованих умінь.
 */

import { BATTLE_CONSTANTS } from "@/lib/constants/battle";
import { collectModifiers } from "@/lib/utils/abilities/engine/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/participants";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import type { BattleParticipant, DamageStep } from "@/types/battle";

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
  steps: DamageStep[];
}

function matchesDamageType(flagType: string, damageType: string, fromSpell: boolean): boolean {
  const t = damageType.toLowerCase();

  const f = flagType.toLowerCase();

  return f === t || (f === "physical" && PHYSICAL_DAMAGE_TYPES.includes(t)) || (f === "spell" && (fromSpell || t === "spell" || t === "magic"));
}

function matchingResistances(target: BattleParticipant, damageType: string, opts: ResistanceOptions = {}) {
  const { entries } = collectModifiers(withSelf(opts.participants ?? [], target), target.basicInfo.id, { flag: "resistance" }, opts.extra);

  return entries.flatMap((e) =>
    e.flag?.flag === "resistance" && matchesDamageType(e.flag.damageType, damageType, opts.fromSpell === true)
      ? [{ label: e.label, percent: e.flag.percent, icon: e.icon }]
      : [],
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

  const matches = matchingResistances(target, damageType, opts);

  const immune = matches.find((m) => m.percent >= 100);

  if (immune) {
    breakdown.push(`${damage} ${damageType} → ІМУНІТЕТ (0 урону)`);

    return {
      finalDamage: 0,
      immunityApplied: true,
      resistanceApplied: false,
      breakdown,
      steps: [{ label: immune.label, side: "target", kind: "immunity", value: -100, after: 0, icon: immune.icon }],
    };
  }

  const resistancePercent = Math.min(BATTLE_CONSTANTS.RESISTANCE_PERCENT_CAP, matches.reduce((sum, m) => sum + m.percent, 0));

  if (resistancePercent > 0) {
    finalDamage = Math.floor(damage * (1 - resistancePercent / BATTLE_CONSTANTS.PERCENT_DIVISOR));
    breakdown.push(`${damage} ${damageType} → -${resistancePercent}% опір (${finalDamage} урону)`);

    let used = 0;

    const steps = matches.map((m, i): DamageStep => {
      used = Math.min(resistancePercent, used + m.percent);

      const after = i === matches.length - 1 ? finalDamage : Math.floor(damage * (1 - used / BATTLE_CONSTANTS.PERCENT_DIVISOR));

      return { label: m.label, side: "target", kind: "percent", value: -m.percent, after, icon: m.icon };
    });

    return { finalDamage, immunityApplied: false, resistanceApplied: true, breakdown, steps };
  }

  breakdown.push(`${damage} ${damageType} урону`);

  return { finalDamage, immunityApplied: false, resistanceApplied: false, breakdown, steps: [] };
}
