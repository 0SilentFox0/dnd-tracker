// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MAX_BARRIER_ROUNDS, useMapTerrainTool } from '../useMapTerrainTool';

function setup(isDM = true) {
    const mutate = vi.fn().mockResolvedValue({ skipped: [] });

    const view = renderHook(() => useMapTerrainTool({ isDM, mutate }));

    act(() => view.result.current.toggle());

    return { view, mutate };
}

describe('useMapTerrainTool: клітинки', () => {
    it('is never active for players', () => {
        expect(setup(false).view.result.current.active).toBe(false);
    });

    it('commits a wall stroke with unique cells', async () => {
        const { view, mutate } = setup();

        await act(async () =>
            view.result.current.commit([
                { x: 1, y: 1 },
                { x: 1, y: 1 },
                { x: 2, y: 1 },
            ])
        );

        expect(mutate).toHaveBeenCalledWith({
            cells: ['1:1', '2:1'],
            terrain: { kind: 'wall' },
        });
    });

    it('erase sends a null terrain, erase-zone also flags the zone', async () => {
        const { view, mutate } = setup();

        act(() => view.result.current.setBrush({ kind: 'erase' }));
        await act(async () => view.result.current.commit([{ x: 0, y: 0 }]));
        expect(mutate).toHaveBeenLastCalledWith({
            cells: ['0:0'],
            terrain: null,
        });

        act(() => view.result.current.setBrush({ kind: 'erase-zone' }));
        await act(async () => view.result.current.commit([{ x: 3, y: 3 }]));
        expect(mutate).toHaveBeenLastCalledWith({
            cells: ['3:3'],
            terrain: null,
            eraseZone: true,
        });
    });

    it('clamps barrier rounds to 1..max', async () => {
        const { view, mutate } = setup();

        act(() =>
            view.result.current.setBrush({ kind: 'barrier', rounds: 999 })
        );
        await act(async () => view.result.current.commit([{ x: 0, y: 0 }]));

        expect(mutate).toHaveBeenCalledWith({
            cells: ['0:0'],
            terrain: { kind: 'barrier', rounds: MAX_BARRIER_ROUNDS },
        });
    });

    it('ignores empty strokes and edge brushes', async () => {
        const { view, mutate } = setup();

        await act(async () => view.result.current.commit([]));

        act(() => view.result.current.setBrush({ kind: 'edge-wall' }));
        await act(async () => view.result.current.commit([{ x: 0, y: 0 }]));

        expect(mutate).not.toHaveBeenCalled();
    });

    it('reports skipped cells from the server', async () => {
        const mutate = vi.fn().mockResolvedValue({ skipped: ['1:1'] });

        const onSkipped = vi.fn();

        const view = renderHook(() =>
            useMapTerrainTool({ isDM: true, mutate, onSkipped })
        );

        await act(async () => view.result.current.commit([{ x: 1, y: 1 }]));

        expect(onSkipped).toHaveBeenCalledWith(1);
    });

    it('closes on Escape', () => {
        const { view } = setup();

        expect(view.result.current.active).toBe(true);

        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        });

        expect(view.result.current.active).toBe(false);
    });
});
