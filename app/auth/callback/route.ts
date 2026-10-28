import { NextResponse } from 'next/server'

import { getRedirectOrigin } from './redirect-origin'

import { ensureDbUser } from '@/lib/server/users/db-user'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)

  const origin = getRedirectOrigin(request)

  const code = requestUrl.searchParams.get('code')

  const error = requestUrl.searchParams.get('error')

  if (error) {
    console.error('OAuth error:', error)

    return NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent(error)}`)
  }

  if (!code) {
    console.error('No code parameter in callback')

    return NextResponse.redirect(`${origin}/sign-in?error=no_code`)
  }

  try {
    const supabase = await createClient()
    
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError)

      return NextResponse.redirect(`${origin}/sign-in?error=exchange_failed`)
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('Error getting user:', userError)

      return NextResponse.redirect(`${origin}/sign-in?error=user_not_found`)
    }

    try {
      await ensureDbUser(user, { refresh: true })
    } catch (dbError) {
      console.error('Database error:', dbError)
      // Продовжуємо навіть якщо є помилка з базою - користувач все одно авторизований
    }

    return NextResponse.redirect(`${origin}/campaigns`)
  } catch (error) {
    console.error('Unexpected error in callback:', error)

    return NextResponse.redirect(`${origin}/sign-in?error=unexpected`)
  }
}
