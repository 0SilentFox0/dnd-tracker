// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { battleMapKeys } from '../keys';
import { useMapArtSave } from '../useMapArtSave';

import {
    discardBattleMapBackground,
    uploadBattleMapBackground,
} from '@/lib/api/battle-map-background';
import { saveMapArt } from '@/lib/api/battle-maps';
import { ApiError } from '@/lib/api/client';
import { emptyScene } from '@/lib/utils/battle/map-art';
import { BakeError, bakeScene } from '@/lib/utils/canvas/map-art/bake';
import type { MapArtRecord, MapArtScene } from '@/types/battle-map';

const notify = vi.fn();

vi.mock('@/lib/api/battle-maps', () => ({ saveMapArt: vi.fn() }));
vi.mock('@/lib/api/battle-map-background', () => ({
    discardBattleMapBackground: vi.fn(async () => undefined),
    uploadBattleMapBackground: vi.fn(),
}));
vi.mock('@/lib/utils/canvas/map-art/bake', async (orig) => ({
    ...(await orig<object>()),
    bakeScene: vi.fn(),
}));
vi.mock('@/lib/utils/canvas/map-art/assets', () => ({
    artTextureUrls: () => [],
    loadArtAssets: async () => ({ get: () => undefined }),
}));
vi.mock('@/lib/hooks/common', () => ({ useNotify: () => notify }));
vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));

const record = (over: Partial<MapArtRecord> = {}): MapArtRecord => ({
    scene: null,
    sceneVersion: 2,
    bakedSceneVersion: 2,
    bakedUrl: 'https://cdn.test/old.webp',
    bakedAt: null,
    ...over,
});

const mapCfg = {
    cols: 4,
    rows: 4,
    gridType: 'square' as const,
    background: 'https://cdn.test/old.webp',
};

const light = { id: 'l1', x: 9999, y: 9999, radius: 100, color: '#fff', intensity: 1 };

const setup = ({
    rec = record(),
    scene = emptyScene(),
    isDirty = true,
}: {
    rec?: MapArtRecord;
    scene?: MapArtScene;
    isDirty?: boolean;
} = {}) => {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });

    client.setQueryData(battleMapKeys.art('c1', 'm1'), rec);

    const draft = {
        editor: { state: { map: mapCfg, value: mapCfg } },
        name: { value: ' Cave ' },
        version: 5,
        acceptArtSave: vi.fn(),
    };

    const art = { scene, isDirty, markSaved: vi.fn() };

    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const hook = renderHook(
        () => useMapArtSave('c1', 'm1', draft as never, art as never),
        { wrapper }
    );

    return { ...hook, draft, art, client };
};

const saved = { brief: { version: 6 }, art: record({ sceneVersion: 3 }), patch: {} };

describe('useMapArtSave', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(bakeScene).mockResolvedValue({
            blob: new Blob(['x']),
            cellPx: 64,
            width: 256,
            height: 256,
            ms: 12,
        });
        vi.mocked(uploadBattleMapBackground).mockResolvedValue(
            'https://cdn.test/new.webp'
        );
        vi.mocked(saveMapArt).mockResolvedValue(saved as never);
    });

    it('bakes a dirty scene, uploads and saves with bakedUrl', async () => {
        const { result, draft, art } = setup();

        await act(async () => result.current.save());

        expect(bakeScene).toHaveBeenCalledTimes(1);
        expect(saveMapArt).toHaveBeenCalledWith(
            'c1',
            'm1',
            expect.objectContaining({
                bakedUrl: 'https://cdn.test/new.webp',
                expectedSceneVersion: 2,
                save: expect.objectContaining({ name: 'Cave', expectedVersion: 5 }),
            })
        );
        expect(draft.acceptArtSave).toHaveBeenCalledWith(saved);
        expect(art.markSaved).toHaveBeenCalled();
        expect(result.current.lastBake).toEqual({ ms: 12, cellPx: 64, bytes: 1 });
        expect(result.current.phase).toBe('idle');
    });

    it('saves without bakedUrl when the bake fails', async () => {
        vi.mocked(bakeScene).mockRejectedValue(new BakeError('too-large'));

        const { result } = setup({ rec: record({ bakedSceneVersion: 1 }) });

        await act(async () => result.current.save());

        expect(notify).toHaveBeenCalledWith('art.bakeFailed.too-large');
        expect(uploadBattleMapBackground).not.toHaveBeenCalled();

        const body = vi.mocked(saveMapArt).mock.calls[0][2];

        expect(body).not.toHaveProperty('bakedUrl');
        expect(result.current.needsBake).toBe(true);
    });

    it('discards the upload and notifies on 409', async () => {
        vi.mocked(saveMapArt).mockRejectedValue(new ApiError('x', 409, '/maps/m1/art'));

        const { result, draft } = setup();

        await act(async () => result.current.save());

        expect(discardBattleMapBackground).toHaveBeenCalledWith(
            'c1',
            'https://cdn.test/new.webp'
        );
        expect(notify).toHaveBeenCalledWith('conflict');
        expect(draft.acceptArtSave).not.toHaveBeenCalled();
    });

    it('skips the bake for a clean scene that does not need one', async () => {
        const { result } = setup({ isDirty: false });

        expect(result.current.needsBake).toBe(false);

        await act(async () => result.current.save());

        expect(bakeScene).not.toHaveBeenCalled();
        expect(saveMapArt).toHaveBeenCalledTimes(1);
    });

    it('bakes on demand for a clean scene', async () => {
        const { result } = setup({ isDirty: false });

        await act(async () => result.current.save({ bake: true }));

        expect(bakeScene).toHaveBeenCalledTimes(1);
    });

    it('sends a scene clipped to the map', async () => {
        const { result } = setup({
            scene: { ...emptyScene(), lights: [light] },
        });

        await act(async () => result.current.save());

        await waitFor(() => expect(saveMapArt).toHaveBeenCalled());

        const body = vi.mocked(saveMapArt).mock.calls[0][2];

        expect(body.scene.lights).toEqual([]);
    });
});
