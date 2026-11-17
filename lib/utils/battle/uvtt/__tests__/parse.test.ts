import { describe, expect, it } from 'vitest';

import { parseUvtt, UvttImportError } from '../parse';

// Minimal PNG header: parser only needs dimensions and an embedded payload.
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAK';

const pngWithSize = (width: number, height: number) => {
    const bytes = new Uint8Array(24);

    bytes.set([0x89, 0x50, 0x4e, 0x47]);

    const view = new DataView(bytes.buffer);

    view.setUint32(16, width);
    view.setUint32(20, height);

    return btoa(String.fromCharCode(...bytes));
};

const base = {
    format: 0.2,
    image: png,
    resolution: {
        map_origin: [0, 0],
        map_size: { x: 8, y: 6 },
        pixels_per_grid: 10,
    },
    line_of_sight: [
        [20, 10, 40, 10],
        [30, 20, 30, 40],
    ],
};

describe('parseUvtt', () => {
    it('maps image PPI, LOS segments and closed portals onto map edges', () => {
        const result = parseUvtt(
            JSON.stringify({
                ...base,
                portals: [{ bounds: [50, 30, 60, 30], closed: true }],
            })
        );

        expect(result).toMatchObject({
            imageWidth: 10,
            imageHeight: 10,
            cols: 8,
            rows: 6,
            backgroundCols: 1,
            walls: ['2:0:s', '3:0:s', '2:2:e', '2:3:e'],
            doors: { '5:2:s': { open: false } },
        });
    });

    it('rejects malformed JSON, missing fields, oversized dimensions and unsupported diagonals', () => {
        for (const input of [
            '{',
            JSON.stringify({ ...base, resolution: undefined }),
            JSON.stringify({
                ...base,
                resolution: { ...base.resolution, map_size: { x: 201, y: 6 } },
            }),
            JSON.stringify({ ...base, line_of_sight: [[0, 0, 20, 20]] }),
        ]) {
            expect(() => parseUvtt(input)).toThrow(UvttImportError);
        }
    });

    it('accepts the 200-cell limit and rejects 201', () => {
        const withSize = (x: number, y: number) =>
            JSON.stringify({
                ...base,
                line_of_sight: [],
                resolution: { ...base.resolution, map_size: { x, y } },
            });

        expect(() => parseUvtt(withSize(200, 200))).not.toThrow();
        expect(() => parseUvtt(withSize(200, 201))).toThrow(UvttImportError);
        expect(() => parseUvtt(withSize(201, 200))).toThrow(UvttImportError);
    });

    it('rejects malformed embedded images and excessive file sizes', () => {
        expect(() =>
            parseUvtt(JSON.stringify({ ...base, image: 'not base64' }))
        ).toThrow(/image/i);
        expect(() => parseUvtt(' '.repeat(96 * 1024 * 1024 + 1))).toThrow(
            /96 MiB/
        );
    });

    it('accepts larger source dimensions within the decode guard and rejects above it', () => {
        const accepted = {
            ...base,
            line_of_sight: [],
            image: pngWithSize(10_000, 10_000),
            resolution: { ...base.resolution, pixels_per_grid: 200 },
        };

        expect(parseUvtt(JSON.stringify(accepted)).imageWidth).toBe(10_000);

        const tooManyPixels = {
            ...base,
            line_of_sight: [],
            image: pngWithSize(12_000, 12_000),
            resolution: { ...base.resolution, pixels_per_grid: 200 },
        };

        expect(() => parseUvtt(JSON.stringify(tooManyPixels))).toThrow(
            /12000 px per side or 120 MP/
        );

        const tooWide = {
            ...base,
            line_of_sight: [],
            image: pngWithSize(12_001, 100),
            resolution: { ...base.resolution, pixels_per_grid: 200 },
        };

        expect(() => parseUvtt(JSON.stringify(tooWide))).toThrow(
            /12000 px per side/
        );
    });
});
