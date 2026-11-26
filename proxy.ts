import { type NextRequest, NextResponse } from 'next/server';

import { LOCALE_COOKIE } from '@/lib/i18n/config';
import { landingRedirectTarget } from '@/lib/i18n/landing-redirect';
import {
    newNonce,
    nonceCsp,
    nonceCspHeaderName,
    usesNonce,
} from '@/lib/security/csp';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
    const nonce = usesNonce(request.nextUrl.pathname) ? newNonce() : null;

    if (nonce) {
        // Next reads the nonce from the forwarded request CSP header and stamps it on its scripts
        request.headers.set(nonceCspHeaderName(), nonceCsp(nonce));
    }

    const response = await updateSession(request);

    if (nonce && !response.headers.has('location')) {
        response.headers.set(nonceCspHeaderName(), nonceCsp(nonce));
    }

    const target = landingRedirectTarget({
        pathname: request.nextUrl.pathname,
        cookie: request.cookies.get(LOCALE_COOKIE)?.value,
        acceptLanguage: request.headers.get('accept-language'),
    });

    if (!target || response.headers.has('location')) return response;

    // a redirect, not a rewrite: `/` must never serve the uk page under the en canonical
    const redirect = NextResponse.redirect(new URL(target, request.url), 307);

    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);

    return redirect;
}

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|txt|xml|docx?|xlsx?|zip|webmanifest)).*)',
        // API routes: CSRF check only, no auth round trip (see updateSession)
        '/(api|trpc)(.*)',
    ],
};
