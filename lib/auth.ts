import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Отримує поточного авторизованого користувача
 * Якщо користувач не авторизований, перенаправляє на сторінку входу
 */
export async function getAuthUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  return user
}

/**
 * Отримує поточного авторизованого користувача без редиректу
 * Повертає null якщо користувач не авторизований
 */
export async function getAuthUserOptional() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}
