// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMapEditorDraft } from '../useMapEditorDraft';

import {
    discardBattleMapBackground,
    uploadBattleMapBackground,
} from '@/lib/api/battle-map-background';
import { updateBattleMap } from '@/lib/api/battle-maps';
import { ApiError } from '@/lib/api/client';
import { ConfirmContext } from '@/lib/hooks/common/confirm-context';
import { normalizeUvttBackground } from '@/lib/utils/battle/uvtt/normalize-background';
import type { BattleMapFull } from '@/types/battle-map';

vi.mock('@/lib/api/battle-maps', () => ({ updateBattleMap: vi.fn() }));
vi.mock('@/lib/api/battle-map-background', () => ({
    discardBattleMapBackground: vi.fn(async () => undefined),
    uploadBattleMapBackground: vi.fn(),
}));
vi.mock('@/lib/utils/battle/uvtt/normalize-background', () => ({
    normalizeUvttBackground: vi.fn(),
}));
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
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(normalizeUvttBackground).mockResolvedValue(
            new Blob(['image'], { type: 'image/webp' })
        );
        vi.mocked(uploadBattleMapBackground).mockResolvedValue(
            'https://cdn.test/bg.webp'
        );
    });

    it('starts clean and saves name, header and edges', async () => {
        vi.mocked(updateBattleMap).mockResolvedValue({} as never);

        const { result } = setup();

        expect(result.current.isDirty).toBe(false);
        expect(result.current.canSave).toBe(false);

        act(() => result.current.name.set(' Renamed '));
        expect(result.current.canSave).toBe(true);

        await act(async () => result.current.save());

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
        await act(async () => result.current.save());
        await waitFor(() => expect(result.current.isDirty).toBe(false));

        act(() => result.current.name.set('B'));
        await act(async () => result.current.save());

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
        await act(async () => result.current.save());

        await waitFor(() =>
            expect(confirm).toHaveBeenCalledWith(
                expect.objectContaining({ description: 'maps.editor.conflict' })
            )
        );
        expect(result.current.isDirty).toBe(true);
    });

    it('a failed save keeps the local background usable after upload cleanup', async () => {
        vi.mocked(updateBattleMap).mockRejectedValue(
            new ApiError('errors.battleMapConflict', 409, '/maps/m1')
        );

        const { result } = setup();

        const localBackground = 'data:image/png;base64,AAAA';

        act(() => result.current.editor.actions.setBackground(localBackground));
        await act(async () => result.current.save());

        expect(result.current.editor.state.map.background).toBe(
            localBackground
        );
        expect(discardBattleMapBackground).toHaveBeenCalledWith(
            'c1',
            'https://cdn.test/bg.webp'
        );
    });

    it('other failures show the server message', async () => {
        vi.mocked(updateBattleMap).mockRejectedValue(
            new ApiError('Boom', 500, '/maps/m1')
        );

        const { result } = setup();

        act(() => result.current.name.set('X'));
        await act(async () => result.current.save());

        await waitFor(() =>
            expect(confirm).toHaveBeenCalledWith(
                expect.objectContaining({ description: 'Boom' })
            )
        );
    });

    it('a background or terrain change makes the draft dirty', () => {
        const { result } = setup();

        act(() =>
            result.current.editor.actions.setBackground('https://x/a.png')
        );
        expect(result.current.isDirty).toBe(true);

        act(() => result.current.editor.actions.setBackground(null));
        expect(result.current.isDirty).toBe(false);

        act(() => result.current.editor.actions.setOpacity(0.9));
        expect(result.current.isDirty).toBe(true);
    });

    it('swaps a saved data-URL background for the stored URL and stays clean', async () => {
        vi.mocked(updateBattleMap).mockResolvedValue({ version: 4 } as never);

        const { result } = setup();

        act(() =>
            result.current.editor.actions.setBackground(
                'data:image/png;base64,AAAA'
            )
        );
        await act(async () => result.current.save());

        await waitFor(() =>
            expect(uploadBattleMapBackground).toHaveBeenCalledWith(
                'c1',
                expect.any(Blob)
            )
        );
        await waitFor(() =>
            expect(result.current.editor.state.map.background).toBe(
                'https://cdn.test/bg.webp'
            )
        );
        await waitFor(() => expect(result.current.isDirty).toBe(false));
    });

    it('does not overwrite a background changed during upload', async () => {
        let resolveUpload!: (url: string) => void;

        vi.mocked(uploadBattleMapBackground).mockReturnValue(
            new Promise((resolve) => (resolveUpload = resolve))
        );

        const { result } = setup();

        act(() =>
            result.current.editor.actions.setBackground(
                'data:image/png;base64,AAAA'
            )
        );

        let saving!: Promise<void>;

        await act(async () => {
            saving = result.current.save();
            await waitFor(() =>
                expect(uploadBattleMapBackground).toHaveBeenCalled()
            );
        });
        act(() =>
            result.current.editor.actions.setBackground('https://x/other.png')
        );
        await waitFor(() =>
            expect(result.current.editor.state.map.background).toBe(
                'https://x/other.png'
            )
        );
        await act(async () => {
            resolveUpload('https://cdn.test/bg.webp');
            await saving;
        });
        expect(result.current.editor.state.map.background).toBe(
            'https://x/other.png'
        );
    });
});
