import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/battle-maps/library-service', () => ({
    pruneMapVersions: vi.fn(),
}));

import { FLOOR_MATERIALS } from '@/lib/constants/map-art/materials';
import { TILE_CATALOG } from '@/lib/constants/tilesets/catalog';
import { visibleFrom } from '@/lib/utils/battle/vision/shadowcast';
import { encodeEdges } from '@/lib/utils/battle/map-storage/edge-chunks';
import { encodeTileChunk } from '@/lib/utils/battle/tiles/rle';
import {
    applyConversionTx,
    applyObjectsTx,
    buildConversion,
    buildObjectsConversion,
} from '@/scripts/maps/lib/convert-map';
import { convertTiles } from '@/scripts/maps/lib/tiles-to-scene';

const [A] = FLOOR_MATERIALS.map((m) => m.code);

const ground = (() => {
    const arr = new Uint16Array(256);

    arr[0] = A;

    return encodeTileChunk(arr);
})();

const BARREL = TILE_CATALOG.find((t) => t.key === 'barrel' && t.layer === 'objects')!.id;

const objects = (() => {
    const arr = new Uint16Array(256);

    arr[5 * 16 + 4] = BARREL;

    return encodeTileChunk(arr);
})();

const header = { cols: 10, rows: 10 };

const edgeData = encodeEdges({ walls: ['2:2:e'] }, 10, 10)['0:0'];

function makeTx(over: { count?: number; art?: unknown } = {}) {
    const update = vi.fn();

    return {
        battleMapArt: {
            findUnique: vi.fn(async () => over.art ?? null),
            create: vi.fn(),
            update,
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
                    tileLayers: { ground, objects },
                },
            ]),
            update: vi.fn(),
        },
        battleMapVersion: {
            findUnique: vi.fn(async () => ({
                payload: {
                    header,
                    tileLayers: { '0:0': { ground, objects } },
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
                payload: {
                    header: { ...header, blocked: ['4:5'], sightBlocked: ['4:5'] },
                    tileLayers: {},
                },
            },
        });
        expect(tx.battleMapArt.create).toHaveBeenCalled();
    });

    it('writes the stamp footprint into the header in the same transaction', async () => {
        const tx = makeTx();

        await applyConversionTx(tx as never, 'm1');

        expect(tx.battleMap.updateMany).toHaveBeenCalledWith({
            where: { id: 'm1', mapVersion: 4 },
            data: {
                mapVersion: { increment: 1 },
                header: { ...header, blocked: ['4:5'], sightBlocked: ['4:5'] },
            },
        });
        expect(tx.battleMapChunk.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { tileLayers: expect.anything() } })
        );
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

describe('buildConversion with objects', () => {
    it('returns stamps that validate, and a header where a column blocks sight', () => {
        const chunks = [{ cx: 0, cy: 0, data: edgeData, tileLayers: { ground, objects } }];

        const conversion = buildConversion(header, chunks);

        expect(conversion?.scene.stamps).toHaveLength(1);
        expect(conversion?.objects).toMatchObject({ total: 1, newBlocked: 1 });

        const map = conversion!.header as never;

        expect(visibleFrom(map, { x: 1, y: 5 }, 9).has('7:5')).toBe(false);
    });
});

describe('buildObjectsConversion', () => {
    const scene = convertTiles({ '0:0': { ground } }, { cols: 10, rows: 10 }).scene;

    it('is null when the map has no objects layer', () => {
        expect(
            buildObjectsConversion(scene, header, [
                { cx: 0, cy: 0, data: edgeData, tileLayers: { ground } },
            ])
        ).toBeNull();
    });

    it('appends stamps to the existing scene and is idempotent', () => {
        const chunks = [{ cx: 0, cy: 0, data: edgeData, tileLayers: { objects } }];

        const first = buildObjectsConversion(scene, header, chunks);

        expect(first?.scene.stamps).toHaveLength(1);

        const again = buildObjectsConversion(first!.scene, header, chunks);

        expect(again?.scene.stamps).toHaveLength(1);
    });
});

describe('applyObjectsTx', () => {
    const artRow = (baked: number | null) => ({
        scene: convertTiles({ '0:0': { ground } }, { cols: 10, rows: 10 }).scene,
        sceneVersion: 2,
        bakedSceneVersion: baked,
    });

    it('bumps sceneVersion, strips objects and writes header mechanics', async () => {
        const tx = makeTx({ art: artRow(null) });

        const done = await applyObjectsTx(tx as never, 'm1');

        expect(done?.objects.stamps).toHaveLength(1);
        expect(tx.battleMapArt.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ sceneVersion: { increment: 1 } }),
            })
        );
        expect(tx.battleMap.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    header: expect.objectContaining({ blocked: ['4:5'] }),
                }),
            })
        );
    });

    it('skips baked art unless includeBaked', async () => {
        const tx = makeTx({ art: artRow(2) });

        expect(await applyObjectsTx(tx as never, 'm1')).toBeNull();
        expect(tx.battleMap.updateMany).not.toHaveBeenCalled();
        expect(await applyObjectsTx(tx as never, 'm1', { includeBaked: true })).not.toBeNull();
    });
});
