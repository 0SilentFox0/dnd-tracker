import { describe, expect, it } from 'vitest';

import {
    addRevealedRuns,
    diffRevealedRuns,
    normalizeRevealedRuns,
    removeRevealedRuns,
    revealedHas,
} from '../revealed-runs';

describe('revealed row runs', () => {
    it('sorts, clips, and merges overlapping or adjacent spans', () => {
        expect(
            normalizeRevealedRuns(
                [
                    [2, 5, 8],
                    [1, 3, 6],
                    [2, 1, 5],
                    [1, 6, 12],
                ],
                { cols: 10, rows: 4 }
            )
        ).toEqual([
            [1, 3, 10],
            [2, 1, 8],
        ]);
    });

    it('checks membership and subtracts runs without losing the outer spans', () => {
        const source = [
            [4, 0, 10],
            [5, 2, 7],
        ] as const;

        expect(revealedHas(source, 0, 4)).toBe(true);
        expect(revealedHas(source, 10, 4)).toBe(false);
        expect(revealedHas(source, 3, 6)).toBe(false);
        expect(removeRevealedRuns(source, [[4, 3, 6]])).toEqual([
            [4, 0, 3],
            [4, 6, 10],
            [5, 2, 7],
        ]);
    });

    it('adds runs idempotently and computes a reversible set delta', () => {
        const before = [
            [1, 0, 4],
            [2, 1, 5],
        ] as const;

        const after = addRevealedRuns(before, [
            [1, 3, 7],
            [3, 2, 6],
        ]);

        expect(after).toEqual([
            [1, 0, 7],
            [2, 1, 5],
            [3, 2, 6],
        ]);
        expect(addRevealedRuns(after, [[1, 3, 7]])).toEqual(after);
        expect(diffRevealedRuns(before, after)).toEqual({
            add: [
                [1, 4, 7],
                [3, 2, 6],
            ],
            remove: [],
        });
        expect(diffRevealedRuns(after, before)).toEqual({
            add: [],
            remove: [
                [1, 4, 7],
                [3, 2, 6],
            ],
        });
    });
});
