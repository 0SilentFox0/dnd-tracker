import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
    battleScene: {
        findFirst: vi.fn(),
        create: vi.fn(),
        deleteMany: vi.fn(),
    },
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: db }));

import { cleanupDemoBattleCopies, resolveDemoBattleId } from '../demo-copy';

const args = { campaignId: 'c1', battleId: 'tpl', userId: 'u1' };

const template = {
    id: 'tpl',
    name: 'Ambush',
    description: null,
    participants: [],
    map: null,
    audio: null,
    rules: null,
    mapId: null,
    mapVersion: null,
    turnTimerSeconds: null,
};

beforeEach(() => vi.clearAllMocks());

describe('resolveDemoBattleId', () => {
    it('ignores non-demo campaigns', async () => {
        db.battleScene.findFirst.mockResolvedValueOnce({
            id: 'tpl',
            ownerUserId: null,
            sourceBattleId: null,
            campaign: { kind: 'campaign' },
        });

        expect(await resolveDemoBattleId(args)).toBeNull();
        expect(db.battleScene.create).not.toHaveBeenCalled();
    });

    it('keeps the visitor on their own copy', async () => {
        db.battleScene.findFirst.mockResolvedValueOnce({
            id: 'tpl',
            ownerUserId: 'u1',
            sourceBattleId: 'src',
            campaign: { kind: 'demo' },
        });

        expect(await resolveDemoBattleId(args)).toBe('tpl');
    });

    it('creates a private copy of the template when none exists', async () => {
        db.battleScene.findFirst
            .mockResolvedValueOnce({
                id: 'tpl',
                ownerUserId: null,
                sourceBattleId: null,
                campaign: { kind: 'demo' },
            })
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(template);
        db.battleScene.create.mockResolvedValue({ id: 'copy' });

        expect(await resolveDemoBattleId(args)).toBe('copy');
        expect(db.battleScene.create.mock.calls[0][0].data).toMatchObject({
            ownerUserId: 'u1',
            sourceBattleId: 'tpl',
            status: 'prepared',
        });
    });

    it('sends a visitor on someone else’s copy to their own', async () => {
        db.battleScene.findFirst
            .mockResolvedValueOnce({
                id: 'theirs',
                ownerUserId: 'u2',
                sourceBattleId: 'tpl',
                campaign: { kind: 'demo' },
            })
            .mockResolvedValueOnce({ id: 'mine' });

        expect(await resolveDemoBattleId({ ...args, battleId: 'theirs' })).toBe(
            'mine'
        );
        expect(db.battleScene.findFirst.mock.calls[1][0].where).toMatchObject({
            ownerUserId: 'u1',
            sourceBattleId: 'tpl',
        });
    });
});

describe('cleanupDemoBattleCopies', () => {
    it('deletes only owned copies older than the TTL', async () => {
        db.battleScene.deleteMany.mockResolvedValue({ count: 3 });

        expect(await cleanupDemoBattleCopies(new Date('2026-11-20'))).toEqual({
            copies: 3,
        });

        const where = db.battleScene.deleteMany.mock.calls[0][0].where;

        expect(where.ownerUserId).toEqual({ not: null });
        expect(where.createdAt.lt).toEqual(new Date('2026-11-19'));
    });
});
