// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
    markerBubblePosition,
    useMarkerBubblePosition,
} from '../useMarkerBubblePosition';

const base = {
    box: { width: 800, height: 600 },
    zoom: 1,
    offset: { x: 0, y: 0 },
    size: { width: 200, height: 100 },
};

describe('markerBubblePosition', () => {
    it('sits above the point and centres on it', () => {
        const p = markerBubblePosition({ ...base, point: { x: 0.5, y: 0.5 } });

        expect(p.placement).toBe('above');
        expect(p.left).toBe(300);
        expect(p.top).toBeLessThan(300 - 100);
    });

    it('flips below near the top edge', () => {
        const p = markerBubblePosition({ ...base, point: { x: 0.5, y: 0.05 } });

        expect(p.placement).toBe('below');
        expect(p.top).toBeGreaterThan(30);
    });

    it('clamps vertically when the anchor is panned off-screen', () => {
        const below = markerBubblePosition({
            ...base,
            point: { x: 0.5, y: 0.5 },
            offset: { x: 0, y: 900 },
        });

        const above = markerBubblePosition({
            ...base,
            point: { x: 0.5, y: 0.5 },
            offset: { x: 0, y: -900 },
        });

        expect(below.top).toBe(500);
        expect(above.top).toBe(0);
    });

    it('keeps the card inside the box near the bottom edge', () => {
        const p = markerBubblePosition({
            ...base,
            point: { x: 0.5, y: 1 },
            size: { width: 200, height: 700 },
        });

        expect(p.top).toBe(0);
    });

    it('clamps to the left and right edges', () => {
        expect(
            markerBubblePosition({ ...base, point: { x: 0, y: 0.5 } }).left
        ).toBe(0);
        expect(
            markerBubblePosition({ ...base, point: { x: 1, y: 0.5 } }).left
        ).toBe(600);
    });

    it('follows zoom and offset', () => {
        const point = { x: 0.5, y: 0.5 };

        const a = markerBubblePosition({ ...base, point });

        const zoomed = markerBubblePosition({ ...base, point, zoom: 1.2 });

        const moved = markerBubblePosition({
            ...base,
            point,
            offset: { x: -50, y: 0 },
        });

        expect(zoomed.top).toBeGreaterThan(a.top);
        expect(moved.left).toBe(a.left - 50);
    });
});

describe('useMarkerBubblePosition', () => {
    it('recomputes when zoom changes', () => {
        const { result, rerender } = renderHook(
            ({ zoom }) =>
                useMarkerBubblePosition({
                    ...base,
                    point: { x: 0.5, y: 0.5 },
                    zoom,
                }),
            { initialProps: { zoom: 1 } }
        );

        const before = result.current.top;

        rerender({ zoom: 1.2 });
        expect(result.current.top).toBeGreaterThan(before);
    });
});
