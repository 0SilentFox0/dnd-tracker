import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const db = vi.hoisted(() => {
    const map = { mapVersion: 1, cols: 20, rows: 20 };

    type ChunkRow = {
        mapId: string;
        cx: number;
        cy: number;
        data: string;
        tileLayers?: unknown;
    };
    type SnapshotRow = {
        mapId: string;
        version: number;
        payload: Record<string, unknown>;
    };

    const rows: ChunkRow[] = [
        {
            mapId: 'm1',
            cx: 0,
            cy: 0,
            data: 'legacy-edges',
            tileLayers: { ground: 'r1:old', objects: 'r1:object' },
        },
    ];

    const snapshots: SnapshotRow[] = [
        {
            mapId: 'm1',
            version: 1,
            payload: {
                header: { cols: 20, rows: 20 },
                chunks: { '0:0': 'legacy-edges' },
                tileLayers: {
                    '0:0': { ground: 'r1:old', objects: 'r1:object' },
                },
            },
        },
    ];

    const api = {
        battleMap: {
            findUniqueOrThrow: vi.fn(async () => map),
            updateMany: vi.fn(
                async ({
                    where,
                    data,
                }: {
                    where: { mapVersion: number };
                    data: { mapVersion: { increment: number } };
                }) => {
                    if (map.mapVersion !== where.mapVersion)
                        return { count: 0 };

                    map.mapVersion += data.mapVersion.increment;

                    return { count: 1 };
                }
            ),
        },
        battleMapChunk: {
            findMany: vi.fn(async () => rows),
            upsert: vi.fn(
                async ({
                    where,
                    create,
                    update,
                }: {
                    where: {
                        mapId_cx_cy: { mapId: string; cx: number; cy: number };
                    };
                    create: ChunkRow;
                    update: Partial<ChunkRow>;
                }) => {
                    const row = rows.find(
                        (item) =>
                            item.mapId === where.mapId_cx_cy.mapId &&
                            item.cx === where.mapId_cx_cy.cx &&
                            item.cy === where.mapId_cx_cy.cy
                    );

                    if (row) Object.assign(row, update);
                    else rows.push(create);
                }
            ),
            deleteMany: vi.fn(
                async ({
                    where,
                }: {
                    where: { mapId: string; cx: number; cy: number };
                }) => {
                    const index = rows.findIndex(
                        (row) =>
                            row.mapId === where.mapId &&
                            row.cx === where.cx &&
                            row.cy === where.cy
                    );

                    if (index >= 0) rows.splice(index, 1);
                }
            ),
        },
        battleMapVersion: {
            findUnique: vi.fn(
                async ({
                    where,
                }: {
                    where: {
                        mapId_version: { mapId: string; version: number };
                    };
                }) =>
                    snapshots.find(
                        (snapshot) =>
                            snapshot.mapId === where.mapId_version.mapId &&
                            snapshot.version === where.mapId_version.version
                    ) ?? null
            ),
            create: vi.fn(async ({ data }: { data: SnapshotRow }) =>
                snapshots.push(data)
            ),
        },
        $transaction: vi.fn(async (fn: (tx: unknown) => unknown) =>
            fn(undefined)
        ),
    };

    api.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
        Promise.resolve(fn(api))
    );

    return { api, map, rows, snapshots };
});

vi.mock('@/lib/db', () => ({ prisma: db.api }));
vi.mock('@/lib/server/battle-maps/library-service', () => ({
    pruneMapVersions: vi.fn(),
}));

import { getTileChunks, patchTileChunks } from '../tiles-service';

import { encodeTileChunk } from '@/lib/utils/battle/tiles/rle';

const encodedNew = encodeTileChunk(new Uint16Array(256).fill(2));

describe('battle map tile storage', () => {
    beforeEach(() => {
        db.map.mapVersion = 1;
        db.rows.splice(0, db.rows.length, {
            mapId: 'm1',
            cx: 0,
            cy: 0,
            data: 'legacy-edges',
            tileLayers: { ground: 'r1:old', objects: 'r1:object' },
        });
        db.snapshots.splice(0, db.snapshots.length, {
            mapId: 'm1',
            version: 1,
            payload: {
                header: { cols: 20, rows: 20 },
                chunks: { '0:0': 'legacy-edges' },
                tileLayers: {
                    '0:0': { ground: 'r1:old', objects: 'r1:object' },
                },
            },
        });
        vi.clearAllMocks();
        db.api.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
            Promise.resolve(fn(db.api))
        );
        db.api.battleMap.findUniqueOrThrow.mockResolvedValue(db.map);
    });

    it('reads tile layers from a versioned snapshot', async () => {
        await expect(getTileChunks('m1', 1)).resolves.toEqual({
            ground: { '0:0': 'r1:old' },
            objects: { '0:0': 'r1:object' },
        });
    });

    it('patches one layer without changing edges or other layers and snapshots the result', async () => {
        const next = await patchTileChunks('m1', 1, [
            { layer: 'ground', cx: 0, cy: 0, data: encodedNew },
        ]);

        expect(next).toBe(2);
        expect(db.map.mapVersion).toBe(2);
        expect(db.rows[0]).toMatchObject({
            data: 'legacy-edges',
            tileLayers: { ground: encodedNew, objects: 'r1:object' },
        });
        expect(await getTileChunks('m1', 2)).toEqual({
            ground: { '0:0': encodedNew },
            objects: { '0:0': 'r1:object' },
        });
    });

    it('rejects stale versions and out of map coordinates without writing', async () => {
        await expect(
            patchTileChunks('m1', 0, [
                { layer: 'ground', cx: 0, cy: 0, data: encodedNew },
            ])
        ).rejects.toMatchObject({ status: 409 });
        await expect(
            patchTileChunks('m1', 1, [
                { layer: 'ground', cx: 2, cy: 0, data: encodedNew },
            ])
        ).rejects.toMatchObject({ status: 400 });
        expect(db.api.battleMapChunk.upsert).not.toHaveBeenCalled();
    });

    it('rejects a tile id assigned to a different layer', async () => {
        const objectTile = encodeTileChunk(new Uint16Array(256).fill(5));

        await expect(
            patchTileChunks('m1', 1, [
                { layer: 'ground', cx: 0, cy: 0, data: objectTile },
            ])
        ).rejects.toMatchObject({ status: 400 });
        expect(db.api.battleMap.updateMany).not.toHaveBeenCalled();
    });

    it('reads only patched chunks and skips unchanged ones', async () => {
        db.rows[0].tileLayers = { ground: encodedNew };

        const next = await patchTileChunks('m1', 1, [
            { layer: 'ground', cx: 0, cy: 0, data: encodedNew },
        ]);

        expect(next).toBe(2);
        expect(db.api.battleMapChunk.findMany).toHaveBeenCalledWith({
            where: { mapId: 'm1', OR: [{ cx: 0, cy: 0 }] },
        });
        expect(db.api.battleMapChunk.upsert).not.toHaveBeenCalled();
    });
});
