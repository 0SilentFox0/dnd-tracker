// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useMapTerrainTool } from '../useMapTerrainTool';

function setup(
    walls?: string[],
    bars?: string[],
    mutate = vi.fn().mockResolvedValue(undefined)
) {
    const view = renderHook(() =>
        useMapTerrainTool({
            isDM: true,
            mutate: vi.fn(),
            edgeSource: { walls, bars, mutate },
        })
    );

    act(() => view.result.current.toggle());

    return { view, mutate };
}

describe('useMapTerrainTool: інструмент ребер', () => {
    it('пензель клітинок не дає редактора ребер', () => {
        const { view } = setup();

        expect(view.result.current.edges).toBeNull();
    });

    it('edge-wall шле walls із add/remove', async () => {
        const { view, mutate } = setup(['1:1:e']);

        act(() => view.result.current.setBrush({ kind: 'edge-wall' }));
        expect(view.result.current.edges?.existing.has('1:1:e')).toBe(true);

        await act(async () =>
            view.result.current.edges?.onCommit(['2:2:s'], ['1:1:e'])
        );
        expect(mutate).toHaveBeenCalledWith({
            kind: 'walls',
            add: ['2:2:s'],
            remove: ['1:1:e'],
        });
    });

    it('edge-bars працює з ґратами', async () => {
        const { view, mutate } = setup(undefined, ['3:3:e']);

        act(() => view.result.current.setBrush({ kind: 'edge-bars' }));

        await act(async () =>
            view.result.current.edges?.onCommit([], ['3:3:e'])
        );
        expect(mutate).toHaveBeenCalledWith({
            kind: 'bars',
            add: [],
            remove: ['3:3:e'],
        });
    });

    it('edge-erase шле одну операцію kind both', async () => {
        const { view, mutate } = setup(['1:1:e'], ['3:3:e']);

        act(() => view.result.current.setBrush({ kind: 'edge-erase' }));
        expect(view.result.current.edges?.erase).toBe(true);

        await act(async () =>
            view.result.current.edges?.onCommit([], ['1:1:e', '3:3:e'])
        );
        await vi.waitFor(() =>
            expect(mutate).toHaveBeenCalledWith({
                kind: 'both',
                add: [],
                remove: ['1:1:e', '3:3:e'],
            })
        );
        expect(mutate).toHaveBeenCalledTimes(1);
    });

    it('штрих одразу видно як committed, поки сервер не відповів', async () => {
        let done!: () => void;

        const mutate = vi.fn(
            () => new Promise<void>((resolve) => (done = resolve))
        );

        const { view } = setup(undefined, undefined, mutate);

        act(() => view.result.current.setBrush({ kind: 'edge-wall' }));
        act(() => view.result.current.edges?.onCommit(['2:2:s'], []));

        expect(view.result.current.edges?.committed?.add.has('2:2:s')).toBe(
            true
        );

        await vi.waitFor(() => expect(mutate).toHaveBeenCalled());
        await act(async () => done());
        expect(view.result.current.edges?.committed?.add.size).toBe(0);
    });

    it('помилка знімає committed без нерозв’язаного відхилення', async () => {
        const mutate = vi.fn().mockRejectedValue(new Error('x'));

        const { view } = setup(undefined, undefined, mutate);

        act(() => view.result.current.setBrush({ kind: 'edge-wall' }));

        await act(async () =>
            view.result.current.edges?.onCommit(['2:2:s'], [])
        );
        await vi.waitFor(() =>
            expect(view.result.current.edges?.committed?.add.size).toBe(0)
        );
    });
});
