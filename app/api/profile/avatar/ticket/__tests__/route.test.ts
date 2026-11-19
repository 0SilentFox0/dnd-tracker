import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/profile/avatar/ticket/route';

const requireAuth = vi.fn();

vi.mock('@/lib/utils/api/api-auth', () => ({
    requireAuth: () => requireAuth(),
}));

const checkRateLimit = vi.fn();

vi.mock('@/lib/utils/api/rate-limit', () => ({
    checkRateLimit: (...a: unknown[]) => checkRateLimit(...a),
    rateLimitResponse: () =>
        NextResponse.json({ error: 'slow down' }, { status: 429 }),
}));

const createTicket = vi.fn();

vi.mock('@/lib/server/users/avatar', () => ({
    createUserAvatarTicket: (...a: unknown[]) => createTicket(...a),
}));

const post = (body: unknown = { contentType: 'image/webp' }) =>
    POST(
        new Request('http://x/api/profile/avatar/ticket', {
            method: 'POST',
            body: JSON.stringify(body),
        })
    );

beforeEach(() => {
    vi.clearAllMocks();
    requireAuth.mockResolvedValue({ userId: 'u1' });
    checkRateLimit.mockResolvedValue({ allowed: true });
    createTicket.mockResolvedValue({ ok: true, value: { path: 'u1/a.webp' } });
});

describe('POST /api/profile/avatar/ticket', () => {
    it('401 without a session', async () => {
        requireAuth.mockResolvedValue(
            NextResponse.json({ error: 'x' }, { status: 401 })
        );

        expect((await post()).status).toBe(401);
        expect(createTicket).not.toHaveBeenCalled();
    });

    it('issues a ticket for the requested content type', async () => {
        const res = await post({ contentType: 'image/jpeg' });

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ path: 'u1/a.webp' });
        expect(createTicket).toHaveBeenCalledWith('u1', 'image/jpeg');
        expect(checkRateLimit).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: 'u1',
                scope: 'user-avatar-upload',
            })
        );
    });

    it('400 for an unsupported content type', async () => {
        expect((await post({ contentType: 'image/png' })).status).toBe(400);
        expect(createTicket).not.toHaveBeenCalled();
    });

    it('429 when rate limited, without issuing a ticket', async () => {
        checkRateLimit.mockResolvedValue({ allowed: false });

        expect((await post()).status).toBe(429);
        expect(createTicket).not.toHaveBeenCalled();
    });

    it('500 when the ticket cannot be created', async () => {
        createTicket.mockResolvedValue({ ok: false, message: 'errors.internal' });

        expect((await post()).status).toBe(500);
    });
});
