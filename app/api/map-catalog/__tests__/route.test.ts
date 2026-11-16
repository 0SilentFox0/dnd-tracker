import { beforeEach, describe, expect, it, vi } from 'vitest';

const catalog = vi.hoisted(() => {
    class MockMapCatalogError extends Error {
        constructor(
            message: string,
            readonly status: number,
            readonly code: string
        ) {
            super(message);
        }
    }

    return {
        listVttMapCatalog: vi.fn(),
        MapCatalogError: MockMapCatalogError,
    };
});

vi.mock('@/lib/server/map-catalog/vtt-maps', () => ({
    listVttMapCatalog: catalog.listVttMapCatalog,
    MapCatalogError: catalog.MapCatalogError,
}));

import { GET as getCatalog } from '../route';

describe('map catalog routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns the public catalog with a shared cache lifetime', async () => {
        catalog.listVttMapCatalog.mockResolvedValue([
            {
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
            },
        ]);

        const response = await getCatalog();

        expect(response.status).toBe(200);
        expect(response.headers.get('Cache-Control')).toContain(
            's-maxage=3600'
        );
        await expect(response.json()).resolves.toMatchObject([
            { id: 'maps/cave/Room.dd2vtt', license: 'CC-BY-SA-4.0' },
        ]);
    });

    it('returns a bounded source error without leaking upstream details', async () => {
        catalog.listVttMapCatalog.mockRejectedValue(
            Object.assign(new Error('raw GitHub response details'), {
                status: 502,
                code: 'MAP_CATALOG_UNAVAILABLE',
            })
        );

        const response = await getCatalog();

        expect(response.status).toBe(502);
        await expect(response.json()).resolves.toEqual({
            error: 'MAP_CATALOG_UNAVAILABLE',
        });
    });
});
