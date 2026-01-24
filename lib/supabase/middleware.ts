import { type NextRequest,NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Оновлюємо сесію користувача
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Захищаємо приватні маршрути
  // Виключаємо публічні маршрути та callback
  const publicPaths = ['/sign-in', '/sign-up', '/auth/callback']

  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path))
  
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()

    url.pathname = '/sign-in'

    return NextResponse.redirect(url)
  }
  
  // Якщо користувач авторизований і на сторінці входу - перенаправляємо на campaigns
  if (user && request.nextUrl.pathname.startsWith('/sign-in')) {
    const url = request.nextUrl.clone()

    url.pathname = '/campaigns'

    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
