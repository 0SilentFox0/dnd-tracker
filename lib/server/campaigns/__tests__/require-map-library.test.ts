import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
    redirect: vi.fn((to: string) => {
        throw new Error(`redirect:${to}`);
    }),
    findUnique: vi.fn(),
}));

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/lib/auth', () => ({
    getAuthUser: vi.fn(async () => ({ id: 'u1' })),
}));
vi.mock('@/lib/db', () => ({
    prisma: { campaign: { findUnique: mocks.findUnique } },
}));

import { requireMapLibrary } from '../access';

const campaign = (mapLibraryEnabled: boolean, role = 'dm') => ({
    id: 'c1',
    kind: 'CAMPAIGN',
    mapLibraryEnabled,
    members: [{ userId: 'u1', role }],
});

describe('requireMapLibrary', () => {
    beforeEach(() => vi.clearAllMocks());

    it('redirects to the campaign when the flag is off', async () => {
        mocks.findUnique.mockResolvedValue(campaign(false));

        await expect(requireMapLibrary('c1')).rejects.toThrow(
            'redirect:/campaigns/c1'
        );
    });

    it('passes a DM when the flag is on', async () => {
        mocks.findUnique.mockResolvedValue(campaign(true));

        expect((await requireMapLibrary('c1')).userId).toBe('u1');
        expect(mocks.redirect).not.toHaveBeenCalled();
    });

    it('redirects a player even when the flag is on', async () => {
        mocks.findUnique.mockResolvedValue(campaign(true, 'player'));

        await expect(requireMapLibrary('c1')).rejects.toThrow(
            'redirect:/campaigns/c1'
        );
    });
});
