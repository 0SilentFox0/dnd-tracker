import { describe, expect, it } from 'vitest';

import { EMPTY_EDGE_CHUNK } from '@/lib/utils/battle/map-storage/edge-chunks';
import {
    planTileChunkWrites,
    tilePatchKeys,
} from '@/lib/utils/battle/map-storage/tile-chunk-patch';

describe('tilePatchKeys', () => {
    it('dedupes chunk coordinates', () => {
        expect(
            tilePatchKeys([
                { layer: 'ground', cx: 0, cy: 1, data: 'a' },
                { layer: 'objects', cx: 0, cy: 1, data: 'b' },
                { layer: 'ground', cx: 2, cy: 0, data: null },
            ])
        ).toEqual(['0:1', '2:0']);
    });
});

describe('planTileChunkWrites', () => {
    it('merges a layer and keeps edge data and other layers', () => {
        const plan = planTileChunkWrites(
            [{ layer: 'ground', cx: 0, cy: 0, data: 'new' }],
            new Map([
                [
                    '0:0',
                    {
                        data: 'edges',
                        layers: { ground: 'old', objects: 'obj' },
                    },
                ],
            ])
        );

        expect(plan.nextLayers.get('0:0')).toEqual({
            ground: 'new',
            objects: 'obj',
        });
        expect(plan.writes).toEqual([
            {
                kind: 'upsert',
                key: '0:0',
                cx: 0,
                cy: 0,
                data: 'edges',
                layers: { ground: 'new', objects: 'obj' },
            },
        ]);
    });

    it('skips unchanged chunks', () => {
        const plan = planTileChunkWrites(
            [
                { layer: 'ground', cx: 0, cy: 0, data: 'same' },
                { layer: 'objects', cx: 1, cy: 0, data: null },
            ],
            new Map([['0:0', { data: 'edges', layers: { ground: 'same' } }]])
        );

        expect(plan.writes).toEqual([]);
    });

    it('creates a chunk with an empty edge payload', () => {
        const plan = planTileChunkWrites(
            [{ layer: 'ground', cx: 1, cy: 1, data: 'x' }],
            new Map()
        );

        expect(plan.writes).toEqual([
            {
                kind: 'upsert',
                key: '1:1',
                cx: 1,
                cy: 1,
                data: EMPTY_EDGE_CHUNK,
                layers: { ground: 'x' },
            },
        ]);
    });

    it('deletes a chunk left with no layers and no edges', () => {
        const plan = planTileChunkWrites(
            [{ layer: 'ground', cx: 0, cy: 0, data: null }],
            new Map([
                ['0:0', { data: EMPTY_EDGE_CHUNK, layers: { ground: 'x' } }],
            ])
        );

        expect(plan.nextLayers.get('0:0')).toBeNull();
        expect(plan.writes).toEqual([
            { kind: 'delete', key: '0:0', cx: 0, cy: 0 },
        ]);
    });

    it('clears layers but keeps a chunk that has edges', () => {
        const plan = planTileChunkWrites(
            [{ layer: 'ground', cx: 0, cy: 0, data: null }],
            new Map([['0:0', { data: 'edges', layers: { ground: 'x' } }]])
        );

        expect(plan.writes).toEqual([
            {
                kind: 'upsert',
                key: '0:0',
                cx: 0,
                cy: 0,
                data: 'edges',
                layers: null,
            },
        ]);
    });
});
