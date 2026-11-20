// @vitest-environment happy-dom
import type { PointerEvent } from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { usePinGesture } from '@/lib/hooks/world';

const ev = (x: number, y: number) =>
    ({
        clientX: x,
        clientY: y,
        pointerId: 1,
        stopPropagation: vi.fn(),
        currentTarget: { setPointerCapture: vi.fn() },
    }) as unknown as PointerEvent<HTMLElement>;

function setup(draggable = true) {
    const cb = {
        onClick: vi.fn(),
        onDragMove: vi.fn(),
        onDragEnd: vi.fn(),
        onCancel: vi.fn(),
    };

    const { result } = renderHook(() => usePinGesture({ draggable, ...cb }));

    return {
        b: result.current.bind('p1') as Required<
            ReturnType<typeof result.current.bind>
        >,
        cb,
    };
}

describe('usePinGesture', () => {
    it('treats a move below the threshold as a click', () => {
        const { b, cb } = setup();

        b.onPointerDown(ev(10, 10));
        b.onPointerMove(ev(13, 10));
        b.onPointerUp(ev(13, 10));
        expect(cb.onClick).toHaveBeenCalledWith('p1');
        expect(cb.onDragMove).not.toHaveBeenCalled();
        expect(cb.onDragEnd).not.toHaveBeenCalled();
    });

    it('drags past the threshold and ends once', () => {
        const { b, cb } = setup();

        b.onPointerDown(ev(10, 10));
        b.onPointerMove(ev(30, 10));
        b.onPointerUp(ev(40, 10));
        expect(cb.onDragMove).toHaveBeenCalledTimes(1);
        expect(cb.onDragEnd).toHaveBeenCalledTimes(1);
        expect(cb.onDragEnd.mock.calls[0][1]).toMatchObject({ clientX: 40 });
        expect(cb.onClick).not.toHaveBeenCalled();
    });

    it('does not drag when not draggable', () => {
        const { b, cb } = setup(false);

        b.onPointerDown(ev(10, 10));
        b.onPointerMove(ev(60, 10));
        b.onPointerUp(ev(60, 10));
        expect(cb.onDragMove).not.toHaveBeenCalled();
        expect(cb.onClick).toHaveBeenCalledWith('p1');
    });

    it('cancel resets the gesture', () => {
        const { b, cb } = setup();

        b.onPointerDown(ev(10, 10));
        b.onPointerMove(ev(30, 10));
        b.onPointerCancel(ev(30, 10));
        b.onPointerUp(ev(30, 10));
        expect(cb.onCancel).toHaveBeenCalledTimes(1);
        expect(cb.onDragEnd).not.toHaveBeenCalled();
        expect(cb.onClick).not.toHaveBeenCalled();
    });

    it('Escape mid-drag cancels: no drag end, no click', () => {
        const { b, cb } = setup();

        b.onPointerDown(ev(10, 10));
        b.onPointerMove(ev(40, 10));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        b.onPointerUp(ev(40, 10));
        expect(cb.onCancel).toHaveBeenCalledTimes(1);
        expect(cb.onDragEnd).not.toHaveBeenCalled();
        expect(cb.onClick).not.toHaveBeenCalled();
    });
});
