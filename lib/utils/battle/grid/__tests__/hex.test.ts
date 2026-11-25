import { describe, expect, it } from 'vitest';

import {
    fromCube,
    hexAwayStep,
    hexCenter,
    hexDisk,
    hexDistance,
    hexLine,
    hexMapSize,
    hexNeighbors,
    hexPointToCell,
    hexPolygon,
    hexRing,
    toCube,
} from '../hex';

import type { GridPoint } from '@/types/battle-grid';

const key = (p: GridPoint) => `${p.x}:${p.y}`;

const cubeRef = (a: GridPoint, b: GridPoint) => {
    const q1 = a.x;

    const r1 = a.y - (a.x - (a.x % 2)) / 2;

    const q2 = b.x;

    const r2 = b.y - (b.x - (b.x % 2)) / 2;

    const dq = q1 - q2;

    const dr = r1 - r2;

    return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
};

describe('hex cube conversion', () => {
    it('round-trips offset cells', () => {
        for (let x = -3; x < 12; x++)
            for (let y = -3; y < 12; y++)
                expect(fromCube(toCube({ x, y }))).toEqual({ x, y });
    });

    it('keeps the cube invariant x + y + z = 0', () => {
        const c = toCube({ x: 7, y: 4 });

        expect(c.x + c.y + c.z).toBe(0);
    });
});

describe('hexNeighbors', () => {
    it.each([
        ['even column', { x: 2, y: 2 }],
        ['odd column', { x: 3, y: 2 }],
    ])('returns 6 distinct neighbours at distance 1 (%s)', (_, p) => {
        const n = hexNeighbors(p);

        expect(new Set(n.map(key)).size).toBe(6);
        expect(n.every((c) => hexDistance(p, c) === 1)).toBe(true);
    });

    it('matches the odd-q layout', () => {
        expect(hexNeighbors({ x: 2, y: 2 }).map(key).sort()).toEqual(
            ['3:1', '3:2', '2:3', '1:2', '1:1', '2:1'].sort()
        );
        expect(hexNeighbors({ x: 3, y: 2 }).map(key).sort()).toEqual(
            ['4:2', '4:3', '3:3', '2:3', '2:2', '3:1'].sort()
        );
    });
});

describe('hexDistance', () => {
    it('matches the cube reference on random pairs', () => {
        let seed = 7;

        const rnd = () => {
            seed = (seed * 1103515245 + 12345) % 2147483648;

            return seed % 30;
        };

        for (let i = 0; i < 300; i++) {
            const a = { x: rnd(), y: rnd() };

            const b = { x: rnd(), y: rnd() };

            expect(hexDistance(a, b)).toBe(cubeRef(a, b));
            expect(hexDistance(a, b)).toBe(hexDistance(b, a));
        }
    });

    it('differs from Chebyshev on the diagonal', () => {
        expect(hexDistance({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(2);
    });
});

describe('hex geometry in unit space', () => {
    it('round-trips centre to cell for 0..10 squared', () => {
        for (let x = 0; x <= 10; x++)
            for (let y = 0; y <= 10; y++) {
                const c = hexCenter({ x, y });

                expect(hexPointToCell(c.x, c.y)).toEqual({ x, y });
                expect(hexPointToCell(c.x + 3, c.y - 3)).toEqual({ x, y });
            }
    });

    it('has a flat-top width of 2R and height of sqrt(3)R', () => {
        const pts = hexPolygon({ x: 0, y: 0 })
            .split(' ')
            .map((s) => s.split(',').map(Number));

        const xs = pts.map((p) => p[0]);

        const ys = pts.map((p) => p[1]);

        expect(pts).toHaveLength(6);
        expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(100, 0);
        expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(86.6, 0);
    });

    it('shifts odd columns down by half a cell', () => {
        const even = hexCenter({ x: 0, y: 0 });

        const odd = hexCenter({ x: 1, y: 0 });

        expect(odd.y - even.y).toBeCloseTo(43.3, 1);
        expect(odd.x - even.x).toBeCloseTo(75, 5);
    });

    it('sizes the map to cover every cell polygon', () => {
        const { width, height } = hexMapSize(5, 4);

        let maxX = 0;

        let maxY = 0;

        for (let x = 0; x < 5; x++)
            for (let y = 0; y < 4; y++)
                for (const pt of hexPolygon({ x, y }).split(' ')) {
                    const [px, py] = pt.split(',').map(Number);

                    maxX = Math.max(maxX, px);
                    maxY = Math.max(maxY, py);
                }

        expect(width).toBeCloseTo(maxX, 0);
        expect(height).toBeCloseTo(maxY, 0);
        expect(hexMapSize(1, 3).height).toBeCloseTo(3 * 86.6, 0);
    });
});

describe('hexLine', () => {
    it('starts and ends on the endpoints with continuous steps', () => {
        const pairs: [GridPoint, GridPoint][] = [
            [
                { x: 0, y: 0 },
                { x: 6, y: 3 },
            ],
            [
                { x: 5, y: 5 },
                { x: 0, y: 0 },
            ],
            [
                { x: 2, y: 7 },
                { x: 9, y: 1 },
            ],
            [
                { x: 3, y: 3 },
                { x: 3, y: 9 },
            ],
        ];

        for (const [a, b] of pairs) {
            const line = hexLine(a, b);

            expect(line[0]).toEqual(a);
            expect(line[line.length - 1]).toEqual(b);
            expect(line).toHaveLength(hexDistance(a, b) + 1);

            for (let i = 1; i < line.length; i++)
                expect(hexDistance(line[i - 1], line[i])).toBe(1);
        }
    });

    it('returns one cell for identical endpoints and [] for NaN', () => {
        expect(hexLine({ x: 2, y: 2 }, { x: 2, y: 2 })).toEqual([
            { x: 2, y: 2 },
        ]);
        expect(hexLine({ x: NaN, y: 0 }, { x: 1, y: 1 })).toEqual([]);
    });
});

describe('hexDisk and hexRing', () => {
    it('disk of radius r has 3r(r+1)+1 cells within r', () => {
        for (const r of [0, 1, 2, 4]) {
            const disk = hexDisk({ x: 5, y: 5 }, r);

            expect(disk).toHaveLength(3 * r * (r + 1) + 1);
            expect(disk.every((c) => hexDistance({ x: 5, y: 5 }, c) <= r)).toBe(
                true
            );
            expect(new Set(disk.map(key)).size).toBe(disk.length);
        }
    });

    it('ring of radius r has 6r cells at exactly r', () => {
        for (const r of [1, 2, 5]) {
            const ring = hexRing({ x: 4, y: 4 }, r);

            expect(ring).toHaveLength(6 * r);
            expect(
                ring.every((c) => hexDistance({ x: 4, y: 4 }, c) === r)
            ).toBe(true);
            expect(new Set(ring.map(key)).size).toBe(6 * r);
        }
    });
});

describe('hexAwayStep', () => {
    it.each([
        { x: 4, y: 4 },
        { x: 5, y: 4 },
    ])('steps along each of the 6 directions from %j', (of) => {
        for (const n of hexNeighbors(of)) {
            const next = hexAwayStep(of, n);

            expect(hexDistance(n, next)).toBe(1);
            expect(hexDistance(of, next)).toBe(2);
        }
    });

    it('always yields a neighbour of the pushed cell, even off-axis', () => {
        for (let x = 0; x < 9; x++)
            for (let y = 0; y < 9; y++) {
                const from = { x: 4, y: 4 };

                const of = { x, y };

                if (hexDistance(from, of) === 0) continue;

                const next = hexAwayStep(from, of);

                expect(hexDistance(of, next)).toBe(1);
                expect(hexDistance(from, next)).toBeGreaterThanOrEqual(
                    hexDistance(from, of)
                );
            }
    });

    it('stays put when both cells coincide', () => {
        expect(hexAwayStep({ x: 2, y: 2 }, { x: 2, y: 2 })).toEqual({
            x: 2,
            y: 2,
        });
    });
});
