import { skillTarget } from '../characteristics/derive';
import type { CareerState, Characteristics } from '../characteristics/keys';
import type { SlModel } from '../percentile/resolve';
import { parseSkillAdvanceKey } from '../skills/catalog';
import {
    CANON_INCOME_DIFFICULTY,
    HARDLY_WORKING_COINS,
    STATUS_COIN,
} from './constants';
import { rollDowntimeTest } from './roll';
import { parseStatus, type Status } from './status';
import type { CoinAmount, TestOutcome } from './types';

import type { Rng } from '@/lib/utils/common/rng';

export type PeriodCareer = {
    state: CareerState;
    /** Status string of each career level, in order */
    statuses: (string | undefined)[];
    earningSkill?: string;
};

export type BurdenResult = {
    test: TestOutcome;
    lost?: 'standing' | 'tier';
};

const EARNING_FALLBACK = 'charm';

/** The Status the hero currently earns at: tier status minus the Standing lost to Burdens of Power */
export function effectiveStatus(
    raw: string | null | undefined,
    loss = 0
): Status {
    const base = parseStatus(raw);

    return { ...base, level: Math.max(1, base.level - loss) };
}

export const statusText = (s: Status) => `${s.tier} ${s.level}`;

/** Each Income Endeavour regains one lost Standing level (p196) */
export function regainStanding(state: CareerState): CareerState {
    if (!state.standingLoss) return state;

    const { standingLoss, ...rest } = state;

    return standingLoss > 1
        ? { ...rest, standingLoss: standingLoss - 1 }
        : rest;
}

/** Hardly Working: one coin of the Status tier instead of earnings (p199) */
export const hardlyWorkingCoins = (status: Status): CoinAmount => ({
    coin: STATUS_COIN[status.tier],
    amount: HARDLY_WORKING_COINS,
});

/** Burdens of Power: at the top Career Level, skipping Income still costs an Earning Test (p196) */
export function burdenOfPower(
    career: PeriodCareer,
    characteristics: Characteristics,
    rng: Rng,
    slModel?: SlModel
): { result: BurdenResult; state: CareerState } {
    const { state } = career;

    const skill = parseSkillAdvanceKey(career.earningSkill ?? EARNING_FALLBACK);

    const target =
        skillTarget(characteristics, skill.key, skill.spec)?.target ?? 0;

    const { test, passed } = rollDowntimeTest(target, rng, undefined, {
        difficulty: CANON_INCOME_DIFFICULTY,
        slModel,
    });

    if (passed) return { result: { test }, state };

    const status = effectiveStatus(
        career.statuses[state.tier - 1],
        state.standingLoss
    );

    if (status.level - 1 >= 1)
        return {
            result: { test, lost: 'standing' },
            state: { ...state, standingLoss: (state.standingLoss ?? 0) + 1 },
        };

    const { standingLoss: _loss, lastChange: _last, ...rest } = state;

    return {
        result: { test, lost: 'tier' },
        state: {
            ...rest,
            tier: (state.tier - 1) as CareerState['tier'],
            ticks: [],
        },
    };
}
