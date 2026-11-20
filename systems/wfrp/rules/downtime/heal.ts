import { CANON_RECOVERY_DIFFICULTY } from './constants';
import { rollDowntimeTest } from './roll';
import type { TestOutcome } from './types';

import type { Rng } from '@/lib/utils/common/rng';

export function healWounds(i: {
    current: number;
    max: number;
    tb: number;
    days: number;
    multiplier: number;
    bonus: number;
}): number {
    return Math.min(i.max, i.current + i.tb * i.days * i.multiplier + i.bonus);
}

/** Daily recovery: Average (+2 SL) Endurance gives SL + TB Wounds, a restful day adds TB even on a failure (p170) */
export function rollDailyRecovery(i: {
    endurance: number;
    tb: number;
    rested: boolean;
    rng: Rng;
    presetRoll?: number;
}): { test: TestOutcome; healed: number } {
    const { test, passed } = rollDowntimeTest(
        i.endurance,
        i.rng,
        i.presetRoll,
        { difficulty: CANON_RECOVERY_DIFFICULTY, slModel: 'final' }
    );

    return {
        test,
        healed:
            (passed ? Math.max(0, test.sl) + i.tb : 0) + (i.rested ? i.tb : 0),
    };
}

/** A successful Heal test recovers IB + SL Wounds (p170) */
export const healEndeavourWounds = (ib: number, sl: number): number =>
    ib + Math.max(0, sl);

/** A fumbled Heal inflicts 1d10 Wounds but never takes the patient below 1 Wound (p170) */
export const healFumbleWounds = (rolled: number, current: number): number =>
    Math.max(0, Math.min(rolled, current - 1));
