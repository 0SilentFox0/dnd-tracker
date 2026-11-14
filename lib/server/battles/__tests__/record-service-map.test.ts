import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    assert: vi.fn(),
    create: vi.fn(async () => ({ id: 'b1' })),
    update: vi.fn(async () => ({})),
    findUnique: vi.fn(),
    getMap: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
    prisma: {
        battleScene: {
            create: mocks.create,
            update: mocks.update,
            findUnique: mocks.findUnique,
        },
    },
}));
vi.mock('@/lib/server/battle-maps/library-service', () => ({
    getMap: mocks.getMap,
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
        mocks.getMap.mockResolvedValue({
            campaignId: 'c1',
            version: 4,
            map: header,
        });

        await create('m1');

        expect(mocks.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                map: header,
                mapId: 'm1',
                mapVersion: 4,
            }),
        });
    });

    it('чужа кампанія або відсутня карта -> 404', async () => {
        mocks.getMap.mockResolvedValue({
            campaignId: 'other',
            version: 1,
            map: header,
        });

        await expect(create('m1')).rejects.toMatchObject({
            status: 404,
            message: API_ERRORS.BATTLE_MAP_NOT_FOUND,
        });

        mocks.getMap.mockResolvedValue(null);

        await expect(create('m1')).rejects.toMatchObject({ status: 404 });
        expect(mocks.create).not.toHaveBeenCalled();
    });

    it('карта більша за battleMaxSide -> 422', async () => {
        mocks.getMap.mockResolvedValue({
            campaignId: 'c1',
            version: 1,
            map: { ...header, cols: 61 },
        });

        await expect(create('m1')).rejects.toMatchObject({
            status: 422,
            message: API_ERRORS.BATTLE_MAP_TOO_LARGE,
        });
    });
});
