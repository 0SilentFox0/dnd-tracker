import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DELETE, PUT } from '@/app/api/profile/avatar/route';

const requireAuth = vi.fn();

vi.mock('@/lib/utils/api/api-auth', () => ({
    requireAuth: () => requireAuth(),
}));

const commitUserAvatar = vi.fn();

const removeUserAvatar = vi.fn();

vi.mock('@/lib/server/users/avatar', () => ({
    commitUserAvatar: (...a: unknown[]) => commitUserAvatar(...a),
    removeUserAvatar: (...a: unknown[]) => removeUserAvatar(...a),
    createUserAvatarTicket: vi.fn(),
}));

const put = (body: unknown) =>
    PUT(
        new Request('http://x/api/profile/avatar', {
            method: 'PUT',
            body: JSON.stringify(body),
        })
    );

beforeEach(() => {
    vi.clearAllMocks();
    requireAuth.mockResolvedValue({ userId: 'u1' });
});

describe('/api/profile/avatar', () => {
    it('401 without a session', async () => {
        requireAuth.mockResolvedValue(
            NextResponse.json({ error: 'x' }, { status: 401 })
        );

        expect((await put({ url: 'https://a.b/c' })).status).toBe(401);
        expect((await DELETE()).status).toBe(401);
    });

    it('400 on an invalid body', async () => {
        expect((await put({ url: 5 })).status).toBe(400);
        expect(commitUserAvatar).not.toHaveBeenCalled();
    });

    it('400 for another user url', async () => {
        commitUserAvatar.mockResolvedValue({ ok: false, message: 'errors.invalidBody' });

        expect((await put({ url: 'https://a.b/u2/x.webp' })).status).toBe(400);
        expect(commitUserAvatar).toHaveBeenCalledWith('u1', 'https://a.b/u2/x.webp');
    });

    it('commits a valid url and returns it', async () => {
        commitUserAvatar.mockResolvedValue({
            ok: true,
            value: { avatarUrl: 'https://a.b/u1/x.webp' },
        });

        const res = await put({ url: 'https://a.b/u1/x.webp' });

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ avatarUrl: 'https://a.b/u1/x.webp' });
    });

    it('400 for a foreign-host url or a bad path (service rejects)', async () => {
        commitUserAvatar.mockResolvedValue({
            ok: false,
            message: 'errors.invalidBody',
        });

        for (const url of [
            'https://evil.example/storage/v1/object/public/user-avatars/u1/x.webp',
            'https://a.b/storage/v1/object/public/user-avatars/u1/../u2/x.webp',
        ])
            expect((await put({ url })).status).toBe(400);
    });

    it('500 when the commit fails internally', async () => {
        commitUserAvatar.mockResolvedValue({
            ok: false,
            message: 'errors.internal',
        });

        expect((await put({ url: 'https://a.b/u1/x.webp' })).status).toBe(500);
    });

    it('DELETE 200 on success and 500 on failure', async () => {
        removeUserAvatar.mockResolvedValue({ ok: true, value: { ok: true } });

        expect((await DELETE()).status).toBe(200);

        removeUserAvatar.mockResolvedValue({
            ok: false,
            message: 'errors.internal',
        });

        expect((await DELETE()).status).toBe(500);
    });
});
