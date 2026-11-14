import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    assert: vi.fn(),
    create: vi.fn(async () => ({ id: 'b1' })),
    update: vi.fn(async () => ({})),
    findUnique: vi.fn(),
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
vi.mock('@/lib/server/battles/participant-sources', async (orig) => ({
    ...(await orig<
        typeof import('@/lib/server/battles/participant-sources')
    >()),
    assertParticipantSources: mocks.assert,
}));

import { API_ERRORS } from '@/lib/constants/api-errors';
import { writeBattleRecord } from '@/lib/server/battles/record-service';
import { ContentError } from '@/lib/server/content/errors';

const participants = [{ id: 'foreign', type: 'character', side: 'ally' }];

describe('writeBattleRecord: джерела учасників', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.assert.mockResolvedValue(undefined);
        mocks.findUnique.mockResolvedValue({
            id: 'b1',
            version: 1,
            campaignId: 'c1',
            participants: [{ id: 'old', type: 'character', side: 'ally' }],
            map: null,
        });
    });

    it('create з чужим id -> 404, запис не створено', async () => {
        mocks.assert.mockRejectedValue(
            new ContentError(API_ERRORS.BATTLE_PARTICIPANT_SOURCE_MISSING, 404)
        );

        await expect(
            writeBattleRecord(
                'c1',
                'u1',
                'create',
                undefined,
                { name: 'B', participants },
                undefined,
                true
            )
        ).rejects.toMatchObject({ status: 404 });
        expect(mocks.create).not.toHaveBeenCalled();
    });

    it('patch: відомі id передаються як known, новий чужий -> 404', async () => {
        mocks.assert.mockRejectedValue(
            new ContentError(API_ERRORS.BATTLE_PARTICIPANT_SOURCE_MISSING, 404)
        );

        await expect(
            writeBattleRecord(
                'c1',
                'u1',
                'patch',
                'b1',
                { participants },
                undefined,
                true
            )
        ).rejects.toMatchObject({ status: 404 });
        expect(mocks.assert).toHaveBeenCalledWith(
            'c1',
            expect.any(Array),
            new Set(['old'])
        );
        expect(mocks.update).not.toHaveBeenCalled();
    });

    it('patch зі старим id проходить', async () => {
        await writeBattleRecord(
            'c1',
            'u1',
            'patch',
            'b1',
            { participants: [{ ...participants[0], id: 'old' }] },
            undefined,
            true
        );

        expect(mocks.update).toHaveBeenCalled();
    });
});
