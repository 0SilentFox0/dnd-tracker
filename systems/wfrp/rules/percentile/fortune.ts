import { ACCEPTED_SPOTS, type HitSpot } from '../combat/constants';
import { fateLeftOf } from '../combat/fate';
import type { BlessingDimension } from '../magic/constants';
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
    /** Attacks only: situational choices the DM or player declares */
    mods?: WfrpAttackMods;
    /** Casts only: overcast SL spent per dimension */
    overcast?: WfrpOvercast;
}

export interface WfrpAttackMods {
    calledShot?: HitSpot;
    cover?: boolean;
    highGround?: 'attacker' | 'defender';
    enclosed?: boolean;
    helplessRoll?: number;
    grapple?: boolean;
}

export const OVERCAST_DIMENSIONS = [
    'damage',
    'targets',
    'range',
    'aoe',
    'duration',
] as const;

export type OvercastDimension = (typeof OVERCAST_DIMENSIONS)[number];

export type WfrpOvercast = Partial<Record<OvercastDimension, number>>;

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

const KINDS: readonly unknown[] = ['reroll', 'sl', 'notFail', 'none'];

const SPOTS_ACCEPTED: readonly unknown[] = ACCEPTED_SPOTS;

function modsOf(raw: unknown): WfrpAttackMods | undefined {
    if (typeof raw !== 'object' || raw === null) return undefined;

    const m = raw as Record<string, unknown>;

    const out: WfrpAttackMods = {
        ...(SPOTS_ACCEPTED.includes(m.calledShot) && {
            calledShot: m.calledShot as HitSpot,
        }),
        ...(m.cover === true && { cover: true }),
        ...((m.highGround === 'attacker' || m.highGround === 'defender') && {
            highGround: m.highGround,
        }),
        ...(m.enclosed === true && { enclosed: true }),
        ...(typeof m.helplessRoll === 'number' &&
            Number.isInteger(m.helplessRoll) &&
            m.helplessRoll >= 1 &&
            m.helplessRoll <= 100 && { helplessRoll: m.helplessRoll }),
        ...(m.grapple === true && { grapple: true }),
    };

    return Object.keys(out).length > 0 ? out : undefined;
}

function overcastOf(raw: unknown): WfrpOvercast | undefined {
    if (typeof raw !== 'object' || raw === null) return undefined;

    const out = Object.fromEntries(
        OVERCAST_DIMENSIONS.flatMap((d) => {
            const v = (raw as Record<string, unknown>)[d];

            return typeof v === 'number' && Number.isInteger(v) && v > 0
                ? [[d, v]]
                : [];
        })
    ) as WfrpOvercast;

    return Object.keys(out).length > 0 ? out : undefined;
}

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
        mods,
        overcast,
    } = raw as Record<string, unknown>;

    if (!KINDS.includes(kind)) return undefined;

    const parsedMods = modsOf(mods);

    const parsedOvercast = overcastOf(overcast);

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
        ...(parsedMods && { mods: parsedMods }),
        ...(parsedOvercast && { overcast: parsedOvercast }),
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
