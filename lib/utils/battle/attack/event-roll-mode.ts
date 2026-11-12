import type { AttackRollResult } from "../types/attack";

/** Режим кидка для подій hit / attack after: лише перевага чи недолік, звичайний — без поля. */
export function eventRollMode(roll: AttackRollResult): { rollMode?: "advantage" | "disadvantage" } {
  return roll.secondRoll ? { rollMode: roll.secondRoll.mode } : {};
}
