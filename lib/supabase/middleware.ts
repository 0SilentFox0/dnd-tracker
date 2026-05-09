import { type NextRequest,NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * CSRF defense for mutating /api/* requests (CODE_AUDIT 4.4).
 *
 * Next.js залежить на `SameSite=Lax` cookie за замовчуванням (Supabase
 * sets these), що блокує більшість cross-site CSRF. Цей middleware
 * додає явну перевірку: на POST/PATCH/PUT/DELETE до /api/* перевіряємо,
 * що Origin (або Sec-Fetch-Site) вказує на same-origin.
 *
 * Виняток — `/api/pusher/auth` має дозволяти безпечний cross-origin
 * fetch не потрібен (клієнт завжди same-origin), тому не виключаємо.
 *
 * Якщо Origin відсутній (типово для server-side fetch або сторонніх
 * API клієнтів) — пропускаємо, оскільки auth cookie все одно
 * захистить (без cookie немає сесії).
 */
export function rejectCrossOriginMutation(request: NextRequest): NextResponse | null {
  const method = request.method.toUpperCase();

  if (method !== "POST" && method !== "PATCH" && method !== "PUT" && method !== "DELETE") {
    return null;
  }

  if (!request.nextUrl.pathname.startsWith("/api/")) return null;

  const origin = request.headers.get("origin");

  if (!origin) return null;

  let originHost: string;

  try {
    originHost = new URL(origin).host;
  } catch {
    return NextResponse.json(
      { error: "Invalid Origin header" },
      { status: 403 },
    );
  }

  const requestHost = request.headers.get("host") ?? request.nextUrl.host;

  if (originHost !== requestHost) {
    return NextResponse.json(
      { error: "Cross-origin request rejected" },
      { status: 403 },
    );
  }

  return null;
}

export async function updateSession(request: NextRequest) {
  const csrfReject = rejectCrossOriginMutation(request);

  if (csrfReject) return csrfReject;

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
