import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const requireAdmin = vi.hoisted(() => vi.fn());

const load = vi.hoisted(() => vi.fn());

vi.mock('@/lib/utils/api/require-platform-admin', () => ({
    requirePlatformAdmin: requireAdmin,
}));
vi.mock('@/lib/server/admin/user-detail', () => ({ getAdminUserDetail: load }));

import { GET } from '@/app/api/admin/users/[id]/route';

const call = () =>
    GET(new Request('http://localhost/api/admin/users/x'), {
        params: Promise.resolve({ id: 'x' }),
    });

describe('GET /api/admin/users/[id]', () => {
    beforeEach(() => {
        requireAdmin.mockReset().mockResolvedValue({ userId: 'owner' });
        load.mockReset().mockResolvedValue({ id: 'x' });
    });

    it('404 for a non-admin', async () => {
        requireAdmin.mockResolvedValue(
            NextResponse.json({ error: 'nf' }, { status: 404 })
        );

        expect((await call()).status).toBe(404);
        expect(load).not.toHaveBeenCalled();
    });

    it('404 for an unknown id', async () => {
        load.mockResolvedValue(null);

        expect((await call()).status).toBe(404);
    });

    it('returns the payload', async () => {
        const res = await call();

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ id: 'x' });
        expect(load).toHaveBeenCalledWith('x');
    });
});
