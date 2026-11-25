import { describe, expect, it } from 'vitest';

import { backgroundBox, gridForCellSize } from '../background';
import { hexCenter, hexMapSize, hexNeighbors } from '../hex';
import {
    cellAtScreenPoint,
    cellCenter,
    fitMapBox,
    fitMapView,
    mapPixelSize,
    visibleGridWindow,
} from '../layout';
import {
    gridLinesPath,
    hexEdgeNeighbor,
    regionFillPath,
    regionOutlinePath,
} from '../region-path';

const ID = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

const segments = (d: string) => d.match(/M[^M]+/g) ?? [];

describe('hex region paths', () => {
    it('fill is one path with one closed sub-path per cell', () => {
        const d = regionFillPath(['0:0', '1:0', '1:1'], 'hex');

        expect(segments(d)).toHaveLength(3);
        expect(d.match(/z/g)).toHaveLength(3);
    });

    it('square fill is unchanged', () => {
        expect(regionFillPath(['0:0'])).toBe('M0 0h100v100h-100z');
    });

    it('edge i faces the neighbour whose centre mirrors the edge midpoint', () => {
        const p = { x: 3, y: 2 };

        const c = hexCenter(p);

        for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i;

            const b = (Math.PI / 3) * (i + 1);

            const mid = {
                x: c.x + (50 * (Math.cos(a) + Math.cos(b))) / 2,
                y: c.y + (50 * (Math.sin(a) + Math.sin(b))) / 2,
            };

            const n = hexCenter(hexEdgeNeighbor(p, i));

            expect(n.x).toBeCloseTo(2 * mid.x - c.x, 5);
            expect(n.y).toBeCloseTo(2 * mid.y - c.y, 5);
        }

        expect(hexNeighbors(p)).toHaveLength(6);
    });

    it('outline cancels the shared edge of two adjacent cells', () => {
        const a = { x: 1, y: 1 };

        const b = hexEdgeNeighbor(a, 0);

        const keys = [a, b].map((p) => `${p.x}:${p.y}`);

        expect(
            segments(regionOutlinePath(keys.slice(0, 1), 'hex'))
        ).toHaveLength(6);
        expect(segments(regionOutlinePath(keys, 'hex'))).toHaveLength(10);
    });

    it('grid lines have no duplicate edges', () => {
        const edges = segments(gridLinesPath(3, 3, 'hex')).flatMap((s) => {
            const pts = s.slice(1).split('L');

            return pts.slice(1).map((pt, i) => [pts[i], pt].sort().join('|'));
        });

        expect(new Set(edges).size).toBe(edges.length);
    });
});

describe('hex layout', () => {
    it('hit-tests every cell centre back to its cell', () => {
        const map = { cols: 5, rows: 4 };

        for (let x = 0; x < map.cols; x++)
            for (let y = 0; y < map.rows; y++) {
                const c = cellCenter({ x, y }, 'hex');

                expect(cellAtScreenPoint(map, ID, c.x, c.y, 'hex')).toEqual({
                    x,
                    y,
                });
            }

        expect(cellAtScreenPoint(map, ID, -10, -10, 'hex')).toBeNull();
    });

    it('fits the box by the hex map ratio', () => {
        const map = { cols: 6, rows: 6 };

        const size = hexMapSize(6, 6);

        const box = fitMapBox({ width: 1000, height: 1000 }, map, 'hex');

        expect(box.width / box.height).toBeCloseTo(size.width / size.height, 6);
        expect(fitMapBox({ width: 1000, height: 1000 }, map)).toEqual({
            width: 1000,
            height: 1000,
        });
    });

    it('never rotates a hex map', () => {
        const view = fitMapView(
            { width: 300, height: 900 },
            { cols: 12, rows: 4 },
            { rotatable: true, grid: 'hex' }
        );

        expect(view.rotated).toBe(false);
    });

    it('visible window divides by column and row steps', () => {
        const win = visibleGridWindow(
            {
                viewport: { left: 0, top: 0, right: 150, bottom: 87 },
                ctm: ID,
                cols: 100,
                rows: 100,
                grid: 'hex',
            },
            0
        );

        expect(win.x).toBe(0);
        expect(win.cols).toBe(16);
    });

    it('background box and sizing use hex steps', () => {
        const box = backgroundBox({ cols: 4, rows: 4 }, 100, null, 'hex');

        expect([box.width, box.height]).toEqual([
            mapPixelSize({ cols: 4, rows: 4 }, 100, 'hex').width,
            mapPixelSize({ cols: 4, rows: 4 }, 100, 'hex').height,
        ]);
        expect(
            gridForCellSize({ width: 750, height: 866 }, 100, 'hex')
                .backgroundCols
        ).toBeCloseTo(10, 6);
    });
});
