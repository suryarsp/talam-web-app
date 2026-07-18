import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export async function requireAuth(nextPath?: string) {
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

  return user
}

export async function requireTenant() {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const subdomain = headersList.get('x-subdomain') ?? ''
  const tier = headersList.get('x-tenant-tier') ?? 'trial'

  if (!tenantId) redirect('/not-found')

  return { tenantId, subdomain, tier }
}
