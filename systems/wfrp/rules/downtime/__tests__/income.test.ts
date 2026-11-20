import { describe, expect, it } from 'vitest';

import { rollIncome } from '../income';

const rng = () => 0.5;

describe('rollIncome', () => {
    it('brass pays 2d10 per level, silver 1d10, gold a crown per level', () => {
        expect(rollIncome({ tier: 'brass', level: 2 }, true, rng)).toEqual({
            coin: 'cp',
            amount: 24,
        });
        expect(rollIncome({ tier: 'silver', level: 3 }, true, rng)).toEqual({
            coin: 'sp',
            amount: 18,
        });
        expect(rollIncome({ tier: 'gold', level: 2 }, true, rng)).toEqual({
            coin: 'gp',
            amount: 2,
        });
    });

    it('halves on failure, rounding down', () => {
        expect(
            rollIncome({ tier: 'brass', level: 1 }, false, () => 0.6)
        ).toEqual({ coin: 'cp', amount: 7 });
        expect(rollIncome({ tier: 'gold', level: 1 }, false, rng).amount).toBe(
            0
        );
    });
});
