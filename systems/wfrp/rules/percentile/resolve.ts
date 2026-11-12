import { reverseRoll, rollPercentile } from './roll';

import type { Rng } from '@/lib/utils/common/rng';

export type TestMode = 'normal' | 'advantage' | 'disadvantage';

export type PercentileOutcome = 'critical' | 'success' | 'failure' | 'fumble';

export interface PercentileTestInput {
    target: number;
    slModifier?: number;
    mode?: TestMode;
    doubles?: boolean;
    rng: Rng;
    presetRoll?: number;
}

export interface PercentileTestResult {
    rawRoll: number;
    roll: number;
    reversed: boolean;
    target: number;
    outcome: PercentileOutcome;
    sl: number;
    auto: 'success' | 'failure' | null;
    doubles: boolean;
    mode: TestMode;
}

const OUTCOME_RANK: Record<PercentileOutcome, number> = {
    fumble: 0,
    failure: 1,
    success: 2,
    critical: 3,
};

const tens = (n: number) => Math.floor(n / 10);

const isDouble = (roll: number) =>
    roll === 100 || (roll >= 11 && roll % 11 === 0);

type Single = Pick<
    PercentileTestResult,
    'roll' | 'outcome' | 'sl' | 'auto' | 'doubles'
>;

function resolveSingle(
    roll: number,
    target: number,
    slModifier: number,
    withDoubles: boolean
): Single {
    const auto = roll <= 5 ? 'success' : roll >= 96 ? 'failure' : null;

    const success = auto ? auto === 'success' : roll <= target;

    const sl = tens(target) - tens(roll) + slModifier;

    const doubles = isDouble(roll);

    const outcome: PercentileOutcome =
        doubles && withDoubles
            ? success
                ? 'critical'
                : 'fumble'
            : success
              ? 'success'
              : 'failure';

    return {
        roll,
        outcome,
        sl: success ? Math.max(0, sl) : Math.min(0, sl),
        auto,
        doubles,
    };
}

const score = (r: Single) => OUTCOME_RANK[r.outcome] * 1000 + r.sl;

export function resolvePercentileTest({
    target,
    slModifier = 0,
    mode = 'normal',
    doubles = false,
    rng,
    presetRoll,
}: PercentileTestInput): PercentileTestResult {
    const rawRoll = rollPercentile(rng, presetRoll);

    const straight = resolveSingle(rawRoll, target, slModifier, doubles);

    if (mode === 'normal')
        return { ...straight, rawRoll, reversed: false, target, mode };

    const flipped = resolveSingle(
        reverseRoll(rawRoll),
        target,
        slModifier,
        doubles
    );

    const flippedWins =
        mode === 'advantage'
            ? score(flipped) > score(straight)
            : score(flipped) < score(straight);

    return {
        ...(flippedWins ? flipped : straight),
        rawRoll,
        reversed: flippedWins,
        target,
        mode,
    };
}
