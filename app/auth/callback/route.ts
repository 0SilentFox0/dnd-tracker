import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const origin = requestUrl.origin

  // Якщо є помилка від OAuth провайдера
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
    
    // Обмінюємо код на сесію
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError)
      return NextResponse.redirect(`${origin}/sign-in?error=exchange_failed`)
    }

    // Отримуємо користувача після обміну
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('Error getting user:', userError)
      return NextResponse.redirect(`${origin}/sign-in?error=user_not_found`)
    }

    // Створюємо або оновлюємо користувача в базі даних
    try {
      let dbUser = await prisma.user.findUnique({
        where: { id: user.id },
      })

      if (!dbUser) {
        // Створюємо нового користувача
        dbUser = await prisma.user.create({
          data: {
            id: user.id,
            email: user.email || '',
            displayName: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
            avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          },
        })
      } else {
        // Оновлюємо існуючого користувача
        dbUser = await prisma.user.update({
          where: { id: user.id },
          data: {
            email: user.email || dbUser.email,
            displayName: user.user_metadata?.full_name || user.user_metadata?.name || dbUser.displayName,
            avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || dbUser.avatar,
          },
        })
      }
    } catch (dbError) {
      console.error('Database error:', dbError)
      // Продовжуємо навіть якщо є помилка з базою - користувач все одно авторизований
    }

    // Перенаправляємо на campaigns
    return NextResponse.redirect(`${origin}/campaigns`)
  } catch (error) {
    console.error('Unexpected error in callback:', error)
    return NextResponse.redirect(`${origin}/sign-in?error=unexpected`)
  }
}
