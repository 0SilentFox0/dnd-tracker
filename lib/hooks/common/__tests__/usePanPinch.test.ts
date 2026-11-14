// @vitest-environment happy-dom
import type { PointerEvent } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { usePanPinch } from '../usePanPinch';

const rect = {
    left: 10,
    top: 20,
    width: 400,
    height: 300,
    right: 410,
    bottom: 320,
    x: 10,
    y: 20,
    toJSON: () => ({}),
} as DOMRect;

function pointer(pointerId: number, clientX: number, clientY: number) {
    return {
        pointerId,
        clientX,
        clientY,
        currentTarget: {
            getBoundingClientRect: () => rect,
            setPointerCapture: vi.fn(),
        },
    } as unknown as PointerEvent<HTMLElement>;
}

describe('usePanPinch', () => {
    it('starts pan after the drag threshold and reports wasDragged', () => {
        const onPan = vi.fn();

        const { result } = renderHook(() =>
            usePanPinch({ panLocked: false, onPan, onPinch: vi.fn(), onWheel: vi.fn() })
        );

        act(() => result.current.bind.onPointerDown(pointer(1, 100, 100)));
        act(() => result.current.bind.onPointerMove(pointer(1, 103, 100)));
        expect(onPan).not.toHaveBeenCalled();
        expect(result.current.wasDragged()).toBe(false);

        act(() => result.current.bind.onPointerMove(pointer(1, 105, 100)));
        expect(onPan).toHaveBeenCalledWith(2, 0, rect);
        expect(result.current.wasDragged()).toBe(true);
    });

    it('locks one-pointer pan while allowing two-pointer pinch and midpoint movement', () => {
        const onPan = vi.fn();

        const onPinch = vi.fn();

        const { result } = renderHook(() =>
            usePanPinch({ panLocked: true, onPan, onPinch, onWheel: vi.fn() })
        );

        act(() => result.current.bind.onPointerDown(pointer(1, 100, 100)));
        act(() => result.current.bind.onPointerMove(pointer(1, 130, 100)));
        expect(onPan).not.toHaveBeenCalled();
        act(() => result.current.bind.onPointerDown(pointer(2, 200, 100)));
        act(() => result.current.bind.onPointerMove(pointer(2, 220, 110)));
        act(() => result.current.bind.onPointerMove(pointer(1, 120, 110)));
        expect(onPinch).toHaveBeenLastCalledWith(
            expect.objectContaining({ factor: expect.any(Number), dmx: -5, dmy: 5 }),
            rect
        );
    });

    it('does not intercept wheel when disabled', () => {
        const onWheel = vi.fn();

        const el = document.createElement('div');

        const { rerender } = renderHook(() => {
            const gesture = usePanPinch({
                enabled: false,
                panLocked: false,
                onPan: vi.fn(),
                onPinch: vi.fn(),
                onWheel,
            });

            gesture.containerRef.current = el;

            return gesture;
        });

        rerender();

        const event = new WheelEvent('wheel', { cancelable: true });

        act(() => el.dispatchEvent(event));
        expect(onWheel).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBe(false);
    });
});
