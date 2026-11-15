import { describe, expect, it } from 'vitest';

import { splitMapChunkRows, UnknownTileLayerError } from '../chunks';

import {
    EMPTY_EDGE_CHUNK,
    encodeEdges,
} from '@/lib/utils/battle/map-storage/edge-chunks';

describe('splitMapChunkRows', () => {
    it('reads old rows with null tile_layers as edge chunks', () => {
        const encoded = encodeEdges({ walls: ['0:0:e'] }, 16, 16)['0:0'];

        const result = splitMapChunkRows([
            { cx: 0, cy: 0, data: encoded, tileLayers: null },
        ]);

        expect(result.edges).toEqual({ '0:0': encoded });
        expect(result.tiles).toEqual({});
    });

    it('separates tile layers stored alongside the legacy edge payload', () => {
        const result = splitMapChunkRows([
            {
                cx: 0,
                cy: 0,
                data: EMPTY_EDGE_CHUNK,
                tileLayers: { ground: 'r1:ground', objects: 'r1:objects' },
            },
        ]);

        expect(result.edges).toEqual({ '0:0': EMPTY_EDGE_CHUNK });
        expect(result.tiles).toEqual({
            ground: { '0:0': 'r1:ground' },
            objects: { '0:0': 'r1:objects' },
        });
    });

    it('rejects duplicate rows for a coordinate', () => {
        expect(() =>
            splitMapChunkRows([
                { cx: 0, cy: 0, data: 'edges', tileLayers: null },
                { cx: 0, cy: 0, data: 'edges', tileLayers: { ground: 'r1:tile' } },
            ])
        ).toThrow(/duplicate/i);
    });

    it('rejects unknown tile layer keys instead of interpreting them as edges', () => {
        expect(() =>
            splitMapChunkRows([
                { cx: 0, cy: 0, data: EMPTY_EDGE_CHUNK, tileLayers: { future: 'r1:data' } },
            ])
        ).toThrow(UnknownTileLayerError);
    });
});
