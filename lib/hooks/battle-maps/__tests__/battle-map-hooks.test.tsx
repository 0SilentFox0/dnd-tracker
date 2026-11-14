// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { battleMapKeys, useBattleMap, useBattleMapMutations } from '..';

import {
    cloneBattleMap,
    deleteBattleMap,
    getBattleMap,
    updateBattleMap,
} from '@/lib/api/battle-maps';
import { getCampaign } from '@/lib/api/campaigns';
import { useMapLibraryEnabled } from '@/lib/hooks/campaigns';

vi.mock('@/lib/api/battle-maps', () => ({
    getBattleMaps: vi.fn(),
    getBattleMap: vi.fn(),
    createBattleMap: vi.fn(),
    updateBattleMap: vi.fn(),
    deleteBattleMap: vi.fn(),
    cloneBattleMap: vi.fn(),
}));
vi.mock('@/lib/api/campaigns', () => ({ getCampaign: vi.fn() }));

const setup = () => {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    return { client, wrapper };
};

describe('battle-map hooks', () => {
    beforeEach(() => vi.clearAllMocks());

    it('useBattleMap loads the unpinned map under the detail key', async () => {
        const { client, wrapper } = setup();

        vi.mocked(getBattleMap).mockResolvedValue({ id: 'm1' } as never);

        const { result } = renderHook(() => useBattleMap('c1', 'm1'), {
            wrapper,
        });

        await waitFor(() => expect(result.current.data).toEqual({ id: 'm1' }));
        expect(getBattleMap).toHaveBeenCalledWith('c1', 'm1');
        expect(client.getQueryData(battleMapKeys.detail('c1', 'm1'))).toEqual({
            id: 'm1',
        });
    });

    it('update invalidates detail and list', async () => {
        const { client, wrapper } = setup();

        vi.mocked(updateBattleMap).mockResolvedValue({} as never);

        const spy = vi.spyOn(client, 'invalidateQueries');

        const { result } = renderHook(() => useBattleMapMutations('c1'), {
            wrapper,
        });

        await act(() =>
            result.current.update.mutateAsync({
                mapId: 'm1',
                data: {} as never,
            })
        );

        const keys = spy.mock.calls.map((c) => c[0]?.queryKey);

        expect(keys).toContainEqual(battleMapKeys.detail('c1', 'm1'));
        expect(keys).toContainEqual(battleMapKeys.list('c1'));
        expect(spy).toHaveBeenCalledWith({
            queryKey: battleMapKeys.detail('c1', 'm1'),
            refetchType: 'none',
        });
    });

    it('remove drops the detail cache', async () => {
        const { client, wrapper } = setup();

        vi.mocked(deleteBattleMap).mockResolvedValue({ success: true });
        client.setQueryData(battleMapKeys.detail('c1', 'm1'), { id: 'm1' });

        const { result } = renderHook(() => useBattleMapMutations('c1'), {
            wrapper,
        });

        await act(() => result.current.remove.mutateAsync('m1'));

        expect(
            client.getQueryData(battleMapKeys.detail('c1', 'm1'))
        ).toBeUndefined();
    });

    it('clone passes the optional name', async () => {
        const { wrapper } = setup();

        vi.mocked(cloneBattleMap).mockResolvedValue({} as never);

        const { result } = renderHook(() => useBattleMapMutations('c1'), {
            wrapper,
        });

        await act(() =>
            result.current.clone.mutateAsync({ mapId: 'm1', name: 'Copy' })
        );

        expect(cloneBattleMap).toHaveBeenCalledWith('c1', 'm1', 'Copy');
    });

    it('useMapLibraryEnabled reads the campaign flag', async () => {
        const { wrapper } = setup();

        vi.mocked(getCampaign).mockResolvedValue({
            mapLibraryEnabled: true,
        } as never);

        const { result } = renderHook(() => useMapLibraryEnabled('c1'), {
            wrapper,
        });

        await waitFor(() => expect(result.current).toBe(true));
    });
});
