import { DIFFICULTY_SL, type DifficultyKey } from '../percentile/difficulty';
import { resolvePercentileTest, type SlModel } from '../percentile/resolve';
import { ENDEAVOUR_DIFFICULTY } from './constants';
import type { TestOutcome } from './types';

import type { Rng } from '@/lib/utils/common/rng';

export type DowntimeRollOptions = {
    difficulty?: DifficultyKey;
    slModel?: SlModel;
};

export function rollDowntimeTest(
    target: number,
    rng: Rng,
    presetRoll?: number,
    { difficulty = ENDEAVOUR_DIFFICULTY, slModel }: DowntimeRollOptions = {}
): { test: TestOutcome; passed: boolean } {
    const r = resolvePercentileTest({
        target,
        slModifier: DIFFICULTY_SL[difficulty],
        slModel,
        doubles: false,
        mode: 'normal',
        rng,
        presetRoll,
    });

    return {
        test: { roll: r.roll, target: r.target, sl: r.sl, outcome: r.outcome },
        passed: r.outcome === 'success' || r.outcome === 'critical',
    };
}
