import { describe, expect, it } from 'vitest';

import {
    BAKE,
    bakeCellPx,
    bakedBackgroundSpan,
    bakePixelSize,
    nextBakeCellPx,
} from '../bake-size';

const SIDES = [4, 10, 30, 58, 59, 100, 150, 200];

describe('bake size', () => {
    it.each(['square', 'hex'] as const)('keeps %s maps within limits', (gridType) => {
        for (const cols of SIDES)
            for (const rows of SIDES) {
                const map = { cols, rows, gridType };

                const px = bakeCellPx(map);

                const { width, height } = bakePixelSize(map, px);

                expect(px).toBeGreaterThanOrEqual(BAKE.minCellPx);
                expect(px).toBeLessThanOrEqual(BAKE.maxCellPx);
                expect(Math.max(width, height)).toBeLessThanOrEqual(BAKE.maxSidePx);
            }
    });

    it('matches the reference sizes', () => {
        const sq30 = { cols: 30, rows: 30, gridType: 'square' as const };

        expect(bakeCellPx(sq30)).toBe(140);
        expect(bakePixelSize(sq30, 140)).toEqual({ width: 4200, height: 4200 });
        expect(bakeCellPx({ cols: 100, rows: 100, gridType: 'square' })).toBe(81);
        expect(bakeCellPx({ cols: 100, rows: 100, gridType: 'hex' })).toBe(94);
    });

    it('shrinks the cell size for an oversized file', () => {
        const next = nextBakeCellPx(81, 8 * 1024 * 1024);

        expect(next).toBeLessThan(81);
        expect(next).toBeGreaterThanOrEqual(BAKE.minCellPx);
    });

    it('computes the background span', () => {
        expect(bakedBackgroundSpan({ cols: 30, rows: 20 })).toEqual({
            backgroundCols: 30,
            backgroundRows: 20,
        });
        expect(
            bakedBackgroundSpan({ cols: 200, rows: 200, gridType: 'hex' }).backgroundCols
        ).toBeCloseTo(200.333, 2);
    });
});
