import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export interface SessionUser {
  id: string
  email: string | null
}

/** Verifies the session JWT locally (asymmetric signing keys); no Supabase Auth round trip. */
export async function getAuthUserOptional(): Promise<SessionUser | null> {
  const supabase = await createClient()

  const { data } = await supabase.auth.getClaims()

  const claims = data?.claims

  if (!claims?.sub) return null

  return { id: claims.sub, email: claims.email ?? null }
}

export async function getSessionUserId(): Promise<string | null> {
  return (await getAuthUserOptional())?.id ?? null
}

export async function getAuthUser(): Promise<SessionUser> {
  const user = await getAuthUserOptional()

  if (!user) {
    redirect('/sign-in')
  }

  return user
}
