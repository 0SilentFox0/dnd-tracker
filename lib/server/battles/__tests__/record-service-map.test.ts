import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    assert: vi.fn(),
    create: vi.fn(async () => ({ id: 'b1' })),
    update: vi.fn(async () => ({})),
    findUnique: vi.fn(),
    getMapMeta: vi.fn(),
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
            fn({ battleScene: { create: mocks.create } }),
    },
}));
vi.mock('@/lib/server/battle-maps/library-service', () => ({
    getMapMeta: mocks.getMapMeta,
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
