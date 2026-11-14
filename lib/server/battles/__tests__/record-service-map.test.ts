import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    assert: vi.fn(),
    create: vi.fn(async () => ({ id: 'b1' })),
    update: vi.fn(async () => ({})),
    findUnique: vi.fn(),
    getMapMeta: vi.fn(),
    getMap: vi.fn(),
    deleteState: vi.fn(async () => ({})),
    lock: vi.fn(async () => undefined),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
    prisma: {
        battleScene: {
            create: mocks.create,
            update: mocks.update,
            findUnique: mocks.findUnique,
        },
        $transaction: async (fn: (tx: unknown) => unknown) =>
            fn({
                battleScene: { create: mocks.create, update: mocks.update },
                battleMapState: { deleteMany: mocks.deleteState },
            }),
    },
}));
vi.mock('@/lib/server/battle-maps/library-service', () => ({
    getMapMeta: mocks.getMapMeta,
    getMap: mocks.getMap,
    lockMapRow: mocks.lock,
}));
vi.mock('@/lib/server/battles/participant-sources', async (orig) => ({
    ...(await orig<
        typeof import('@/lib/server/battles/participant-sources')
    >()),
    assertParticipantSources: mocks.assert,
}));

import { API_ERRORS } from '@/lib/constants/api-errors';
import { writeBattleRecord } from '@/lib/server/battles/record-service';

const header = { cols: 20, rows: 10, background: null, opacity: 0.3 };

const size = { cols: 20, rows: 10 };

const create = (mapId: string) =>
    writeBattleRecord(
        'c1',
        'u1',
        'create',
        undefined,
        { name: 'B', participants: [], mapId },
        undefined,
        true
    );

describe('writeBattleRecord: create з mapId', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.assert.mockResolvedValue(undefined);
    });

    it('копіює шапку, пише map_id і поточну версію', async () => {
        mocks.getMapMeta.mockResolvedValue({
            campaignId: 'c1',
            version: 4,
            ...size,
            header,
        });

        await create('m1');

        expect(mocks.lock).toHaveBeenCalledWith(
            expect.anything(),
            'm1',
            'share'
        );
        expect(mocks.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                map: header,
                mapId: 'm1',
                mapVersion: 4,
            }),
        });
    });

    it('чужа кампанія або відсутня карта -> 404', async () => {
        mocks.getMapMeta.mockResolvedValue({
            campaignId: 'other',
            version: 1,
            ...size,
            header,
        });

        await expect(create('m1')).rejects.toMatchObject({
            status: 404,
            message: API_ERRORS.BATTLE_MAP_NOT_FOUND,
        });

        mocks.getMapMeta.mockResolvedValue(null);

        await expect(create('m1')).rejects.toMatchObject({ status: 404 });
        expect(mocks.create).not.toHaveBeenCalled();
    });

    it('карта більша за battleMaxSide -> 422', async () => {
        mocks.getMapMeta.mockResolvedValue({
            campaignId: 'c1',
            version: 1,
            cols: 61,
            rows: 10,
            header: { ...header, cols: 61 },
        });

        await expect(create('m1')).rejects.toMatchObject({
            status: 422,
            message: API_ERRORS.BATTLE_MAP_TOO_LARGE,
        });
    });
});

describe('writeBattleRecord: create з map і mapId разом', () => {
    it('відхиляється схемою, нічого не створює', async () => {
        await expect(
            writeBattleRecord(
                'c1',
                'u1',
                'create',
                undefined,
                {
                    name: 'B',
                    participants: [],
                    mapId: 'm1',
                    map: header,
                },
                undefined,
                true
            )
        ).rejects.toMatchObject({ status: 400 });
        expect(mocks.create).not.toHaveBeenCalled();
    });
});

describe('writeBattleRecord: patch linked-бою', () => {
    const patch = (map: unknown) =>
        writeBattleRecord('c1', 'u1', 'patch', 'b1', { map }, undefined, true);

    const row = {
        id: 'b1',
        campaignId: 'c1',
        version: 2,
        participants: [],
        mapId: 'm1',
        mapVersion: 4,
        map: { ...header, blocked: ['0:0'] },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.findUnique.mockResolvedValue(row);
    });

    it('клієнтська шапка не змінює розміри й blocked закріпленої', async () => {
        await patch({
            cols: 50,
            rows: 50,
            background: null,
            opacity: 0.9,
            blocked: [],
        });

        expect(mocks.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    map: expect.objectContaining({
                        cols: 20,
                        rows: 10,
                        blocked: ['0:0'],
                        opacity: 0.9,
                    }),
                }),
            })
        );
    });

    it('map: null знімає mapId і mapVersion', async () => {
        await patch(null);

        expect(mocks.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    mapId: null,
                    mapVersion: null,
                }),
            })
        );
    });
});

describe('writeBattleRecord: patch mapId (перепривʼязка)', () => {
    const patch = (body: unknown) =>
        writeBattleRecord('c1', 'u1', 'patch', 'b1', body, undefined, true);

    const row = (over: Record<string, unknown> = {}) => ({
        id: 'b1',
        campaignId: 'c1',
        version: 2,
        status: 'prepared',
        participants: [],
        mapId: 'm1',
        mapVersion: 4,
        map: {
            ...header,
            weather: 'rain',
            terrain: { '0:0': { kind: 'hazard' } },
        },
        ...over,
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.findUnique.mockResolvedValue(row());
    });

    it('активний бій -> 409', async () => {
        mocks.findUnique.mockResolvedValue(row({ status: 'active' }));

        await expect(patch({ mapId: 'm2' })).rejects.toMatchObject({
            status: 409,
            message: API_ERRORS.BATTLE_MAP_RELINK_STARTED,
        });
        expect(mocks.update).not.toHaveBeenCalled();
    });

    it('інша карта: нова шапка й версія, стан видалено, terrain скинуто, weather лишився', async () => {
        mocks.getMapMeta.mockResolvedValue({
            campaignId: 'c1',
            version: 7,
            ...size,
            header: { ...header, opacity: 0.8 },
        });

        await patch({ mapId: 'm2' });

        expect(mocks.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    map: { ...header, opacity: 0.8, weather: 'rain' },
                    mapId: 'm2',
                    mapVersion: 7,
                }),
            })
        );
        expect(mocks.deleteState).toHaveBeenCalledWith({
            where: { battleId: 'b1' },
        });
    });

    it('чужа кампанія -> 404', async () => {
        mocks.getMapMeta.mockResolvedValue({
            campaignId: 'other',
            version: 1,
            ...size,
            header,
        });

        await expect(patch({ mapId: 'm2' })).rejects.toMatchObject({
            status: 404,
        });
    });

    it('та сама карта: тристороннє злиття зберігає місцевість з бою', async () => {
        mocks.getMapMeta.mockResolvedValue({
            campaignId: 'c1',
            version: 5,
            ...size,
            header: { ...header, opacity: 0.9 },
        });
        mocks.getMap.mockResolvedValue({ map: header });

        await patch({ mapId: 'm1' });

        expect(mocks.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    map: expect.objectContaining({
                        opacity: 0.9,
                        weather: 'rain',
                        terrain: { '0:0': { kind: 'hazard' } },
                    }),
                    mapVersion: 5,
                }),
            })
        );
        expect(mocks.deleteState).not.toHaveBeenCalled();
    });

    it('null: ребра pinned-версії стають inline, привʼязка знята', async () => {
        mocks.getMap.mockResolvedValue({
            map: header,
            walls: ['1:1:e'],
            bars: ['2:2:s'],
        });

        await patch({ mapId: null });

        expect(mocks.getMap).toHaveBeenCalledWith('m1', 4);
        expect(mocks.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    map: expect.objectContaining({
                        walls: ['1:1:e'],
                        bars: ['2:2:s'],
                    }),
                    mapId: null,
                    mapVersion: null,
                }),
            })
        );
    });

    it('null: забагато ребер -> 422', async () => {
        mocks.getMap.mockResolvedValue({
            map: header,
            walls: Array.from({ length: 7201 }, (_, i) => `${i}:0:e`),
            bars: [],
        });

        await expect(patch({ mapId: null })).rejects.toMatchObject({
            status: 422,
            message: API_ERRORS.BATTLE_MAP_TOO_MANY_EDGES,
        });
    });

    it('map разом із mapId -> 400', async () => {
        await expect(patch({ mapId: 'm2', map: header })).rejects.toMatchObject(
            { status: 400 }
        );
    });
});
