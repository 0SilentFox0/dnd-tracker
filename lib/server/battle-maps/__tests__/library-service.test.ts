import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const db = vi.hoisted(() => {
    const maps = new Map<string, Record<string, unknown>>();

    type MapRowData = {
        campaignId?: string;
        name?: string;
        cols?: number;
        rows?: number;
        header?: unknown;
        chunks?: { create: Omit<(typeof chunks)[number], 'mapId'>[] };
        versions?: { create: Omit<(typeof versions)[number], 'mapId'> };
        mapVersion?: number | { increment?: number };
        [key: string]: unknown;
    };

    const chunks: {
        mapId: string;
        cx: number;
        cy: number;
        data: string;
        tileLayers?: unknown;
    }[] = [];

    const versions: {
        mapId: string;
        version: number;
        payload: unknown;
    }[] = [];

    const scenes: { mapId: string; mapVersion: number | null }[] = [];

    let seq = 0;

    const api = {
        battleMap: {
            create: vi.fn(async ({ data }: { data: MapRowData }) => {
                const id = `m${++seq}`;

                const row = {
                    id,
                    campaignId: data.campaignId,
                    name: data.name,
                    cols: data.cols,
                    rows: data.rows,
                    header: data.header,
                    mapVersion: 1,
                    updatedAt: new Date(0),
                };

                maps.set(id, row);

                for (const c of data.chunks?.create ?? [])
                    chunks.push({ mapId: id, ...c });

                if (data.versions?.create)
                    versions.push({ mapId: id, ...data.versions.create });

                return row;
            }),
            findUnique: vi.fn(
                async ({ where }: { where: { id: string } }) =>
                    maps.get(where.id) ?? null
            ),
            findMany: vi.fn(async () => [...maps.values()]),
            findUniqueOrThrow: vi.fn(
                async ({ where }: { where: { id: string } }) => {
                    const row = maps.get(where.id);

                    if (!row) throw new Error('not found');

                    return row;
                }
            ),
            updateMany: vi.fn(
                async ({
                    where,
                    data,
                }: {
                    where: { id: string; mapVersion: number };
                    data: MapRowData;
                }) => {
                    const row = maps.get(where.id) as
                        | Record<string, unknown>
                        | undefined;

                    if (
                        !row ||
                        typeof row.mapVersion !== 'number' ||
                        row.mapVersion !== where.mapVersion
                    )
                        return { count: 0 };

                    const { mapVersion, ...rest } = data;

                    const increment =
                        typeof mapVersion === 'object'
                            ? mapVersion.increment ?? 0
                            : 0;

                    Object.assign(row, rest, {
                        mapVersion: row.mapVersion + increment,
                    });

                    return { count: 1 };
                }
            ),
            delete: vi.fn(async ({ where }: { where: { id: string } }) => {
                maps.delete(where.id);
            }),
        },
        battleMapChunk: {
            findMany: vi.fn(async ({ where }: { where: { mapId: string } }) =>
                chunks.filter((c) => c.mapId === where.mapId)
            ),
            deleteMany: vi.fn(
                async ({ where }: { where: { mapId: string } }) => {
                    for (let i = chunks.length - 1; i >= 0; i--)
                        if (chunks[i].mapId === where.mapId)
                            chunks.splice(i, 1);
                }
            ),
            createMany: vi.fn(async ({ data }: { data: typeof chunks }) => {
                chunks.push(...data);
            }),
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
                    versions.find(
                        (v) =>
                            v.mapId === where.mapId_version.mapId &&
                            v.version === where.mapId_version.version
                    ) ?? null
            ),
            create: vi.fn(async ({ data }: { data: (typeof versions)[0] }) => {
                versions.push(data);
            }),
            deleteMany: vi.fn(
                async ({
                    where,
                }: {
                    where: {
                        mapId: string;
                        version: { lt: number; notIn: number[] };
                    };
                }) => {
                    for (let i = versions.length - 1; i >= 0; i--) {
                        const v = versions[i];

                        if (
                            v.mapId === where.mapId &&
                            v.version < where.version.lt &&
                            !where.version.notIn.includes(v.version)
                        )
                            versions.splice(i, 1);
                    }
                }
            ),
        },
        battleScene: {
            findMany: vi.fn(async ({ where }: { where: { mapId: string } }) =>
                scenes.filter((s) => s.mapId === where.mapId)
            ),
            count: vi.fn(
                async ({ where }: { where: { mapId: string } }) =>
                    scenes.filter((s) => s.mapId === where.mapId).length
            ),
        },
        $queryRaw: vi.fn(async () => []),
        $transaction: vi.fn(),
    };

    api.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn(api)
    );

    return {
        api,
        maps,
        chunks,
        versions,
        scenes,
        reset: () => {
            maps.clear();
            chunks.length = 0;
            versions.length = 0;
            scenes.length = 0;
        },
    };
});

vi.mock('@/lib/db', () => ({ prisma: db.api }));

const storage = vi.hoisted(() => ({
    resolve: vi.fn(
        async (bg: string | null) =>
            ({
                ok: true,
                background: bg?.startsWith('data:')
                    ? 'https://cdn.test/bg.webp'
                    : bg,
            }) as const
    ),
}));

vi.mock('@/lib/supabase/battle-map-storage', () => ({
    resolveMapBackgroundForPersistence: storage.resolve,
}));

import { clearGeometryCache } from '../assemble';
import {
    cloneMap,
    createMap,
    deleteMap,
    getMap,
    getMapMeta,
    getPinnedGeometry,
    listMaps,
    saveMap,
    withStoredBackground,
} from '../library-service';

import type { BattleMapInput } from '@/lib/schemas/battle-maps';

const input = (over: Partial<BattleMapInput> = {}): BattleMapInput => ({
    name: 'Crypt',
    map: { cols: 20, rows: 20, background: null, opacity: 0.5 },
    walls: ['0:0:e', '17:3:s'],
    bars: ['1:1:e'],
    ...over,
});

beforeEach(() => {
    db.reset();
    clearGeometryCache();
    vi.clearAllMocks();
});

describe('battle map library service', () => {
    it('create then get roundtrips header and edges', async () => {
        const brief = await createMap('c1', input());

        expect(brief.version).toBe(1);

        const map = await getMap(brief.id);

        expect(map?.campaignId).toBe('c1');
        expect(map?.map.cols).toBe(20);
        expect(map?.walls.sort()).toEqual(['0:0:e', '17:3:s']);
        expect(map?.bars).toEqual(['1:1:e']);
        expect(await listMaps('c1')).toHaveLength(1);
    });

    it('save bumps the version and replaces edges; an unpinned old version is pruned', async () => {
        const { id } = await createMap('c1', input());

        const saved = await saveMap(id, input({ walls: ['2:2:e'], bars: [] }));

        expect(saved.version).toBe(2);
        expect((await getMap(id))?.walls).toEqual(['2:2:e']);
        expect(await getMap(id, 1)).toBeNull();
    });

    it('geometry save preserves tile layers on rows and in the new version snapshot', async () => {
        const { id } = await createMap('c1', input());

        const row = db.chunks.find((chunk) => chunk.mapId === id);

        if (!row) throw new Error('expected chunk row');

        row.tileLayers = { ground: 'r1:tiles' };

        const saved = await saveMap(id, input({ walls: ['2:2:e'], bars: [] }));

        const persisted = db.chunks.find((chunk) => chunk.mapId === id);

        const version = db.versions.find(
            (snapshot) => snapshot.mapId === id && snapshot.version === saved.version
        );

        expect(persisted?.tileLayers).toEqual({ ground: 'r1:tiles' });
        expect((version?.payload as { tileLayers: unknown }).tileLayers).toEqual({
            '0:0': { ground: 'r1:tiles' },
        });
    });

    it('save with a stale expectedVersion is a 409 conflict and writes nothing', async () => {
        const { id } = await createMap('c1', input());

        await saveMap(id, input({ walls: ['2:2:e'], expectedVersion: 1 }));

        await expect(
            saveMap(id, input({ walls: ['3:3:e'], expectedVersion: 1 }))
        ).rejects.toMatchObject({
            status: 409,
            message: 'errors.battleMapConflict',
        });
        expect((await getMap(id))?.walls).toEqual(['2:2:e']);

        const ok = await saveMap(
            id,
            input({ walls: ['3:3:e'], expectedVersion: 2 })
        );

        expect(ok.version).toBe(3);
    });

    it('a concurrent save between read and write (count 0) is a conflict', async () => {
        const { id } = await createMap('c1', input());

        db.api.battleMap.updateMany.mockResolvedValueOnce({ count: 0 });

        await expect(
            saveMap(id, input({ walls: ['2:2:e'] }))
        ).rejects.toMatchObject({ status: 409 });
    });

    it('a rename-only save keeps the version and the snapshot', async () => {
        const { id } = await createMap('c1', input());

        const saved = await saveMap(id, input({ name: 'Renamed' }));

        expect(saved.version).toBe(1);
        expect(saved.name).toBe('Renamed');
        expect(db.versions).toHaveLength(1);
    });

    it('a stale current read never memoizes newer geometry under the old version', async () => {
        const { id } = await createMap('c1', input());

        const stale = { ...(db.maps.get(id) as Record<string, unknown>) };

        await saveMap(id, input({ walls: ['2:2:e'], bars: [] }));

        db.api.battleMap.findUnique.mockResolvedValueOnce(stale);

        const read = await getMap(id);

        expect(read?.version).toBe(2);
        expect(read?.walls).toEqual(['2:2:e']);
        expect(await getMap(id, 1)).toBeNull();
        expect((await getMap(id, 2))?.walls).toEqual(['2:2:e']);
    });

    it('prune drops unreferenced old versions but keeps a pinned one', async () => {
        const { id } = await createMap('c1', input());

        db.scenes.push({ mapId: id, mapVersion: 1 });

        await saveMap(id, input({ walls: ['2:2:e'] }));
        await saveMap(id, input({ walls: ['3:3:e'] }));

        expect(db.versions.map((v) => v.version).sort()).toEqual([1, 3]);

        const pinned = await getMap(id, 1);

        expect(pinned?.walls.sort()).toEqual(['0:0:e', '17:3:s']);
        expect(pinned?.version).toBe(1);
        expect(await getMap(id, 2)).toBeNull();
    });

    it('version beyond current is not found', async () => {
        const { id } = await createMap('c1', input());

        expect(await getMap(id, 9)).toBeNull();
        expect(await getMap('nope')).toBeNull();
    });

    it('delete refuses a map used by a battle', async () => {
        const { id } = await createMap('c1', input());

        db.scenes.push({ mapId: id, mapVersion: 1 });

        expect(await deleteMap(id)).toBe('in-use');
        expect(db.maps.has(id)).toBe(true);

        db.scenes.length = 0;

        expect(await deleteMap(id)).toBe('ok');
        expect(db.maps.has(id)).toBe(false);
    });

    it('delete checks usage and deletes inside one locked transaction', async () => {
        const { id } = await createMap('c1', input());

        db.api.$transaction.mockClear();

        await deleteMap(id);

        expect(db.api.$transaction).toHaveBeenCalledTimes(1);
        expect(db.api.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('getMapMeta reads ownership and version without geometry', async () => {
        const { id } = await createMap('c1', input());

        await saveMap(id, input({ walls: ['2:2:e'] }));

        db.api.battleMapChunk.findMany.mockClear();

        expect(await getMapMeta(id)).toMatchObject({
            campaignId: 'c1',
            version: 2,
            cols: 20,
            rows: 20,
        });
        expect(await getMapMeta('nope')).toBeNull();
        expect(db.api.battleMapChunk.findMany).not.toHaveBeenCalled();
    });

    it('getPinnedGeometry serves a pinned version without reading the map row', async () => {
        const { id } = await createMap('c1', input());

        db.scenes.push({ mapId: id, mapVersion: 1 });

        await saveMap(id, input({ walls: ['2:2:e'] }));

        db.api.battleMap.findUnique.mockClear();

        const geometry = await getPinnedGeometry(id, 1);

        expect(geometry?.walls.sort()).toEqual(['0:0:e', '17:3:s']);
        expect(await getPinnedGeometry(id, 1)).toBe(geometry);
        expect(await getPinnedGeometry(id, 2)).toMatchObject({
            walls: ['2:2:e'],
        });
        expect(await getPinnedGeometry(id, 9)).toBeNull();
        expect(db.api.battleMap.findUnique).not.toHaveBeenCalled();
    });

    it('clone copies content under a new id', async () => {
        const { id } = await createMap('c1', input());

        const source = await getMap(id);

        if (!source) throw new Error('expected source map');

        const copy = await cloneMap(source, undefined);

        expect(copy.id).not.toBe(id);
        expect(copy.name).toBe('Crypt (copy)');
        expect((await getMap(copy.id))?.walls.sort()).toEqual([
            '0:0:e',
            '17:3:s',
        ]);
    });

    it('a data-URL background is stored as a bucket URL, and re-saving that URL keeps the version', async () => {
        const stored = await withStoredBackground(
            input({
                map: {
                    cols: 20,
                    rows: 20,
                    background: 'data:image/png;base64,AAAA',
                    opacity: 0.5,
                },
            }),
            'c1'
        );

        expect(storage.resolve).toHaveBeenCalledTimes(1);
        expect(stored.map.background).toBe('https://cdn.test/bg.webp');

        const brief = await createMap('c1', stored);

        const again = await withStoredBackground(
            stored,
            'c1',
            stored.map.background
        );

        expect((await saveMap(brief.id, again)).version).toBe(1);
    });
});
