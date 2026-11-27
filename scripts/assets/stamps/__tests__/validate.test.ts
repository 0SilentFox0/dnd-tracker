import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import type { StampRow } from '../csv';
import { validateStampBytes } from '../validate';

const ROW: StampRow = {
    file: 'x.webp',
    name: 'X',
    biome: 'dungeon',
    category: 'decor',
    layer: 'object',
    cols: 2,
    rows: 1,
    shadow: 'soft',
    blocks: null,
    sight: false,
    prompt: 'x',
    priority: 1,
};

const solid = (w: number, h: number, colour: string, alpha: boolean) =>
    sharp({
        create: {
            width: w,
            height: h,
            channels: alpha ? 4 : 3,
            background: colour,
        },
    });

describe('validateStampBytes', () => {
    it('accepts a correct webp with alpha', async () => {
        const bytes = await solid(512, 256, '#3070c0cc', true)
            .webp()
            .toBuffer();

        expect(await validateStampBytes(bytes, ROW)).toEqual([]);
    });

    it('rejects png', async () => {
        const bytes = await solid(512, 256, '#3070c0cc', true).png().toBuffer();

        expect(await validateStampBytes(bytes, ROW)).toContain('not-webp');
    });

    it('rejects webp without alpha', async () => {
        const bytes = await solid(512, 256, '#3070c0', false).webp().toBuffer();

        expect(await validateStampBytes(bytes, ROW)).toContain('no-alpha');
    });

    it('rejects wrong size', async () => {
        const bytes = await solid(256, 256, '#3070c0cc', true)
            .webp()
            .toBuffer();

        expect(await validateStampBytes(bytes, ROW)).toContain('bad-size');
    });

    it('rejects a file without a CSV row', async () => {
        const bytes = await solid(512, 256, '#3070c0cc', true)
            .webp()
            .toBuffer();

        expect(await validateStampBytes(bytes, undefined)).toContain(
            'not-in-csv'
        );
    });

    it('rejects magenta fringe', async () => {
        const bytes = await solid(512, 256, '#ff00ffcc', true)
            .webp({ lossless: true })
            .toBuffer();

        expect(await validateStampBytes(bytes, ROW)).toContain(
            'magenta-fringe'
        );
    });

    it('flags duplicate content', async () => {
        const bytes = await solid(512, 256, '#3070c0cc', true)
            .webp()
            .toBuffer();

        const seen = new Map<string, string>();

        expect(await validateStampBytes(bytes, ROW, seen, 'a')).toEqual([]);
        expect(await validateStampBytes(bytes, ROW, seen, 'b')).toContain(
            'duplicate'
        );
    });
});
