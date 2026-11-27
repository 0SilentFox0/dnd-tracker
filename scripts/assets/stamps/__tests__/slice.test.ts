import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import type { StampRow } from '../csv';
import type { Rgba } from '../slice';
import { components, keyMagenta, normalize, sliceSheet } from '../slice';

const MAGENTA = { r: 255, g: 0, b: 255, alpha: 1 };

const block = (w: number, h: number, c: string) => ({
    create: { width: w, height: h, channels: 4 as const, background: c },
});

const row = (cols: number, rows: number): StampRow => ({
    file: 'x.webp',
    name: 'X',
    biome: 'dungeon',
    category: 'decor',
    layer: 'object',
    cols,
    rows,
    shadow: 'soft',
    blocks: null,
    sight: false,
    prompt: 'x',
    priority: 1,
});

async function sheet(
    parts: { left: number; top: number; w: number; h: number; c: string }[]
): Promise<Buffer> {
    return sharp({
        create: { width: 300, height: 300, channels: 4, background: MAGENTA },
    })
        .composite(
            parts.flatMap(({ left, top, w, h, c }) => [
                {
                    input: block(w + 2, h + 2, '#ff80ff'),
                    left: left - 1,
                    top: top - 1,
                },
                { input: block(w, h, c), left, top },
            ])
        )
        .png()
        .toBuffer();
}

const decode = async (png: Buffer): Promise<Rgba> => {
    const { data, info } = await sharp(png)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    return {
        width: info.width,
        height: info.height,
        data: new Uint8Array(data),
    };
};

const SEPARATE = [
    { left: 200, top: 30, w: 60, h: 60, c: '#2060d0' },
    { left: 30, top: 30, w: 60, h: 60, c: '#d03020' },
    { left: 110, top: 190, w: 70, h: 60, c: '#20a040' },
];

describe('keyMagenta + components', () => {
    it('finds three components in reading order', async () => {
        const keyed = keyMagenta(await decode(await sheet(SEPARATE)));

        const boxes = components(keyed);

        expect(boxes).toHaveLength(3);
        expect(boxes.map((b) => b.x0 < 150)).toEqual([true, false, true]);
        expect(boxes[2].y0).toBeGreaterThan(boxes[0].y1);
    });

    it('leaves no magenta fringe pixels', async () => {
        const { data } = keyMagenta(await decode(await sheet(SEPARATE)));

        let fringe = 0;

        for (let i = 0; i < data.length; i += 4)
            if (
                data[i + 3] > 0 &&
                data[i] > 200 &&
                data[i + 2] > 200 &&
                data[i + 1] < 80
            )
                fringe++;

        expect(fringe).toBe(0);
    });
});

describe('sliceSheet', () => {
    const write = async (parts: typeof SEPARATE) => {
        const file = join(mkdtempSync(join(tmpdir(), 'stamp-')), 'sheet.png');

        writeFileSync(file, await sheet(parts));

        return file;
    };

    it('slices objects into normalized webp files', async () => {
        const out = await sliceSheet(await write(SEPARATE), [
            row(1, 1),
            row(1, 1),
            row(1, 1),
        ]);

        expect(out).toHaveLength(3);

        for (const { webp } of out) {
            const meta = await sharp(webp).metadata();

            expect(meta.format).toBe('webp');
            expect([meta.width, meta.height]).toEqual([256, 256]);
        }
    });

    it('throws when objects are merged', async () => {
        const touching = [
            { left: 30, top: 30, w: 60, h: 60, c: '#d03020' },
            { left: 90, top: 30, w: 60, h: 60, c: '#2060d0' },
            { left: 110, top: 190, w: 70, h: 60, c: '#20a040' },
        ];

        await expect(
            sliceSheet(await write(touching), [row(1, 1), row(1, 1), row(1, 1)])
        ).rejects.toThrow(/merged/);
    });
});

describe('normalize', () => {
    it('fits a 2x1 stamp into 512x256', async () => {
        const w = 100;

        const h = 40;

        const data = new Uint8Array(w * h * 4).fill(200);

        const webp = await normalize({ width: w, height: h, data }, 2, 1);

        const meta = await sharp(webp).metadata();

        expect([meta.format, meta.width, meta.height]).toEqual([
            'webp',
            512,
            256,
        ]);
    });
});
