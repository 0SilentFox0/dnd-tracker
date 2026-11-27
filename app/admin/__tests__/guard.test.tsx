import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const getAuthUserOptional = vi.hoisted(() => vi.fn());

const notFound = vi.hoisted(() =>
    vi.fn(() => {
        throw new Error('NEXT_NOT_FOUND');
    })
);

const permanentRedirect = vi.hoisted(() =>
    vi.fn(() => {
        throw new Error('NEXT_REDIRECT');
    })
);

vi.mock('next/navigation', () => ({ notFound, permanentRedirect }));
vi.mock('@/lib/auth', () => ({ getAuthUserOptional }));

import robots from '@/app/robots';
import { assertAdmin } from '@/lib/server/admin/page-guard';

describe('assertAdmin', () => {
    beforeEach(() => {
        getAuthUserOptional.mockReset();
        notFound.mockClear();
        vi.stubEnv('PLATFORM_ADMIN_USER_IDS', 'owner');
        vi.stubEnv('OPS_ADMIN_EMAILS', 'ok@x.com');
    });

    it('calls notFound without a session and for non-owners', async () => {
        getAuthUserOptional.mockResolvedValue(null);
        await expect(assertAdmin()).rejects.toThrow('NEXT_NOT_FOUND');

        getAuthUserOptional.mockResolvedValue({
            id: 'someone',
            email: 'no@x.com',
        });
        await expect(assertAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
    });

    it('passes for the owner', async () => {
        getAuthUserOptional.mockResolvedValue({ id: 'owner', email: null });

        await expect(assertAdmin()).resolves.toBeUndefined();

        getAuthUserOptional.mockResolvedValue({ id: 'x', email: 'OK@x.com' });
        await expect(assertAdmin()).resolves.toBeUndefined();
        expect(notFound).not.toHaveBeenCalled();
    });
});

describe('robots', () => {
    it('disallows /ops and /admin when indexing is on', async () => {
        vi.resetModules();
        vi.doMock('@/lib/constants/site', () => ({
            SITE_INDEXING: true,
            SITE_URL: 'https://example.test',
        }));

        const mod = await import('@/app/robots');

        const rules = mod.default().rules as { disallow: string[] };

        expect(rules.disallow).toContain('/ops');
        expect(rules.disallow).toContain('/admin');
        expect(robots).toBeTypeOf('function');
    });
});

describe('legacy /ops page', () => {
    it('permanently redirects to /admin/ops', async () => {
        vi.doMock('@/lib/server/ops/summary', () => ({
            buildSummary: vi.fn(),
        }));

        const mod = await import('@/app/ops/page');

        expect(() => mod.default()).toThrow('NEXT_REDIRECT');
        expect(permanentRedirect).toHaveBeenCalledWith('/admin/ops');
    });
});
