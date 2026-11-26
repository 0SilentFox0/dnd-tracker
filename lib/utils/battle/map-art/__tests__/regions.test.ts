import { describe, expect, it } from 'vitest';

import { applyFloorStroke } from '../floors';
import { floorRegionSeeds } from '../regions';

describe('floorRegionSeeds', () => {
    const map = { cols: 10, rows: 4 };

    const paint = (cells: { x: number; y: number }[], chunks = {}) =>
        applyFloorStroke({ chunks, points: cells, code: 3, brushSize: 1, tool: 'brush', map })
            .chunks;

    it('gives separate areas of one code different seeds', () => {
        const seeds = floorRegionSeeds(
            paint([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 5, y: 0 }]),
            map,
            's'
        );

        expect(seeds[0]).toBe(seeds[1]);
        expect(seeds[0]).not.toBe(seeds[5]);
        expect(seeds[0]).not.toBe(0);
    });

    it('leaves empty cells at zero', () => {
        const seeds = floorRegionSeeds(paint([{ x: 0, y: 0 }]), map, 's');

        expect(seeds[1]).toBe(0);
        expect(seeds[39]).toBe(0);
    });
});
