import { bonus, skillTarget } from '../characteristics/derive';
import type { Characteristics } from '../characteristics/keys';
import { EDITION_PROFILES, type EditionProfile } from '../edition/profiles';
import {
    CANON_INCOME_DIFFICULTY,
    ENDEAVOUR_DIFFICULTY,
    STATUS_COIN,
    TEND_DAYS_PER_SL,
    TEND_HEAL_PER_SL,
    TRAIN_DISCOUNT_BASE,
    TRAIN_DISCOUNT_PER_SL,
} from './constants';
import { healEndeavourWounds } from './heal';
import { rollIncome } from './income';
import { rollDowntimeTest } from './roll';
import { parseStatus } from './status';
import type {
    CoinAmount,
    Endeavour,
    TestOutcome,
    TrainingCredit,
} from './types';

import type { Rng } from '@/lib/utils/common/rng';

export type EndeavourCtx = {
    characteristics: Characteristics;
    status?: string | null;
    rng: Rng;
    presetRoll?: number;
    edition?: EditionProfile;
};

export type EndeavourOutcome = {
    test?: TestOutcome;
    coins?: CoinAmount;
    training?: TrainingCredit;
    tend?: { patientId: string; heal: number; days: number };
};

const skillOf = (e: Endeavour): { key: string; spec?: string } | null => {
    switch (e.kind) {
        case 'earn':
            return e.params.skill === 'trade'
                ? { key: 'trade', spec: e.params.spec }
                : { key: 'charm' };
        case 'train':
            return { key: 'research' };
        case 'tend':
            return { key: 'heal' };
        default:
            return null;
    }
};

export function validateEndeavour(
    e: Endeavour,
    c: Characteristics
): 'SKILL_UNTRAINED' | null {
    const skill = skillOf(e);

    if (!skill) return null;

    const t = skillTarget(c, skill.key, skill.spec);

    return !t || !t.trained ? 'SKILL_UNTRAINED' : null;
}

export function resolveEndeavour(
    e: Endeavour,
    ctx: EndeavourCtx
): EndeavourOutcome {
    const skill = skillOf(e);

    const t = skill && skillTarget(ctx.characteristics, skill.key, skill.spec);

    if (!skill || !t) return {};

    const model = ctx.edition ?? EDITION_PROFILES.legacy;

    const canon = model.downtimeModel === 'canon5e';

    const { test, passed } = rollDowntimeTest(
        t.target,
        ctx.rng,
        ctx.presetRoll,
        {
            difficulty:
                canon && e.kind === 'earn'
                    ? CANON_INCOME_DIFFICULTY
                    : ENDEAVOUR_DIFFICULTY,
            slModel: model.slModel,
        }
    );

    if (canon && e.kind === 'earn') {
        const coins = rollIncome(parseStatus(ctx.status), passed, ctx.rng);

        return { test, ...(coins.amount > 0 ? { coins } : {}) };
    }

    if (!passed) return { test };

    const sl = Math.max(1, test.sl);

    switch (e.kind) {
        case 'earn': {
            const status = parseStatus(ctx.status);

            return {
                test,
                coins: {
                    coin: STATUS_COIN[status.tier],
                    amount: sl * status.level,
                },
            };
        }
        case 'train':
            return {
                test,
                training: {
                    kind: e.params.kind,
                    key: e.params.key,
                    discount:
                        TRAIN_DISCOUNT_BASE + test.sl * TRAIN_DISCOUNT_PER_SL,
                },
            };
        case 'tend':
            return {
                test,
                tend: {
                    patientId: e.params.patientId,
                    heal: canon
                        ? healEndeavourWounds(
                              bonus(ctx.characteristics, 'int'),
                              test.sl
                          )
                        : sl * TEND_HEAL_PER_SL,
                    days: sl * TEND_DAYS_PER_SL,
                },
            };
        default:
            return { test };
    }
}
