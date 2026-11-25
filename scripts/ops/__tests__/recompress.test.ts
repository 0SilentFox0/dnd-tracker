import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import {
    addObject,
    emptyTotals,
    recompressImage,
} from '@/scripts/ops/lib/recompress';

const noise = (size: number) =>
    sharp({
        create: {
            width: size,
            height: size,
            channels: 3,
            background: { r: 200, g: 30, b: 30 },
        },
    });

const OPTIONS = { maxEdge: 1000, minSavingPct: 10 };

describe('recompressImage', () => {
    it('shrinks an oversized png and keeps the format', async () => {
        const input = await noise(2400).png({ compressionLevel: 0 }).toBuffer();

        const result = await recompressImage(input, OPTIONS);

        if (!result) throw new Error('expected a result');

        const meta = await sharp(result.bytes).metadata();

        expect(result.resized).toBe(true);
        expect(result.after).toBeLessThan(result.before);
        expect(meta.format).toBe('png');
        expect(meta.width).toBe(1000);
    });

    it('skips a file that would save too little', async () => {
        const input = await noise(200).webp({ quality: 40 }).toBuffer();

        expect(await recompressImage(input, OPTIONS)).toBeNull();
    });

    it('skips gif and svg', async () => {
        const gif = await noise(50).gif().toBuffer();

        expect(await recompressImage(gif, OPTIONS)).toBeNull();
        expect(
            await recompressImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), OPTIONS).catch(
                () => null
            )
        ).toBeNull();
    });
});

describe('addObject', () => {
    it('sums before/after and counts skipped files at their original size', () => {
        const totals = emptyTotals();

        addObject(totals, 1000, {
            bytes: Buffer.alloc(0),
            before: 1000,
            after: 400,
            resized: false,
            format: 'png',
        });
        addObject(totals, 500, null);

        expect(totals).toEqual({
            objects: 2,
            changed: 1,
            skipped: 1,
            before: 1500,
            after: 900,
        });
    });
});
