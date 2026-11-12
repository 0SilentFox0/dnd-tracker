import { DIFFICULTY_SL } from '../percentile/difficulty';
import { resolvePercentileTest } from '../percentile/resolve';
import { ENDEAVOUR_DIFFICULTY } from './constants';
import type { TestOutcome } from './types';

import type { Rng } from '@/lib/utils/common/rng';

export function rollDowntimeTest(
    target: number,
    rng: Rng,
    presetRoll?: number
): { test: TestOutcome; passed: boolean } {
    const r = resolvePercentileTest({
        target,
        slModifier: DIFFICULTY_SL[ENDEAVOUR_DIFFICULTY],
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
