import { BATTLE_CONSTANTS } from "@/lib/constants/battle";
import { PHYSICAL_DAMAGE_TYPES } from "@/lib/constants/damage";
import { textRef } from "@/lib/i18n/text-ref";
import { collectModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/core/participants";
import type { AttackKind, StaticEffect } from "@/lib/utils/abilities/schema";
import type { BattleParticipant, DamageStep } from "@/types/battle";
import type { LogLine } from "@/types/text";

export interface ResistanceOptions {
  participants?: BattleParticipant[];
  fromSpell?: boolean;
  /** вид атаки, що завдає шкоди; опір з attackKind діє лише на нього */
  attackKind?: AttackKind;
  /** модифікатори поточної дії для цілі (фаза before) */
  extra?: StaticEffect[];
  /** школа заклинання; опір зі school діє лише на нього */
  school?: string | null;
}

/**
 * Результат застосування імунітетів/опору
 */
export interface ResistanceResult {
  finalDamage: number;
  immunityApplied: boolean;
  resistanceApplied: boolean;
  breakdown: LogLine[];
  steps: DamageStep[];
}

/** Текст для логу, коли шкоду повністю зняв імунітет: «⛔ Дракон: Імунітет до вогню». */
export function immunityNote(targetName: string, steps: DamageStep[]): LogLine {
  const step = steps.find((s) => s.kind === "immunity");

  return step ? textRef("battleLog.resistance.immunityNote", { target: targetName, label: step.label }) : "";
}

const clampPercent = (n: number) => Math.max(-BATTLE_CONSTANTS.RESISTANCE_PERCENT_CAP, Math.min(BATTLE_CONSTANTS.RESISTANCE_PERCENT_CAP, n));

function matchesDamageType(flagType: string, damageType: string, fromSpell: boolean): boolean {
  const t = damageType.toLowerCase();

  const f = flagType.toLowerCase();

  return f === "all" || f === t || (f === "physical" && PHYSICAL_DAMAGE_TYPES.includes(t)) || (f === "spell" && (fromSpell || t === "spell" || t === "magic"));
}

function matchingResistances(target: BattleParticipant, damageType: string, opts: ResistanceOptions = {}) {
  const { entries } = collectModifiers(withSelf(opts.participants ?? [], target), target.basicInfo.id, { flag: "resistance" }, opts.extra);

  return entries.flatMap((e) =>
    e.flag?.flag === "resistance" &&
    (!e.flag.attackKind || e.flag.attackKind === opts.attackKind) &&
    (!e.flag.school || (opts.fromSpell === true && e.flag.school === opts.school)) &&
    matchesDamageType(e.flag.damageType, damageType, opts.fromSpell === true)
      ? [{ label: e.label, percent: e.flag.percent, icon: e.icon }]
      : [],
  );
}

export function hasImmunity(target: BattleParticipant, damageType: string, opts?: ResistanceOptions): boolean {
  return matchingResistances(target, damageType, opts).some((f) => f.percent >= 100);
}

/** Сумарний відсоток опору (−100…100; від'ємний = вразливість) з прапорців resistance. */
export function getCombinedResistancePercent(target: BattleParticipant, damageType: string, opts?: ResistanceOptions): number {
  const total = matchingResistances(target, damageType, opts).reduce((sum, f) => sum + f.percent, 0);

  return clampPercent(total);
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
export function applyResistance(target: BattleParticipant, damage: number, damageType: string, opts?: ResistanceOptions): ResistanceResult {
  const result = applyPercentResistance(target, damage, damageType, opts);

  const threshold = damageThreshold(target, opts);

  if (threshold === 0 || result.finalDamage <= 0 || result.finalDamage >= threshold) return result;

  return {
    ...result,
    finalDamage: 0,
    breakdown: [...result.breakdown, textRef("battleLog.resistance.threshold", { damage: result.finalDamage, threshold })],
    steps: [...result.steps, { label: textRef("battleLog.resistance.thresholdStep", { threshold }), side: "target", kind: "immunity", value: -100, after: 0 }],
  };
}

function damageThreshold(target: BattleParticipant, opts: ResistanceOptions = {}): number {
  const { entries } = collectModifiers(withSelf(opts.participants ?? [], target), target.basicInfo.id, { flag: "damageThreshold" }, opts.extra);

  return Math.max(0, ...entries.map((e) => (e.flag?.flag === "damageThreshold" ? e.flag.value : 0)));
}

function applyPercentResistance(target: BattleParticipant, damage: number, damageType: string, opts?: ResistanceOptions): ResistanceResult {
  const breakdown: LogLine[] = [];

  let finalDamage = damage;

  const matches = matchingResistances(target, damageType, opts);

  const immune = matches.find((m) => m.percent >= 100);

  if (immune) {
    breakdown.push(textRef("battleLog.resistance.immune", { damage, type: damageType }));

    return {
      finalDamage: 0,
      immunityApplied: true,
      resistanceApplied: false,
      breakdown,
      steps: [{ label: immune.label, side: "target", kind: "immunity", value: -100, after: 0, icon: immune.icon }],
    };
  }

  const resistancePercent = clampPercent(matches.reduce((sum, m) => sum + m.percent, 0));

  if (resistancePercent !== 0) {
    finalDamage = Math.floor(damage * (1 - resistancePercent / BATTLE_CONSTANTS.PERCENT_DIVISOR));
    breakdown.push(
      resistancePercent > 0
        ? textRef("battleLog.resistance.resist", { damage, type: damageType, percent: resistancePercent, final: finalDamage })
        : textRef("battleLog.resistance.vulnerable", { damage, type: damageType, percent: -resistancePercent, final: finalDamage }),
    );

    let used = 0;

    const steps = matches.map((m, i): DamageStep => {
      used = Math.min(resistancePercent, used + m.percent);

      const after = i === matches.length - 1 ? finalDamage : Math.floor(damage * (1 - used / BATTLE_CONSTANTS.PERCENT_DIVISOR));

      return { label: m.label, side: "target", kind: "percent", value: -m.percent, after, icon: m.icon };
    });

    return { finalDamage, immunityApplied: false, resistanceApplied: true, breakdown, steps };
  }

  breakdown.push(textRef("battleLog.resistance.plain", { damage, type: damageType }));

  return { finalDamage, immunityApplied: false, resistanceApplied: false, breakdown, steps: [] };
}
