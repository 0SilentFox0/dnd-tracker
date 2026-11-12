import { describe, expect, it } from 'vitest';

import { reverseRoll, rollPercentile } from '../roll';

import { mulberry32 } from '@/lib/utils/common/rng';

describe('rollPercentile', () => {
    it('stays within 1..100', () => {
        const rng = mulberry32(1);

        for (let i = 0; i < 1000; i++) {
            const roll = rollPercentile(rng);

            expect(roll).toBeGreaterThanOrEqual(1);
            expect(roll).toBeLessThanOrEqual(100);
        }
    });

    it('returns the preset as is', () => {
        expect(rollPercentile(mulberry32(1), 42)).toBe(42);
    });
});

describe('reverseRoll', () => {
    it.each([
        [71, 17],
        [20, 2],
        [2, 20],
        [7, 70],
        [100, 100],
        [44, 44],
    ])('%i -> %i', (n, expected) => {
        expect(reverseRoll(n)).toBe(expected);
    });
});
