import { beforeEach, describe, expect, it, vi } from 'vitest';

const findMany = vi.fn();

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
    prisma: { campaignMember: { findMany: (a: unknown) => findMany(a) } },
}));

import { listCopyTargets, resolveTargets } from '@/lib/server/content/copy/targets';

const m = (id: string, kind = 'campaign') => ({
    campaign: { id, name: `N${id}`, kind },
});

beforeEach(() => {
    findMany.mockReset();
    findMany.mockResolvedValue([m('a'), m('src'), m('demo', 'demo'), m('b')]);
});

describe('copy targets', () => {
    it('queries only DM memberships of the user', async () => {
        await listCopyTargets('u1', 'src');

        expect(findMany.mock.calls[0][0].where).toMatchObject({
            userId: 'u1',
            role: 'dm',
        });
    });

    it('all excludes source and demo campaigns', async () => {
        const r = await resolveTargets({
            userId: 'u1',
            sourceCampaignId: 'src',
            targets: { all: true },
        });

        expect(r.map((c) => c.id)).toEqual(['a', 'b']);
    });

    it('rejects an id the user does not manage', async () => {
        await expect(
            resolveTargets({
                userId: 'u1',
                sourceCampaignId: 'src',
                targets: { campaignIds: ['a', 'foreign'] },
            })
        ).rejects.toMatchObject({ status: 403 });
    });

    it('allows an empty result for all', async () => {
        findMany.mockResolvedValue([]);

        await expect(
            resolveTargets({
                userId: 'u1',
                sourceCampaignId: 'src',
                targets: { all: true },
            })
        ).resolves.toEqual([]);
    });

    it('resolves explicit ids', async () => {
        const r = await resolveTargets({
            userId: 'u1',
            sourceCampaignId: 'src',
            targets: { campaignIds: ['b'] },
        });

        expect(r).toEqual([{ id: 'b', name: 'Nb' }]);
    });
});
