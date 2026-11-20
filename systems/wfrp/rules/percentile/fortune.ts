import { ACCEPTED_SPOTS, type HitSpot } from '../combat/constants';
import { fateLeftOf } from '../combat/fate';
import {
    type BlessingDimension,
    OVERCAST_DIRECTIONS,
    type OvercastPlan,
} from '../magic/constants';
import { wfrpState } from '../state';
import type { ForcedResult } from './resolve';

import { defineSlot } from '@/lib/utils/rules/systems/slot';
import type { BattleParticipant } from '@/types/battle';

export type FortuneKind = 'reroll' | 'sl' | 'notFail';

/** Fortune spent on a character-sheet test (`sl` is shown as Advantage) */
export const SHEET_FORTUNE_KINDS = ['advantage', 'reroll', 'notFail'] as const;

export type SheetFortuneKind = (typeof SHEET_FORTUNE_KINDS)[number];

export interface FortuneInput {
    /** `none` spends nothing: it only carries the cast choices (`critBonus`, `blessing`) */
    kind: FortuneKind | 'none';
    manualReroll?: number;
    /** Canon5e reroll count, 1..9 (p133) */
    rerolls?: number;
    /** `notFail` only: choose a Critical and, with it, the hit location (p133) */
    critical?: boolean;
    location?: HitSpot;
    /** Casts only: the Critical Casting bonus (p235) */
    critBonus?: CritBonus;
    /** Blessing casts only: the overcast dimension (p217) */
    blessing?: BlessingDimension;
    /** Spell casts only: SL planned per overcast direction before the roll (p236) */
    overcast?: OvercastPlan;
    /** Attacks only: the chosen Hit Location, -2 SL (p167) */
    calledShot?: HitSpot;
    /** Attacks only: situational Combat modifiers set by hand */
    situational?: Situational;
}

/** Circumstances the map cannot tell: height, a tight space, mud or water (p166) */
export interface Situational {
    highGround?: 'attacker' | 'defender';
    enclosed?: true;
    badFooting?: true;
}

export type CritBonus = 'criticalDamage' | 'totalPower' | 'unstoppableForce';

const CRIT_BONUSES: readonly unknown[] = [
    'criticalDamage',
    'totalPower',
    'unstoppableForce',
];

const BLESSING_DIMENSIONS: readonly unknown[] = [
    'rangeYards',
    'targets',
    'durationRounds',
];

function readOvercast(raw: unknown): OvercastPlan | undefined {
    if (typeof raw !== 'object' || raw === null) return undefined;

    const rec = raw as Record<string, unknown>;

    const out: OvercastPlan = {};

    for (const dir of OVERCAST_DIRECTIONS) {
        const n = rec[dir];

        if (typeof n === 'number' && Number.isInteger(n) && n > 0)
            out[dir] = n;
    }

    return Object.keys(out).length ? out : undefined;
}

function readSituational(raw: unknown): Situational | undefined {
    if (typeof raw !== 'object' || raw === null) return undefined;

    const { highGround, enclosed, badFooting } = raw as Record<string, unknown>;

    const out: Situational = {
        ...((highGround === 'attacker' || highGround === 'defender') && {
            highGround,
        }),
        ...(enclosed === true && { enclosed }),
        ...(badFooting === true && { badFooting }),
    };

    return Object.keys(out).length ? out : undefined;
}

const KINDS: readonly unknown[] = ['reroll', 'sl', 'notFail', 'none'];

export const FORTUNE_INPUT = defineSlot<FortuneInput>('wfrp', (raw) => {
    if (typeof raw !== 'object' || raw === null) return undefined;

    const {
        kind,
        manualReroll,
        rerolls,
        critical,
        location,
        critBonus,
        blessing,
        overcast,
        calledShot,
        situational,
    } = raw as Record<string, unknown>;

    if (!KINDS.includes(kind)) return undefined;

    return {
        kind: kind as FortuneInput['kind'],
        ...(typeof manualReroll === 'number' && { manualReroll }),
        ...(typeof rerolls === 'number' &&
            Number.isInteger(rerolls) &&
            rerolls >= 1 &&
            rerolls <= 9 && { rerolls }),
        ...(critical === true && { critical }),
        ...(typeof location === 'string' && {
            location: location as HitSpot,
        }),
        ...(CRIT_BONUSES.includes(critBonus) && {
            critBonus: critBonus as CritBonus,
        }),
        ...(BLESSING_DIMENSIONS.includes(blessing) && {
            blessing: blessing as BlessingDimension,
        }),
        ...(readOvercast(overcast) && { overcast: readOvercast(overcast) }),
        ...(ACCEPTED_SPOTS.includes(calledShot as HitSpot) && {
            calledShot: calledShot as HitSpot,
        }),
        ...(readSituational(situational) && {
            situational: readSituational(situational),
        }),
    };
});

export const spentFortune = (
    p: BattleParticipant,
    n = 1
): { fortune: number } => ({
    fortune: Math.max(0, (wfrpState(p).fortune ?? 0) - n),
});

export const spentFate = (p: BattleParticipant): { fate: number } => ({
    fate: Math.max(0, fateLeftOf(p) - 1),
});

/** What the spend costs: Fate for `notFail`, `n` Fortune otherwise */
export const spentFor = (p: BattleParticipant, kind: FortuneKind, n = 1) =>
    kind === 'notFail' ? spentFate(p) : spentFortune(p, n);

export const forcedOf = (
    fortune: FortuneInput | undefined,
    minSl = 0
): ForcedResult | undefined =>
    fortune?.kind === 'notFail'
        ? { outcome: fortune.critical ? 'critical' : 'success', minSl }
        : undefined;

export interface FortuneUse {
    kind: FortuneKind;
    firstRoll?: number;
    /** Every reroll's roll, in order (canon5e repeat only) */
    rolls?: number[];
    /** Points actually spent: rerolls used, else 1 */
    spent: number;
}

/**
 * `test(preset, first)` runs one test; a reroll receives the previous result. An `sl` Fortune is the caller's job (it adds the bonus inside `test`); so is `notFail` (it forces the result inside `test`).
 * `repeat` (canon5e, p133) rerolls up to `rerolls` times until the test passes and charges only the rerolls used; a manual roll covers the first reroll only.
 */
export function applyFortune<T extends { roll: number }>(
    test: (preset?: number, first?: T) => T,
    fortune: FortuneInput | undefined,
    isSuccess: (r: T) => boolean,
    firstPreset?: number,
    opts: { repeat?: boolean } = {}
): { result: T; fortune?: FortuneUse } {
    const first = test(firstPreset);

    if (fortune?.kind === 'reroll' && !isSuccess(first)) {
        const limit = opts.repeat ? (fortune.rerolls ?? 1) : 1;

        const rolls: number[] = [];

        let result = first;

        while (
            rolls.length < limit &&
            (rolls.length === 0 || !isSuccess(result))
        ) {
            result = test(
                rolls.length === 0 ? fortune.manualReroll : undefined,
                result
            );

            rolls.push(result.roll);
        }

        return {
            result,
            fortune: {
                kind: 'reroll',
                firstRoll: first.roll,
                ...(rolls.length > 1 && { rolls }),
                spent: rolls.length,
            },
        };
    }

    return fortune?.kind === 'sl' || fortune?.kind === 'notFail'
        ? { result: first, fortune: { kind: fortune.kind, spent: 1 } }
        : { result: first };
}
