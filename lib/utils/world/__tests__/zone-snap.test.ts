import { describe, expect, it } from 'vitest';

import {
    insertSharedPoints,
    insertSnapPoint,
    sharedEdges,
    snapPoint,
} from '../zone-snap';

import type { Polygon } from '@/types/world';

const left: Polygon = [
    [0, 0],
    [0.5, 0],
    [0.5, 0.5],
    [0, 0.5],
];

const right: Polygon = [
    [0.5, 0.5],
    [0.5, 0],
    [1, 0],
    [1, 0.5],
];

describe('snapPoint', () => {
    it('prefers a vertex within the radius over an edge', () => {
        expect(snapPoint({ x: 0.51, y: 0.49 }, [left], 0.05)).toEqual({
            x: 0.5,
            y: 0.5,
        });
    });

    it('projects onto an edge, clamped to the segment', () => {
        expect(snapPoint({ x: 0.25, y: 0.02 }, [left], 0.05)).toEqual({
            x: 0.25,
            y: 0,
        });
    });

    it('returns the point unchanged outside the radius', () => {
        const p = { x: 0.25, y: 0.25 };

        expect(snapPoint(p, [left], 0.05)).toBe(p);
    });

    it('measures the radius in pixels on a non-square box', () => {
        const p = { x: 0.3, y: 0.06 };

        expect(snapPoint(p, [left], 0.05, 1)).toBe(p);
        expect(snapPoint(p, [left], 0.05, 0.5)).toEqual({ x: 0.3, y: 0 });
        expect(snapPoint({ x: 0.3, y: 0.14 }, [left], 0.05, 0.5)).toEqual({
            x: 0.3,
            y: 0.14,
        });
    });

    it('picks the nearest of several vertices', () => {
        expect(snapPoint({ x: 0.52, y: 0.01 }, [left, right], 0.1)).toEqual({
            x: 0.5,
            y: 0,
        });
    });

    it('picks the nearest edge when no vertex is in range', () => {
        const near: Polygon = [
            [0, 0.3],
            [1, 0.3],
            [1, 0.9],
        ];

        expect(snapPoint({ x: 0.7, y: 0.27 }, [left, near], 0.04)).toEqual({
            x: 0.7,
            y: 0.3,
        });
    });
});

describe('sharedEdges', () => {
    it('finds the one edge shared by two squares in any vertex order', () => {
        const shared = sharedEdges([left, right]);

        expect([...shared]).toEqual(['0.5,0|0.5,0.5']);
    });

    it('is empty without shared edges', () => {
        expect(sharedEdges([left]).size).toBe(0);
        expect(
            sharedEdges([
                left,
                [
                    [2, 2],
                    [3, 2],
                    [3, 3],
                ],
            ]).size
        ).toBe(0);
    });
});

const closed = (p: Polygon): Polygon => [...p, p[0]];

describe('insertSnapPoint', () => {
    it('inserts a point lying inside an edge after its start vertex', () => {
        const res = insertSnapPoint(closed(left), { x: 0.5, y: 0.25 });

        expect(res?.index).toBe(2);
        expect(res?.polygon[2]).toEqual([0.5, 0.25]);
        expect(res?.polygon).toHaveLength(6);
    });

    it('is a no-op for an existing vertex or a point off the ring', () => {
        expect(insertSnapPoint(closed(left), { x: 0.5, y: 0.5 })).toBeNull();
        expect(insertSnapPoint(closed(left), { x: 0.7, y: 0.25 })).toBeNull();
    });

    it('finds the snapped point on a non-square map', () => {
        const aspect = 0.5;

        const poly = closed([
            [0, 0],
            [0.7, 0.3],
            [0.2, 0.9],
        ]);

        const p = snapPoint({ x: 0.36, y: 0.16 }, [poly], 0.05, aspect);

        const res = insertSnapPoint(poly, p, aspect);

        expect(res?.index).toBe(1);
        expect(res?.polygon[1]).toEqual([p.x, p.y]);
    });
});

describe('insertSharedPoints', () => {
    it('splits the neighbour edge for a vertex that sits on it', () => {
        const ring = closed([
            [0.5, 0.2],
            [0.8, 0.2],
            [0.8, 0.4],
        ]);

        const out = insertSharedPoints(ring, [
            { id: 'n', polygon: closed(left) },
        ]);

        expect(out).toHaveLength(1);
        expect(out[0].id).toBe('n');
        expect(out[0].polygon).toContainEqual([0.5, 0.2]);
    });

    it('returns nothing when all shared points are already vertices', () => {
        const ring = closed([
            [0.5, 0.5],
            [0.5, 0],
            [0.9, 0.2],
        ]);

        expect(
            insertSharedPoints(ring, [{ id: 'n', polygon: closed(left) }])
        ).toEqual([]);
    });

    it('accumulates several insertions into one neighbour update', () => {
        const ring = closed([
            [0.5, 0.1],
            [0.5, 0.3],
            [0.9, 0.2],
        ]);

        const out = insertSharedPoints(ring, [
            { id: 'n', polygon: closed(left) },
        ]);

        expect(out).toHaveLength(1);
        expect(out[0].polygon).toHaveLength(7);
    });
});
