import { describe, expect, it } from 'vitest';

import { sharedEdges, snapPoint } from '../zone-snap';

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
