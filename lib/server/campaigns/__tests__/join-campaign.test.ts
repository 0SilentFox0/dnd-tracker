import { beforeEach, describe, expect, it, vi } from 'vitest';

import { API_ERRORS } from '@/lib/constants/api-errors';

const db = vi.hoisted(() => ({
    campaign: { findUnique: vi.fn() },
    campaignMember: { create: vi.fn() },
}));

vi.mock('@/lib/db', () => ({ prisma: db }));
vi.mock('@/lib/cache/campaign-list', () => ({
    invalidateCampaignLists: vi.fn(),
}));
vi.mock('@/lib/server/users/db-user', () => ({
    ensureDbUser: vi.fn(),
    PUBLIC_USER_SELECT: {},
}));

import { getJoinPreview, joinCampaignByCode } from '../join-campaign';

const campaign = (over: Record<string, unknown> = {}) => ({
    id: 'c1',
    name: 'Zorya',
    kind: 'campaign',
    status: 'active',
    dmUserId: 'dm',
    members: [
        { userId: 'dm', role: 'dm', user: { displayName: 'Master' } },
    ],
    ...over,
});

beforeEach(() => vi.clearAllMocks());

describe('joinCampaignByCode', () => {
    it('looks the code up uppercase with an exact match', async () => {
        db.campaign.findUnique.mockResolvedValue(campaign());
        db.campaignMember.create.mockResolvedValue({ id: 'm1' });

        const result = await joinCampaignByCode('u1', {} as never, 'ab3k9z');

        expect(result.ok).toBe(true);
        expect(db.campaign.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({ where: { inviteCode: 'AB3K9Z' } })
        );
    });

    it('still finds legacy codes with 0 and O', async () => {
        db.campaign.findUnique.mockResolvedValue(campaign());
        db.campaignMember.create.mockResolvedValue({ id: 'm1' });

        await joinCampaignByCode('u1', {} as never, 'o0o0o0');

        expect(db.campaign.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({ where: { inviteCode: 'O0O0O0' } })
        );
    });
});

describe('getJoinPreview', () => {
    it('returns member for a member and for the DM', async () => {
        db.campaign.findUnique.mockResolvedValue(campaign());

        expect(await getJoinPreview('dm', 'X')).toEqual({
            kind: 'member',
            campaignId: 'c1',
        });
    });

    it('returns the campaign card for a new user', async () => {
        db.campaign.findUnique.mockResolvedValue(campaign());

        expect(await getJoinPreview('u1', 'x')).toEqual({
            kind: 'joinable',
            campaign: { id: 'c1', name: 'Zorya', dmName: 'Master' },
        });
    });

    it.each([
        [null, API_ERRORS.CAMPAIGN_NOT_FOUND],
        [campaign({ kind: 'template' }), API_ERRORS.TEMPLATE_NOT_JOINABLE],
        [campaign({ kind: 'demo' }), API_ERRORS.DEMO_NOT_JOINABLE],
        [campaign({ status: 'archived' }), API_ERRORS.CAMPAIGN_NOT_ACTIVE],
    ])('rejects %#', async (found, error) => {
        db.campaign.findUnique.mockResolvedValue(found);

        expect(await getJoinPreview('u1', 'X')).toMatchObject({
            ok: false,
            error,
        });
    });
});
