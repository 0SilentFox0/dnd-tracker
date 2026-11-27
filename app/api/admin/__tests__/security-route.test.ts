import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const requireAdmin = vi.hoisted(() => vi.fn());

const buildSecurity = vi.hoisted(() => vi.fn());

vi.mock('@/lib/utils/api/require-platform-admin', () => ({
    requirePlatformAdmin: requireAdmin,
}));
vi.mock('@/lib/server/admin/security', () => ({ buildSecurity }));

import { GET } from '@/app/api/admin/security/route';

const call = (qs = '') =>
    GET(new Request(`http://localhost/api/admin/security${qs}`));

describe('GET /api/admin/security', () => {
    beforeEach(() => {
        requireAdmin.mockReset().mockResolvedValue({ userId: 'owner' });
        buildSecurity.mockReset().mockResolvedValue({ days: 7 });
    });

    it('404 for a non-admin without building', async () => {
        requireAdmin.mockResolvedValue(
            NextResponse.json({ error: 'nf' }, { status: 404 })
        );

        expect((await call('?days=7')).status).toBe(404);
        expect(buildSecurity).not.toHaveBeenCalled();
    });

    it('400 on days=5', async () => {
        expect((await call('?days=5')).status).toBe(400);
        expect(buildSecurity).not.toHaveBeenCalled();
    });

    it('passes days and defaults to 30', async () => {
        expect((await call('?days=7')).status).toBe(200);
        expect(buildSecurity).toHaveBeenCalledWith(7);

        await call();
        expect(buildSecurity).toHaveBeenLastCalledWith(30);
    });
});
