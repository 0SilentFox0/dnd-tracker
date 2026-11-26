import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { updateSession } from '../middleware';

import { SEEN_COOKIE, seenValue } from '@/lib/utils/admin/seen-cookie';

const getClaims = vi.hoisted(() => vi.fn());

const recordActivity = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('@supabase/ssr', () => ({
    createServerClient: vi.fn(() => ({ auth: { getClaims } })),
}));

vi.mock('@/lib/server/admin/record-activity', () => ({ recordActivity }));

const request = (pathname: string, cookie?: string) =>
    new NextRequest(`http://app.test${pathname}`, {
        headers: {
            host: 'app.test',
            'user-agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
            'x-forwarded-for': '203.0.113.7',
            ...(cookie ? { cookie } : {}),
        },
    });

describe('updateSession activity touch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
        getClaims.mockResolvedValue({
            data: { claims: { sub: 'u1' } },
            error: null,
        });
    });

    it('signed in without the cookie: sets it and records once', async () => {
        const res = await updateSession(request('/campaigns'));

        expect(res.cookies.get(SEEN_COOKIE)?.value).toBe(
            seenValue('u1', new Date())
        );
        await vi.waitFor(() => expect(recordActivity).toHaveBeenCalledTimes(1));
        expect(recordActivity.mock.calls[0][0]).toMatchObject({
            userId: 'u1',
            ip: '203.0.113.7',
        });
    });

    it('fresh cookie: no write', async () => {
        const res = await updateSession(
            request(
                '/campaigns',
                `${SEEN_COOKIE}=${seenValue('u1', new Date())}`
            )
        );

        expect(res.cookies.get(SEEN_COOKIE)).toBeUndefined();
        await Promise.resolve();
        expect(recordActivity).not.toHaveBeenCalled();
    });

    it('/api path: no write', async () => {
        const res = await updateSession(request('/api/x'));

        expect(res.cookies.get(SEEN_COOKIE)).toBeUndefined();
        await Promise.resolve();
        expect(recordActivity).not.toHaveBeenCalled();
    });
});
