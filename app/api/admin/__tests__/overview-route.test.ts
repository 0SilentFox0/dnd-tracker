import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const requireAdmin = vi.hoisted(() => vi.fn());

const buildOverview = vi.hoisted(() => vi.fn());

vi.mock('@/lib/utils/api/require-platform-admin', () => ({
    requirePlatformAdmin: requireAdmin,
}));
vi.mock('@/lib/server/admin/overview', () => ({ buildOverview }));

import { GET } from '@/app/api/admin/overview/route';

const call = (qs = '') =>
    GET(new Request(`http://localhost/api/admin/overview${qs}`));

describe('GET /api/admin/overview', () => {
    beforeEach(() => {
        requireAdmin.mockReset().mockResolvedValue({ userId: 'owner' });
        buildOverview.mockReset().mockResolvedValue({ range: '7d' });
    });

    it('404 for a non-admin without building', async () => {
        requireAdmin.mockResolvedValue(
            NextResponse.json({ error: 'nf' }, { status: 404 })
        );

        expect((await call('?range=7d')).status).toBe(404);
        expect(buildOverview).not.toHaveBeenCalled();
    });

    it('400 on an unknown range', async () => {
        expect((await call('?range=1y')).status).toBe(400);
        expect(buildOverview).not.toHaveBeenCalled();
    });

    it('passes the range and defaults to 30d', async () => {
        const res = await call('?range=7d');

        expect(res.status).toBe(200);
        expect(buildOverview).toHaveBeenCalledWith('7d');

        await call();
        expect(buildOverview).toHaveBeenLastCalledWith('30d');
    });
});
