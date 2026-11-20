import { parseDice, rollDice } from '@/lib/utils/common/dice';
import type { Rng } from '@/lib/utils/common/rng';

const TB_TERM = /([+-])\s*TB\b/i;

/** Dice with an optional `± TB` term, e.g. `1d10 - TB` (p174 temporary injuries) */
export const isRoundsFormula = (formula: string): boolean =>
    parseDice(formula.replace(TB_TERM, '')) !== null &&
    /d/i.test(formula.replace(TB_TERM, ''));

export interface RolledRounds {
    /** Dice and flat part, rolled when the row is rolled */
    base: number;
    /** `-1`/`1` when the formula carries `∓ TB`, else 0 */
    tb: -1 | 0 | 1;
}

export function rollRoundsFormula(formula: string, rng: Rng): RolledRounds {
    const m = TB_TERM.exec(formula);

    return {
        base: rollDice(formula.replace(TB_TERM, ''), rng),
        tb: m ? (m[1] === '-' ? -1 : 1) : 0,
    };
}

/** At least one round whatever the Toughness Bonus */
export const resolveRounds = (r: RolledRounds, toughnessBonus: number): number =>
    Math.max(1, r.base + r.tb * toughnessBonus);
