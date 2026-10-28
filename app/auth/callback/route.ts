import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

import { getRedirectOrigin } from './redirect-origin'

import { RESET_PASSWORD_PATH } from '@/lib/constants/auth'
import type { Locale } from '@/lib/i18n/config'
import { readLocaleCookie, setLocaleCookie } from '@/lib/i18n/cookie'
import { ensureDbUser } from '@/lib/server/users/db-user'
import { syncUserLocale } from '@/lib/server/users/locale'
import { createClient } from '@/lib/supabase/server'
import { safeNextPath } from '@/lib/utils/auth'

// Lands every emailed or OAuth link: Google sign-in, email confirmation, password recovery.
export async function GET(request: Request) {
  const url = new URL(request.url)

  const origin = getRedirectOrigin(request)

  const code = url.searchParams.get('code')

  const tokenHash = url.searchParams.get('token_hash')

  const type = url.searchParams.get('type') as EmailOtpType | null

  const recovery = type === 'recovery' || url.searchParams.get('next') === RESET_PASSWORD_PATH

  const next = recovery ? RESET_PASSWORD_PATH : safeNextPath(url.searchParams.get('next'))

  const fail = (reason: string) => NextResponse.redirect(`${origin}${recovery ? '/forgot-password' : '/sign-in'}?error=${encodeURIComponent(reason)}`)

  const providerError = url.searchParams.get('error_code') ?? url.searchParams.get('error')

  if (providerError) {
    console.error('Auth callback error:', providerError)

    return fail(providerError)
  }

  try {
    const supabase = await createClient()

    let failure

    if (code) failure = (await supabase.auth.exchangeCodeForSession(code)).error
    else if (tokenHash && type) failure = (await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error
    else return fail('no_code')

    if (failure) {
      console.error('Auth callback exchange failed:', failure)

      return fail(failure.code ?? 'exchange_failed')
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('Error getting user:', userError)

      return fail('user_not_found')
    }

    let locale: Locale | null = null

    try {
      await ensureDbUser(user, { refresh: true })

      locale = await syncUserLocale(user.id, readLocaleCookie(request))
    } catch (dbError) {
      // the session is valid either way; the row is created again on the first campaign create/join
      console.error('Database error:', dbError)
    }

    const res = NextResponse.redirect(`${origin}${next}`)

    if (locale) setLocaleCookie(res, locale, request)

    return res
  } catch (error) {
    console.error('Unexpected error in callback:', error)

    return fail('unexpected')
  }
}
