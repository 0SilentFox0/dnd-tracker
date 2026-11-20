import { describe, expect, it } from 'vitest';

import {
    clampRect,
    initialLayerRect,
    moveRect,
    resizeRect,
} from '../layer-rect';

const r = { x: 0.2, y: 0.2, w: 0.4, h: 0.4 };

describe('layer-rect', () => {
    it('moves the rect and clamps to coordinate limits', () => {
        const moved = moveRect(r, 0.1, -0.1);

        expect(moved.x).toBeCloseTo(0.3);
        expect(moved.y).toBeCloseTo(0.1);
        expect(moveRect(r, 10, -10)).toMatchObject({ x: 2, y: -1 });
    });

    it('resizes from se corner keeping the origin', () => {
        const next = resizeRect(r, 'se', 0.1, 0.2);

        expect(next).toMatchObject({ x: 0.2, y: 0.2 });
        expect(next.w).toBeCloseTo(0.5);
        expect(next.h).toBeCloseTo(0.6);
    });

    it('resizes from nw corner keeping the opposite corner fixed', () => {
        const next = resizeRect(r, 'nw', 0.1, 0.1);

        expect(next.x + next.w).toBeCloseTo(0.6);
        expect(next.y + next.h).toBeCloseTo(0.6);
        expect(next.w).toBeCloseTo(0.3);
    });

    it('never shrinks below the minimum size', () => {
        expect(resizeRect(r, 'se', -5, -5)).toMatchObject({ w: 0.02, h: 0.02 });
        expect(clampRect({ x: 0, y: 0, w: 9, h: 0 })).toMatchObject({
            w: 2,
            h: 0.02,
        });
    });

    it('keeps the image aspect ratio for the first rect', () => {
        expect(initialLayerRect(2000, 1000, 1)).toMatchObject({
            w: 0.5,
            h: 0.25,
        });
        expect(initialLayerRect(1000, 2000, 1)).toMatchObject({ w: 0.5, h: 1 });
        expect(initialLayerRect(1000, 1000, 2).h).toBeCloseTo(1);
    });
});
