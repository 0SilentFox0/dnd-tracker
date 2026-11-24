import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSessionUserId } = vi.hoisted(() => ({
    getSessionUserId: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getSessionUserId }));
vi.mock('@/lib/utils/api/platform-admin', () => ({
    isPlatformAdmin: (id: string) => id === 'owner',
}));

import { requirePlatformAdmin } from '../require-platform-admin';

beforeEach(() => getSessionUserId.mockReset());

describe('requirePlatformAdmin', () => {
    it('passes the owner', async () => {
        getSessionUserId.mockResolvedValue('owner');

        expect(await requirePlatformAdmin()).toEqual({ userId: 'owner' });
    });

    it('returns 404 for another user', async () => {
        getSessionUserId.mockResolvedValue('other');

        const res = await requirePlatformAdmin();

        expect('status' in res && res.status).toBe(404);
    });

    it('returns 404 without a session', async () => {
        getSessionUserId.mockResolvedValue(null);

        const res = await requirePlatformAdmin();

        expect('status' in res && res.status).toBe(404);
    });
});
