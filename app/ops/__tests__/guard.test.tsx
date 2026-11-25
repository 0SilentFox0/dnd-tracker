import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const getAuthUserOptional = vi.hoisted(() => vi.fn());

const notFound = vi.hoisted(() =>
    vi.fn(() => {
        throw new Error('NEXT_NOT_FOUND');
    })
);

vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/lib/auth', () => ({ getAuthUserOptional }));

import robots from '@/app/robots';
import { assertOpsAdmin } from '@/lib/server/ops/page-guard';

describe('assertOpsAdmin', () => {
    beforeEach(() => {
        getAuthUserOptional.mockReset();
        notFound.mockClear();
        vi.stubEnv('PLATFORM_ADMIN_USER_IDS', 'owner');
        vi.stubEnv('OPS_ADMIN_EMAILS', 'ok@x.com');
    });

    it('calls notFound without a session and for non-owners', async () => {
        getAuthUserOptional.mockResolvedValue(null);
        await expect(assertOpsAdmin()).rejects.toThrow('NEXT_NOT_FOUND');

        getAuthUserOptional.mockResolvedValue({ id: 'someone', email: 'no@x.com' });
        await expect(assertOpsAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
    });

    it('passes for the owner', async () => {
        getAuthUserOptional.mockResolvedValue({ id: 'owner', email: null });

        await expect(assertOpsAdmin()).resolves.toBeUndefined();

        getAuthUserOptional.mockResolvedValue({ id: 'x', email: 'OK@x.com' });
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
