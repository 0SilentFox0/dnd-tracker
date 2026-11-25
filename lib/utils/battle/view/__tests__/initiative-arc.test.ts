import { describe, expect, it } from 'vitest';

import { arcStyle } from '../initiative-arc';

describe('arcStyle', () => {
    it('active slot is full size, opaque and lowest', () => {
        expect(arcStyle(0)).toEqual({ scale: 1, opacity: 1, y: 0 });
    });

    it('fades and rises monotonically with distance and is symmetric', () => {
        for (let d = 1; d < 8; d++) {
            expect(arcStyle(d + 1).opacity).toBeLessThanOrEqual(
                arcStyle(d).opacity
            );
            expect(arcStyle(d + 1).y).toBeLessThanOrEqual(arcStyle(d).y);
            expect(arcStyle(-d)).toEqual(arcStyle(d));
        }
    });

    it('clamps opacity and caps the rise for long queues', () => {
        expect(arcStyle(10).opacity).toBe(0.55);
        expect(arcStyle(20).y).toBe(-44);
        expect(arcStyle(-20).y).toBe(-44);
    });

    it('keeps bending across the visible queue before it saturates', () => {
        expect(arcStyle(1).y).toBe(-10);
        expect(arcStyle(2).y).toBe(-28);
    });
});
