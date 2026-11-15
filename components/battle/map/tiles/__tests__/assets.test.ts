import { describe, expect, it } from 'vitest';

import { visibleTileIds } from '../assets';

describe('visibleTileIds', () => {
    it('returns only ids anchored in the visible chunks plus footprint margin', () => {
        const ground = new Uint16Array(256);

        ground[1] = 2;
        ground[2] = 1;
        ground[3] = 3;
        ground[4] = 5;
        ground[18] = 4;
        ground[33] = 6;

        expect(
            visibleTileIds(
                { ground: { '0:0': ground } },
                { x: 2, y: 0, cols: 1, rows: 1 }
            )
        ).toEqual([1, 2, 3, 4]);
    });
});
