import { afterEach, describe, expect, it, vi } from 'vitest';

import { getMapCatalogAsset } from '../map-catalog';

import type { MapCatalogEntry } from '@/types/map-catalog';

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

afterEach(() => vi.unstubAllGlobals());

describe('getMapCatalogAsset', () => {
    it('downloads only the expected raw GitHub path and streams UTF-8 text', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response('map data'));

        vi.stubGlobal('fetch', fetchMock);
        await expect(getMapCatalogAsset(entry)).resolves.toBe('map data');
        expect(fetchMock).toHaveBeenCalledWith(new URL(entry.downloadUrl), {
            mode: 'cors',
        });
    });

    it('rejects a modified host or path without fetching it', async () => {
        const fetchMock = vi.fn();

        vi.stubGlobal('fetch', fetchMock);
        await expect(
            getMapCatalogAsset({
                ...entry,
                downloadUrl: 'https://evil.test/maps/Room.dd2vtt',
            })
        ).rejects.toThrow(/provenance/);
        await expect(
            getMapCatalogAsset({ ...entry, filePath: '../secret.dd2vtt' })
        ).rejects.toThrow(/path/);
        await expect(
            getMapCatalogAsset({
                ...entry,
                filePath: 'maps/%2e%2e/secret.dd2vtt',
            })
        ).rejects.toThrow(/path/);
        await expect(
            getMapCatalogAsset({ ...entry, license: 'MIT' as never })
        ).rejects.toThrow(/provenance/);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects a declared download above 96 MiB before reading it', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(null, {
                headers: { 'content-length': String(97 * 1024 * 1024) },
            })
        );

        vi.stubGlobal('fetch', fetchMock);
        await expect(getMapCatalogAsset(entry)).rejects.toThrow(/96 MiB/);
    });
});
