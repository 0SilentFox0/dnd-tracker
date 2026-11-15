import { describe, expect, it } from 'vitest';

import { edgeMask } from '../autotile';

describe('edgeMask', () => {
    it.each(
        [
            [false, false, false, false, 0],
            [true, false, false, false, 1],
            [false, true, false, false, 2],
            [true, true, false, false, 3],
            [false, false, true, false, 4],
            [true, false, true, false, 5],
            [false, true, true, false, 6],
            [true, true, true, false, 7],
            [false, false, false, true, 8],
            [true, false, false, true, 9],
            [false, true, false, true, 10],
            [true, true, false, true, 11],
            [false, false, true, true, 12],
            [true, false, true, true, 13],
            [false, true, true, true, 14],
            [true, true, true, true, 15],
        ] as const
    )('maps neighbor presence to mask %i', (north, east, south, west, expected) => {
        expect(edgeMask({ north, east, south, west })).toBe(expected);
    });
});
