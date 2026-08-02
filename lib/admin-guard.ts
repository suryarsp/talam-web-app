import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// cache(): dedupe repeated calls within one request — layouts, pages, and server
// actions on the same route each call these, and without memoization every call
// re-hits Supabase Auth + Postgres over the network.
export const requireOwnerSession = cache(async function requireOwnerSession(
  nextPath = '/admin/onboarding'
): Promise<{ userId: string; email: string | null; authProvider: string | null }> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth?next=${nextPath}`)
  }

  return { userId: user.id, email: user.email ?? null, authProvider: user.app_metadata?.provider ?? null }
})

// Admin Server Actions operate on the signed-in owner's own tenant, never a client-supplied id.
export const requireOwnerTenant = cache(async function requireOwnerTenant(): Promise<{
  userId: string
  tenantId: string
}> {
  const { userId } = await requireOwnerSession()
  const tenant = await prisma.tenant.findUnique({ where: { ownerId: userId }, select: { id: true } })
  if (!tenant) redirect('/admin/onboarding')
  return { userId, tenantId: tenant.id }
})
