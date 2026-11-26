import { describe, expect, it } from 'vitest';

import { roomPerimeter } from '../room';

describe('roomPerimeter', () => {
    const square = { cols: 6, rows: 6 };

    it('returns the 8 perimeter edges of a 2x2 room', () => {
        const r = roomPerimeter(square, { x: 1, y: 1 }, { x: 2, y: 2 });

        expect(r.cells).toHaveLength(4);
        expect(new Set(r.edges).size).toBe(8);
    });

    it('skips edges on the map border', () => {
        expect(roomPerimeter(square, { x: 0, y: 0 }, { x: 1, y: 1 }).edges).toHaveLength(4);
    });

    it('returns the 6 edges of a single hex', () => {
        const r = roomPerimeter(
            { ...square, gridType: 'hex' },
            { x: 2, y: 2 },
            { x: 2, y: 2 }
        );

        expect(r.edges).toHaveLength(6);
    });
});
