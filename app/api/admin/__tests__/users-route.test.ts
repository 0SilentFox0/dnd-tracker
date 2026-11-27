import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const requireAdmin = vi.hoisted(() => vi.fn());

const listAdminUsers = vi.hoisted(() => vi.fn());

vi.mock('@/lib/utils/api/require-platform-admin', () => ({
    requirePlatformAdmin: requireAdmin,
}));
vi.mock('@/lib/server/admin/users-list', () => ({ listAdminUsers }));

import { GET } from '@/app/api/admin/users/route';

const call = (qs = '') =>
    GET(new Request(`http://localhost/api/admin/users${qs}`));

describe('GET /api/admin/users', () => {
    beforeEach(() => {
        requireAdmin.mockReset().mockResolvedValue({ userId: 'owner' });
        listAdminUsers.mockReset().mockResolvedValue({ rows: [] });
    });

    it('404 for a non-admin', async () => {
        requireAdmin.mockResolvedValue(
            NextResponse.json({ error: 'nf' }, { status: 404 })
        );

        expect((await call()).status).toBe(404);
        expect(listAdminUsers).not.toHaveBeenCalled();
    });

    it('400 on an unknown sort', async () => {
        expect((await call('?sort=x')).status).toBe(400);
        expect(listAdminUsers).not.toHaveBeenCalled();
    });

    it('applies defaults', async () => {
        expect((await call('?q=%20bob%20')).status).toBe(200);
        expect(listAdminUsers).toHaveBeenCalledWith({
            q: 'bob',
            sort: 'created',
            filter: 'all',
        });
    });
});
