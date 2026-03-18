/**
 * Допоміжні функції для виконання тригерів скілів
 */

import { evaluateFormula } from "@/lib/utils/battle/common/formula-evaluator";
import type { BattleParticipant } from "@/types/battle";

export function parseDiceAverage(dice: string): number {
  const match = dice.match(/^(\d+)d(\d+)$/);

  if (!match) return 0;

  const count = parseInt(match[1], 10);

  const sides = parseInt(match[2], 10);

  return Math.ceil((count * (sides + 1)) / 2);
}

export function getEffectTargets(
  caster: BattleParticipant,
  target: string | undefined,
  allParticipants: BattleParticipant[],
): BattleParticipant[] {
  switch (target) {
    case "all_allies":
      return allParticipants.filter((p) => p.basicInfo.side === caster.basicInfo.side);
    case "all_enemies":
      return allParticipants.filter((p) => p.basicInfo.side !== caster.basicInfo.side);
    case "all":
      return allParticipants;
    case "self":
    case "enemy":
    default:
      return [caster];
  }
}

export function evaluateFormulaSimple(
  formula: string,
  participant: BattleParticipant,
): number {
  const maxHp = participant.combatStats.maxHp;

  const currentHp = participant.combatStats.currentHp;

  const lostHpPercent = maxHp > 0 ? ((maxHp - currentHp) / maxHp) * 100 : 0;

  const context: Record<string, number> = {
    hero_level: participant.abilities.level,
    lost_hp_percent: lostHpPercent,
    morale: participant.combatStats.morale,
  };

  const result = evaluateFormula(formula, context);

  return Math.floor(result);
}
