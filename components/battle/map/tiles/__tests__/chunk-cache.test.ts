import { describe, expect, it, vi } from 'vitest';

import { TileRasterChunkCache } from '../chunk-cache';

describe('TileRasterChunkCache', () => {
    it('перемальовує лише чанк зі зміненим вмістом між версіями карти', () => {
        const cache = new TileRasterChunkCache<{ label: string }>();

        const render = vi.fn((label: string) => ({ label }));

        const base = {
            mapId: 'map-1',
            layer: 'ground' as const,
            cy: 0,
            pixelRatio: 1,
        };

        const first = cache.getOrCreate(
            { ...base, version: 1, cx: 0, signature: 'a' },
            () => render('first')
        );

        const neighbor = cache.getOrCreate(
            { ...base, version: 1, cx: 1, signature: 'b' },
            () => render('neighbor')
        );

        const unchanged = cache.getOrCreate(
            { ...base, version: 2, cx: 1, signature: 'b' },
            () => render('should-not-render')
        );

        const changed = cache.getOrCreate(
            { ...base, version: 2, cx: 0, signature: 'changed' },
            () => render('updated')
        );

        expect(unchanged).toBe(neighbor);
        expect(changed).not.toBe(first);
        expect(render).toHaveBeenCalledTimes(3);
    });

    it('перебудовує raster, коли змінюється DPR', () => {
        const cache = new TileRasterChunkCache<object>();

        const render = vi.fn(() => ({}));

        const base = {
            mapId: 'map-1',
            version: 1,
            layer: 'ground' as const,
            cx: 0,
            cy: 0,
            signature: 'same',
        };

        cache.getOrCreate({ ...base, pixelRatio: 1 }, render);
        cache.getOrCreate({ ...base, pixelRatio: 2 }, render);

        expect(render).toHaveBeenCalledTimes(2);
    });
});
