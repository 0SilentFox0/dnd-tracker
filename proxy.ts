import { type NextRequest, NextResponse } from 'next/server'

import { LOCALE_COOKIE } from '@/lib/i18n/config'
import { landingRewriteTarget } from '@/lib/i18n/landing-rewrite'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  const response = await updateSession(request)

  const target = landingRewriteTarget({
    pathname: request.nextUrl.pathname,
    cookie: request.cookies.get(LOCALE_COOKIE)?.value,
    acceptLanguage: request.headers.get('accept-language'),
  })

  if (!target || response.headers.has('location')) return response

  const rewrite = NextResponse.rewrite(new URL(target, request.url))

  for (const cookie of response.cookies.getAll()) rewrite.cookies.set(cookie)

  return rewrite
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|txt|xml|docx?|xlsx?|zip|webmanifest)).*)',
    // API routes: CSRF check only, no auth round trip (see updateSession)
    '/(api|trpc)(.*)',
  ],
}
