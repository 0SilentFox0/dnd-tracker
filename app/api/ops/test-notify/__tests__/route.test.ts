import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const requireAdmin = vi.hoisted(() => vi.fn());

const sendAlert = vi.hoisted(() => vi.fn());

vi.mock('@/lib/utils/api/require-platform-admin', () => ({
    requirePlatformAdmin: requireAdmin,
}));
vi.mock('@/lib/server/ops/notify', () => ({ sendAlert }));

import { POST } from '@/app/api/ops/test-notify/route';

describe('POST /api/ops/test-notify', () => {
    beforeEach(() => {
        requireAdmin.mockReset();
        sendAlert.mockReset();
    });

    it('returns the guard response for non-owners', async () => {
        requireAdmin.mockResolvedValue(
            NextResponse.json({ error: 'nf' }, { status: 404 })
        );

        expect((await POST()).status).toBe(404);
        expect(sendAlert).not.toHaveBeenCalled();
    });

    it('returns per-channel results for the owner', async () => {
        requireAdmin.mockResolvedValue({ userId: 'u' });
        sendAlert.mockResolvedValue({ telegram: 'off', email: 'off' });

        const response = await POST();

        expect(await response.json()).toEqual({
            telegram: 'off',
            email: 'off',
        });
    });
});
