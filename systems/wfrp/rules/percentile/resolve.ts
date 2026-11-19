import { reverseRoll, rollPercentile } from './roll';

import type { Rng } from '@/lib/utils/common/rng';

export type TestMode = 'normal' | 'advantage' | 'disadvantage';

export type SlModel = 'clamped' | 'final';

export type PercentileOutcome = 'critical' | 'success' | 'failure' | 'fumble';

export interface PercentileTestInput {
    target: number;
    slModifier?: number;
    mode?: TestMode;
    doubles?: boolean;
    slModel?: SlModel;
    rng: Rng;
    presetRoll?: number;
    /** Fate "I Will Not Fail" (p133): the result is chosen instead of rolled */
    forced?: ForcedResult;
}

export interface ForcedResult {
    outcome: 'success' | 'critical';
    minSl?: number;
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
    withDoubles: boolean,
    slModel: SlModel
): Single {
    const auto = roll <= 5 ? 'success' : roll >= 96 ? 'failure' : null;

    const rawSl = tens(target) - tens(roll) + slModifier;

    const success = auto
        ? auto === 'success'
        : slModel === 'final'
          ? rawSl > 0 || (rawSl === 0 && roll <= target)
          : roll <= target;

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
        sl: success ? Math.max(0, rawSl) : Math.min(0, rawSl),
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
    slModel = 'clamped',
    rng,
    presetRoll,
    forced,
}: PercentileTestInput): PercentileTestResult {
    if (forced) return forceResult(target, mode, forced, rng, presetRoll);

    const rawRoll = rollPercentile(rng, presetRoll);

    const straight = resolveSingle(
        rawRoll,
        target,
        slModifier,
        doubles,
        slModel
    );

    if (mode === 'normal')
        return { ...straight, rawRoll, reversed: false, target, mode };

    const flipped = resolveSingle(
        reverseRoll(rawRoll),
        target,
        slModifier,
        doubles,
        slModel
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

function forceResult(
    target: number,
    mode: TestMode,
    { outcome, minSl = 0 }: ForcedResult,
    rng: Rng,
    presetRoll?: number
): PercentileTestResult {
    const rawRoll = rollPercentile(rng, presetRoll);

    return {
        rawRoll,
        roll: rawRoll,
        reversed: false,
        target,
        outcome,
        sl: Math.max(0, minSl),
        auto: 'success',
        doubles: outcome === 'critical',
        mode,
    };
}
