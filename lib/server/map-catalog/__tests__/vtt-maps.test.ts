import { describe, expect, it, vi } from 'vitest';

import { createVttMapCatalog, MapCatalogError } from '../vtt-maps';

import type { SafeFetchResult } from '@/lib/utils/api/safe-fetch';

const treeResponse = (tree: unknown[], truncated = false): SafeFetchResult => ({
    status: 200,
    contentType: 'application/json',
    body: Buffer.from(JSON.stringify({ tree, truncated })),
});

describe('VTT map catalog', () => {
    it('lists only UVTT maps and derives nested category and display name', async () => {
        const fetchBuffer = vi.fn().mockResolvedValueOnce(
            treeResponse([
                {
                    path: 'maps/desert/buildings/Sunken-Keep.dd2vtt',
                    type: 'blob',
                    size: 500,
                },
                { path: 'maps/desert/preview.png', type: 'blob', size: 50 },
                {
                    path: 'maps/forest/grove.uvtt',
                    type: 'blob',
                    size: 300,
                },
                { path: 'README.md', type: 'blob', size: 10 },
            ])
        );

        const catalog = createVttMapCatalog({ fetchBuffer });

        await expect(catalog.list()).resolves.toEqual([
            {
                id: 'maps/desert/buildings/Sunken-Keep.dd2vtt',
                category: 'desert / buildings',
                name: 'Sunken Keep',
                filePath: 'maps/desert/buildings/Sunken-Keep.dd2vtt',
                sourceUrl:
                    'https://github.com/mbround18/vtt-maps/blob/main/maps/desert/buildings/Sunken-Keep.dd2vtt',
                downloadUrl:
                    'https://raw.githubusercontent.com/mbround18/vtt-maps/main/maps/desert/buildings/Sunken-Keep.dd2vtt',
                license: 'CC-BY-SA-4.0',
                attribution: 'mbround18/vtt-maps',
            },
        ]);
        expect(fetchBuffer).toHaveBeenCalledTimes(1);
    });

    it('rejects an incomplete Git tree and does not cache it', async () => {
        const fetchBuffer = vi
            .fn()
            .mockResolvedValueOnce(treeResponse([], true))
            .mockResolvedValueOnce(
                treeResponse([
                    { path: 'maps/cave/Room.dd2vtt', type: 'blob', size: 1 },
                ])
            );

        const catalog = createVttMapCatalog({ fetchBuffer });

        await expect(catalog.list()).rejects.toMatchObject({
            code: 'MAP_CATALOG_UNAVAILABLE',
        });
        await expect(catalog.list()).resolves.toHaveLength(1);
        expect(fetchBuffer).toHaveBeenCalledTimes(2);
    });

    it('caches successful catalog responses for one hour', async () => {
        let time = 10_000;

        const fetchBuffer = vi
            .fn()
            .mockResolvedValue(
                treeResponse([
                    { path: 'maps/cave/Room.dd2vtt', type: 'blob', size: 1 },
                ])
            );

        const catalog = createVttMapCatalog({
            fetchBuffer,
            now: () => time,
        });

        await catalog.list();
        time += 3_599_999;
        await catalog.list();
        expect(fetchBuffer).toHaveBeenCalledTimes(1);

        time += 1;
        await catalog.list();
        expect(fetchBuffer).toHaveBeenCalledTimes(2);
    });

    it('does not expose unsafe paths from the Git tree', async () => {
        const fetchBuffer = vi.fn().mockResolvedValue(
            treeResponse([
                { path: 'maps/../secret.dd2vtt', type: 'blob', size: 1 },
                { path: 'maps/%2e%2e/secret.dd2vtt', type: 'blob', size: 1 },
            ])
        );

        const catalog = createVttMapCatalog({ fetchBuffer });

        await expect(catalog.list()).resolves.toEqual([]);
    });

    it('rejects malformed tree JSON and reports upstream failures', async () => {
        const malformed = vi.fn().mockResolvedValue({
            status: 200,
            contentType: 'application/json',
            body: Buffer.from('{'),
        });

        const failed = vi.fn().mockResolvedValue({
            status: 429,
            contentType: 'application/json',
            body: Buffer.from('{}'),
        });

        await expect(
            createVttMapCatalog({ fetchBuffer: malformed }).list()
        ).rejects.toBeInstanceOf(MapCatalogError);
        await expect(
            createVttMapCatalog({ fetchBuffer: failed }).list()
        ).rejects.toMatchObject({
            status: 502,
        });
    });
});
