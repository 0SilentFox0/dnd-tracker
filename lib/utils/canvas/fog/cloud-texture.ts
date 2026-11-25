const TEXTURE_WIDTH = 224;

const TEXTURE_HEIGHT = 144;

const textures = new Map<string, HTMLCanvasElement>();

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function ease(value: number) {
    return value * value * (3 - 2 * value);
}

function smoothStep(from: number, to: number, value: number) {
    return ease(Math.min(1, Math.max(0, (value - from) / (to - from))));
}

function grain(x: number, y: number, seed: number) {
    const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;

    return value - Math.floor(value);
}

function noise(x: number, y: number, seed: number) {
    const ix = Math.floor(x);

    const iy = Math.floor(y);

    const u = ease(x - ix);

    const v = ease(y - iy);

    return mix(
        mix(grain(ix, iy, seed), grain(ix + 1, iy, seed), u),
        mix(grain(ix, iy + 1, seed), grain(ix + 1, iy + 1, seed), u),
        v
    );
}

export type Rgb = readonly [number, number, number];

export interface FogPalette {
    shadow: Rgb;
    light: Rgb;
    flat: string;
    moon: number;
}

export const DEFAULT_FOG_PALETTE: FogPalette = {
    shadow: [43, 51, 71],
    light: [168, 179, 207],
    flat: 'rgb(20, 18, 24)',
    moon: 1,
};

export const paletteKey = (palette: FogPalette) =>
    `${palette.shadow.join(',')}|${palette.light.join(',')}`;

export function cloudTexture(palette?: FogPalette) {
    const key = palette ? paletteKey(palette) : '';

    const cached = textures.get(key);

    if (cached) return cached;

    const canvas = document.createElement('canvas');

    canvas.width = TEXTURE_WIDTH;
    canvas.height = TEXTURE_HEIGHT;

    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    const image = ctx.createImageData(canvas.width, canvas.height);

    for (let y = 0; y < canvas.height; y++) {
        const v = y / canvas.height;

        for (let x = 0; x < canvas.width; x++) {
            const u = x / canvas.width;

            const warp = (noise(u * 2.2, v * 2.2, 5) - 0.5) * 0.3;

            const px = u + warp;

            const py = v - warp * 0.72;

            const cloud =
                noise(px * 3.5, py * 3.5, 19) * 0.46 +
                noise(px * 6.8, py * 6.8, 23) * 0.29 +
                noise(px * 13, py * 13, 31) * 0.17 +
                noise(px * 24, py * 24, 47) * 0.08;

            const shade = smoothStep(0.25, 0.71, cloud);

            const moon = 1 - smoothStep(0.05, 1, u * 0.68 + v * 0.58);

            const depth = smoothStep(0.36, 0.96, v);

            const i = (y * canvas.width + x) * 4;

            if (palette) {
                image.data[i] = mix(palette.shadow[0], palette.light[0], shade);
                image.data[i + 1] = mix(
                    palette.shadow[1],
                    palette.light[1],
                    shade
                );
                image.data[i + 2] = mix(
                    palette.shadow[2],
                    palette.light[2],
                    shade
                );
            } else {
                image.data[i] = 68 + shade * 116 + moon * 24 - depth * 17;
                image.data[i + 1] = 75 + shade * 118 + moon * 25 - depth * 14;
                image.data[i + 2] = 99 + shade * 123 + moon * 34 - depth * 11;
            }

            image.data[i + 3] = 255;
        }
    }

    ctx.putImageData(image, 0, 0);
    textures.set(key, canvas);

    return canvas;
}

const dataUrls = new Map<string, string>();

export function cloudTextureUrl(palette: FogPalette) {
    const key = paletteKey(palette);

    const cached = dataUrls.get(key);

    if (cached) return cached;

    const url = cloudTexture(palette)?.toDataURL('image/png') ?? '';

    if (url) dataUrls.set(key, url);

    return url;
}
