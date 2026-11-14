import { describe, expect, it } from 'vitest';

import {
    fromCellRect,
    MAX_CELL_PX,
    MIN_CELL_PX,
    nudge,
} from '@/lib/utils/battle/grid';

const img = { width: 1000, height: 600 };

describe('fromCellRect', () => {
    it('квадратна клітинка: масштаб по обох осях і зсув', () => {
        const out = fromCellRect(img, { x: 150, y: 80, w: 100, h: 100 });

        expect(out.backgroundCols).toBe(10);
        expect(out.backgroundRows).toBe(6);
        expect(out.gridOffset.x).toBeCloseTo(0.5);
        expect(out.gridOffset.y).toBeCloseTo(0.8);
    });

    it('прямокутна клітинка дає різні cols і rows', () => {
        const out = fromCellRect(img, { x: 0, y: 0, w: 100, h: 50 });

        expect(out.backgroundCols).toBe(10);
        expect(out.backgroundRows).toBe(12);
    });

    it('квадрат N×N ділить розміри на n', () => {
        const out = fromCellRect(img, { x: 0, y: 0, w: 300, h: 300 }, 3);

        expect(out.backgroundCols).toBe(10);
        expect(out.backgroundRows).toBe(6);
    });

    it('зсув на межі клітинки — 0, а не 1', () => {
        const out = fromCellRect(img, { x: 200, y: 100, w: 100, h: 100 });

        expect(out.gridOffset).toEqual({ x: 0, y: 0 });
        expect(out.gridOffset.x).toBeLessThan(1);
    });

    it('розмір клітинки обмежений MIN/MAX_CELL_PX', () => {
        const small = fromCellRect(img, { x: 0, y: 0, w: 2, h: 2 });

        const big = fromCellRect(img, { x: 0, y: 0, w: 900, h: 900 });

        expect(small.backgroundCols).toBeCloseTo(img.width / MIN_CELL_PX);
        expect(big.backgroundRows).toBeCloseTo(img.height / MAX_CELL_PX);
    });
});

describe('nudge', () => {
    it('px рахується від розміру клітинки', () => {
        const out = nudge(
            { gridOffset: { x: 0.1, y: 0.2 } },
            5,
            -10,
            'px',
            100
        );

        expect(out.gridOffset.x).toBeCloseTo(0.15);
        expect(out.gridOffset.y).toBeCloseTo(0.1);
    });

    it('cell додає частки клітинки; без зсуву старт з нуля', () => {
        const out = nudge({}, 0.01, 0.25, 'cell', 100);

        expect(out.gridOffset.x).toBeCloseTo(0.01);
        expect(out.gridOffset.y).toBeCloseTo(0.25);
    });

    it('обгортається в [0, 1) в обидва боки', () => {
        const up = nudge(
            { gridOffset: { x: 0.99, y: 0 } },
            0.02,
            -0.01,
            'cell',
            1
        );

        expect(up.gridOffset.x).toBeCloseTo(0.01);
        expect(up.gridOffset.y).toBeCloseTo(0.99);
        expect(up.gridOffset.x).toBeLessThan(1);
    });
});
