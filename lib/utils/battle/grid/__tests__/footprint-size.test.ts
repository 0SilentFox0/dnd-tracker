import { describe, expect, it } from 'vitest';

import { cellsOf, footprintSizeOf, isAdjacent, sizeOf } from '../occupancy';

import { placed } from '@/lib/utils/battle/__tests__/fixtures/placed';

describe('footprintSizeOf', () => {
    const huge = placed('h', { at: { x: 2, y: 2 }, size: 3 });

    it('is sizeOf on square and 1 on hex', () => {
        expect(footprintSizeOf(huge, 'square')).toBe(sizeOf(huge));
        expect(footprintSizeOf(huge, 'square')).toBe(3);
        expect(footprintSizeOf(huge, 'hex')).toBe(1);
    });

    it('does not change sizeOf or stored gridSize', () => {
        expect(sizeOf(huge)).toBe(3);
        expect(huge.combatStats.gridSize).toBe(3);
    });

    it('cellsOf follows the grid', () => {
        expect(cellsOf(huge, 'square')).toHaveLength(9);
        expect(cellsOf(huge, 'hex')).toEqual([{ x: 2, y: 2 }]);
    });

    it('isAdjacent uses hex distance on hex', () => {
        const a = placed('a', { at: { x: 0, y: 0 } });

        const b = placed('b', { at: { x: 1, y: 1 } });

        expect(isAdjacent(a, b, 'square')).toBe(true);
        expect(isAdjacent(a, b, 'hex')).toBe(false);
    });
});
