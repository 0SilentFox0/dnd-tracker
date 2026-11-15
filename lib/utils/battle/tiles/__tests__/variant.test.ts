import { describe, expect, it } from 'vitest';

import { variantFor } from '../variant';

const variants = [
    { asset: 'a', weight: 1 },
    { asset: 'b', weight: 2 },
    { asset: 'c', weight: 1 },
];

describe('variantFor', () => {
    it('returns a valid weighted variant deterministically for a cell', () => {
        const first = variantFor('map-seed', 9, 12, 4, variants);

        expect(first).toBe(variantFor('map-seed', 9, 12, 4, variants));
        expect(first).toBeGreaterThanOrEqual(0);
        expect(first).toBeLessThan(variants.length);
    });

    it('changes the distribution when the map seed changes', () => {
        const picks = (seed: string) =>
            Array.from({ length: 64 }, (_, x) =>
                variantFor(seed, x, x * 3, 4, variants)
            );

        expect(picks('seed-a')).not.toEqual(picks('seed-b'));
        expect(new Set(picks('seed-a')).size).toBeGreaterThan(1);
    });

    it('rejects an empty or non-positive variant list', () => {
        expect(() => variantFor('map-seed', 0, 0, 4, [])).toThrow();
        expect(() =>
            variantFor('map-seed', 0, 0, 4, [{ asset: 'a', weight: 0 }])
        ).toThrow();
    });
});
