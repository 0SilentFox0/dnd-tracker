/**
 * Спільні утиліти battle: модифікатори урону, формули, кидки атаки
 */

export type { AttackRollData, ResolveAttackRollResult } from "./attack-roll-helpers";
export {
  getEffectiveD20,
  resolveAttackRoll,
} from "./attack-roll-helpers";
export { evaluateFormula } from "./formula-evaluator";
export {
  calculatePercentBonus,
  formatFlatBonusBreakdown,
  formatPercentBonusBreakdown,
  matchesAttackType,
} from "./modifiers";
