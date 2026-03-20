/**
 * Утиліти для обробки атак в бою
 */

export type { AttackResult, AttackRollResult } from "../types/attack";
export { calculateAttackBonus, hasAdvantage, hasDisadvantage } from "./bonus";
export { applyCriticalEffect } from "./critical";
export type { ProcessAttackParams, ProcessAttackResult } from "./process";
export { processAttack } from "./process";
export {
  canPerformReaction,
  getCounterDamagePercent,
  getReactionDamageAmount,
  performReaction,
} from "./reaction";
export { calculateAttackRoll } from "./roll";
