import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DELETE, PUT } from '@/app/api/profile/avatar/route';

const requireAuth = vi.fn();

vi.mock('@/lib/utils/api/api-auth', () => ({
    requireAuth: () => requireAuth(),
}));

const commitUserAvatar = vi.fn();

vi.mock('@/lib/server/users/avatar', () => ({
    commitUserAvatar: (...a: unknown[]) => commitUserAvatar(...a),
    removeUserAvatar: vi.fn(),
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
});
