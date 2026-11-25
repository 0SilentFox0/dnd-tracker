import { describe, expect, it } from 'vitest';

import {
    cellDistance,
    cellLine,
    cellsByDistance,
    footprint,
    footprintDistance,
    gridOf,
    neighbors,
} from '../geometry';

describe('gridOf', () => {
    it('defaults to square for missing map or field', () => {
        expect(gridOf(undefined)).toBe('square');
        expect(gridOf(null)).toBe('square');
        expect(gridOf({})).toBe('square');
        expect(gridOf({ gridType: 'hex' })).toBe('hex');
    });
});

describe('geometry with grid = hex', () => {
    it('uses 6 neighbours and hex distance', () => {
        expect(neighbors({ x: 5, y: 5 }, 'hex')).toHaveLength(6);
        expect(cellDistance({ x: 0, y: 0 }, { x: 1, y: 1 }, 'hex')).toBe(2);
        expect(cellDistance({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(1);
    });

    it('draws a hex line and keeps footprint at one cell', () => {
        const line = cellLine({ x: 0, y: 0 }, { x: 4, y: 2 }, 'hex');

        expect(line).toHaveLength(
            cellDistance({ x: 0, y: 0 }, { x: 4, y: 2 }, 'hex') + 1
        );
        expect(footprint({ x: 2, y: 2 }, 3, 'hex')).toEqual([{ x: 2, y: 2 }]);
        expect(footprint({ x: 2, y: 2 }, 2, 'square')).toHaveLength(4);
    });

    it('measures footprint distance on hex', () => {
        expect(
            footprintDistance([{ x: 0, y: 0 }], [{ x: 1, y: 1 }], 'hex')
        ).toBe(2);
    });

    it('orders every in-bounds cell by distance from the origin', () => {
        const map = { cols: 6, rows: 5 };

        const cells = cellsByDistance(map, { x: 2, y: 2 }, 'hex');

        expect(cells).toHaveLength(30);
        expect(new Set(cells.map((c) => `${c.x}:${c.y}`)).size).toBe(30);

        const dists = cells.map((c) => cellDistance({ x: 2, y: 2 }, c, 'hex'));

        expect(dists).toEqual([...dists].sort((a, b) => a - b));
        expect(cells[0]).toEqual({ x: 2, y: 2 });
    });
});
