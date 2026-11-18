import { describe, expect, it } from 'vitest';

import { parseUvtt, UvttImportError } from '../parse';

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

    it('rejects malformed JSON, missing fields, oversized dimensions and missing geometry', () => {
        for (const input of [
            '{',
            JSON.stringify({ ...base, resolution: undefined }),
            JSON.stringify({
                ...base,
                resolution: { ...base.resolution, map_size: { x: 201, y: 6 } },
            }),
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

    describe('hostile input', () => {
        const withLos = (line_of_sight: unknown, extra: object = {}) =>
            JSON.stringify({ ...base, line_of_sight, ...extra });

        it('skips diagonal, zero-length, border and out-of-bounds walls with warnings', () => {
            const result = parseUvtt(
                withLos([
                    [20, 10, 40, 10],
                    [0, 0, 20, 20],
                    [30, 30, 30, 30],
                    [0, 10, 0, 30],
                    [80, 10, 80, 30],
                    [500, 10, 900, 10],
                ])
            );

            expect(result.walls).toEqual(['2:0:s', '3:0:s']);
            expect(result.warnings).toEqual(
                expect.arrayContaining([
                    { code: 'diagonal', count: 1 },
                    { code: 'zeroLength', count: 1 },
                    { code: 'border', count: 2 },
                    { code: 'outOfBounds', count: 1 },
                ])
            );
        });

        it('reports no warnings for a clean file', () => {
            expect(parseUvtt(JSON.stringify(base)).warnings).toEqual([]);
        });

        it('skips a portal that spans several edges or is diagonal', () => {
            const result = parseUvtt(
                withLos([], {
                    portals: [
                        { bounds: [10, 30, 50, 30], closed: true },
                        { bounds: [10, 10, 30, 30], closed: true },
                    ],
                })
            );

            expect(result.doors).toEqual({});
            expect(result.warnings).toEqual(
                expect.arrayContaining([
                    { code: 'portalSpan', count: 1 },
                    { code: 'diagonal', count: 1 },
                ])
            );
        });

        it('does not widen a wall by float noise past a cell boundary', () => {
            const result = parseUvtt(withLos([[20, 10, 40.0000001, 10]]));

            expect(result.walls).toEqual(['2:0:s', '3:0:s']);
        });

        it('snaps fractional coordinates within tolerance', () => {
            const result = parseUvtt(
                withLos([[2.1, 1.05, 3.95, 0.95]], {
                    resolution: { ...base.resolution, pixels_per_grid: 1 },
                })
            );

            expect(result.walls).toEqual(['2:0:s', '3:0:s']);
        });

        it('rejects NaN, Infinity-like and non-numeric sizes', () => {
            for (const size of [
                { x: null, y: 6 },
                { x: '8', y: 6 },
                { x: 8.5, y: 6 },
                { x: -8, y: 6 },
                { x: 1e308, y: 1e308 },
            ])
                expect(() =>
                    parseUvtt(
                        JSON.stringify({
                            ...base,
                            resolution: { ...base.resolution, map_size: size },
                        })
                    )
                ).toThrow(UvttImportError);

            for (const ppi of [0, -1, null, 'x'])
                expect(() =>
                    parseUvtt(
                        JSON.stringify({
                            ...base,
                            resolution: {
                                ...base.resolution,
                                pixels_per_grid: ppi,
                            },
                        })
                    )
                ).toThrow(UvttImportError);
        });

        it('ignores wall points that are NaN and rejects non-array geometry', () => {
            expect(() => parseUvtt(withLos([[20, null, 40, 10]]))).toThrow(
                UvttImportError
            );
            expect(() => parseUvtt(withLos('walls'))).toThrow(UvttImportError);
            expect(() => parseUvtt(withLos([], { portals: {} }))).toThrow(
                UvttImportError
            );
        });

        it('rejects corrupted base64 without decoding the whole payload', () => {
            for (const image of [
                'iVBOR*GgoAAAANSUhEUgAAAAoAAAAK',
                'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKA',
                'data:image/png;base64,@@@@',
                'data:image/gif;base64,AAAA',
                '=',
            ])
                expect(() =>
                    parseUvtt(JSON.stringify({ ...base, image }))
                ).toThrow(UvttImportError);
        });

        it('rejects a huge pixels-per-grid ratio and tiny background scale', () => {
            expect(() =>
                parseUvtt(
                    JSON.stringify({
                        ...base,
                        resolution: {
                            ...base.resolution,
                            pixels_per_grid: 1e-9,
                        },
                    })
                )
            ).toThrow(/background scale/);
        });
    });
});
