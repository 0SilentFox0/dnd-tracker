// @vitest-environment happy-dom
import type { PointerEvent } from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type MapCameraOptions, useMapCamera } from '../useMapCamera';

const motion = vi.hoisted(() => ({ reduced: false }));

vi.mock('@/lib/hooks/common/useReducedMotion', () => ({
    useReducedMotion: () => motion.reduced,
}));

const frame = {
    avail: { width: 400, height: 300 },
    content: { width: 800, height: 600 },
    bounds: { min: 1, max: 6 },
};

const target = { point: { x: 500, y: 300 } };

const self = { point: { x: 200, y: 200 } };

function wheelEvent(init: WheelEventInit) {
    const event = new WheelEvent('wheel', init);

    Object.defineProperties(event, {
        clientX: { value: init.clientX ?? 150 },
        clientY: { value: init.clientY ?? 100 },
    });

    return event;
}

function setup(overrides: Partial<MapCameraOptions> = {}) {
    const el = document.createElement('div');

    el.getBoundingClientRect = () => ({
        left: 50,
        top: 40,
        width: 400,
        height: 300,
        right: 450,
        bottom: 340,
        x: 50,
        y: 40,
        toJSON: () => ({}),
    });

    const containerRef = { current: el };

    const options: MapCameraOptions = {
        enabled: true,
        frame,
        containerRef,
        panLocked: false,
        follow: { currentId: 'p1', target, self, enabled: true },
        ...overrides,
    };

    const hook = renderHook((props: MapCameraOptions) => useMapCamera(props), {
            initialProps: options,
        });

    act(() => vi.advanceTimersByTime(16));

    return {
        ...hook,
        el,
        containerRef,
    };
}

const pointer = (pointerId: number, clientX: number, clientY: number) =>
    ({
        pointerId,
        clientX,
        clientY,
        currentTarget: {
            getBoundingClientRect: () => ({ left: 50, top: 40, width: 400, height: 300 }),
            setPointerCapture: vi.fn(),
        },
    }) as unknown as PointerEvent<HTMLElement>;

describe('useMapCamera', () => {
    beforeEach(() => {
        motion.reduced = false;
        vi.useFakeTimers();
        vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
            setTimeout(() => callback(performance.now()), 16)
        );
        vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
    });

    it('starts focused on self and zooms around the cursor with and without Ctrl', () => {
        const { result, el } = setup();

        expect(result.current.camera.zoom).toBeGreaterThan(1);
        expect(result.current.camera.x + self.point.x * result.current.camera.zoom).toBeCloseTo(200);

        const before = result.current.camera.zoom;

        const localPoint = { x: 100, y: 60 };

        const worldBefore = {
            x: (localPoint.x - result.current.camera.x) / before,
            y: (localPoint.y - result.current.camera.y) / before,
        };

        act(() => {
            const event = wheelEvent({
                deltaY: -100,
                clientX: 150,
                clientY: 100,
                ctrlKey: true,
                cancelable: true,
            });

            el.dispatchEvent(event);
            expect(event.defaultPrevented).toBe(true);
        });
        expect(result.current.camera.zoom).toBeGreaterThan(before);
        expect(result.current.userMoved).toBe(true);
        expect((localPoint.x - result.current.camera.x) / result.current.camera.zoom).toBeCloseTo(worldBefore.x);
        expect((localPoint.y - result.current.camera.y) / result.current.camera.zoom).toBeCloseTo(worldBefore.y);
        act(() => el.dispatchEvent(wheelEvent({ deltaY: -50, cancelable: true })));
        expect(result.current.camera.zoom).toBeGreaterThan(before * 1.1);
    });

    it('follows a new turn, while a missing target leaves the camera in place', () => {
        const { result, rerender, containerRef } = setup();

        const before = result.current.camera;

        rerender({
            enabled: true,
            frame,
            containerRef,
            panLocked: false,
            follow: { currentId: 'p2', target, self, enabled: true },
        });
        act(() => vi.advanceTimersByTime(400));
        expect(result.current.camera.x + target.point.x * result.current.camera.zoom).toBeCloseTo(200);

        const followed = result.current.camera;

        rerender({
            enabled: true,
            frame,
            containerRef,
            panLocked: false,
            follow: { currentId: 'p3', target: null, self, enabled: true },
        });
        act(() => vi.advanceTimersByTime(400));
        expect(result.current.camera).toEqual(followed);
        expect(before).not.toEqual(followed);
    });

    it('does not auto-follow after a pan until the next turn', () => {
        const { result, rerender, containerRef } = setup();

        act(() => result.current.bind.onPointerDown(pointer(1, 100, 100)));
        act(() => result.current.bind.onPointerMove(pointer(1, 120, 100)));
        expect(result.current.userMoved).toBe(true);

        const panned = result.current.camera;

        rerender({
            enabled: true,
            frame,
            containerRef,
            panLocked: false,
            follow: { currentId: 'p1', target: { point: { x: 700, y: 450 } }, self, enabled: true },
        });
        act(() => vi.advanceTimersByTime(400));
        expect(result.current.camera).toEqual(panned);
        rerender({
            enabled: true,
            frame,
            containerRef,
            panLocked: false,
            follow: { currentId: 'p2', target, self, enabled: true },
        });
        act(() => vi.advanceTimersByTime(400));
        expect(result.current.userMoved).toBe(false);
        expect(result.current.camera.x + target.point.x * result.current.camera.zoom).toBeCloseTo(200);
    });

    it('keeps the center point through frame resizing', () => {
        const { result, rerender, containerRef } = setup();

        const camera = result.current.camera;

        const center = {
            x: (frame.avail.width / 2 - camera.x) / camera.zoom,
            y: (frame.avail.height / 2 - camera.y) / camera.zoom,
        };

        const resizedFrame = { ...frame, avail: { width: 500, height: 360 } };

        rerender({
            enabled: true,
            frame: resizedFrame,
            containerRef,
            panLocked: false,
            follow: { currentId: 'p1', target, self, enabled: true },
        });
        act(() => vi.advanceTimersByTime(16));
        expect((resizedFrame.avail.width / 2 - result.current.camera.x) / result.current.camera.zoom).toBeCloseTo(center.x);
        expect((resizedFrame.avail.height / 2 - result.current.camera.y) / result.current.camera.zoom).toBeCloseTo(center.y);
    });

    it('re-initializes the camera when the mode key changes', () => {
        const { result, rerender, containerRef } = setup({ modeKey: true });

        expect(result.current.camera.zoom).toBeGreaterThan(1);

        const fitFrame = {
            avail: { width: 400, height: 300 },
            content: { width: 400, height: 300 },
            bounds: { min: 1, max: 1 },
        };

        rerender({
            enabled: true,
            modeKey: false,
            frame: fitFrame,
            containerRef,
            panLocked: false,
            follow: { currentId: 'p1', target: null, self: null, enabled: false },
        });
        act(() => vi.advanceTimersByTime(16));

        expect(result.current.camera.zoom).toBe(1);
    });

    it('applies follow immediately when reduced motion is enabled', () => {
        const { result, rerender, containerRef } = setup();

        motion.reduced = true;
        rerender({
            enabled: true,
            frame,
            containerRef,
            panLocked: false,
            follow: { currentId: 'p2', target, self, enabled: true },
        });
        expect(result.current.camera.x + target.point.x * result.current.camera.zoom).toBeCloseTo(200);
    });

    it('recenter clears userMoved, and disabled camera is identity and passive', () => {
        const { result, rerender, el, containerRef } = setup();

        act(() => result.current.zoomBy(1.2));
        expect(result.current.userMoved).toBe(true);
        act(() => result.current.recenter());
        expect(result.current.userMoved).toBe(false);
        rerender({
            enabled: false,
            frame,
            containerRef,
            panLocked: false,
            follow: { currentId: 'p1', target, self, enabled: true },
        });
        expect(result.current.camera).toEqual({ zoom: 1, x: 0, y: 0 });

        const event = wheelEvent({ deltaY: -100, cancelable: true });

        act(() => el.dispatchEvent(event));
        expect(event.defaultPrevented).toBe(false);
    });
});
