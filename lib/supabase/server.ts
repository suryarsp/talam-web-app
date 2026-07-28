import { createServerClient as createClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cookieDomain } from './cookie-domain'
import { E2E_USER_COOKIE, e2eMockSupabaseClient } from './e2e-mock'

export async function createServerClient() {
  const cookieStore = await cookies()

  if (process.env.E2E_MOCK === '1') return e2eMockSupabaseClient(cookieStore.get(E2E_USER_COOKIE)?.value)

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options, domain: cookieDomain() })
            )
          } catch {
            // Server Component — cannot set cookies, middleware handles this
          }
        },
      },
    }
  )
}
