import { describe, expect, it } from 'vitest';

import { mapMotionSchema } from '@/lib/schemas/battles';
import {
    clampMotionSpeed,
    mirrorTileCount,
    motionInMapSpace,
    resumeSpeed,
    stepMotion,
} from '@/lib/utils/battle/map-motion';

describe('clampMotionSpeed', () => {
    it('clamps, rounds to 0.1 and maps NaN to 0', () => {
        expect(clampMotionSpeed(99)).toBe(12);
        expect(clampMotionSpeed(-99)).toBe(-12);
        expect(clampMotionSpeed(NaN)).toBe(0);
        expect(clampMotionSpeed(1.26)).toBe(1.3);
    });
});

describe('motionInMapSpace', () => {
    it('keeps motion when the map is not rotated', () => {
        const m = { axis: 'x', speed: 2 } as const;

        expect(motionInMapSpace(m, false)).toEqual(m);
    });

    it('swaps axis and sign for a rotated map', () => {
        expect(motionInMapSpace({ axis: 'x', speed: 2 }, true)).toEqual({
            axis: 'y',
            speed: -2,
        });
        expect(motionInMapSpace({ axis: 'y', speed: 2 }, true)).toEqual({
            axis: 'x',
            speed: 2,
        });
    });
});

describe('stepMotion', () => {
    it('accelerates toward the target and keeps phase in range', () => {
        const next = stepMotion({ phase: 0, speed: 0 }, 3, 10, 100);

        expect(next.speed).toBeGreaterThanOrEqual(2.99);
        expect(next.phase).toBeGreaterThanOrEqual(0);
        expect(next.phase).toBeLessThan(100);
    });

    it('wraps downward for negative motion', () => {
        expect(
            stepMotion({ phase: 1, speed: -5 }, -5, 1, 100).phase
        ).toBeCloseTo(96);
    });

    it('decays to a stop when the target is 0', () => {
        let s = { phase: 0, speed: 5 };

        for (let i = 0; i < 200; i++) s = stepMotion(s, 0, 0.05, 100);
        expect(Math.abs(s.speed)).toBeLessThan(0.01);
    });
});

describe('mirrorTileCount', () => {
    it('returns an even count covering map plus period', () => {
        expect(mirrorTileCount(1000, 200)).toBe(8);
        expect(mirrorTileCount(100, 500)).toBe(4);
        expect(mirrorTileCount(100, 0)).toBe(2);
    });
});

describe('resumeSpeed', () => {
    it('falls back to the default for null or zero', () => {
        expect(resumeSpeed(null)).toBe(2.5);
        expect(resumeSpeed(-4)).toBe(-4);
        expect(resumeSpeed(0)).toBe(2.5);
    });
});

describe('mapMotionSchema', () => {
    it('validates axis and speed bounds', () => {
        expect(
            mapMotionSchema.safeParse({ motion: { axis: 'x', speed: 13 } })
                .success
        ).toBe(false);
        expect(mapMotionSchema.safeParse({ motion: null }).success).toBe(true);
        expect(
            mapMotionSchema.safeParse({ motion: { axis: 'z', speed: 1 } })
                .success
        ).toBe(false);
    });
});
