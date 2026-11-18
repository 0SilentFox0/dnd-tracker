// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useMapFogTool } from '../useMapFogTool';

import type { BattleMapConfig, MazeConfig } from '@/types/battle-grid';

const map: BattleMapConfig = { cols: 6, rows: 4, background: null, opacity: 0.3 };

function setup(overrides: Partial<Parameters<typeof useMapFogTool>[0]> = {}) {
    const mutate = vi.fn().mockResolvedValue(undefined);

    const view = renderHook(() =>
        useMapFogTool({
            isDM: true,
            map,
            mode: 'reveal',
            radius: 8,
            mutate,
            ...overrides,
        })
    );

    return { view, mutate };
}

describe('useMapFogTool', () => {
    it('is unavailable for players, mazes and without a map', () => {
        expect(setup({ isDM: false }).view.result.current).toBeNull();
        expect(setup({ map: null }).view.result.current).toBeNull();
        expect(
            setup({ map: { ...map, maze: {} as MazeConfig } }).view.result
                .current
        ).toBeNull();
    });

    it('sends the chosen mode', () => {
        const { view, mutate } = setup();

        act(() => view.result.current?.setMode('vision'));

        expect(mutate).toHaveBeenCalledWith({ mode: 'vision' });
    });

    it('reveals brushed cells as runs and erases with the erase brush', () => {
        const { view, mutate } = setup();

        act(() =>
            view.result.current?.applyCells([
                { x: 1, y: 0 },
                { x: 2, y: 0 },
            ])
        );
        expect(mutate).toHaveBeenLastCalledWith({ add: [[0, 1, 3]] });

        act(() => view.result.current?.setBrush('erase'));
        act(() => view.result.current?.applyCells([{ x: 1, y: 0 }]));
        expect(mutate).toHaveBeenLastCalledWith({ remove: [[0, 1, 2]] });
    });

    it('rectangle brush needs two clicks', () => {
        const { view, mutate } = setup();

        act(() => view.result.current?.setBrush('rectangle'));
        act(() => view.result.current?.onCell({ x: 0, y: 0 }));
        expect(mutate).not.toHaveBeenCalled();

        act(() => view.result.current?.onCell({ x: 1, y: 1 }));
        expect(mutate).toHaveBeenCalledWith({
            add: [
                [0, 0, 2],
                [1, 0, 2],
            ],
        });
    });

    it('commits the vision radius clamped to the maximum', () => {
        const { view, mutate } = setup();

        act(() => view.result.current?.setRadius(999));
        expect(view.result.current?.radius).toBe(999);

        act(() => view.result.current?.commitRadius());

        expect(mutate).toHaveBeenCalledWith({
            visionRadius: expect.any(Number),
        });
        expect(mutate.mock.calls[0][0].visionRadius).toBeLessThan(999);
    });
});
