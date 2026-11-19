import type { HitLocation } from '../combat/constants';
import { wfrpState } from '../state';
import type { ForcedResult } from './resolve';

import { defineSlot } from '@/lib/utils/rules/systems/slot';
import type { BattleParticipant } from '@/types/battle';

export type FortuneKind = 'reroll' | 'sl' | 'notFail';

export interface FortuneInput {
    kind: FortuneKind;
    manualReroll?: number;
    /** `notFail` only: choose a Critical and, with it, the hit location (p133) */
    critical?: boolean;
    location?: HitLocation;
}

const KINDS: readonly unknown[] = ['reroll', 'sl', 'notFail'];

export const FORTUNE_INPUT = defineSlot<FortuneInput>('wfrp', (raw) => {
    if (typeof raw !== 'object' || raw === null) return undefined;

    const { kind, manualReroll, critical, location } = raw as Record<
        string,
        unknown
    >;

    if (!KINDS.includes(kind)) return undefined;

    return {
        kind: kind as FortuneKind,
        ...(typeof manualReroll === 'number' && { manualReroll }),
        ...(critical === true && { critical }),
        ...(typeof location === 'string' && {
            location: location as HitLocation,
        }),
    };
});

export const spentFortune = (p: BattleParticipant): { fortune: number } => ({
    fortune: Math.max(0, (wfrpState(p).fortune ?? 0) - 1),
});

export const spentFate = (p: BattleParticipant): { fate: number } => ({
    fate: Math.max(0, (wfrpState(p).fate ?? 0) - 1),
});

/** What the spend costs: Fate for `notFail`, Fortune otherwise */
export const spentFor = (p: BattleParticipant, kind: FortuneKind) =>
    kind === 'notFail' ? spentFate(p) : spentFortune(p);

export const forcedOf = (
    fortune: FortuneInput | undefined,
    minSl = 0
): ForcedResult | undefined =>
    fortune?.kind === 'notFail'
        ? { outcome: fortune.critical ? 'critical' : 'success', minSl }
        : undefined;

/** `test(preset, first)` runs one test; a reroll receives the first result. An `sl` Fortune is the caller's job (it adds the bonus inside `test`); so is `notFail` (it forces the result inside `test`). */
export function applyFortune<T extends { roll: number }>(
    test: (preset?: number, first?: T) => T,
    fortune: FortuneInput | undefined,
    isSuccess: (r: T) => boolean,
    firstPreset?: number
): { result: T; fortune?: { kind: FortuneKind; firstRoll?: number } } {
    const first = test(firstPreset);

    if (fortune?.kind === 'reroll' && !isSuccess(first))
        return {
            result: test(fortune.manualReroll, first),
            fortune: { kind: 'reroll', firstRoll: first.roll },
        };

    return fortune?.kind === 'sl' || fortune?.kind === 'notFail'
        ? { result: first, fortune: { kind: fortune.kind } }
        : { result: first };
}
