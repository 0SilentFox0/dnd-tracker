import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Створюємо або оновлюємо користувача в базі даних
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // Перевіряємо чи користувач існує в базі
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
  }

  return NextResponse.redirect(`${origin}/campaigns`)
}
