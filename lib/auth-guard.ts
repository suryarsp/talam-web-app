import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { withTenant } from '@/lib/prisma'

// cache(): dedupe repeated calls within one request — layouts, pages, and server
// actions on the same route each call this, and without memoization every call
// re-hits Supabase Auth over the network.
export const requireAuth = cache(async function requireAuth(nextPath?: string) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Tenant is path-prefixed in dev (/dev/store/<tenant>/...) rather than by subdomain, so the
    // bounce target and the post-login "next" destination both need the store-base prefix here —
    // otherwise this lands on the root owner-login page instead of the tenant's own /store/auth.
    const storeBase = (await headers()).get('x-store-base') ?? ''
    const target = nextPath ? `${storeBase}${nextPath}` : undefined
    const suffix = target ? `?next=${encodeURIComponent(target)}` : ''
    redirect(`${storeBase}/auth${suffix}`)
  }

  // Google OAuth creates the customer row in the /auth/callback route, but phone-OTP
  // sign-in verifies client-side and never hits a server route — so without this, any
  // authenticated action (e.g. placing an order) 500s on a customer_id FK violation.
  const tenantId = (await headers()).get('x-tenant-id')
  if (tenantId) {
    await withTenant(tenantId, (db) =>
      db.customer.upsert({
        where: { id: user.id },
        create: { id: user.id, tenantId, email: user.email ?? null, phone: user.phone ?? null },
        update: {},
      })
    )
  }

  return user
})

export const requireTenant = cache(async function requireTenant() {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const subdomain = headersList.get('x-subdomain') ?? ''
  const tier = headersList.get('x-tenant-tier') ?? 'trial'

  if (!tenantId) redirect('/not-found')

  return { tenantId, subdomain, tier }
})

/**
 * The Talam ops allow-list. Doubles as the recipient list for staff notifications
 * (lib/resend.ts), so an empty value silently means both "nobody can reach /super-admin"
 * and "nobody is told when a shop asks for help" — see .env.example.
 */
export function getSuperAdminEmails(): string[] {
  return (process.env.SUPER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

// Ops-only allow-list, not a role column — a handful of Talam staff, not worth a schema table.
export const requireSuperAdmin = cache(async function requireSuperAdmin() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const allowList = getSuperAdminEmails()

  if (!user?.email || !allowList.includes(user.email.toLowerCase())) {
    redirect('/not-found')
  }

  return user
})
