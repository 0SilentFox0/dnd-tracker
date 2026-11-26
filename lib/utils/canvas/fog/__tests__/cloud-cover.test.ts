import { describe, expect, it } from 'vitest';

import { coverClouds, shaderShadeBasis } from '../cloud-cover';

function ramp(width: number, height: number) {
    const data = new Uint8ClampedArray(width * height * 4);

    for (let i = 0; i < width * height; i++) {
        const g = Math.round((i / (width * height - 1)) * 255);

        data.set([g, g, g, 255], i * 4);
    }

    return { data, width, height } as unknown as ImageData;
}

const covered = (image: ImageData) => {
    let n = 0;

    for (let i = 3; i < image.data.length; i += 4) if (image.data[i] > 128) n++;

    return n / (image.width * image.height);
};

describe('coverClouds', () => {
    it('opens the darkest share as gaps and keeps the rest opaque', () => {
        const image = ramp(64, 32);

        coverClouds(image, 0.3, null);

        expect(covered(image)).toBeGreaterThan(0.62);
        expect(covered(image)).toBeLessThan(0.74);
        expect(image.data[3]).toBe(0);
        expect(image.data[image.data.length - 1]).toBe(255);
    });

    it('eases the band from the previous frame', () => {
        const band = coverClouds(ramp(64, 32), 0.3, null, { lo: 0, hi: 0.1 });

        expect(band.lo).toBeLessThan(0.1);
    });

    it('measures only the visible region', () => {
        const band = coverClouds(ramp(64, 32), 0.5, null, null, {
            x: 0,
            y: 16,
            width: 64,
            height: 16,
        });

        expect(band.lo).toBeGreaterThan(0.6);
    });

    it('lifts the shadow level in the moonlit corner', () => {
        const { base } = shaderShadeBasis(16, 10);

        expect(base[0]).toBeGreaterThan(base[base.length - 1]);
    });
});
