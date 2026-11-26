import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getProfileSummary } from '../summary';

const db = vi.hoisted(() => ({
    memberCount: vi.fn(),
    characterCount: vi.fn(),
    aggregate: vi.fn(),
    memberFind: vi.fn(),
    characterFind: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
    prisma: {
        campaignMember: { count: db.memberCount, findMany: db.memberFind },
        character: { count: db.characterCount, findMany: db.characterFind },
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
    db.memberFind.mockResolvedValue([]);
    db.characterFind.mockResolvedValue([]);
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
            recentCampaigns: [],
            recentCharacters: [],
        });
    });

    it('limits and orders the recent lists with the same filters', async () => {
        await getProfileSummary('u1');

        expect(db.memberFind).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { userId: 'u1', campaign: live },
                orderBy: { campaign: { updatedAt: 'desc' } },
                take: 5,
            })
        );
        expect(db.characterFind).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    controlledBy: 'u1',
                    type: 'player',
                    status: 'active',
                    campaign: live,
                },
                orderBy: { updatedAt: 'desc' },
                take: 6,
            })
        );
    });

    it('maps recent campaigns and heroes to plain props', async () => {
        db.memberFind.mockResolvedValue([
            {
                role: 'dm',
                campaign: {
                    id: 'c1',
                    name: 'Camp',
                    updatedAt: new Date('2026-11-20T10:00:00.000Z'),
                },
            },
        ]);
        db.characterFind.mockResolvedValue([
            {
                id: 'h1',
                name: 'Hero',
                level: 4,
                class: 'Wizard',
                avatar: null,
                campaignId: 'c1',
                campaign: { name: 'Camp' },
            },
        ]);

        const result = await getProfileSummary('u1');

        expect(result.recentCampaigns).toEqual([
            {
                id: 'c1',
                name: 'Camp',
                role: 'dm',
                updatedAt: '2026-11-20T10:00:00.000Z',
            },
        ]);
        expect(result.recentCharacters[0]).toMatchObject({
            id: 'h1',
            className: 'Wizard',
            campaignName: 'Camp',
        });
    });

    it('returns null last activity when there are no campaigns', async () => {
        db.aggregate.mockResolvedValue({ _max: { updatedAt: null } });

        const result = await getProfileSummary('u1');

        expect(result.lastActivity).toBeNull();
    });
});
