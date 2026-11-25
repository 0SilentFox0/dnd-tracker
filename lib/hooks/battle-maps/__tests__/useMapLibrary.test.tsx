// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMapLibrary } from '../useMapLibrary';

import {
    cloneBattleMap,
    createBattleMap,
    deleteBattleMap,
    getBattleMaps,
} from '@/lib/api/battle-maps';
import { ApiError } from '@/lib/api/client';
import { ConfirmContext } from '@/lib/hooks/common/confirm-context';

const push = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/api/battle-maps', () => ({
    getBattleMaps: vi.fn(),
    createBattleMap: vi.fn(),
    deleteBattleMap: vi.fn(),
    cloneBattleMap: vi.fn(),
}));

const confirm = vi.fn(async () => true);

const setup = () => {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>
            <ConfirmContext.Provider value={confirm as never}>
                {children}
            </ConfirmContext.Provider>
        </QueryClientProvider>
    );

    return renderHook(() => useMapLibrary('c1'), { wrapper });
};

const brief = {
    id: 'm1',
    name: 'Cave',
    cols: 10,
    rows: 8,
    version: 1,
    updatedAt: '2026-11-14T00:00:00.000Z',
};

describe('useMapLibrary', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getBattleMaps).mockResolvedValue([brief]);
    });

    it('lists maps', async () => {
        const { result } = setup();

        await waitFor(() => expect(result.current.maps).toEqual([brief]));
    });

    it('shows the server message when deleting a map used by a battle (409)', async () => {
        vi.mocked(deleteBattleMap).mockRejectedValue(
            new ApiError('Map is used by a battle', 409, '/maps/m1')
        );

        const { result } = setup();

        await act(() => result.current.actions.remove('m1'));
        await waitFor(() => expect(confirm).toHaveBeenCalledTimes(2));

        expect(confirm).toHaveBeenLastCalledWith(
            expect.objectContaining({ description: 'Map is used by a battle' })
        );
    });

    it('clones with a default copy name', async () => {
        vi.mocked(cloneBattleMap).mockResolvedValue({ ...brief, id: 'm2' });

        const { result } = setup();

        await act(async () => result.current.actions.clone(brief));
        await waitFor(() =>
            expect(cloneBattleMap).toHaveBeenCalledWith(
                'c1',
                'm1',
                'maps.list.cloneName {"name":"Cave"}'
            )
        );
    });

    it('creates a blank map of the chosen size and opens the editor', async () => {
        vi.mocked(createBattleMap).mockResolvedValue({ ...brief, id: 'm9' });

        const { result } = setup();

        await act(async () =>
            result.current.actions.create({
                name: 'New',
                cols: 12,
                rows: 9,
                gridType: 'square',
            })
        );
        await waitFor(() =>
            expect(push).toHaveBeenCalledWith('/campaigns/c1/dm/maps/m9')
        );

        expect(createBattleMap).toHaveBeenCalledWith(
            'c1',
            expect.objectContaining({
                name: 'New',
                map: expect.objectContaining({ cols: 12, rows: 9 }),
                walls: [],
                bars: [],
            })
        );
    });
});
