import { describe, expect, it } from 'vitest';

import { tooBigToHold } from '../size-limit';

import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import type { BattleParticipant } from '@/types/battle';

const sized = (id: string, gridSize: number): BattleParticipant => {
    const p = makeParticipant({ id });

    return { ...p, combatStats: { ...p.combatStats, gridSize } };
};

describe('tooBigToHold', () => {
    it('allows equal and one-larger targets', () => {
        expect(tooBigToHold(sized('a', 1), sized('b', 1))).toBe(false);
        expect(tooBigToHold(sized('a', 1), sized('b', 2))).toBe(false);
        expect(tooBigToHold(sized('a', 3), sized('b', 4))).toBe(false);
    });

    it('rejects a target two or more sizes larger', () => {
        expect(tooBigToHold(sized('a', 1), sized('b', 3))).toBe(true);
        expect(tooBigToHold(sized('a', 2), sized('b', 4))).toBe(true);
    });

    it('smaller targets are always fine', () => {
        expect(tooBigToHold(sized('a', 4), sized('b', 1))).toBe(false);
    });
});
