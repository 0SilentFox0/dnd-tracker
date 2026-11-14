import { describe, expect, it } from 'vitest';

import { rayCells, templateCells } from '../template';

import { testMap } from '@/lib/utils/battle/__tests__/fixtures/placed';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import type { GridPoint, SpellTemplate } from '@/types/battle';

const column = (edge: 'walls' | 'bars') => ({
    [edge]: Array.from({ length: 12 }, (_, y) => `5:${y}:e`),
});

const wallMap = testMap(12, 12, column('walls'));

const barMap = testMap(12, 12, column('bars'));

const xs = (cells: string[]) => cells.map((c) => Number(c.split(':')[0]));

const cast = (
    map: typeof wallMap,
    template: SpellTemplate,
    origin: GridPoint[],
    aim: GridPoint
) => templateCells(map, template, origin, aim, DEFAULT_RULES);

const ORIGIN = [{ x: 2, y: 5 }];

describe('шаблони й стіни', () => {
    it('промінь зупиняється перед стіною', () => {
        const cells = rayCells(
            wallMap,
            { x: 1, y: 5 },
            { x: 9, y: 5 },
            { maxCells: 8 }
        );

        expect(Math.max(...cells.map((c) => c.x))).toBe(5);
    });

    it.each<SpellTemplate>([
        { shape: 'circle', size: 20 },
        { shape: 'circle', size: 20, exact: true },
        { shape: 'cube', size: 15 },
        { shape: 'cross', size: 15 },
    ])('центрована форма $shape не лізе крізь стіну', (template) => {
        const open = cast(testMap(12, 12), template, ORIGIN, { x: 5, y: 5 });

        const walled = cast(wallMap, template, ORIGIN, { x: 5, y: 5 });

        expect(Math.max(...xs(open))).toBeGreaterThan(5);
        expect(Math.max(...xs(walled))).toBeLessThanOrEqual(5);
    });

    it('конус і лінія відсікаються стіною', () => {
        for (const shape of ['cone', 'line'] as const) {
            const cells = cast(wallMap, { shape, size: 30 }, ORIGIN, {
                x: 8,
                y: 5,
            });

            expect(cells.length).toBeGreaterThan(0);
            expect(Math.max(...xs(cells))).toBeLessThanOrEqual(5);
        }
    });

    it('ґрати шаблон не блокують', () => {
        const cells = cast(barMap, { shape: 'circle', size: 20 }, ORIGIN, {
            x: 5,
            y: 5,
        });

        expect(Math.max(...xs(cells))).toBeGreaterThan(5);
    });
});
