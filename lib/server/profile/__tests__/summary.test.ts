import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getProfileSummary } from '../summary';

const db = vi.hoisted(() => ({
    memberCount: vi.fn(),
    characterCount: vi.fn(),
    aggregate: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
    prisma: {
        campaignMember: { count: db.memberCount },
        character: { count: db.characterCount },
        campaign: { aggregate: db.aggregate },
    },
}));

const live = { status: 'active', kind: 'campaign' };

beforeEach(() => {
    vi.clearAllMocks();
    db.memberCount.mockResolvedValue(3);
    db.characterCount.mockResolvedValue(2);
    db.aggregate.mockResolvedValue({
        _max: { updatedAt: new Date('2026-11-20T10:00:00.000Z') },
    });
});

describe('getProfileSummary', () => {
    it('passes the live-campaign filters to Prisma', async () => {
        await getProfileSummary('u1');

        expect(db.memberCount).toHaveBeenCalledWith({
            where: { userId: 'u1', campaign: live },
        });
        expect(db.characterCount).toHaveBeenCalledWith({
            where: {
                controlledBy: 'u1',
                type: 'player',
                status: 'active',
                campaign: live,
            },
        });
        expect(db.aggregate).toHaveBeenCalledWith({
            where: { members: { some: { userId: 'u1' } }, ...live },
            _max: { updatedAt: true },
        });
    });

    it('returns counts and an ISO last activity', async () => {
        await expect(getProfileSummary('u1')).resolves.toEqual({
            campaigns: 3,
            characters: 2,
            lastActivity: '2026-11-20T10:00:00.000Z',
        });
    });

    it('returns null last activity when there are no campaigns', async () => {
        db.aggregate.mockResolvedValue({ _max: { updatedAt: null } });

        const result = await getProfileSummary('u1');

        expect(result.lastActivity).toBeNull();
    });
});
