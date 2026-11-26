import { describe, expect, it } from 'vitest';

import {
    canonicalEdge,
    edgeCellsOf,
    edgeGridOf,
    edgeKeyBetween,
    edgeSegment,
    type HexDir,
    parseEdge,
} from '../edge-keys';
import { HEX_R, hexNeighbors, hexPolygon, hexVertices } from '../hex';

const DIRS: HexDir[] = ['n', 'ne', 'se', 's', 'sw', 'nw'];

describe('canonicalEdge hex', () => {
    it('even column', () => {
        const exp = ['2:3:n', '2:3:ne', '2:3:se', '2:4:n', '1:3:ne', '1:2:se'];

        expect(DIRS.map((d) => canonicalEdge('hex', { x: 2, y: 3 }, d))).toEqual(exp);
    });

    it('odd column', () => {
        const c = { x: 3, y: 3 };

        expect(canonicalEdge('hex', c, 's')).toBe('3:4:n');
        expect(canonicalEdge('hex', c, 'sw')).toBe('2:4:ne');
        expect(canonicalEdge('hex', c, 'nw')).toBe('2:3:se');
    });
});

describe('hex edges between neighbours', () => {
    const same = (p: { x: number; y: number }, q: { x: number; y: number }) =>
        p.x === q.x && p.y === q.y;

    it('is symmetric and resolves to both cells', () => {
        for (let x = 0; x < 4; x++)
            for (let y = 0; y < 4; y++) {
                const a = { x, y };

                for (const b of hexNeighbors(a)) {
                    const k = edgeKeyBetween('hex', a, b);

                    expect(k).not.toBeNull();
                    expect(k).toBe(edgeKeyBetween('hex', b, a));

                    const [p, q] = edgeCellsOf('hex', k ?? '');

                    expect((same(p, a) && same(q, b)) || (same(p, b) && same(q, a))).toBe(true);
                }
            }
    });

    it('segment lies on both cells vertices with length HEX_R', () => {
        const near = (p: { x: number; y: number }, vs: { x: number; y: number }[]) =>
            vs.some((v) => Math.hypot(v.x - p.x, v.y - p.y) < 1e-6);

        for (const a of [{ x: 2, y: 3 }, { x: 3, y: 3 }]) {
            for (const b of hexNeighbors(a)) {
                const [p, q] = edgeSegment('hex', edgeKeyBetween('hex', a, b) ?? '');

                for (const pt of [p, q]) {
                    expect(near(pt, hexVertices(a))).toBe(true);
                    expect(near(pt, hexVertices(b))).toBe(true);
                }
                expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeCloseTo(HEX_R, 6);
            }
        }
    });
});

describe('square edges', () => {
    it('keys between cells', () => {
        expect(edgeKeyBetween('square', { x: 1, y: 1 }, { x: 2, y: 1 })).toBe('1:1:e');
        expect(edgeKeyBetween('square', { x: 2, y: 1 }, { x: 1, y: 1 })).toBe('1:1:e');
        expect(edgeKeyBetween('square', { x: 1, y: 1 }, { x: 1, y: 0 })).toBe('1:0:s');
        expect(edgeKeyBetween('square', { x: 1, y: 1 }, { x: 2, y: 2 })).toBeNull();
    });

    it('segment', () => {
        expect(edgeSegment('square', '1:1:e')).toEqual([
            { x: 200, y: 100 },
            { x: 200, y: 200 },
        ]);
    });
});

describe('edge grid detection', () => {
    it('by side token', () => {
        expect(edgeGridOf('1:1:e')).toBe('square');
        expect(edgeGridOf('1:1:ne')).toBe('hex');
        expect(edgeGridOf('1:1:x')).toBeNull();
        expect(parseEdge('a:1:e')).toBeNull();
    });
});

describe('hexPolygon', () => {
    it('is unchanged', () => {
        expect(hexPolygon({ x: 0, y: 0 })).toBe(
            '100.0,43.3 75.0,86.6 25.0,86.6 0.0,43.3 25.0,0.0 75.0,-0.0'
        );
        expect(hexPolygon({ x: 3, y: 2 })).toBe(
            '325.0,259.8 300.0,303.1 250.0,303.1 225.0,259.8 250.0,216.5 300.0,216.5'
        );
    });
});
