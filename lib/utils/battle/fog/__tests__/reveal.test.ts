import { describe, expect, it } from 'vitest';

import { floodRoom, revealCells, revealRectangle } from '../reveal';
import { revealedHas } from '../revealed-runs';

import type { BattleMapConfig } from '@/types/battle-grid';

const map = (overrides: Partial<BattleMapConfig> = {}): BattleMapConfig => ({
    cols: 5,
    rows: 4,
    background: null,
    opacity: 1,
    ...overrides,
});

describe('fog reveal geometry', () => {
    it('fills an enclosed room and stops at walls and blocked cells', () => {
        const room = map({
            walls: ['1:0:e', '1:1:e', '1:2:e', '1:3:e'],
            blocked: ['4:0'],
        });

        const filled = floodRoom({ map: room, start: { x: 0, y: 0 } });

        expect(filled.size).toBe(8);
        expect(filled.has('2:0')).toBe(false);
        expect(filled.has('4:0')).toBe(false);
    });

    it('clips brush and rectangle cells to map bounds and respects caller blocks', () => {
        const grid = map();

        const brush = revealCells(
            grid,
            [
                { x: -1, y: 0 },
                { x: 2, y: 2 },
            ],
            new Set(['2:2'])
        );

        expect(brush).toEqual([]);
        expect(revealRectangle(grid, { x: -2, y: 1 }, { x: 2, y: 3 })).toEqual([
            [1, 0, 3],
            [2, 0, 3],
            [3, 0, 3],
        ]);
    });

    it('stops room fill at closed doors, bars, and impassable terrain', () => {
        expect(
            floodRoom({
                map: map({
                    cols: 2,
                    rows: 1,
                    doors: { '0:0:e': { open: false } },
                }),
                start: { x: 0, y: 0 },
            }).size
        ).toBe(1);
        expect(
            floodRoom({
                map: map({
                    cols: 2,
                    rows: 1,
                    bars: ['0:0:e'],
                    terrain: { '1:0': { kind: 'wall' } },
                }),
                start: { x: 0, y: 0 },
            }).size
        ).toBe(1);
    });

    it('converts fill output to normalized row runs', () => {
        const cells = floodRoom({ map: map(), start: { x: 1, y: 1 } });

        const runs = revealCells(
            map(),
            [...cells].map((key) => {
                const [x, y] = key.split(':').map(Number);

                return { x, y };
            })
        );

        expect(runs).toEqual([
            [0, 0, 5],
            [1, 0, 5],
            [2, 0, 5],
            [3, 0, 5],
        ]);
        expect(revealedHas(runs, 4, 3)).toBe(true);
    });

    it('large map with many blocked cells reveals quickly and correctly', () => {
        const side = 200;

        const blocked = Array.from(
            { length: side * side },
            (_, i) => `${i % side}:${Math.floor(i / side)}`
        ).filter((_, i) => i % 3 === 0);

        const big = map({ cols: side, rows: side, blocked });

        const started = Date.now();

        const runs = revealRectangle(big, { x: 0, y: 0 }, { x: side - 1, y: side - 1 });

        const cells = revealCells(
            big,
            Array.from({ length: side * side }, (_, i) => ({
                x: i % side,
                y: Math.floor(i / side),
            }))
        );

        expect(Date.now() - started).toBeLessThan(2000);
        expect(runs).toEqual(cells);
        expect(revealedHas(runs, 1, 0)).toBe(true);
        expect(revealedHas(runs, 0, 0)).toBe(false);
    });

    it('ignores NaN and fractional cells', () => {
        expect(revealCells(map(), [{ x: NaN, y: 0 }, { x: 1.5, y: 1 }])).toEqual([]);
    });
});
