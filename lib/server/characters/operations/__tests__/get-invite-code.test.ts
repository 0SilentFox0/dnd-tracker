import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    character: { findUnique: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: h }));
vi.mock('@/lib/utils/api/api-auth', () => ({ requireAuth: vi.fn() }));

import { getOperation } from '../get';

const row = (role: 'dm' | 'player') => ({
    id: 'ch1',
    campaignId: 'camp',
    controlledBy: 'p1',
    notes: 'private',
    knownSpells: [],
    campaign: {
        id: 'camp',
        name: 'Camp',
        inviteCode: 'SECRET',
        members: [{ userId: 'u', role }],
    },
});

const read = () =>
    getOperation.run(
        { userId: 'u', campaignId: 'camp' },
        { characterId: 'ch1' }
    ) as Promise<{ campaign: Record<string, unknown> }>;

beforeEach(() => vi.clearAllMocks());

describe('get character: inviteCode', () => {
    it('shows the invite code to the DM', async () => {
        h.character.findUnique.mockResolvedValue({
            ...row('dm'),
            controlledBy: 'other',
        });

        expect((await read()).campaign.inviteCode).toBe('SECRET');
    });

    it('hides the invite code from the owning player', async () => {
        h.character.findUnique.mockResolvedValue({
            ...row('player'),
            controlledBy: 'u',
        });

        const { campaign } = await read();

        expect(campaign).not.toHaveProperty('inviteCode');
        expect(campaign.name).toBe('Camp');
    });
});
