import { describe, expect, it } from 'vitest';

import { cellsConnected, closedDoorsOf, edgeBlocks, wallsOf } from '../edges';

import { testMap } from '@/lib/utils/battle/__tests__/fixtures/placed';

const at = (x: number, y: number) => ({ x, y });

const doors = {
    '2:2:e': { open: false },
    '3:3:e': { open: true },
    '1:1:s': { open: false, locked: true },
};

const map = testMap(6, 6, { doors });

describe('closed doors', () => {
    it('closedDoorsOf: лише зачинені, стабільне посилання', () => {
        expect(closedDoorsOf(map)).toEqual(['2:2:e', '1:1:s']);
        expect(closedDoorsOf(map)).toBe(closedDoorsOf(map));
        expect(closedDoorsOf(testMap(6, 6, {})).length).toBe(0);
    });

    it('зачинені блокують move/sight/fire, відчинені — ні', () => {
        for (const kind of ['move', 'sight', 'fire'] as const) {
            expect(edgeBlocks(map, at(2, 2), at(3, 2), kind)).toBe(true);
            expect(edgeBlocks(map, at(1, 1), at(1, 2), kind)).toBe(true);
            expect(edgeBlocks(map, at(3, 3), at(4, 3), kind)).toBe(false);
        }
    });

    it('діагональ через кут із зачиненими дверима закрита', () => {
        expect(edgeBlocks(map, at(2, 1), at(3, 2), 'move')).toBe(true);
    });

    it('cellsConnected не бачить крізь зачинені', () => {
        expect(cellsConnected(map, 'sight', [at(2, 2)], [at(4, 2)])).toBe(
            false
        );
        expect(cellsConnected(map, 'sight', [at(3, 3)], [at(5, 3)])).toBe(true);
    });

    it('wallsOf об’єднує стіни та зачинені двері, результат мемоізований', () => {
        const withWalls = testMap(6, 6, { walls: ['0:0:e'], doors });

        expect([...wallsOf(withWalls)].sort()).toEqual(
            ['0:0:e', '1:1:s', '2:2:e'].sort()
        );
        expect(wallsOf(withWalls)).toBe(wallsOf(withWalls));
        expect(wallsOf(map)).toBe(wallsOf(map));
    });
});
