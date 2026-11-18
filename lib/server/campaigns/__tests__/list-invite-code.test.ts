import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ campaign: { findMany: vi.fn() } }));

vi.mock('@/lib/db', () => ({ prisma: db }));

import { listUserCampaigns } from '../read-campaign';

const campaign = (id: string, role: 'dm' | 'player') => ({
    id,
    name: id,
    inviteCode: `code-${id}`,
    members: [{ userId: 'u1', role }],
});

beforeEach(() => vi.clearAllMocks());

describe('listUserCampaigns', () => {
    it('keeps the invite code only for campaigns the user is DM of', async () => {
        db.campaign.findMany.mockResolvedValue([
            campaign('mine', 'dm'),
            campaign('joined', 'player'),
        ]);

        const [mine, joined] = await listUserCampaigns('u1');

        expect(mine).toMatchObject({ inviteCode: 'code-mine' });
        expect(joined).not.toHaveProperty('inviteCode');
        expect(joined.name).toBe('joined');
    });
});
