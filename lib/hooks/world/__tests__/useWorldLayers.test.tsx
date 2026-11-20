// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { worldKeys } from '../keys';
import { useLayerVisibility } from '../useLayerVisibility';
import { useWorldLayers } from '../useWorldLayers';

import { ApiError } from '@/lib/api/client';
import { deleteWorldLayer, setWorldLayerHeroes } from '@/lib/api/world';
import { useOptionalNotify } from '@/lib/hooks/common/useNotify';

vi.mock('@/lib/api/world', () => ({
    createWorldLayer: vi.fn(),
    updateWorldLayer: vi.fn(),
    setWorldLayerHeroes: vi.fn(),
    deleteWorldLayer: vi.fn(),
}));
vi.mock('@/lib/hooks/common/useNotify', () => ({
    useOptionalNotify: vi.fn(() => vi.fn()),
}));

let client: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
});

describe('useWorldLayers', () => {
    it('remove passes the marker mode to the api', async () => {
        vi.mocked(deleteWorldLayer).mockResolvedValue({ ok: true });

        const { result } = renderHook(() => useWorldLayers('c1', 'map1'), {
            wrapper,
        });

        await act(() =>
            result.current.remove.mutateAsync({ id: 'l1', mode: 'ungroup' })
        );

        expect(deleteWorldLayer).toHaveBeenCalledWith('c1', 'l1', 'ungroup');
    });

    it('setHeroes invalidates map and view caches', async () => {
        vi.mocked(setWorldLayerHeroes).mockResolvedValue(
            {} as Awaited<ReturnType<typeof setWorldLayerHeroes>>
        );

        const spy = vi.spyOn(client, 'invalidateQueries');

        const { result } = renderHook(() => useWorldLayers('c1', 'map1'), {
            wrapper,
        });

        await act(() =>
            result.current.setHeroes.mutateAsync({ id: 'l1', heroIds: ['h1'] })
        );

        await waitFor(() => {
            const keys = spy.mock.calls.map((c) => c[0]?.queryKey);

            expect(keys).toContainEqual(worldKeys.mapAll('c1'));
            expect(keys).toContainEqual(worldKeys.viewAll('c1'));
        });
    });
});

describe('useLayerVisibility', () => {
    it('toggles a layer and treats the null layer as always shown', () => {
        const { result } = renderHook(() => useLayerVisibility(['a', 'b']));

        expect(result.current.isShown('a')).toBe(true);

        act(() => result.current.toggle('a'));

        expect(result.current.hidden.has('a')).toBe(true);
        expect(result.current.isShown('a')).toBe(false);
        expect(result.current.isShown('b')).toBe(true);
        expect(result.current.isShown(null)).toBe(true);

        act(() => result.current.toggle('a'));

        expect(result.current.isShown('a')).toBe(true);
    });

    it('remove explains a 409 conflict, not the generic text', async () => {
        const notify = vi.fn();

        vi.mocked(useOptionalNotify).mockReturnValue(notify);
        vi.mocked(deleteWorldLayer).mockRejectedValue(
            new ApiError(
                'x',
                409,
                '/api/x',
                undefined,
                'errors.worldLayerHasMarkers'
            )
        );

        const { result } = renderHook(() => useWorldLayers('c1', 'map1'), {
            wrapper,
        });

        await act(async () => {
            await result.current.remove.mutateOk({ id: 'l1', mode: 'delete' });
        });

        expect(notify).toHaveBeenCalledWith(
            expect.stringContaining('deleteLayerNested')
        );
    });
});
