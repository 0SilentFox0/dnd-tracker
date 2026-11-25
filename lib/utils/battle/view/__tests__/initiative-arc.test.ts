import { describe, expect, it } from 'vitest';

import { arcStyle } from '../initiative-arc';

describe('arcStyle', () => {
    it('active slot is full size, opaque and flat', () => {
        expect(arcStyle(0)).toEqual({ scale: 1, opacity: 1, y: 0 });
    });

    it('decays monotonically with distance and is symmetric', () => {
        for (let d = 1; d < 8; d++) {
            expect(arcStyle(d + 1).scale).toBeLessThanOrEqual(
                arcStyle(d).scale
            );
            expect(arcStyle(d + 1).opacity).toBeLessThanOrEqual(
                arcStyle(d).opacity
            );
            expect(arcStyle(d + 1).y).toBeGreaterThanOrEqual(arcStyle(d).y);
            expect(arcStyle(-d)).toEqual(arcStyle(d));
        }
    });

    it('clamps scale at 0.7 and opacity at 0.45', () => {
        expect(arcStyle(10).scale).toBe(0.7);
        expect(arcStyle(10).opacity).toBe(0.45);
    });

    it('caps the vertical offset for long queues', () => {
        expect(arcStyle(20).y).toBeLessThanOrEqual(10);
        expect(arcStyle(-20).y).toBeLessThanOrEqual(10);
    });
});
