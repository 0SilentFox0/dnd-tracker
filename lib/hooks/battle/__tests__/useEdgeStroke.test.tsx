// @vitest-environment happy-dom
import type { PointerEvent } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type EdgeEditing, useEdgeStroke } from '../useEdgeStroke';

import { UNIT } from '@/lib/utils/battle/grid';

const map = { cols: 6, rows: 4 };

const svg = {
    getScreenCTM: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
};

function ev(x: number, y: number, extra: Partial<PointerEvent> = {}) {
    return {
        pointerId: 1,
        isPrimary: true,
        button: 0,
        pointerType: 'mouse',
        clientX: x,
        clientY: y,
        currentTarget: { ownerSVGElement: svg, setPointerCapture: vi.fn() },
        ...extra,
    } as unknown as PointerEvent;
}

function setup(editing: Partial<EdgeEditing> = {}) {
    const onCommit = vi.fn();

    const view = renderHook(() =>
        useEdgeStroke(map, {
            existing: new Set<string>(),
            onCommit,
            ...editing,
        })
    );

    return { view, onCommit };
}

describe('useEdgeStroke', () => {
    it('протяг по горизонталі збирає ребра й додає їх на відпусканні', () => {
        const { view, onCommit } = setup();

        const y = 2 * UNIT + 4;

        act(() =>
            view.result.current.handlers.onPointerDown(ev(UNIT * 1.5, y))
        );
        act(() =>
            view.result.current.handlers.onPointerMove(ev(UNIT * 3.5, y))
        );

        expect([...view.result.current.pending].sort()).toEqual([
            '1:1:s',
            '2:1:s',
            '3:1:s',
        ]);

        act(() => view.result.current.handlers.onPointerUp(ev(UNIT * 3.5, y)));
        expect(onCommit).toHaveBeenCalledTimes(1);

        const [add, remove] = onCommit.mock.calls[0];

        expect([...add].sort()).toEqual(['1:1:s', '2:1:s', '3:1:s']);
        expect(remove).toEqual([]);
        expect(view.result.current.pending.size).toBe(0);
    });

    it('перше ребро існуюче — штрих знімає лише існуючі', () => {
        const { view, onCommit } = setup({
            existing: new Set(['1:1:s', '3:1:s']),
        });

        const y = 2 * UNIT;

        act(() =>
            view.result.current.handlers.onPointerDown(ev(UNIT * 1.5, y))
        );
        act(() =>
            view.result.current.handlers.onPointerMove(ev(UNIT * 3.5, y))
        );
        act(() => view.result.current.handlers.onPointerUp(ev(UNIT * 3.5, y)));

        const [add, remove] = onCommit.mock.calls[0];

        expect(add).toEqual([]);
        expect([...remove].sort()).toEqual(['1:1:s', '3:1:s']);
    });

    it('erase завжди знімає, навіть починаючи з порожнього ребра', () => {
        const { view, onCommit } = setup({
            erase: true,
            existing: new Set(['2:1:s']),
        });

        const y = 2 * UNIT;

        act(() =>
            view.result.current.handlers.onPointerDown(ev(UNIT * 1.5, y))
        );
        act(() =>
            view.result.current.handlers.onPointerMove(ev(UNIT * 2.5, y))
        );
        act(() => view.result.current.handlers.onPointerUp(ev(UNIT * 2.5, y)));

        expect(onCommit).toHaveBeenCalledWith([], ['2:1:s']);
    });

    it('дотик і клік у центр клітинки штрих не починають', () => {
        const { view, onCommit } = setup();

        act(() =>
            view.result.current.handlers.onPointerDown(
                ev(UNIT * 1.5, UNIT * 2, { pointerType: 'touch' })
            )
        );
        act(() =>
            view.result.current.handlers.onPointerDown(
                ev(UNIT * 1.5, UNIT * 1.5)
            )
        );
        act(() =>
            view.result.current.handlers.onPointerUp(ev(UNIT * 1.5, UNIT * 1.5))
        );

        expect(view.result.current.pending.size).toBe(0);
        expect(onCommit).not.toHaveBeenCalled();
    });

    it('cancel скидає штрих без коміту', () => {
        const { view, onCommit } = setup();

        act(() =>
            view.result.current.handlers.onPointerDown(ev(UNIT * 1.5, UNIT * 2))
        );
        act(() =>
            view.result.current.handlers.onPointerCancel(
                ev(UNIT * 1.5, UNIT * 2)
            )
        );
        act(() =>
            view.result.current.handlers.onPointerUp(ev(UNIT * 1.5, UNIT * 2))
        );

        expect(view.result.current.pending.size).toBe(0);
        expect(onCommit).not.toHaveBeenCalled();
    });
});
