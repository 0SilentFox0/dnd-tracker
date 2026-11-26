import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DELETE } from '@/app/api/account/route';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { deleteAccount } from '@/lib/server/account/delete-account';
import { AccountDeleteBlockedError } from '@/lib/server/account/template-guard';
import { requireAuthUser } from '@/lib/utils/api/api-auth';

vi.mock('@/lib/utils/api/api-auth', () => ({ requireAuthUser: vi.fn() }));
vi.mock('@/lib/server/account/delete-account', () => ({
    deleteAccount: vi.fn(),
}));

const signOut = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/server', () => ({
    createClient: async () => ({ auth: { signOut } }),
}));

const session = {
    userId: 'u1',
    authUser: { id: 'u1', email: 'Hero@Example.com' },
};

const req = (body: unknown) =>
    new Request('http://x/api/account', {
        method: 'DELETE',
        body: JSON.stringify(body),
    });

beforeEach(() => {
    vi.clearAllMocks();
    signOut.mockResolvedValue({});
    vi.mocked(requireAuthUser).mockResolvedValue(session);
    vi.mocked(deleteAccount).mockResolvedValue({ deletedCampaigns: 0 });
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('DELETE /api/account', () => {
    it('401 without a session', async () => {
        vi.mocked(requireAuthUser).mockResolvedValue(
            NextResponse.json(
                { error: API_ERRORS.UNAUTHORIZED },
                { status: 401 }
            )
        );

        expect((await DELETE(req({ email: 'a@b.co' }))).status).toBe(401);
        expect(deleteAccount).not.toHaveBeenCalled();
    });

    it('400 for a foreign email', async () => {
        const res = await DELETE(req({ email: 'other@example.com' }));

        expect(res.status).toBe(400);
        expect((await res.json()).error).toBe(
            API_ERRORS.ACCOUNT_EMAIL_MISMATCH
        );
        expect(deleteAccount).not.toHaveBeenCalled();
    });

    it('200 even when the local sign-out rejects', async () => {
        signOut.mockRejectedValue(new Error('boom'));

        expect((await DELETE(req({ email: 'hero@example.com' }))).status).toBe(
            200
        );
    });

    it('409 when the template guard blocks', async () => {
        vi.mocked(deleteAccount).mockRejectedValue(
            new AccountDeleteBlockedError(['t1'])
        );

        const res = await DELETE(req({ email: 'hero@example.com' }));

        expect(res.status).toBe(409);
        expect((await res.json()).error).toBe(
            API_ERRORS.ACCOUNT_DELETE_BLOCKED
        );
    });

    it('200 ignores email case and deletes the session user', async () => {
        const res = await DELETE(req({ email: 'HERO@example.COM' }));

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ success: true });
        expect(deleteAccount).toHaveBeenCalledWith('u1');
        expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
    });

    it('500 when the service fails unexpectedly', async () => {
        vi.mocked(deleteAccount).mockRejectedValue(new Error('supabase down'));

        expect((await DELETE(req({ email: 'hero@example.com' }))).status).toBe(
            500
        );
    });
});
