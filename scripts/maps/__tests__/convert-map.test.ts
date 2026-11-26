import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/battle-maps/library-service', () => ({
    pruneMapVersions: vi.fn(),
}));

import { FLOOR_MATERIALS } from '@/lib/constants/map-art/materials';
import { encodeEdges } from '@/lib/utils/battle/map-storage/edge-chunks';
import { encodeTileChunk } from '@/lib/utils/battle/tiles/rle';
import { applyConversionTx } from '@/scripts/maps/lib/convert-map';
import { convertTiles } from '@/scripts/maps/lib/tiles-to-scene';

const [A] = FLOOR_MATERIALS.map((m) => m.code);

const ground = (() => {
    const arr = new Uint16Array(256);

    arr[0] = A;

    return encodeTileChunk(arr);
})();

const header = { cols: 10, rows: 10 };

const edgeData = encodeEdges({ walls: ['2:2:e'] }, 10, 10)['0:0'];

function makeTx(over: { count?: number; art?: unknown } = {}) {
    return {
        battleMapArt: {
            findUnique: vi.fn(async () => over.art ?? null),
            create: vi.fn(),
        },
        battleMap: {
            findUniqueOrThrow: vi.fn(async () => ({ header, mapVersion: 4 })),
            updateMany: vi.fn(async () => ({ count: over.count ?? 1 })),
        },
        battleMapChunk: {
            findMany: vi.fn(async () => [
                {
                    cx: 0,
                    cy: 0,
                    data: edgeData,
                    tileLayers: { ground, objects: 'o' },
                },
            ]),
            update: vi.fn(),
        },
        battleMapVersion: {
            findUnique: vi.fn(async () => ({
                payload: {
                    header,
                    tileLayers: { '0:0': { ground, objects: 'o' } },
                },
            })),
            create: vi.fn(),
        },
    };
}

describe('applyConversionTx', () => {
    it('bumps mapVersion and writes a snapshot with stripped tileLayers', async () => {
        const tx = makeTx();

        const done = await applyConversionTx(tx as never, 'm1');

        expect(done).not.toBeNull();
        expect(tx.battleMap.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'm1', mapVersion: 4 } })
        );
        expect(tx.battleMapVersion.create).toHaveBeenCalledWith({
            data: {
                mapId: 'm1',
                version: 5,
                payload: { header, tileLayers: { '0:0': { objects: 'o' } } },
            },
        });
        expect(tx.battleMapArt.create).toHaveBeenCalled();
    });

    it('fails when the map version moved during the transaction', async () => {
        const tx = makeTx({ count: 0 });

        await expect(applyConversionTx(tx as never, 'm1')).rejects.toThrow(
            'changed during conversion'
        );
        expect(tx.battleMapArt.create).not.toHaveBeenCalled();
    });

    it('skips a map that already has art', async () => {
        const tx = makeTx({ art: {} });

        expect(await applyConversionTx(tx as never, 'm1')).toBeNull();
        expect(tx.battleMap.updateMany).not.toHaveBeenCalled();
    });
});

describe('convertTiles', () => {
    it('counts walls clipped on the map border', () => {
        const { wallsClipped, scene } = convertTiles(
            { '0:0': { ground } },
            { cols: 10, rows: 10, walls: ['2:2:e', '9:3:e'] }
        );

        expect(wallsClipped).toBe(1);
        expect(Object.keys(scene.walls)).toEqual(['2:2:e']);
    });
});
