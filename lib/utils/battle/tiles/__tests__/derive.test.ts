import { describe, expect, it } from 'vitest';

import { deriveTileCells, UnknownTileIdError } from '../derive';

describe('deriveTileCells', () => {
    it('derives movement and sight cells from ground and object layers', () => {
        const ground = new Uint16Array(256);

        ground[0] = 1;

        const objects = new Uint16Array(256);

        objects[15] = 2;

        const chunks = {
            ground: { '0:0': ground },
            objects: { '0:0': objects },
            wallfill: { '0:0': new Uint16Array(256).fill(3) },
        };

        const catalog = {
            1: { blocks: true },
            2: { blocksSight: true, footprint: { cols: 2, rows: 1 } },
            3: { blocks: true },
        };

        const result = deriveTileCells(
            { chunks, cols: 32, rows: 16, version: 1 },
            catalog
        );

        expect([...result.blocked]).toEqual(['0:0']);
        expect([...result.blocksSight]).toEqual(['15:0', '16:0']);
    });

    it('clips footprint cells beyond map bounds', () => {
        const objects = new Uint16Array(256);

        objects[15] = 2;

        const result = deriveTileCells(
            {
                chunks: { objects: { '0:0': objects } },
                cols: 16,
                rows: 16,
                version: 1,
            },
            { 2: { blocks: true, footprint: { cols: 2, rows: 1 } } }
        );

        expect([...result.blocked]).toEqual(['15:0']);
    });

    it('rejects tile ids missing from the catalog', () => {
        const ground = new Uint16Array(256);

        ground[0] = 9;

        expect(() =>
            deriveTileCells(
                { chunks: { ground: { '0:0': ground } }, cols: 16, rows: 16, version: 1 },
                {}
            )
        ).toThrow(UnknownTileIdError);
    });

    it('reuses derived sets only for the same inputs and version', () => {
        const chunks = { ground: { '0:0': new Uint16Array(256).fill(1) } };

        const catalog = { 1: { blocks: true } };

        const input = { chunks, cols: 16, rows: 16, version: 1 };

        expect(deriveTileCells(input, catalog)).toBe(deriveTileCells(input, catalog));
        expect(deriveTileCells({ ...input, version: 2 }, catalog)).not.toBe(
            deriveTileCells(input, catalog)
        );
    });
});
