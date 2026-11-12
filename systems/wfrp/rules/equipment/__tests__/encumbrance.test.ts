import { describe, expect, it } from 'vitest';

import { DEFAULT_CHARACTERISTICS } from '../../characteristics/keys';
import { encumbrance } from '../encumbrance';

const gear = (weight: number) => ({
    systemStats: { type: 'gear', weight, price: 1, qualities: [] },
});

const chars = (s: number, t: number) => ({
    base: { ...DEFAULT_CHARACTERISTICS.base, s, t },
    advances: DEFAULT_CHARACTERISTICS.advances,
});

describe('encumbrance', () => {
    it('sums the weight of all items', () =>
        expect(encumbrance([gear(2), gear(1.5)], chars(40, 30)).carried).toBe(
            3.5
        ));

    it('multiplies by quantity', () =>
        expect(
            encumbrance([{ ...gear(2), quantity: 3 }, gear(1)], chars(40, 30))
                .carried
        ).toBe(7));

    it('counts unparsable items as zero', () =>
        expect(
            encumbrance(
                [
                    { systemStats: { nonsense: 1 } },
                    { systemStats: null },
                    gear(2),
                ],
                chars(40, 30)
            ).carried
        ).toBe(2));

    it('limit is SB + TB', () =>
        expect(encumbrance([], chars(40, 30)).limit).toBe(7));

    it('includes advances in the bonuses', () =>
        expect(
            encumbrance([], {
                base: chars(40, 30).base,
                advances: { ...DEFAULT_CHARACTERISTICS.advances, s: 10 },
            }).limit
        ).toBe(8));

    it('over only when carried exceeds the limit', () => {
        expect(encumbrance([gear(7)], chars(40, 30)).over).toBe(false);
        expect(encumbrance([gear(7.5)], chars(40, 30)).over).toBe(true);
    });
});
