import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    getPinned: vi.fn(),
    getPinnedTiles: vi.fn(),
    lock: vi.fn(),
}));

vi.mock('@/lib/server/battle-maps/library-service', () => ({
    getPinnedGeometry: mocks.getPinned,
    lockMapRow: mocks.lock,
}));
vi.mock('@/lib/server/battle-maps/tiles-service', () => ({
    getPinnedTileChunks: mocks.getPinnedTiles,
}));

import { loadBattle } from '../load-battle';

import { saveBattle } from '@/lib/server/battles/store/save-battle';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { toBattleResponse } from '@/lib/utils/battle/pipeline/battle-response';
import { BattleConflictError } from '@/lib/utils/battle/store/errors';
import { buildSnapshotState } from '@/lib/utils/battle/store/snapshot-state';
import type { BattleDb } from '@/lib/utils/battle/store/types';
import type { LoadedBattle } from '@/lib/utils/battle/store/types';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import type { BattleMapConfig, BattleMapState } from '@/types/battle-grid';

const header: BattleMapConfig = {
    cols: 8,
    rows: 8,
    background: null,
    opacity: 0.3,
};

const sceneRow = (extra: Record<string, unknown>) => ({
    id: 'b1',
    campaignId: 'c1',
    name: 'Бій',
    description: null,
    status: 'active',
    currentRound: 1,
    currentTurnIndex: 0,
    version: 1,
    eventSeq: 0,
    map: header,
    audio: null,
    rules: { system: { key: 'homm' } },
    startedAt: null,
    completedAt: null,
    createdAt: new Date(0),
    participants: [],
    battleParticipants: [],
    campaign: { friendlyFire: false, members: [{ role: 'dm' }] },
    ...extra,
});

const loadWith = (extra: Record<string, unknown>) =>
    loadBattle(
        {
            battleScene: { findFirst: vi.fn(async () => sceneRow(extra)) },
            battleParticipant: { findMany: vi.fn(async () => []) },
        } as unknown as BattleDb,
        { battleId: 'b1', campaignId: 'c1', userId: 'dm' }
    );

describe('loadBattle: карта бібліотеки', () => {
    beforeEach(() => {
        mocks.getPinned.mockReset();
        mocks.getPinnedTiles.mockReset();
        mocks.getPinned.mockResolvedValue({
            map: header,
            walls: ['1:1:e', '2:2:s'],
            bars: ['3:3:e'],
        });
        mocks.getPinnedTiles.mockResolvedValue({});
    });

    it('linked: ребра pinned-версії мінус видалені, mapRef і mapState окремо', async () => {
        const loaded = await loadWith({
            mapId: 'm1',
            mapVersion: 3,
            mapState: { removedEdges: ['1:1:e'], doors: {}, fog: null },
        });

        expect(mocks.getPinned).toHaveBeenCalledWith('m1', 3);
        expect(loaded?.meta.map?.walls).toEqual(['2:2:s']);
        expect(loaded?.meta.map?.bars).toEqual(['3:3:e']);
        expect(loaded?.meta.mapRef).toEqual({ mapId: 'm1', version: 3 });
        expect(loaded?.meta.mapState).toEqual({
            removedEdges: ['1:1:e'],
            doors: {},
        });
    });

    it('linked: блокувальні тайли з pinned-версії входять у карту бою', async () => {
        const cells = new Uint16Array(256);

        cells[3 * 16 + 2] = 5;

        const { encodeTileChunk } = await import(
            '@/lib/utils/battle/tiles/rle'
        );

        mocks.getPinnedTiles.mockResolvedValue({
            objects: { '0:0': encodeTileChunk(cells) },
        });

        const loaded = await loadWith({ mapId: 'm1', mapVersion: 3 });

        expect(loaded?.meta.map?.blocked).toContain('2:3');
    });

    it('linked: відсутня pinned-версія дає типізовану помилку з mapId і версією', async () => {
        mocks.getPinned.mockResolvedValue(null);

        await expect(loadWith({ mapId: 'm1', mapVersion: 3 })).rejects.toThrow(
            'battle map m1@3 is gone'
        );
    });

    it('inline: бібліотеку не чіпає, стан віднімається від власних ребер', async () => {
        const loaded = await loadWith({
            map: { ...header, walls: ['1:1:e', '4:4:e'] },
            mapId: null,
            mapVersion: null,
            mapState: { removedEdges: ['4:4:e'], doors: {}, fog: null },
        });

        expect(mocks.getPinned).not.toHaveBeenCalled();
        expect(loaded?.meta.map?.walls).toEqual(['1:1:e']);
        expect(loaded?.meta.mapRef).toBeNull();
    });

    it('inline без стану: карта без змін (те саме посилання)', async () => {
        const loaded = await loadWith({});

        expect(loaded?.meta.map).toBe(header);
        expect(loaded?.meta.mapState).toBeNull();
    });
});

const hero = createMockParticipant();

const state: BattleMapState = { removedEdges: ['1:1:e'], doors: {} };

const linkedBefore = (mapState: BattleMapState | null): LoadedBattle => ({
    scene: {
        id: 'b1',
        campaignId: 'c1',
        status: 'active',
        round: 1,
        turnIndex: 0,
        version: 1,
        eventSeq: 0,
        pendingChoice: null,
        startedAt: null,
        completedAt: null,
    },
    meta: {
        name: 'Бій',
        description: null,
        setup: [],
        friendlyFire: false,
        rules: DEFAULT_RULES,
        critChoiceByDm: false,
        map: { ...header, walls: ['2:2:s'] },
        mapRef: { mapId: 'm1', version: 3 },
        mapState,
        createdAt: new Date(),
    },
    participants: [hero],
    pending: [],
    isDM: true,
});

function fakeDb(versionExists = true) {
    const tx = {
        battleMapVersion: {
            findUnique: vi.fn(async () =>
                versionExists ? { version: 3 } : null
            ),
        },
        battleScene: { updateMany: vi.fn(async () => ({ count: 1 })) },
        battleParticipant: { createMany: vi.fn(), deleteMany: vi.fn() },
        battleEvent: {
            createMany: vi.fn(),
            updateMany: vi.fn(),
            deleteMany: vi.fn(),
        },
        battleSnapshot: { createMany: vi.fn(), deleteMany: vi.fn() },
        battleMapState: { upsert: vi.fn(), deleteMany: vi.fn() },
        $executeRaw: vi.fn(),
    };

    const db = {
        $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<void>) =>
            fn(tx)
        ),
    } as unknown as BattleDb;

    return { db, tx };
}

const outcome = (scene: object, events: object[] = []) => ({
    participants: [hero],
    pending: [],
    events: events as never,
    scene,
});

describe('saveBattle: шар карти', () => {
    it('linked: walls/bars не потрапляють у battle_scenes.map', async () => {
        const { db, tx } = fakeDb();

        await saveBattle(
            db,
            linkedBefore(null),
            outcome({ map: { ...header, walls: ['2:2:s'], bars: ['3:3:e'] } })
        );

        const { data } = (
            tx.battleScene.updateMany.mock.calls[0] as unknown as [
                { data: { map: object } },
            ]
        )[0];

        expect(data.map).toEqual(header);
    });

    it('patch.mapRef: share-лок карти, перевірка версії; зниклу версію відхиляє', async () => {
        const ref = { mapId: 'm1', version: 3 };

        const { db, tx } = fakeDb();

        await saveBattle(db, linkedBefore(null), outcome({ mapRef: ref }));

        expect(mocks.lock).toHaveBeenCalledWith(tx, 'm1', 'share');
        expect(tx.battleMapVersion.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { mapId_version: ref },
            })
        );

        const gone = fakeDb(false);

        await expect(
            saveBattle(gone.db, linkedBefore(null), outcome({ mapRef: ref }))
        ).rejects.toBeInstanceOf(BattleConflictError);
        expect(gone.tx.battleScene.updateMany).not.toHaveBeenCalled();
    });

    it('patch.mapState: upsert з bump версії; порожній — delete', async () => {
        const { db, tx } = fakeDb();

        await saveBattle(db, linkedBefore(null), outcome({ mapState: state }));

        expect(tx.battleMapState.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { battleId: 'b1' },
                create: expect.objectContaining({
                    removedEdges: ['1:1:e'],
                    version: 1,
                }),
                update: expect.objectContaining({
                    version: { increment: 1 },
                    fog: Prisma.DbNull,
                }),
            })
        );

        await saveBattle(
            db,
            linkedBefore(state),
            outcome({ mapState: { removedEdges: [], doors: {} } })
        );

        expect(tx.battleMapState.deleteMany).toHaveBeenCalledWith({
            where: { battleId: 'b1' },
        });
    });

    it('persists the fog JSON in the existing map-state row', async () => {
        const { db, tx } = fakeDb();

        const fog = {
            mode: 'reveal' as const,
            visionRadius: 8,
            revealed: [[1, 2, 5] as const],
        };

        await saveBattle(
            db,
            linkedBefore(null),
            outcome({ mapState: { removedEdges: [], doors: {}, fog } })
        );

        expect(tx.battleMapState.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                create: expect.objectContaining({ fog }),
                update: expect.objectContaining({ fog }),
            })
        );
    });

    it('без mapState у патчі таблицю стану не чіпає', async () => {
        const { db, tx } = fakeDb();

        await saveBattle(db, linkedBefore(state), outcome({ turnIndex: 0 }));

        expect(tx.battleMapState.upsert).not.toHaveBeenCalled();
        expect(tx.battleMapState.deleteMany).not.toHaveBeenCalled();
    });

    it('знімок тримає стан і mapVersion ДО дії', async () => {
        const { db, tx } = fakeDb();

        await saveBattle(
            db,
            linkedBefore(state),
            outcome({ mapState: { removedEdges: [], doors: {} } }, [
                { type: 'turn', round: 1, resultText: 'x' },
            ])
        );

        const snap = (
            tx.battleSnapshot.createMany.mock.calls[0] as unknown as [
                { data: { state: { scene: object } }[] },
            ]
        )[0].data[0].state.scene;

        expect(snap).toMatchObject({ mapState: state, mapVersion: 3 });
    });
});

describe('buildSnapshotState: шар карти', () => {
    const base = linkedBefore(null);

    it('порожній стан і inline не додають полів', () => {
        const { scene } = buildSnapshotState(
            base.scene,
            [],
            { created: [], updated: [], removed: [] },
            null,
            {
                mapState: { removedEdges: [], doors: {} },
            }
        );

        expect(scene).not.toHaveProperty('mapState');
        expect(scene).not.toHaveProperty('mapVersion');
    });
});

describe('toBattleResponse: linked', () => {
    const respond = (loaded: LoadedBattle) =>
        toBattleResponse(loaded, loaded.scene, [], [], {
            mode: 'full',
            entries: [],
        });

    it('віддає map без walls/bars, mapRef і mapState', () => {
        const res = respond(linkedBefore(state));

        expect(res.map).toEqual(header);
        expect(res.mapRef).toEqual({ mapId: 'm1', version: 3 });
        expect(res.mapState).toEqual(state);
    });

    it('inline: map як є, без mapRef/mapState', () => {
        const loaded = linkedBefore(null);

        loaded.meta.mapRef = null;

        const res = respond(loaded);

        expect(res.map).toEqual({ ...header, walls: ['2:2:s'] });
        expect(res).not.toHaveProperty('mapRef');
        expect(res).not.toHaveProperty('mapState');
    });
});
