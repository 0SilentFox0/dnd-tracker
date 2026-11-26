import { DEFAULT_FOG_PALETTE, type FogPalette } from './cloud-texture';

const BINS = 128;

const S_MIN = -0.2;

const S_MAX = 1.4;

const EDGE_BELOW = 0.07;

const EDGE_ABOVE = 0.1;

export interface CoverBand {
    lo: number;
    hi: number;
}

export interface CoverRegion {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface ShadeBasis {
    base: Float32Array;
    span: Float32Array;
}

/** Per-pixel green-channel shadow and light levels of the cloud shader, moon term included. */
export function shaderShadeBasis(
    width: number,
    height: number,
    palette: FogPalette = DEFAULT_FOG_PALETTE
): ShadeBasis {
    const base = new Float32Array(width * height);

    const span = new Float32Array(width * height);

    const shadow = palette.shadow[1];

    const light = palette.light[1];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const d = ((x + 0.5) / width) * 0.73 + ((y + 0.5) / height) * 0.56;

            const t = Math.min(1, Math.max(0, (d - 0.12) / 0.88));

            const moon = (1 - t * t * (3 - 2 * t)) * palette.moon;

            const i = y * width + x;

            base[i] = shadow + moon * 0.1 * 255;
            span[i] = light - shadow - moon * 0.03 * 255;
        }
    }

    return { base, span };
}

const histogram = new Uint32Array(BINS);

const shadeAt = (
    data: Uint8ClampedArray,
    i: number,
    basis: ShadeBasis | null
) =>
    basis
        ? (data[i * 4 + 1] - basis.base[i]) / basis.span[i]
        : data[i * 4 + 1] / 255;

const binOf = (s: number) =>
    Math.min(
        BINS - 1,
        Math.max(0, Math.floor(((s - S_MIN) / (S_MAX - S_MIN)) * BINS))
    );

/**
 * Turns an opaque cloud frame into cloud masses with gaps: the darkest `gap` share of pixels goes transparent,
 * with a soft rim. `region` is the part actually on screen, so the visible coverage holds steady;
 * `previous` eases the band so the gaps do not flicker between frames.
 */
export function coverClouds(
    image: ImageData,
    gap: number,
    basis: ShadeBasis | null,
    previous: CoverBand | null = null,
    region: CoverRegion | null = null,
    ease = 0.15
): CoverBand {
    const { data, width, height } = image;

    const count = width * height;

    const x0 = Math.max(0, Math.floor(region?.x ?? 0));

    const y0 = Math.max(0, Math.floor(region?.y ?? 0));

    const x1 = Math.min(
        width,
        Math.ceil(region ? region.x + region.width : width)
    );

    const y1 = Math.min(
        height,
        Math.ceil(region ? region.y + region.height : height)
    );

    histogram.fill(0);

    let sampled = 0;

    for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) {
            histogram[binOf(shadeAt(data, y * width + x, basis))]++;
            sampled++;
        }

    const quantile = (q: number) => {
        const target = Math.max(0, Math.min(1, q)) * sampled;

        let seen = 0;

        for (let b = 0; b < BINS; b++) {
            seen += histogram[b];

            if (seen >= target)
                return S_MIN + ((b + 0.5) / BINS) * (S_MAX - S_MIN);
        }

        return S_MAX;
    };

    const lo = quantile(gap - EDGE_BELOW);

    const target = { lo, hi: Math.max(quantile(gap + EDGE_ABOVE), lo + 0.02) };

    const band = previous
        ? {
              lo: previous.lo + (target.lo - previous.lo) * ease,
              hi: previous.hi + (target.hi - previous.hi) * ease,
          }
        : target;

    const scale = 1 / (band.hi - band.lo);

    for (let i = 0; i < count; i++) {
        const t = Math.min(
            1,
            Math.max(0, (shadeAt(data, i, basis) - band.lo) * scale)
        );

        data[i * 4 + 3] = t * t * (3 - 2 * t) * 255;
    }

    return band;
}
