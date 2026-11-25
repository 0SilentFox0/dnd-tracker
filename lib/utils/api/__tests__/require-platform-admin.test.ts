import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getAuthUserOptional } = vi.hoisted(() => ({
    getAuthUserOptional: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getAuthUserOptional }));
vi.mock('@/lib/utils/api/ops-access', () => ({
    isOpsAdmin: (u: { id: string }) => u.id === 'owner',
}));

import { requirePlatformAdmin } from '../require-platform-admin';

beforeEach(() => getAuthUserOptional.mockReset());

describe('requirePlatformAdmin', () => {
    it('passes the owner', async () => {
        getAuthUserOptional.mockResolvedValue({ id: 'owner', email: null });

        expect(await requirePlatformAdmin()).toEqual({ userId: 'owner' });
    });

    it('returns 404 for another user', async () => {
        getAuthUserOptional.mockResolvedValue({ id: 'other', email: null });

        const res = await requirePlatformAdmin();

        expect('status' in res && res.status).toBe(404);
    });

    it('returns 404 without a session', async () => {
        getAuthUserOptional.mockResolvedValue(null);

        const res = await requirePlatformAdmin();

        expect('status' in res && res.status).toBe(404);
    });
});
