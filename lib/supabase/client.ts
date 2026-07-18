import { createBrowserClient as createClient } from '@supabase/ssr'
import { cookieDomain } from './cookie-domain'

export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: { domain: cookieDomain() } }
  )
}
