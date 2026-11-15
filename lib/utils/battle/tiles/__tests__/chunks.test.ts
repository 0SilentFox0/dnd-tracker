import { describe, expect, it } from 'vitest';

import { splitMapChunkRows, UnknownTileLayerError } from '../chunks';

import { encodeEdges } from '@/lib/utils/battle/map-storage/edge-chunks';

describe('splitMapChunkRows', () => {
    it('treats rows without a layer and rows on layer 0 as legacy edges', () => {
        const encoded = encodeEdges({ walls: ['0:0:e'] }, 16, 16)['0:0'];

        const result = splitMapChunkRows([
            { cx: 0, cy: 0, data: encoded },
            { cx: 1, cy: 0, data: encoded, layer: 0 },
        ]);

        expect(result.edges).toEqual({ '0:0': encoded, '1:0': encoded });
        expect(result.tiles).toEqual({});
    });

    it('separates tile layers without passing them to the edge decoder', () => {
        const result = splitMapChunkRows([
            { cx: 0, cy: 0, data: 'r1:ground', layer: 1 },
            { cx: 0, cy: 0, data: 'r1:objects', layer: 3 },
        ]);

        expect(result.edges).toEqual({});
        expect(result.tiles).toEqual({
            ground: { '0:0': 'r1:ground' },
            objects: { '0:0': 'r1:objects' },
        });
    });

    it('rejects duplicate rows for the same layer and coordinates', () => {
        expect(() =>
            splitMapChunkRows([
                { cx: 0, cy: 0, data: 'r1:first', layer: 1 },
                { cx: 0, cy: 0, data: 'r1:second', layer: 1 },
            ])
        ).toThrow(/duplicate/i);
    });

    it('rejects unknown layer ids rather than interpreting data as edges', () => {
        expect(() =>
            splitMapChunkRows([{ cx: 0, cy: 0, data: 'future-format', layer: 99 }])
        ).toThrow(UnknownTileLayerError);
    });
});
