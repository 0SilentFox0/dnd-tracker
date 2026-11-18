import { describe, expect, it } from 'vitest';

import { seq } from '@/lib/utils/abilities/__tests__/fixtures';
import { rollD20WithMode } from '@/systems/d20/rules/dice/roll-d20';

describe('rollD20WithMode', () => {
    it('normal rolls a single die', () => {
        expect(rollD20WithMode('normal', seq(0.5))).toEqual({
            roll: 11,
            rolls: [11],
        });
    });

    it.each([
        ['advantage', 0.1, 0.9, 19],
        ['advantage', 0.9, 0.1, 19],
        ['disadvantage', 0.1, 0.9, 3],
        ['disadvantage', 0.9, 0.1, 3],
    ] as const)('%s keeps the right die (%s, %s)', (mode, a, b, expected) => {
        const r = rollD20WithMode(mode, seq(a, b));

        expect(r.roll).toBe(expected);
        expect(r.rolls).toHaveLength(2);
    });

    it('a preset roll replaces only the first die', () => {
        expect(rollD20WithMode('advantage', seq(0.0), 15)).toEqual({
            roll: 15,
            rolls: [15, 1],
        });
        expect(rollD20WithMode('disadvantage', seq(0.95), 15)).toEqual({
            roll: 15,
            rolls: [15, 20],
        });
    });

    it('normal with a preset ignores the rng', () => {
        expect(rollD20WithMode('normal', () => 0.99, 7)).toEqual({
            roll: 7,
            rolls: [7],
        });
    });
});
