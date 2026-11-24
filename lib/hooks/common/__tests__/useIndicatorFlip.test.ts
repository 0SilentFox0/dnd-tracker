import { describe, expect, it } from 'vitest';

import { flipDelta } from '../useIndicatorFlip';

describe('flipDelta', () => {
    it('is identity for the same rect', () => {
        expect(
            flipDelta({ left: 10, width: 50 }, { left: 10, width: 50 })
        ).toEqual({ translatePct: 0, scaleX: 1 });
    });

    it('expresses the shift in percent of the new width', () => {
        expect(
            flipDelta({ left: 0, width: 100 }, { left: 150, width: 50 })
        ).toEqual({ translatePct: -300, scaleX: 2 });
    });

    it('is invariant to uniform zoom', () => {
        const a = flipDelta({ left: 10, width: 40 }, { left: 70, width: 80 });

        const b = flipDelta({ left: 15, width: 60 }, { left: 105, width: 120 });

        expect(b).toEqual(a);
    });

    it('returns null for degenerate widths', () => {
        expect(
            flipDelta({ left: 0, width: 0 }, { left: 5, width: 10 })
        ).toBeNull();
    });
});
