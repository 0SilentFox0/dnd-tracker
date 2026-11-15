import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import {
    assertCampaignTileBudget,
    TileAssetError,
    validateTileAsset,
} from '../validate';

const image = (width: number, height: number, alpha = false, format: 'png' | 'webp' = 'png') =>
    sharp({
        create: {
            width,
            height,
            channels: alpha ? 4 : 3,
            background: alpha
                ? { r: 10, g: 20, b: 30, alpha: 0.5 }
                : { r: 10, g: 20, b: 30 },
        },
    })[format]().toBuffer();

describe('validateTileAsset', () => {
    it('accepts a 256px seamless ground PNG and returns decoded metadata', async () => {
        const bytes = await image(256, 256);

        await expect(
            validateTileAsset({
                fileName: 'tiles_stone-floor_1.png',
                bytes,
                kind: 'ground',
            })
        ).resolves.toEqual({
            fileName: 'tiles_stone-floor_1.png',
            kind: 'ground',
            width: 256,
            height: 256,
            mime: 'image/png',
            bytes: bytes.length,
            hasAlpha: false,
        });
    });

    it('accepts object dimensions measured at 256px per footprint cell', async () => {
        const bytes = await image(512, 256, true, 'webp');

        await expect(
            validateTileAsset({
                fileName: 'tiles_table.webp',
                bytes,
                kind: 'object',
                footprint: { cols: 2, rows: 1 },
            })
        ).resolves.toMatchObject({
            width: 512,
            height: 256,
            mime: 'image/webp',
            hasAlpha: true,
        });
    });

    it('accepts a 2 by 2 object at 512 by 512 pixels', async () => {
        const bytes = await image(512, 512, true);

        await expect(
            validateTileAsset({
                fileName: 'tiles_tree.png',
                bytes,
                kind: 'object',
                footprint: { cols: 2, rows: 2 },
            })
        ).resolves.toMatchObject({ width: 512, height: 512, hasAlpha: true });
    });

    it('accepts a transparent 256 by 64 edge asset', async () => {
        const bytes = await image(256, 64, true);

        await expect(
            validateTileAsset({
                fileName: 'tiles_door-wood-closed.png',
                bytes,
                kind: 'edge',
            })
        ).resolves.toMatchObject({ width: 256, height: 64, hasAlpha: true });
    });

    it('rejects an image larger than 200 KiB', async () => {
        const bytes = Buffer.alloc(200 * 1024 + 1);

        await expect(
            validateTileAsset({
                fileName: 'tiles_stone-floor_1.png',
                bytes,
                kind: 'ground',
            })
        ).rejects.toMatchObject({ code: 'FILE_TOO_LARGE' });
    });

    it('rejects when the decoded format does not match the file extension', async () => {
        const bytes = await image(256, 256, false, 'webp');

        await expect(
            validateTileAsset({
                fileName: 'tiles_stone-floor_1.png',
                bytes,
                kind: 'ground',
            })
        ).rejects.toMatchObject({ code: 'FORMAT_MISMATCH' });
    });

    it('rejects dimensions that do not match the tile kind', async () => {
        const bytes = await image(128, 256);

        await expect(
            validateTileAsset({
                fileName: 'tiles_stone-floor_1.png',
                bytes,
                kind: 'ground',
            })
        ).rejects.toMatchObject({ code: 'INVALID_DIMENSIONS' });
    });

    it('requires transparency for object and edge art', async () => {
        const bytes = await image(256, 64, false);

        await expect(
            validateTileAsset({
                fileName: 'tiles_door-wood-closed.png',
                bytes,
                kind: 'edge',
            })
        ).rejects.toMatchObject({ code: 'TRANSPARENCY_REQUIRED' });
    });

    it('exposes a typed error for unreadable image data', async () => {
        await expect(
            validateTileAsset({
                fileName: 'tiles_stone-floor_1.png',
                bytes: Buffer.from('not an image'),
                kind: 'ground',
            })
        ).rejects.toBeInstanceOf(TileAssetError);
    });

    it('accepts uploads exactly at the campaign storage budget', () => {
        expect(() => assertCampaignTileBudget(50 * 1024 * 1024 - 1, 1)).not.toThrow();
    });

    it('rejects uploads that exceed the campaign storage budget', () => {
        expect(() => assertCampaignTileBudget(50 * 1024 * 1024 - 1, 2)).toThrow(
            expect.objectContaining({ code: 'CAMPAIGN_BUDGET_EXCEEDED' })
        );
    });
});
