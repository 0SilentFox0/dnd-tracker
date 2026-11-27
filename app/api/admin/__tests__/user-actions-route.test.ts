import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const m = vi.hoisted(() => ({
    requireAdmin: vi.fn(),
    findUser: vi.fn(),
    log: vi.fn(),
    banUser: vi.fn(),
    unbanUser: vi.fn(),
    signOutUser: vi.fn(),
    deleteAccount: vi.fn(),
    deleteAuthUser: vi.fn(),
    assertAuth: vi.fn(),
}));

vi.mock('@/lib/utils/api/require-platform-admin', () => ({
    requirePlatformAdmin: m.requireAdmin,
}));
vi.mock('@/lib/db', () => ({ prisma: { user: { findUnique: m.findUser } } }));
vi.mock('@/lib/server/admin/admin-actions', () => ({ logAdminAction: m.log }));
vi.mock('@/lib/server/admin/auth-admin', () => {
    class AdminAuthUnavailableError extends Error {}

    return {
        AdminAuthUnavailableError,
        banUser: m.banUser,
        unbanUser: m.unbanUser,
        signOutUser: m.signOutUser,
        deleteAuthUser: m.deleteAuthUser,
        assertAuthAdminAvailable: m.assertAuth,
    };
});
vi.mock('@/lib/server/account/delete-account', () => ({
    deleteAccount: m.deleteAccount,
}));
vi.mock('@/lib/utils/api/translate-error', async () => {
    const { NextResponse: R } = await import('next/server');

    return {
        apiErrorJson: (
            { error, ...rest }: Record<string, unknown>,
            init?: ResponseInit
        ) => R.json({ error, ...rest }, init),
    };
});

import { POST as ban } from '@/app/api/admin/users/[id]/ban/route';
import { DELETE } from '@/app/api/admin/users/[id]/route';
import { POST as signout } from '@/app/api/admin/users/[id]/signout/route';
import { POST as unban } from '@/app/api/admin/users/[id]/unban/route';
import { AccountDeleteBlockedError } from '@/lib/server/account/template-guard';
import { AdminAuthUnavailableError } from '@/lib/server/admin/auth-admin';

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

const req = (method: string, body?: unknown) =>
    new Request('http://localhost/api/admin/users/u1', {
        method,
        body: body === undefined ? undefined : JSON.stringify(body),
    });

const calls = {
    ban: (id: string) => ban(req('POST', { hours: 168 }), ctx(id)),
    unban: (id: string) => unban(req('POST'), ctx(id)),
    signout: (id: string) => signout(req('POST'), ctx(id)),
    delete: (id: string) =>
        DELETE(req('DELETE', { email: 'u1@example.test' }), ctx(id)),
};

describe('admin user actions', () => {
    beforeEach(() => {
        Object.values(m).forEach((f) => f.mockReset());
        m.requireAdmin.mockResolvedValue({ userId: 'owner' });
        m.findUser.mockResolvedValue({ id: 'u1', email: 'u1@example.test' });
        m.banUser.mockResolvedValue({ signedOut: true });
    });

    it.each(Object.keys(calls) as (keyof typeof calls)[])(
        '%s on self is 400 and does nothing',
        async (name) => {
            const res = await calls[name]('owner');

            expect(res.status).toBe(400);
            expect((await res.json()).error).toBe('errors.adminSelfAction');
            expect(m.log).not.toHaveBeenCalled();
            expect(m.banUser).not.toHaveBeenCalled();
            expect(m.deleteAccount).not.toHaveBeenCalled();
        }
    );

    it.each(Object.keys(calls) as (keyof typeof calls)[])(
        '%s is 404 for a non-admin',
        async (name) => {
            m.requireAdmin.mockResolvedValue(
                NextResponse.json({ error: 'nf' }, { status: 404 })
            );

            expect((await calls[name]('u1')).status).toBe(404);
            expect(m.findUser).not.toHaveBeenCalled();
        }
    );

    it('404 for an unknown target', async () => {
        m.findUser.mockResolvedValue(null);

        expect((await calls.ban('u1')).status).toBe(404);
    });

    it('rejects an invalid ban duration', async () => {
        const res = await ban(req('POST', { hours: 5 }), ctx('u1'));

        expect(res.status).toBe(400);
        expect(m.banUser).not.toHaveBeenCalled();
    });

    it('ban without auth env is 503 and logs nothing', async () => {
        m.banUser.mockRejectedValue(new AdminAuthUnavailableError());

        const res = await calls.ban('u1');

        expect(res.status).toBe(503);
        expect(m.log).not.toHaveBeenCalled();
    });

    it('ban logs the action with its duration', async () => {
        const res = await calls.ban('u1');

        expect(res.status).toBe(200);
        expect(m.banUser).toHaveBeenCalledWith('u1', 168);
        expect(m.log).toHaveBeenCalledTimes(1);
        expect(m.log).toHaveBeenCalledWith({
            adminUserId: 'owner',
            action: 'ban',
            targetUserId: 'u1',
            meta: { hours: 168, signedOut: true },
        });
    });

    it('unban and signout log their actions', async () => {
        expect((await calls.unban('u1')).status).toBe(200);
        expect((await calls.signout('u1')).status).toBe(200);
        expect(m.log.mock.calls.map((c) => c[0].action)).toEqual([
            'unban',
            'signout',
        ]);
    });

    it('delete with a wrong email is 400', async () => {
        const res = await DELETE(
            req('DELETE', { email: 'other@example.test' }),
            ctx('u1')
        );

        expect(res.status).toBe(400);
        expect(m.deleteAccount).not.toHaveBeenCalled();
        expect(m.log).not.toHaveBeenCalled();
    });

    it('delete blocked by templates is 409 with the ids and no log', async () => {
        m.deleteAccount.mockRejectedValue(
            new AccountDeleteBlockedError(['t1'])
        );

        const res = await calls.delete('u1');

        expect(res.status).toBe(409);
        expect(await res.json()).toMatchObject({ templateIds: ['t1'] });
        expect(m.log).not.toHaveBeenCalled();
    });

    it('delete without auth env is 503 and deletes nothing', async () => {
        m.assertAuth.mockImplementation(() => {
            throw new AdminAuthUnavailableError();
        });

        const res = await calls.delete('u1');

        expect(res.status).toBe(503);
        expect(m.deleteAccount).not.toHaveBeenCalled();
        expect(m.log).not.toHaveBeenCalled();
    });

    it('delete with a failed auth removal is 503 but still audited', async () => {
        m.deleteAuthUser.mockRejectedValue(new Error('network'));
        m.deleteAccount.mockImplementation(
            async (
                _id: string,
                deps: { removeAuthUser: (id: string) => Promise<void> }
            ) => {
                await deps.removeAuthUser('u1');
            }
        );

        const res = await calls.delete('u1');

        expect(res.status).toBe(503);
        expect(m.log).toHaveBeenCalledWith({
            adminUserId: 'owner',
            action: 'delete',
            targetUserId: 'u1',
            meta: { email: 'u1@example.test', authRemoved: false },
        });
    });

    it('delete runs as admin and logs the email afterwards', async () => {
        m.deleteAccount.mockResolvedValue({ deletedCampaigns: 0 });

        const res = await calls.delete('u1');

        expect(res.status).toBe(200);
        expect(m.deleteAccount).toHaveBeenCalledWith(
            'u1',
            { removeAuthUser: expect.any(Function) },
            { by: 'admin' }
        );
        expect(m.log).toHaveBeenCalledWith(
            expect.objectContaining({
                action: 'delete',
                meta: { email: 'u1@example.test' },
            })
        );
    });
});
