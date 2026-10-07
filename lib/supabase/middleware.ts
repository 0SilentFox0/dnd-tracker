import { type NextRequest,NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * CSRF defense for mutating /api/* requests: Origin (або Sec-Fetch-Site) POST/PATCH/PUT/DELETE має бути same-origin.
 * Без Origin (server-side fetch, сторонні клієнти) запит пропускається — auth cookie все одно потрібна.
 * `/api/pusher/auth` не виключено: клієнт завжди same-origin.
 */
const SIGN_OUT_PATH = "/auth/signout";

export function rejectCrossOriginMutation(request: NextRequest): NextResponse | null {
  const method = request.method.toUpperCase();

  if (method !== "POST" && method !== "PATCH" && method !== "PUT" && method !== "DELETE") {
    return null;
  }

  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/") && pathname !== SIGN_OUT_PATH) return null;

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

  // Routes check the session themselves (401) and refresh the token through their own server client.
  // The sign-out route must receive its POST as is (a redirect to /sign-in would downgrade it) and clears the cookies itself.
  if (request.nextUrl.pathname.startsWith('/api/') || request.nextUrl.pathname === SIGN_OUT_PATH) return NextResponse.next()

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

  // getClaims refreshes an expired session and verifies the JWT locally against the cached JWKS
  const { data } = await supabase.auth.getClaims()

  const user = data?.claims?.sub ?? null

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
