import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/server/systems/campaign-system', () => ({
    systemSelectionOfCampaign: vi.fn(async () => null),
}));
vi.mock('@/lib/server/systems/lookup', () => ({
    systemServerOf: vi.fn(),
}));
vi.mock('@/lib/db', () => ({
    prisma: {
        character: { findMany: vi.fn() },
        unit: { findMany: vi.fn() },
    },
}));

import { API_ERRORS } from '@/lib/constants/api-errors';
import { prisma } from '@/lib/db';
import { assertParticipantSources } from '@/lib/server/battles/participant-sources';
import { systemSelectionOfCampaign } from '@/lib/server/systems/campaign-system';
import { systemServerOf } from '@/lib/server/systems/lookup';

const characters = vi.mocked(prisma.character.findMany);

const units = vi.mocked(prisma.unit.findMany);

describe('assertParticipantSources', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        characters.mockResolvedValue([]);
        units.mockResolvedValue([]);
    });

    it('персонаж своєї кампанії проходить, запит із campaignId', async () => {
        characters.mockResolvedValue([{ id: 'h1' }] as never);

        await expect(
            assertParticipantSources('c1', [{ id: 'h1', type: 'character' }])
        ).resolves.toBeUndefined();
        expect(characters).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: { in: ['h1'] }, campaignId: 'c1' },
            })
        );
    });

    it('чужий персонаж -> 404', async () => {
        await expect(
            assertParticipantSources('c1', [{ id: 'x', type: 'character' }])
        ).rejects.toMatchObject({
            status: 404,
            message: API_ERRORS.BATTLE_PARTICIPANT_SOURCE_MISSING,
        });
    });

    it('чужий юніт -> 404, запит із campaignId', async () => {
        await expect(
            assertParticipantSources('c1', [{ id: 'u9', type: 'unit' }])
        ).rejects.toMatchObject({ status: 404 });
        expect(units).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: { in: ['u9'] }, campaignId: 'c1' },
            })
        );
    });

    it('id із known не запитується і не кидає', async () => {
        await expect(
            assertParticipantSources(
                'c1',
                [
                    { id: 'old', type: 'character' },
                    { id: 'oldu', type: 'unit' },
                ],
                new Set(['old', 'oldu'])
            )
        ).resolves.toBeUndefined();
        expect(characters).not.toHaveBeenCalled();
        expect(units).not.toHaveBeenCalled();
    });

    it('a system join guard rejects the character with 409', async () => {
        characters.mockResolvedValue([
            { id: 'h1', characteristics: {} },
        ] as never);
        vi.mocked(systemSelectionOfCampaign).mockResolvedValueOnce({ key: 'x' });
        vi.mocked(systemServerOf).mockReturnValueOnce({
            participant: { joinGuards: [() => 'errors.guarded'] },
        } as never);

        await expect(
            assertParticipantSources('c1', [{ id: 'h1', type: 'character' }])
        ).rejects.toMatchObject({ status: 409, message: 'errors.guarded' });
    });

    it('without a system or guards the character passes', async () => {
        characters.mockResolvedValue([{ id: 'h1' }] as never);

        await expect(
            assertParticipantSources('c1', [{ id: 'h1', type: 'character' }])
        ).resolves.toBeUndefined();
    });
});
