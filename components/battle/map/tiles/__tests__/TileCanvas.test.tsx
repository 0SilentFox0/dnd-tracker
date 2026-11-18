// @vitest-environment happy-dom

import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadTileImage = vi.hoisted(() => vi.fn());

const drawCachedTileViewport = vi.hoisted(() => vi.fn());

const clearTileRasterCache = vi.hoisted(() => vi.fn());

vi.mock('../assets', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../assets')>()),
    loadTileImage,
}));

vi.mock('../chunk-cache', () => ({
    drawCachedTileViewport,
    clearTileRasterCache,
}));

import { TileCanvas } from '../TileCanvas';

describe('TileCanvas', () => {
    beforeEach(() => {
        vi.stubGlobal('devicePixelRatio', 1);
        loadTileImage.mockReset();
        drawCachedTileViewport.mockReset();

        const context = {
            setTransform: vi.fn(),
            clearRect: vi.fn(),
        } as unknown as CanvasRenderingContext2D;

        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
            context
        );
        loadTileImage.mockResolvedValue({ width: 256, height: 256 });
    });

    it('loads visible catalog textures and passes them to the Canvas painter', async () => {
        const cells = new Uint16Array(256);

        cells[0] = 1;

        render(
            <TileCanvas
                tiles={{
                    mapId: 'map-1',
                    version: 3,
                    seed: 'map-1',
                    chunks: { ground: { '0:0': cells } },
                    assets: {},
                }}
                viewport={{ x: 0, y: 0, cols: 1, rows: 1 }}
                cellPx={64}
            />
        );

        await waitFor(() =>
            expect(drawCachedTileViewport).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    mapId: 'map-1',
                    version: 3,
                    assets: {
                        1: { image: expect.objectContaining({ width: 256 }) },
                    },
                })
            )
        );
        expect(loadTileImage).toHaveBeenCalledTimes(1);
    });

    it('keeps loaded textures when the viewport moves and does not reload them', async () => {
        const cells = new Uint16Array(256);

        cells[0] = 1;

        const tiles = {
            mapId: 'map-1',
            version: 1,
            seed: 'map-1',
            chunks: { ground: { '0:0': cells } },
            assets: {},
        };

        const { rerender } = render(
            <TileCanvas
                tiles={tiles}
                viewport={{ x: 0, y: 0, cols: 1, rows: 1 }}
                cellPx={64}
            />
        );

        await waitFor(() => expect(loadTileImage).toHaveBeenCalledTimes(1));

        rerender(
            <TileCanvas
                tiles={tiles}
                viewport={{ x: 20, y: 20, cols: 1, rows: 1 }}
                cellPx={64}
            />
        );

        rerender(
            <TileCanvas
                tiles={tiles}
                viewport={{ x: 0, y: 0, cols: 1, rows: 1 }}
                cellPx={64}
            />
        );

        await waitFor(() =>
            expect(drawCachedTileViewport).toHaveBeenLastCalledWith(
                expect.anything(),
                expect.objectContaining({
                    assets: { 1: expect.anything() },
                })
            )
        );
        expect(loadTileImage).toHaveBeenCalledTimes(1);
    });
});
