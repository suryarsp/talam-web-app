import { headers } from 'next/headers'
import { StoreBaseProvider } from '@/components/store/store-context'
import { AdminNavShell } from '@/components/admin/admin-nav-shell'
import { Tour } from '@/components/admin/tour'
import { AutoStartTour } from '@/components/admin/auto-start-tour'
import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers()
  const storeBase = hdrs.get('x-store-base') ?? ''
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const tenant = user
    ? await prisma.tenant.findUnique({ where: { ownerId: user.id }, select: { id: true, isOnboarded: true, hasSeenSetupTour: true } })
    : null
  const shouldStartTour = Boolean(tenant?.isOnboarded && !tenant.hasSeenSetupTour)

  return (
    <StoreBaseProvider base={storeBase}>
      <AdminNavShell user={user}>{children}</AdminNavShell>
      <Tour />
      <AutoStartTour shouldStart={shouldStartTour} />
    </StoreBaseProvider>
  )
}
