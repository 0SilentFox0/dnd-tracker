import { describe, expect, it } from 'vitest';

import { visibleFrom, visibleFromMany } from '../shadowcast';

import type { BattleMapConfig } from '@/types/battle-grid';

const map = (overrides: Partial<BattleMapConfig> = {}): BattleMapConfig => ({
    cols: 9,
    rows: 9,
    background: null,
    opacity: 1,
    ...overrides,
});

describe('grid line of sight', () => {
    it('includes the source and cells within a bounded radius', () => {
        const visible = visibleFrom(map(), { x: 4, y: 4 }, 2);

        expect(visible.has('4:4')).toBe(true);
        expect(visible.has('6:4')).toBe(true);
        expect(visible.has('7:4')).toBe(false);
        expect(visible.has('6:6')).toBe(false);
    });

    it('blocks cells behind walls, closed doors, and opaque terrain', () => {
        const blocked = visibleFrom(
            map({
                walls: ['3:4:e'],
            }),
            { x: 2, y: 4 },
            6
        );

        expect(blocked.has('4:4')).toBe(false);

        const doorBlocked = visibleFrom(
            map({ doors: { '4:5:e': { open: false } } }),
            { x: 2, y: 5 },
            6
        );

        expect(doorBlocked.has('6:5')).toBe(false);

        const obscured = visibleFrom(
            map({ terrain: { '4:6': { kind: 'difficult', obscured: true } } }),
            { x: 4, y: 4 },
            4
        );

        expect(obscured.has('4:6')).toBe(true);
        expect(obscured.has('4:7')).toBe(false);

        const tileObscured = visibleFrom(
            map(),
            { x: 4, y: 4 },
            4,
            new Set(['4:6'])
        );

        expect(tileObscured.has('4:7')).toBe(false);
    });

    it('prevents diagonal corner leaks and unions multiple viewpoints', () => {
        const corner = visibleFrom(
            map({ walls: ['4:3:s', '3:4:e'] }),
            { x: 3, y: 3 },
            4
        );

        const union = visibleFromMany(
            map(),
            [
                { x: 1, y: 1 },
                { x: 7, y: 7 },
            ],
            1
        );

        expect(corner.has('4:4')).toBe(false);

        const walled = map({ walls: ['3:4:e'] });

        const forward = visibleFrom(walled, { x: 2, y: 4 }, 6);

        const reverse = visibleFrom(walled, { x: 6, y: 4 }, 6);

        expect(forward.has('6:4')).toBe(reverse.has('2:4'));
        expect(union.has('1:1')).toBe(true);
        expect(union.has('7:7')).toBe(true);
        expect(union.has('4:4')).toBe(false);
    });

    it('caps maximum-range output to the radius and grid bounds on a 200×200 map', () => {
        const large = map({ cols: 200, rows: 200 });

        const visible = visibleFrom(large, { x: 100, y: 100 }, 40);

        expect(visible.size).toBeGreaterThan(0);
        expect(visible.size).toBeLessThanOrEqual(81 * 81);
        expect(
            [...visible].every((cell) => {
                const [x, y] = cell.split(':').map(Number);

                return x >= 60 && x <= 140 && y >= 60 && y <= 140;
            })
        ).toBe(true);
    });
});
