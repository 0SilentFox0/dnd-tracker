import { describe, expect, it } from 'vitest';

import { zoneLabelSize, zoneLabelVisible } from '../zone-labels';

import type { Polygon } from '@/types/world';

const square = (s: number): Polygon => [
    [0, 0],
    [s, 0],
    [s, s],
    [0, s],
    [0, 0],
];

const base = {
    zoom: 1,
    known: false,
    fogless: false,
    clashes: false,
    overlaps: false,
    hovered: false,
};

describe('zoneLabelSize', () => {
    it('clamps to the min and max', () => {
        expect(zoneLabelSize(square(0.001), 1)).toBe(11);
        expect(zoneLabelSize(square(0.9), 8)).toBe(22);
    });

    it('grows with zoom for the same zone', () => {
        expect(zoneLabelSize(square(0.1), 4)).toBeGreaterThan(
            zoneLabelSize(square(0.1), 1)
        );
    });
});

describe('zoneLabelVisible', () => {
    it('shows at low zoom and hides past the hide zoom', () => {
        expect(zoneLabelVisible(base)).toBe(true);
        expect(zoneLabelVisible({ ...base, zoom: 5 })).toBe(false);
    });

    it('keeps known and fogless labels at any zoom', () => {
        expect(zoneLabelVisible({ ...base, zoom: 8, known: true })).toBe(true);
        expect(zoneLabelVisible({ ...base, zoom: 8, fogless: true })).toBe(true);
    });

    it('hides on clashes but hover wins', () => {
        expect(zoneLabelVisible({ ...base, clashes: true, known: true })).toBe(
            false
        );
        expect(
            zoneLabelVisible({ ...base, zoom: 8, overlaps: true, hovered: true })
        ).toBe(true);
    });
});

describe('zoneLabelVisible labelMode', () => {
    it('hidden wins even when hovered', () => {
        expect(
            zoneLabelVisible({ ...base, hovered: true, labelMode: 'hidden' })
        ).toBe(false);
        expect(
            zoneLabelVisible({ ...base, known: true, labelMode: 'hidden' })
        ).toBe(false);
    });

    it('always shows despite clashes, overlaps and high zoom', () => {
        expect(
            zoneLabelVisible({
                ...base,
                zoom: 8,
                clashes: true,
                overlaps: true,
                labelMode: 'always',
            })
        ).toBe(true);
    });

    it('auto behaves like no mode', () => {
        const cases = [
            { ...base },
            { ...base, zoom: 5 },
            { ...base, clashes: true },
            { ...base, hovered: true, overlaps: true },
        ];

        for (const c of cases)
            expect(zoneLabelVisible({ ...c, labelMode: 'auto' })).toBe(
                zoneLabelVisible(c)
            );
    });
});
