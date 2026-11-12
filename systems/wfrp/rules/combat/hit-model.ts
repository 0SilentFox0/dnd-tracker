import { skillTarget, value } from '../characteristics/derive';
import { ATTACK_SLOT } from '../slots';
import {
    AVERAGE_SIZE,
    SIZE_DAMAGE_PER_STEP,
    SIZE_HIT_PER_STEP,
} from '../traits/constants';
import { sizeStep } from '../traits/read';
import {
    BALANCE_REF_AP,
    BALANCE_REF_INCOMING,
    BALANCE_REF_TARGET,
    BALANCE_REF_TB,
    LOCATIONS,
    MIN_DAMAGE,
} from './constants';
import { LOCATION_WEIGHTS } from './location';
import { participantChars, participantStats } from './participant';
import { winChance } from './win-chance';

import { diceAverage } from '@/lib/utils/common/dice';
import type { RuleSystemCombat } from '@/lib/utils/rules/systems/types';
import type { BattleParticipant } from '@/types/battle';

const MAX_WARD_CHANCE = 0.9;

const MIN_DURABILITY = 0.25;

const MAX_DURABILITY = 10;

const sizeSteps = (p: BattleParticipant) =>
    sizeStep(participantStats(p)?.size) - sizeStep(AVERAGE_SIZE);

function bestHitAverage(p: BattleParticipant): number {
    const sb = participantStats(p)?.sb ?? 0;

    return (p.battleData.attacks ?? []).reduce(
        (best, a) =>
            Math.max(
                best,
                diceAverage(a.damageDice || '0') +
                    (a.damageBonus ?? 0) +
                    (ATTACK_SLOT.read(a.system)?.noSb ? 0 : sb)
            ),
        0
    );
}

export const wfrpHitModel: NonNullable<RuleSystemCombat['hitModel']> = {
    offense: (p) => value(participantChars(p), 'ws'),
    defense: (p) => {
        const c = participantChars(p);

        return (
            Math.max(
                value(c, 'ws'),
                skillTarget(c, 'dodge')?.target ?? value(c, 'ag')
            ) -
            SIZE_HIT_PER_STEP * Math.max(0, sizeSteps(p))
        );
    },
    winChance,
    damage: (p) =>
        Math.max(
            MIN_DAMAGE,
            bestHitAverage(p) *
                (1 + SIZE_DAMAGE_PER_STEP * Math.max(0, sizeSteps(p))) -
                BALANCE_REF_TB -
                BALANCE_REF_AP
        ),
    durability: (p) => {
        const w = participantStats(p);

        const ap = LOCATIONS.reduce(
            (sum, l) => sum + LOCATION_WEIGHTS[l] * (w?.ap?.[l] ?? 0),
            0
        );

        const ward = w?.ward
            ? Math.min(MAX_WARD_CHANCE, (11 - w.ward) / 10)
            : 0;

        const incoming = Math.max(
            MIN_DAMAGE,
            BALANCE_REF_INCOMING -
                ((w?.tb ?? BALANCE_REF_TB) - BALANCE_REF_TB) -
                ap
        );

        return Math.min(
            MAX_DURABILITY,
            Math.max(
                MIN_DURABILITY,
                BALANCE_REF_INCOMING / incoming / (1 - ward)
            )
        );
    },
    refHit: winChance(BALANCE_REF_TARGET, BALANCE_REF_TARGET),
};
