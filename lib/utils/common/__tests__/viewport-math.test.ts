import { describe, expect, it } from 'vitest';

import {
    clampOffset,
    focusAt,
    INITIAL_VIEWPORT,
    zoomAt,
} from '@/lib/utils/common/viewport-math';

const bounds = { min: 1, max: 3 };

describe('viewport-math', () => {
    it('зум обмежується межами, зсув не виходить за карту', () => {
        expect(zoomAt(INITIAL_VIEWPORT, 10, 0, 0, 100, 100, bounds).zoom).toBe(
            3
        );
        expect(clampOffset(50, 2, 100)).toBe(0);
        expect(clampOffset(-500, 2, 100)).toBe(-100);
    });

    it('зум у точці лишає її на місці', () => {
        const v = zoomAt(INITIAL_VIEWPORT, 2, 50, 50, 100, 100, bounds);

        expect(v).toEqual({ zoom: 2, x: -50, y: -50 });
    });

    it('lets a cropped map pan to both edges at default zoom', () => {
        expect(clampOffset(500, 1, 400, 50)).toBe(50);
        expect(clampOffset(-500, 1, 400, 50)).toBe(-50);
        expect(clampOffset(-500, 0.5, 400, 50)).toBe(100);
        expect(
            focusAt(INITIAL_VIEWPORT, 0, 1, 1, 400, 300, {
                ...bounds,
                crop: { x: 50, y: 0 },
            })
        ).toEqual({
            zoom: 1,
            x: 50,
            y: 0,
        });
    });

    it('focusAt центрує точку й не зменшує поточний зум', () => {
        expect(
            focusAt({ zoom: 2, x: 0, y: 0 }, 0.5, 0.5, 1, 100, 100, bounds)
        ).toEqual({ zoom: 2, x: -50, y: -50 });
    });
});
