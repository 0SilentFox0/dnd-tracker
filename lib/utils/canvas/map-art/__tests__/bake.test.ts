import { describe, expect, it, vi } from 'vitest';

import type { ArtAssets, ArtCtx } from '../assets';
import { BakeError, bakeScene } from '../bake';

import { bakeCellPx, bakePixelSize } from '@/lib/utils/battle/map-art/bake-size';
import { emptyScene } from '@/lib/utils/battle/map-art/scene';

const map = { cols: 8, rows: 8, gridType: 'square' } as const;

const assets: ArtAssets = { get: () => undefined };

const MB = 1024 * 1024;

const fakeCtx = () =>
    ({
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        clip: vi.fn(),
    }) as unknown as ArtCtx;

function deps(sizes: number[], type = 'image/webp', failFirst = false) {
    const sizesCalled: [number, number][] = [];

    let calls = 0;

    return {
        sizesCalled,
        deps: {
            now: () => 0,
            createCanvas: vi.fn((w: number, h: number) => {
                if (failFirst && calls++ === 0) throw new Error('oom');

                sizesCalled.push([w, h]);

                const size = sizes[Math.min(sizesCalled.length - 1, sizes.length - 1)];

                return {
                    ctx: fakeCtx(),
                    toBlob: vi.fn(async () => ({ size, type }) as Blob),
                };
            }),
        },
    };
}

const input = { scene: emptyScene(), map, seed: 's', assets };

describe('bakeScene', () => {
    it('shrinks the cell size when the first blob is too large', async () => {
        const { deps: d, sizesCalled } = deps([5 * MB, 3 * MB]);

        const result = await bakeScene(input, d);

        expect(sizesCalled).toHaveLength(2);
        expect(sizesCalled[1][0]).toBeLessThan(sizesCalled[0][0]);
        expect(result.cellPx).toBeLessThan(bakeCellPx(map));
    });

    it('sizes the first canvas from the bake size', async () => {
        const { deps: d, sizesCalled } = deps([MB]);

        await bakeScene(input, d);

        const size = bakePixelSize(map, bakeCellPx(map));

        expect(sizesCalled[0]).toEqual([size.width, size.height]);
    });

    it('fails with too-large when every attempt is oversize', async () => {
        const { deps: d } = deps([9 * MB]);

        await expect(bakeScene(input, d)).rejects.toMatchObject({ code: 'too-large' });
    });

    it('retries with a smaller cell size when canvas creation throws', async () => {
        const { deps: d, sizesCalled } = deps([MB], 'image/webp', true);

        const result = await bakeScene(input, d);

        expect(result.cellPx).toBe(Math.floor(bakeCellPx(map) * 0.8));
        expect(sizesCalled).toHaveLength(1);
    });

    it('rejects unsupported encodings', async () => {
        const { deps: d } = deps([MB], 'image/gif');

        const error = await bakeScene(input, d).catch((e: unknown) => e);

        expect(error).toBeInstanceOf(BakeError);
        expect(error).toMatchObject({ code: 'encode' });
    });
});
