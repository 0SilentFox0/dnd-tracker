// @vitest-environment happy-dom
import type { PointerEvent } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useStrokePaint } from '../useStrokePaint';

import { UNIT } from '@/lib/utils/battle/grid';

const dims = { cols: 8, rows: 8 };

const down = (overrides: Partial<PointerEvent> = {}) =>
    ({
        isPrimary: true,
        button: 0,
        pointerId: 1,
        clientX: 0,
        clientY: 0,
        ...overrides,
    }) as PointerEvent;

function setup(onStroke = vi.fn()) {
    const view = renderHook(() =>
        useStrokePaint({ painting: true, dims, onStroke })
    );

    view.result.current.svgRef.current = {
        getScreenCTM: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    } as unknown as SVGSVGElement;

    return { view, onStroke };
}

const pointer = (type: string, x: number, y: number, pointerId = 1) =>
    window.dispatchEvent(
        Object.assign(new Event(type), {
            pointerId,
            clientX: (x + 0.5) * UNIT,
            clientY: (y + 0.5) * UNIT,
        })
    );

describe('useStrokePaint', () => {
    it('collects cells along the drag and sends them on release', () => {
        const { view, onStroke } = setup();

        act(() => view.result.current.onStrokeStart({ x: 0, y: 0 }, down()));
        act(() => pointer('pointermove', 3, 0));
        expect(view.result.current.preview.size).toBe(4);

        act(() => pointer('pointerup', 3, 0));

        expect(onStroke).toHaveBeenCalledWith([
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 2, y: 0 },
            { x: 3, y: 0 },
        ]);
        expect(view.result.current.preview.size).toBe(0);
    });

    it('ignores non-primary pointers and other buttons', () => {
        const { view, onStroke } = setup();

        act(() =>
            view.result.current.onStrokeStart(
                { x: 0, y: 0 },
                down({ isPrimary: false })
            )
        );
        act(() =>
            view.result.current.onStrokeStart({ x: 0, y: 0 }, down({ button: 2 }))
        );
        act(() => pointer('pointerup', 0, 0));

        expect(onStroke).not.toHaveBeenCalled();
    });

    it('drops the stroke when a second finger touches down', () => {
        const { view, onStroke } = setup();

        act(() => view.result.current.onStrokeStart({ x: 1, y: 1 }, down()));
        act(() => pointer('pointerdown', 2, 2, 2));
        act(() => pointer('pointerup', 1, 1));

        expect(onStroke).not.toHaveBeenCalled();
        expect(view.result.current.preview.size).toBe(0);
    });

    it('clears the preview when painting is turned off mid-stroke', () => {
        const onStroke = vi.fn();

        const view = renderHook(
            ({ painting }) => useStrokePaint({ painting, dims, onStroke }),
            { initialProps: { painting: true } }
        );

        act(() => view.result.current.onStrokeStart({ x: 1, y: 1 }, down()));
        expect(view.result.current.preview.size).toBe(1);

        view.rerender({ painting: false });

        expect(view.result.current.preview.size).toBe(0);
    });
});
