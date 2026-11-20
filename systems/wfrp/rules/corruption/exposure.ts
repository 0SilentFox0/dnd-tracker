import { skillTarget, value } from '../characteristics/derive';
import type { Characteristics } from '../characteristics/keys';
import type { TestOutcome } from '../downtime/types';
import { DIFFICULTY_SL, resolvePercentileTest } from '../percentile';
import {
    CORRUPTION_TEST_DIFFICULTY,
    EXPOSURE_POINTS,
    type ExposureDegree,
    type ExposureSkill,
} from './constants';

import type { Rng } from '@/lib/utils/common/rng';

export type ExposureInput = {
    characteristics: Characteristics;
    degree: ExposureDegree;
    skill: ExposureSkill;
    rng: Rng;
    presetRoll?: number;
};

export type ExposurePlan = { points: number; test: TestOutcome };

const FALLBACK = { endurance: 't', cool: 'wp' } as const;

export function planExposureTest({
    characteristics: c,
    degree,
    skill,
    rng,
    presetRoll,
}: ExposureInput): ExposurePlan {
    const target = skillTarget(c, skill)?.target ?? value(c, FALLBACK[skill]);

    const r = resolvePercentileTest({
        target,
        slModifier: DIFFICULTY_SL[CORRUPTION_TEST_DIFFICULTY],
        doubles: false,
        mode: 'normal',
        rng,
        presetRoll,
    });

    const table = EXPOSURE_POINTS[degree];

    const passed = r.outcome === 'success' || r.outcome === 'critical';

    const points = passed
        ? (table.bySl.find((b) => r.sl >= b.minSl)?.points ?? 0)
        : table.failure;

    return {
        points,
        test: { roll: r.roll, target: r.target, sl: r.sl, outcome: r.outcome },
    };
}
