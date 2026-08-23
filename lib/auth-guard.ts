import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { withTenant } from '@/lib/prisma'
import { isAdminStaffEmail, getAdminStaffRole, touchAdminStaffLastActive } from '@/lib/data/admin-staff'
import { canAccessSection, type AdminSection } from '@/lib/data/admin-permissions'
import type { AdminStaffRole } from '@prisma/client'

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

// Access is granted to anyone in the AdminStaff table (managed from /super-admin/staff),
// unioned with the SUPER_ADMIN_EMAILS env allow-list. The env list stays only as a bootstrap
// path — without it, an empty AdminStaff table would lock every operator out with no way to
// add the first row.
export const requireSuperAdmin = cache(async function requireSuperAdmin() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/super-admin/login')
  }

  const email = user.email?.toLowerCase()
  const envAllowed = !!email && getSuperAdminEmails().includes(email)
  const staffAllowed = !!email && (await isAdminStaffEmail(email))

  if (!email || !(envAllowed || staffAllowed)) {
    redirect('/not-found')
  }

  if (staffAllowed) void touchAdminStaffLastActive(email)

  return user
})

/**
 * This is also the bootstrap story: there's no separate "create the first admin" flow —
 * an env-listed email always resolves to 'owner', so the first sign-in from
 * SUPER_ADMIN_EMAILS lands with full access (including Staff management) and can invite
 * the real AdminStaff rows — themselves included — from there.
 */
export async function getSuperAdminRole(email: string): Promise<AdminStaffRole> {
  if (getSuperAdminEmails().includes(email.toLowerCase())) return 'owner'
  // requireSuperAdmin() already confirmed this email is either env-listed or has a row —
  // falling through here means it has one, so 'owner' is just a type-safe, never-hit default.
  return (await getAdminStaffRole(email)) ?? 'owner'
}

/** Page-level section guard — redirects if the signed-in staffer's role can't reach `section`. */
export async function requireSuperAdminSection(section: AdminSection) {
  const user = await requireSuperAdmin()
  const role = await getSuperAdminRole(user.email!)
  if (!canAccessSection(role, section)) redirect('/not-found')
  return { user, role }
}
