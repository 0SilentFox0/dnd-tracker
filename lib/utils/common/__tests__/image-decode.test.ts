import { afterEach, describe, expect, it, vi } from 'vitest';

import { imageSizeOf } from '../image-decode';

describe('imageSizeOf', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('returns the bitmap size and closes the bitmap', async () => {
        const close = vi.fn();

        vi.stubGlobal(
            'createImageBitmap',
            vi.fn().mockResolvedValue({ width: 30, height: 20, close })
        );

        await expect(imageSizeOf(new Blob(['x']))).resolves.toEqual({
            width: 30,
            height: 20,
        });
        expect(close).toHaveBeenCalledOnce();
    });

    it('rejects when the image cannot be decoded', async () => {
        vi.stubGlobal(
            'createImageBitmap',
            vi.fn().mockRejectedValue(new Error('bad'))
        );

        await expect(imageSizeOf(new Blob(['x']))).rejects.toThrow('bad');
    });
});
