import type { AttackRollResult } from '../types/attack';

export function eventRollMode(roll: AttackRollResult): {
    rollMode?: 'advantage' | 'disadvantage';
} {
    return roll.secondRoll ? { rollMode: roll.secondRoll.mode } : {};
}
