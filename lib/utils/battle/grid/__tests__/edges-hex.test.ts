import { describe, expect, it } from 'vitest';

import { canonicalEdge } from '../edge-keys';
import { cellsConnected, edgeBlocks } from '../edges';
import { canStep, wallSet } from '../walls';

import { testMap } from '@/lib/utils/battle/__tests__/fixtures/placed';

const at = (x: number, y: number) => ({ x, y });

const wall = canonicalEdge('hex', at(2, 2), 'n');

const base = { gridType: 'hex' as const };

const map = testMap(5, 5, { ...base, walls: [wall] });

describe('hex edges', () => {
    it('wall blocks move both ways, other edges stay open', () => {
        expect(edgeBlocks(map, at(2, 2), at(2, 1), 'move')).toBe(true);
        expect(edgeBlocks(map, at(2, 1), at(2, 2), 'move')).toBe(true);
        expect(edgeBlocks(map, at(2, 2), at(3, 2), 'move')).toBe(false);
    });

    it('bars block move only', () => {
        const m = testMap(5, 5, { ...base, bars: [wall] });

        expect(edgeBlocks(m, at(2, 2), at(2, 1), 'move')).toBe(true);
        expect(edgeBlocks(m, at(2, 2), at(2, 1), 'sight')).toBe(false);
        expect(edgeBlocks(m, at(2, 2), at(2, 1), 'fire')).toBe(false);
    });

    it('closed door blocks, open door does not', () => {
        const closed = testMap(5, 5, { ...base, doors: { [wall]: { open: false } } });

        const open = testMap(5, 5, { ...base, doors: { [wall]: { open: true } } });

        for (const kind of ['move', 'sight'] as const) {
            expect(edgeBlocks(closed, at(2, 2), at(2, 1), kind)).toBe(true);
            expect(edgeBlocks(open, at(2, 2), at(2, 1), kind)).toBe(false);
        }
    });

    it('cellsConnected follows the hex line', () => {
        expect(cellsConnected(map, 'sight', [at(2, 3)], [at(2, 0)])).toBe(false);
        expect(cellsConnected(map, 'sight', [at(0, 2)], [at(4, 2)])).toBe(true);
    });

    it('canStep: neighbours only, wall blocks', () => {
        const grid = { cols: 5, rows: 5, gridType: 'hex' as const };

        expect(canStep(grid, wallSet([wall]), at(2, 2), at(2, 1))).toBe(false);
        expect(canStep(grid, wallSet([]), at(2, 2), at(2, 1))).toBe(true);
        expect(canStep(grid, wallSet([]), at(2, 2), at(2, 0))).toBe(false);
    });
});
