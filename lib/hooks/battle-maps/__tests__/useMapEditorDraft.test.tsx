// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMapEditorDraft } from '../useMapEditorDraft';

import { updateBattleMap } from '@/lib/api/battle-maps';
import { ApiError } from '@/lib/api/client';
import { ConfirmContext } from '@/lib/hooks/common/confirm-context';
import type { BattleMapFull } from '@/types/battle-map';

vi.mock('@/lib/api/battle-maps', () => ({ updateBattleMap: vi.fn() }));
vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<object>()),
    useImageSize: () => null,
}));

const confirm = vi.fn(async () => true);

const source: BattleMapFull = {
    id: 'm1',
    name: 'Cave',
    cols: 10,
    rows: 8,
    version: 3,
    updatedAt: '2026-11-14T00:00:00.000Z',
    map: { cols: 10, rows: 8, background: null, opacity: 0.35 },
    walls: ['0,0|1,0'],
    bars: [],
};

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

    return renderHook(() => useMapEditorDraft('c1', source), { wrapper });
};

describe('useMapEditorDraft', () => {
    beforeEach(() => vi.clearAllMocks());

    it('starts clean and saves name, header and edges', async () => {
        vi.mocked(updateBattleMap).mockResolvedValue({} as never);

        const { result } = setup();

        expect(result.current.isDirty).toBe(false);
        expect(result.current.canSave).toBe(false);

        act(() => result.current.name.set(' Renamed '));
        expect(result.current.canSave).toBe(true);

        act(() => result.current.save());

        await waitFor(() =>
            expect(updateBattleMap).toHaveBeenCalledWith('c1', 'm1', {
                name: 'Renamed',
                map: { cols: 10, rows: 8, background: null, opacity: 0.35 },
                walls: ['0,0|1,0'],
                bars: [],
                expectedVersion: 3,
            })
        );
        await waitFor(() => expect(result.current.isDirty).toBe(false));
        expect(result.current.justSaved).toBe(true);
    });

    it('sends expectedVersion and follows the returned version', async () => {
        vi.mocked(updateBattleMap).mockResolvedValue({ version: 4 } as never);

        const { result } = setup();

        act(() => result.current.name.set('A'));
        act(() => result.current.save());
        await waitFor(() => expect(result.current.isDirty).toBe(false));

        act(() => result.current.name.set('B'));
        act(() => result.current.save());

        await waitFor(() => expect(updateBattleMap).toHaveBeenCalledTimes(2));

        const versions = vi
            .mocked(updateBattleMap)
            .mock.calls.map((c) => c[2].expectedVersion);

        expect(versions).toEqual([3, 4]);
    });

    it('a 409 shows the changed-elsewhere notice and keeps the draft dirty', async () => {
        vi.mocked(updateBattleMap).mockRejectedValue(
            new ApiError('errors.battleMapConflict', 409, '/maps/m1')
        );

        const { result } = setup();

        act(() => result.current.name.set('X'));
        act(() => result.current.save());

        await waitFor(() =>
            expect(confirm).toHaveBeenCalledWith(
                expect.objectContaining({ description: 'maps.editor.conflict' })
            )
        );
        expect(result.current.isDirty).toBe(true);
    });

    it('other failures show the server message', async () => {
        vi.mocked(updateBattleMap).mockRejectedValue(
            new ApiError('Boom', 500, '/maps/m1')
        );

        const { result } = setup();

        act(() => result.current.name.set('X'));
        act(() => result.current.save());

        await waitFor(() =>
            expect(confirm).toHaveBeenCalledWith(
                expect.objectContaining({ description: 'Boom' })
            )
        );
    });
});
