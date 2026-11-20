import {
    CANON_INCOME_DICE_PER_LEVEL,
    CANON_INCOME_DIE,
    STATUS_COIN,
} from './constants';
import type { Status } from './status';
import type { CoinAmount } from './types';

import { rollDice } from '@/lib/utils/common/dice';
import type { Rng } from '@/lib/utils/common/rng';

/** Earned Income by Status tier and Standing level; a failed test halves it, rounding down (p199) */
export function rollIncome(
    status: Status,
    passed: boolean,
    rng: Rng
): CoinAmount {
    const dice = CANON_INCOME_DICE_PER_LEVEL[status.tier] * status.level;

    const gross = dice
        ? rollDice(`${dice}d${CANON_INCOME_DIE}`, rng)
        : status.level;

    return {
        coin: STATUS_COIN[status.tier],
        amount: passed ? gross : Math.floor(gross / 2),
    };
}
