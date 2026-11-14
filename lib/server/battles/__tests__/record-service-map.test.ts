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
