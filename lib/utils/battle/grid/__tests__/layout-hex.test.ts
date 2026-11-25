import { describe, expect, it } from 'vitest';

import {
    cellAtScreenPoint,
    cellCenter,
    cellPolygon,
    cellScreenPoint,
    fitMapBox,
    gridMetrics,
    mapSize,
    tokenBox,
    UNIT,
} from '../layout';

import { placed } from '@/lib/utils/battle/__tests__/fixtures/placed';

const identity = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

describe('gridMetrics', () => {
    it('square metrics equal the plain UNIT grid', () => {
        const m = gridMetrics('square');

        expect(m.colStep).toBe(UNIT);
        expect(m.rowStep).toBe(UNIT);
        expect(m.size({ cols: 4, rows: 3 })).toEqual({
            width: 400,
            height: 300,
        });
        expect(m.cellRect({ x: 2, y: 1 })).toEqual({
            x: 200,
            y: 100,
            width: 100,
            height: 100,
        });
    });

    it('hex metrics use 1.5R columns and sqrt(3)R rows', () => {
        const m = gridMetrics('hex');

        expect(m.colStep).toBeCloseTo(75, 5);
        expect(m.rowStep).toBeCloseTo(86.6, 1);
        expect(m.size({ cols: 4, rows: 3 })).toEqual(
            mapSize({ cols: 4, rows: 3 }, 'hex')
        );
        expect(m.cellRect({ x: 0, y: 0 }).width).toBe(100);
    });
});

describe('layout with grid = hex', () => {
    it('round-trips cell to screen point to cell', () => {
        const map = { cols: 11, rows: 11 };

        for (let x = 0; x < 11; x++)
            for (let y = 0; y < 11; y++) {
                const pt = cellScreenPoint(identity, { x, y }, 'hex');

                expect(
                    cellAtScreenPoint(map, identity, pt.x, pt.y, 'hex')
                ).toEqual({ x, y });
            }
    });

    it('returns null outside the map', () => {
        expect(
            cellAtScreenPoint({ cols: 3, rows: 3 }, identity, -20, 10, 'hex')
        ).toBeNull();
        expect(
            cellAtScreenPoint({ cols: 3, rows: 3 }, identity, 900, 10, 'hex')
        ).toBeNull();
    });

    it('square defaults stay unchanged', () => {
        expect(cellCenter({ x: 1, y: 1 })).toEqual({ x: 150, y: 150 });
        expect(cellCenter({ x: 1, y: 1 }, 'square')).toEqual({
            x: 150,
            y: 150,
        });
        expect(cellPolygon({ x: 0, y: 0 })).toBe(
            '0.0,0.0 100.0,0.0 100.0,100.0 0.0,100.0'
        );
        expect(mapSize({ cols: 4, rows: 3 })).toEqual({
            width: 400,
            height: 300,
        });
    });

    it('emits a six-point polygon and the hex map size', () => {
        expect(cellPolygon({ x: 2, y: 2 }, 'hex').split(' ')).toHaveLength(6);
        expect(mapSize({ cols: 4, rows: 3 }, 'hex').width).toBeCloseTo(
            1.5 * 50 * 4 + 25,
            5
        );
    });

    it('fits the hex box by its real aspect ratio', () => {
        const map = { cols: 10, rows: 10 };

        const { width, height } = mapSize(map, 'hex');

        const box = fitMapBox({ width: 1000, height: 1000 }, map, 'hex');

        expect(box.width / box.height).toBeCloseTo(width / height, 5);
    });

    it('sizes a large token as one hex cell', () => {
        const big = placed('b', { at: { x: 2, y: 2 }, size: 3 });

        const hexBox = tokenBox(big, 'hex');

        expect(hexBox?.size).toBeCloseTo(UNIT * 0.86, 5);
        expect(hexBox).toMatchObject(
            (() => {
                const c = cellCenter({ x: 2, y: 2 }, 'hex');

                return { cx: c.x, cy: c.y };
            })()
        );
        expect(tokenBox(big)?.size).toBeCloseTo(3 * UNIT * 0.86, 5);
    });
});
