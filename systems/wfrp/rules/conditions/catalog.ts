import type { CharacteristicKey } from '../characteristics/keys';

import { EffectMarker } from '@/lib/constants/battle';
import {
    WFRP_CONDITION_KEYS,
    WFRP_CONDITION_MAX_LEVEL,
    type WfrpConditionKey,
} from '@/systems/wfrp/constants/conditions';

export { WFRP_CONDITION_KEYS, WFRP_CONDITION_MAX_LEVEL, type WfrpConditionKey };

// legacy condition model only; the `sl` model costs SL per level
export const BLEEDING_UNCONSCIOUS_CHANCE_PER_LEVEL = 0.1;
export const CONDITION_TEST_STEP = -10;
export const BLINDED_SELF_ATTACK = -20;
export const AGAINST_BONUS = 20;

export interface WfrpConditionDef {
    leveled: { max: number } | false;
    markers: EffectMarker[];
    testMod?: {
        self?: (level: number) => number;
        selfAttack?: number;
        against?: { melee?: number; all?: number };
    };
    /** Under the `sl` condition model the level costs SL on every test (the worst level counts, they do not add) */
    slPenalty?: true;
    tick?: 'bleeding' | 'ablaze' | 'poisoned';
    endTest:
        | { skill: string }
        | { characteristic: CharacteristicKey }
        | 'stand'
        | null;
    rounds?: number;
}

const leveled = { max: WFRP_CONDITION_MAX_LEVEL };

const perLevel = (level: number) => CONDITION_TEST_STEP * level;

export const WFRP_CONDITION_REGISTRY: Record<
    WfrpConditionKey,
    WfrpConditionDef
> = {
    bleeding: {
        leveled,
        markers: [],
        tick: 'bleeding',
        endTest: { skill: 'endurance' },
    },
    fatigued: {
        leveled,
        slPenalty: true,
        markers: [],
        testMod: { self: perLevel },
        endTest: null,
    },
    poisoned: {
        leveled,
        slPenalty: true,
        markers: [],
        tick: 'poisoned',
        testMod: { self: perLevel },
        endTest: { skill: 'endurance' },
    },
    stunned: {
        leveled,
        slPenalty: true,
        markers: [EffectMarker.SKIP_ACTION],
        testMod: { self: perLevel },
        endTest: { skill: 'endurance' },
    },
    ablaze: {
        leveled,
        markers: [],
        tick: 'ablaze',
        endTest: { skill: 'athletics' },
    },
    broken: {
        leveled,
        slPenalty: true,
        markers: [],
        testMod: { self: perLevel },
        endTest: { skill: 'cool' },
    },
    entangled: {
        leveled,
        markers: [EffectMarker.IMMOBILIZED],
        testMod: { self: perLevel },
        endTest: { characteristic: 's' },
    },
    prone: {
        leveled: false,
        markers: [EffectMarker.IMMOBILIZED],
        testMod: { against: { melee: AGAINST_BONUS } },
        endTest: 'stand',
    },
    surprised: {
        leveled: false,
        markers: [EffectMarker.SKIP_ACTION],
        testMod: { against: { all: AGAINST_BONUS } },
        endTest: null,
        rounds: 1,
    },
    blinded: {
        leveled: false,
        markers: [],
        testMod: {
            selfAttack: BLINDED_SELF_ATTACK,
            against: { all: AGAINST_BONUS },
        },
        endTest: null,
    },
    deafened: { leveled, markers: [], endTest: { skill: 'endurance' } },
    unconscious: {
        leveled: false,
        markers: [EffectMarker.SKIP_ACTION, EffectMarker.IMMOBILIZED],
        endTest: null,
    },
};

export const isWfrpConditionKey = (k: string): k is WfrpConditionKey =>
    (WFRP_CONDITION_KEYS as readonly string[]).includes(k);

export const wfrpConditionEffectKey = (key: WfrpConditionKey) =>
    `wfrp:cond:${key}`;

export const wfrpConditionMarker = (key: WfrpConditionKey) => `wfrp:${key}`;
