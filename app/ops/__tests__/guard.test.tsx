import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const getSessionUserId = vi.hoisted(() => vi.fn());

const notFound = vi.hoisted(() =>
    vi.fn(() => {
        throw new Error('NEXT_NOT_FOUND');
    })
);

vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/lib/auth', () => ({ getSessionUserId }));

import robots from '@/app/robots';
import { assertOpsAdmin } from '@/lib/server/ops/page-guard';

describe('assertOpsAdmin', () => {
    beforeEach(() => {
        getSessionUserId.mockReset();
        notFound.mockClear();
        vi.stubEnv('PLATFORM_ADMIN_USER_IDS', 'owner');
    });

    it('calls notFound without a session and for non-owners', async () => {
        getSessionUserId.mockResolvedValue(null);
        await expect(assertOpsAdmin()).rejects.toThrow('NEXT_NOT_FOUND');

        getSessionUserId.mockResolvedValue('someone');
        await expect(assertOpsAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
    });

    it('passes for the owner', async () => {
        getSessionUserId.mockResolvedValue('owner');

        await expect(assertOpsAdmin()).resolves.toBeUndefined();
        expect(notFound).not.toHaveBeenCalled();
    });
});

describe('robots', () => {
    it('disallows /ops when indexing is on', async () => {
        vi.resetModules();
        vi.doMock('@/lib/constants/site', () => ({
            SITE_INDEXING: true,
            SITE_URL: 'https://example.test',
        }));

        const mod = await import('@/app/robots');

        const rules = mod.default().rules as { disallow: string[] };

        expect(rules.disallow).toContain('/ops');
        expect(robots).toBeTypeOf('function');
    });
});
