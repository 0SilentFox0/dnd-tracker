import { describe, expect, it, vi } from 'vitest';

import { drawTileViewport } from '../painter';

import { TILE_CATALOG } from '@/lib/constants/tilesets/catalog';

function context() {
    return {
        clearRect: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        clip: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
}

const catalog = Object.fromEntries(
    TILE_CATALOG.map((definition) => [definition.id, definition])
);

const image = {} as CanvasImageSource;

describe('drawTileViewport', () => {
    it('draws only cells inside the visible window with window-relative positions', () => {
        const ctx = context();

        const first = new Uint16Array(256).fill(1);

        const second = new Uint16Array(256).fill(1);

        drawTileViewport(ctx, {
            chunks: {
                ground: { '0:0': first, '1:0': second },
            },
            assets: { 1: { image } },
            catalog,
            window: { x: 15, y: 0, cols: 2, rows: 1 },
            cellPx: 32,
            seed: 'm1',
        });

        expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 64, 32);
        expect(ctx.drawImage).toHaveBeenCalledTimes(2);
        expect(ctx.drawImage).toHaveBeenNthCalledWith(1, image, 0, 0, 32, 32);
        expect(ctx.drawImage).toHaveBeenNthCalledWith(2, image, 32, 0, 32, 32);
    });

    it('uses the 16-state edge mask to blend a neighboring ground material', () => {
        const ctx = context();

        const chunk = new Uint16Array(256);

        chunk[0] = 1;
        chunk[1] = 2;

        drawTileViewport(ctx, {
            chunks: { ground: { '0:0': chunk } },
            assets: { 1: { image }, 2: { image } },
            catalog,
            window: { x: 0, y: 0, cols: 2, rows: 1 },
            cellPx: 20,
            seed: 'm1',
        });

        expect(ctx.clip).toHaveBeenCalledTimes(2);
        expect(ctx.drawImage).toHaveBeenCalledTimes(4);
    });

    it('draws multi-cell objects at their catalog footprint', () => {
        const ctx = context();

        const chunk = new Uint16Array(256);

        chunk[0] = 5;

        const barrel = catalog[5];

        if (!barrel) throw new Error('barrel tile fixture is missing');

        drawTileViewport(ctx, {
            chunks: { objects: { '0:0': chunk } },
            assets: { 5: { image } },
            catalog: {
                ...catalog,
                5: { ...barrel, footprint: { cols: 2, rows: 2 } },
            },
            window: { x: 0, y: 0, cols: 3, rows: 3 },
            cellPx: 24,
            seed: 'm1',
        });

        expect(ctx.drawImage).toHaveBeenCalledWith(image, 0, 0, 48, 48);
    });

    it('keeps edge-art in a centered 4:1 strip inside its map cell', () => {
        const ctx = context();

        const chunk = new Uint16Array(256);

        chunk[0] = 6;

        drawTileViewport(ctx, {
            chunks: { 'edge-art': { '0:0': chunk } },
            assets: { 6: { image } },
            catalog,
            window: { x: 0, y: 0, cols: 1, rows: 1 },
            cellPx: 64,
            seed: 'm1',
        });

        expect(ctx.drawImage).toHaveBeenCalledWith(image, 0, 24, 64, 16);
    });
});
