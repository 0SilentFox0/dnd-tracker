import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { updateSession } from '../middleware';

const getClaims = vi.hoisted(() => vi.fn());

const getUser = vi.hoisted(() => vi.fn());

const createServerClient = vi.hoisted(() =>
    vi.fn(() => ({ auth: { getClaims, getUser } }))
);

vi.mock('@supabase/ssr', () => ({ createServerClient }));

const request = (
    pathname: string,
    init?: { method?: string; origin?: string }
) =>
    new NextRequest(`http://app.test${pathname}`, {
        method: init?.method ?? 'GET',
        headers: init?.origin
            ? { origin: init.origin, host: 'app.test' }
            : { host: 'app.test' },
    });

const signedIn = () =>
    getClaims.mockResolvedValue({
        data: { claims: { sub: 'u1' } },
        error: null,
    });

const signedOut = () =>
    getClaims.mockResolvedValue({ data: null, error: null });

describe('updateSession', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    });

    it('/api — без Supabase Auth: маршрути самі перевіряють сесію і віддають 401', async () => {
        signedOut();

        const res = await updateSession(request('/api/campaigns'));

        expect(res.status).toBe(200);
        expect(res.headers.get('location')).toBeNull();
        expect(createServerClient).not.toHaveBeenCalled();
    });

    it('/api — CSRF-перевірка лишається', async () => {
        const res = await updateSession(
            request('/api/campaigns', {
                method: 'POST',
                origin: 'http://evil.test',
            })
        );

        expect(res.status).toBe(403);
    });

    it('/auth/signout — без redirect на /sign-in, CSRF-перевірка діє', async () => {
        signedOut();

        const ok = await updateSession(
            request('/auth/signout', {
                method: 'POST',
                origin: 'http://app.test',
            })
        );

        expect(ok.headers.get('location')).toBeNull();
        expect(
            (
                await updateSession(
                    request('/auth/signout', {
                        method: 'POST',
                        origin: 'http://evil.test',
                    })
                )
            ).status
        ).toBe(403);
    });

    it('сторінка без сесії — redirect на /sign-in', async () => {
        signedOut();

        const res = await updateSession(request('/campaigns/c1'));

        expect(new URL(res.headers.get('location') ?? '').pathname).toBe(
            '/sign-in'
        );
    });

    it('гість на /join/<код> — redirect на /sign-in з next', async () => {
        signedOut();

        const res = await updateSession(request('/join/AB3K9Z'));

        const location = new URL(res.headers.get('location') ?? '');

        expect(location.pathname).toBe('/sign-in');
        expect(location.search).toBe('?next=%2Fjoin%2FAB3K9Z');
    });

    it('гість на /campaigns — без next', async () => {
        signedOut();

        const res = await updateSession(request('/campaigns'));

        expect(new URL(res.headers.get('location') ?? '').search).toBe('');
    });

    it('/sign-in із сесією і next — redirect на next, чужий next ігнорується', async () => {
        signedIn();

        const ok = await updateSession(request('/sign-in?next=/join/X'));

        expect(new URL(ok.headers.get('location') ?? '').pathname).toBe(
            '/join/X'
        );

        const evil = await updateSession(request('/sign-up?next=//evil.com'));

        expect(new URL(evil.headers.get('location') ?? '').pathname).toBe(
            '/campaigns'
        );
    });

    it('сторінка із сесією — пропускає, перевіряючи JWT через getClaims, а не getUser', async () => {
        signedIn();

        const res = await updateSession(request('/campaigns/c1'));

        expect(res.headers.get('location')).toBeNull();
        expect(getClaims).toHaveBeenCalledTimes(1);
        expect(getUser).not.toHaveBeenCalled();
    });

    it('/sign-in із сесією — redirect на /campaigns', async () => {
        signedIn();

        const res = await updateSession(request('/sign-in'));

        expect(new URL(res.headers.get('location') ?? '').pathname).toBe(
            '/campaigns'
        );
    });

    it('публічні сторінки без сесії — пропускає', async () => {
        signedOut();

        for (const path of [
            '/',
            '/uk',
            '/sign-in',
            '/sign-up',
            '/forgot-password',
            '/reset-password',
            '/auth/callback',
        ]) {
            expect(
                (await updateSession(request(path))).headers.get('location')
            ).toBeNull();
        }
    });

    it('/?code=… (Site URL fallback) — довершує вхід через /auth/callback', async () => {
        signedOut();

        const res = await updateSession(request('/?code=abc&type=recovery'));

        const location = new URL(res.headers.get('location') ?? '');

        expect(location.pathname + location.search).toBe(
            '/auth/callback?code=abc&type=recovery'
        );
    });
});
