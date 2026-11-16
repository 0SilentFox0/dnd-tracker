// @vitest-environment happy-dom
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useImportCatalogMap } from '../useImportCatalogMap';

import {
    discardBattleMapBackground,
    uploadBattleMapBackground,
} from '@/lib/api/battle-map-background';
import { getMapCatalogAsset } from '@/lib/api/map-catalog';
import { normalizeUvttBackground } from '@/lib/utils/battle/uvtt/normalize-background';
import type { MapCatalogEntry } from '@/types/map-catalog';

const mutations = vi.hoisted(() => ({
    create: { mutateAsync: vi.fn(), isPending: false },
}));

vi.mock('../useBattleMaps', () => ({ useBattleMapMutations: () => mutations }));
vi.mock('@/lib/api/map-catalog', () => ({
    getMapCatalogAsset: vi.fn(),
    validateMapCatalogEntry: vi.fn(),
}));
vi.mock('@/lib/api/battle-map-background', () => ({
    uploadBattleMapBackground: vi.fn(),
    discardBattleMapBackground: vi.fn(),
}));
vi.mock('@/lib/utils/battle/uvtt/normalize-background', () => ({
    normalizeUvttBackground: vi.fn(),
}));

const entry: MapCatalogEntry = {
    id: 'maps/cave/Room.dd2vtt',
    category: 'cave',
    name: 'Room',
    filePath: 'maps/cave/Room.dd2vtt',
    sourceUrl:
        'https://github.com/mbround18/vtt-maps/blob/main/maps/cave/Room.dd2vtt',
    downloadUrl:
        'https://raw.githubusercontent.com/mbround18/vtt-maps/main/maps/cave/Room.dd2vtt',
    license: 'CC-BY-SA-4.0',
    attribution: 'mbround18/vtt-maps',
};

const uvtt = JSON.stringify({
    image: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAK',
    resolution: { map_size: { x: 8, y: 6 }, pixels_per_grid: 10 },
    line_of_sight: [],
});

function setup() {
    const client = new QueryClient();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>
            <NextIntlClientProvider
                locale="en"
                messages={{
                    maps: { catalog: { importFailed: 'Import failed' } },
                }}
            >
                {children}
            </NextIntlClientProvider>
        </QueryClientProvider>
    );

    return renderHook(() => useImportCatalogMap('campaign-1'), { wrapper });
}

describe('useImportCatalogMap', () => {
    it('validates the source and creates a normal attributed campaign map', async () => {
        const blob = new Blob(['image'], { type: 'image/webp' });

        vi.mocked(getMapCatalogAsset).mockResolvedValue(uvtt);
        vi.mocked(normalizeUvttBackground).mockResolvedValue(blob);
        vi.mocked(uploadBattleMapBackground).mockResolvedValue(
            'https://storage.test/battle-maps/c/image.webp'
        );
        mutations.create.mutateAsync.mockResolvedValue({ id: 'new-map' });

        const { result } = setup();

        let created;

        await act(async () => {
            created = await result.current.importEntry(entry);
        });
        expect(created).toEqual({ id: 'new-map' });
        expect(mutations.create.mutateAsync).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'Room',
                walls: [],
                map: expect.objectContaining({
                    cols: 8,
                    rows: 6,
                    background: 'https://storage.test/battle-maps/c/image.webp',
                    source: {
                        url: entry.sourceUrl,
                        attribution: entry.attribution,
                        license: entry.license,
                    },
                }),
            })
        );
    });

    it('removes its uploaded image if campaign map creation fails', async () => {
        vi.mocked(getMapCatalogAsset).mockResolvedValue(uvtt);
        vi.mocked(normalizeUvttBackground).mockResolvedValue(
            new Blob(['image'], { type: 'image/webp' })
        );
        vi.mocked(uploadBattleMapBackground).mockResolvedValue(
            'https://storage.test/battle-maps/c/image.webp'
        );
        vi.mocked(discardBattleMapBackground).mockResolvedValue({
            ok: true,
        } as never);
        mutations.create.mutateAsync.mockRejectedValue(
            new Error('create failed')
        );

        const { result } = setup();

        await expect(result.current.importEntry(entry)).rejects.toThrow(
            'create failed'
        );
        expect(discardBattleMapBackground).toHaveBeenCalledWith(
            'campaign-1',
            'https://storage.test/battle-maps/c/image.webp'
        );
    });
});
