export type { AttackResult, AttackRollResult } from "../types/attack";
export { calculateAttackBonus, hasAdvantage, hasDisadvantage, predictAttackNumbers, predictRollMode } from "./bonus";
export { applyCriticalEffect } from "./critical";
export type { ProcessAttackParams, ProcessAttackResult } from "./process";
export { processAttack } from "./process";
export { calculateAttackRoll } from "./roll";
