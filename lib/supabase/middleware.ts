import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

import { LANDING_PATHS } from '@/lib/constants/site';
import { bearerToken } from '@/lib/utils/api/bearer';
import {
    checkIpRateLimit,
    ipRateLimitResponse,
    ipScopeOf,
} from '@/lib/utils/api/ip-rate-limit';

/** CSRF defense: mutating /api/* requests must be same-origin (Origin or Sec-Fetch-Site). A missing Origin is rejected except `Sec-Fetch-Site: same-origin|none`, Bearer calls and NO_ORIGIN_PREFIXES; `/api/pusher/auth` stays covered since the client is always same-origin. */
const SIGN_OUT_PATH = '/auth/signout';

/** Non-browser calls without a cookie session: MCP (Bearer) and cron (Bearer CRON_SECRET). */
const NO_ORIGIN_PREFIXES = ['/api/mcp/', '/api/cron/'];

export function rejectCrossOriginMutation(
    request: NextRequest
): NextResponse | null {
    const method = request.method.toUpperCase();

    if (
        method !== 'POST' &&
        method !== 'PATCH' &&
        method !== 'PUT' &&
        method !== 'DELETE'
    ) {
        return null;
    }

    const { pathname } = request.nextUrl;

    if (!pathname.startsWith('/api/') && pathname !== SIGN_OUT_PATH)
        return null;

    // bearer requests never read cookies, so CSRF does not apply
    if (bearerToken(request)) return null;

    if (
        NO_ORIGIN_PREFIXES.some(
            (prefix) =>
                pathname === prefix.slice(0, -1) || pathname.startsWith(prefix)
        )
    )
        return null;

    const origin = request.headers.get('origin');

    if (!origin) {
        const site = request.headers.get('sec-fetch-site');

        if (site === 'same-origin' || site === 'none') return null;

        return NextResponse.json(
            { error: 'Missing Origin header' },
            { status: 403 }
        );
    }

    let originHost: string;

    try {
        originHost = new URL(origin).host;
    } catch {
        return NextResponse.json(
            { error: 'Invalid Origin header' },
            { status: 403 }
        );
    }

    const requestHost = request.headers.get('host') ?? request.nextUrl.host;

    if (originHost !== requestHost) {
        return NextResponse.json(
            { error: 'Cross-origin request rejected' },
            { status: 403 }
        );
    }

    return null;
}

export async function updateSession(request: NextRequest) {
    const csrfReject = rejectCrossOriginMutation(request);

    if (csrfReject) return csrfReject;

    const ipScope = ipScopeOf(request.nextUrl.pathname);

    if (ipScope) {
        const rate = await checkIpRateLimit(request.headers, ipScope);

        if (!rate.allowed) return ipRateLimitResponse(rate);
    }

    // Routes check the session themselves (401) and refresh the token through their own server client.
    // The sign-out route must receive its POST as is (a redirect to /sign-in would downgrade it) and clears the cookies itself.
    if (
        request.nextUrl.pathname.startsWith('/api/') ||
        request.nextUrl.pathname === SIGN_OUT_PATH
    )
        return NextResponse.next();

    if (LANDING_PATHS.includes(request.nextUrl.pathname)) {
        // Supabase falls back to the Site URL when a redirectTo isn't allow-listed: finish the auth link anyway
        if (
            request.nextUrl.searchParams.has('code') ||
            request.nextUrl.searchParams.has('token_hash')
        ) {
            const url = request.nextUrl.clone();

            url.pathname = '/auth/callback';

            return NextResponse.redirect(url);
        }

        // the landing is static and session-agnostic: no Supabase round trip in front of the CDN
        return NextResponse.next();
    }

    let supabaseResponse = NextResponse.next({
        request,
    });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
        throw new Error('Missing Supabase environment variables');
    }

    const supabase = createServerClient(url, key, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) => {
                    request.cookies.set(name, value);
                });
                supabaseResponse = NextResponse.next({
                    request,
                });
                cookiesToSet.forEach(({ name, value, options }) => {
                    supabaseResponse.cookies.set(name, value, options);
                });
            },
        },
    });

    // getClaims refreshes an expired session and verifies the JWT locally against the cached JWKS
    const { data } = await supabase.auth.getClaims();

    const user = data?.claims?.sub ?? null;

    const publicPaths = [
        '/sign-in',
        '/sign-up',
        '/forgot-password',
        '/reset-password',
        '/auth/callback',
        ...(process.env.NODE_ENV === 'development' ? ['/dev/'] : []),
    ];

    const isPublicPath = publicPaths.some((path) =>
        request.nextUrl.pathname.startsWith(path)
    );

    if (!user && !isPublicPath) {
        const url = request.nextUrl.clone();

        url.pathname = '/sign-in';

        return NextResponse.redirect(url);
    }

    if (user && request.nextUrl.pathname.startsWith('/sign-in')) {
        const url = request.nextUrl.clone();

        url.pathname = '/campaigns';

        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}
