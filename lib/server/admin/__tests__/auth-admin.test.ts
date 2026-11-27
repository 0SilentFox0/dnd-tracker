import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const m = vi.hoisted(() => ({
    queryRaw: vi.fn(),
    executeRaw: vi.fn(),
    createAdminClient: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
    prisma: { $queryRaw: m.queryRaw, $executeRaw: m.executeRaw },
}));
vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: m.createAdminClient,
}));

import {
    AdminAuthUnavailableError,
    banUser,
    signOutUser,
    unbanUser,
} from '@/lib/server/admin/auth-admin';

const client = (error: unknown = null) => {
    const updateUserById = vi.fn().mockResolvedValue({ error });

    return { updateUserById, client: { auth: { admin: { updateUserById } } } };
};

describe('auth-admin', () => {
    beforeEach(() => {
        Object.values(m).forEach((f) => f.mockReset());
        m.queryRaw.mockResolvedValue([{ ok: true }]);
    });

    it('ban sets ban_duration and drops sessions', async () => {
        const c = client();

        await banUser('u1', 168, { client: c.client });

        expect(c.updateUserById).toHaveBeenCalledWith('u1', {
            ban_duration: '168h',
        });
        expect(m.executeRaw).toHaveBeenCalledTimes(1);
    });

    it('unban clears the ban', async () => {
        const c = client();

        await unbanUser('u1', { client: c.client });

        expect(c.updateUserById).toHaveBeenCalledWith('u1', {
            ban_duration: 'none',
        });
    });

    it('a Supabase error becomes AdminAuthUnavailableError and skips sign-out', async () => {
        const c = client({ message: 'x' });

        await expect(
            banUser('u1', 24, { client: c.client })
        ).rejects.toBeInstanceOf(AdminAuthUnavailableError);
        expect(m.executeRaw).not.toHaveBeenCalled();
    });

    it('missing env becomes AdminAuthUnavailableError', async () => {
        m.createAdminClient.mockImplementation(() => {
            throw new Error('Missing env');
        });

        await expect(unbanUser('u1')).rejects.toBeInstanceOf(
            AdminAuthUnavailableError
        );
    });

    it('signOut is a no-op without auth.sessions', async () => {
        m.queryRaw.mockResolvedValue([{ ok: false }]);

        await expect(signOutUser('u1')).resolves.toBeUndefined();
        expect(m.executeRaw).not.toHaveBeenCalled();
    });
});
