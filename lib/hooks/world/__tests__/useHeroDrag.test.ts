// @vitest-environment happy-dom
import type { PointerEvent } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useHeroDrag } from '../useHeroDrag';

import type { MapPoint } from '@/types/world';

afterEach(cleanup);

const ev = (x: number, y: number) =>
    ({
        clientX: x,
        clientY: y,
        pointerId: 1,
        stopPropagation: vi.fn(),
        currentTarget: {},
    }) as unknown as PointerEvent<HTMLElement>;

const setup = (
    over: {
        toPoint?: (x: number, y: number) => MapPoint | null;
        positions?: Map<string, { x: number; y: number }>;
        selected?: string[];
    } = {}
) => {
    const onDrop = vi.fn();

    const selected = over.selected ?? [];

    const hook = renderHook(() =>
        useHeroDrag({
            toPoint: over.toPoint ?? ((x, y) => ({ x: x / 100, y: y / 100 })),
            groupFor: (ids) =>
                ids.some((i) => selected.includes(i))
                    ? [...new Set([...selected, ...ids])]
                    : ids,
            onDrop,
            positions:
                over.positions ??
                new Map([
                    ['a', { x: 0.1, y: 0.1 }],
                    ['b', { x: 0.2, y: 0.2 }],
                ]),
        })
    );

    return { onDrop, ...hook };
};

const gesture = (
    r: ReturnType<typeof setup>['result'],
    ids: string[],
    from: [number, number],
    to: [number, number]
) => {
    const h = r.current.bind(ids);

    let dragged = false;

    act(() => h.onPointerDown(ev(...from)));
    act(() => h.onPointerMove(ev(...to)));
    act(() => {
        dragged = h.onPointerUp(ev(...to));
    });

    return dragged;
};

describe('useHeroDrag', () => {
    it('treats movement below the threshold as a click', () => {
        const { result, onDrop } = setup();

        const dragged = gesture(result, ['a'], [10, 10], [12, 12]);

        expect(dragged).toBe(false);
        expect(onDrop).not.toHaveBeenCalled();
        expect(result.current.ghost).toBeNull();
    });

    it('drops a dragged hero at the pointer', () => {
        const { result, onDrop } = setup();

        const dragged = gesture(result, ['a'], [10, 10], [60, 70]);

        expect(dragged).toBe(true);
        expect(onDrop).toHaveBeenCalledWith(['a'], { x: 0.6, y: 0.7 });
    });

    it('shows a ghost while dragging', () => {
        const { result } = setup();

        const h = result.current.bind(['a']);

        act(() => h.onPointerDown(ev(10, 10)));
        act(() => h.onPointerMove(ev(60, 70)));

        expect(result.current.ghost?.point).toEqual({ x: 0.6, y: 0.7 });
    });

    it('drags the whole selection when the dragged hero is selected', () => {
        const { result, onDrop } = setup({ selected: ['a', 'b'] });

        gesture(result, ['a'], [10, 10], [60, 70]);

        expect(onDrop).toHaveBeenCalledWith(['a', 'b'], { x: 0.6, y: 0.7 });
    });

    it('drags only the cluster when the hero is not selected', () => {
        const { result, onDrop } = setup({ selected: ['b'] });

        gesture(result, ['a'], [10, 10], [60, 70]);

        expect(onDrop).toHaveBeenCalledWith(['a'], { x: 0.6, y: 0.7 });
    });

    it('Escape cancels the drag', () => {
        const { result, onDrop } = setup();

        const h = result.current.bind(['a']);

        act(() => h.onPointerDown(ev(10, 10)));
        act(() => h.onPointerMove(ev(60, 70)));
        act(() => {
            window.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Escape' })
            );
        });

        expect(result.current.ghost).toBeNull();

        let dragged = false;

        act(() => {
            dragged = h.onPointerUp(ev(60, 70));
        });

        expect(dragged).toBe(true);
        expect(onDrop).not.toHaveBeenCalled();
    });

    it('does nothing when the drop is outside the map', () => {
        const { result, onDrop } = setup({ toPoint: () => null });

        gesture(result, ['a'], [10, 10], [60, 70]);

        expect(onDrop).not.toHaveBeenCalled();
    });

    it('does nothing when dropped on the same point', () => {
        const { result, onDrop } = setup({
            toPoint: () => ({ x: 0.1, y: 0.1 }),
        });

        gesture(result, ['a'], [10, 10], [60, 70]);

        expect(onDrop).not.toHaveBeenCalled();
    });

    it('does nothing for a hero without a position on this map', () => {
        const { result, onDrop } = setup();

        gesture(result, ['ghost'], [10, 10], [60, 70]);

        expect(onDrop).not.toHaveBeenCalled();
    });

    it('stops propagation so the map does not pan', () => {
        const { result } = setup();

        const e = ev(10, 10);

        act(() => result.current.bind(['a']).onPointerDown(e));

        expect(e.stopPropagation).toHaveBeenCalled();
    });
});
