import { headers } from 'next/headers'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { StoreBaseProvider } from '@/components/store/store-context'
import { AdminNavShell } from '@/components/admin/admin-nav-shell'
import { Tour } from '@/components/admin/tour'
import { AutoStartTour } from '@/components/admin/auto-start-tour'
import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getMissingStoreConfig } from '@/lib/data/tenant'

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
  const missingConfig = tenant ? await getMissingStoreConfig(tenant.id) : []
  const shouldStartTour = Boolean(tenant?.isOnboarded && !tenant.hasSeenSetupTour)

  return (
    <StoreBaseProvider base={storeBase}>
      <AdminNavShell user={user}>
        {missingConfig.length > 0 ? (
          <div className="mx-4 mb-5 flex flex-col gap-2 rounded-lg bg-[#FEF3C7] p-3.5 md:mx-0 md:p-4">
            {missingConfig.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="flex items-center gap-2 text-sm font-semibold text-[#92400E] hover:underline"
              >
                <AlertTriangle className="size-4 shrink-0" />
                {item.label} isn&apos;t configured yet — your store won&apos;t go live until it is. Configure now →
              </Link>
            ))}
          </div>
        ) : null}
        {children}
      </AdminNavShell>
      <Tour />
      <AutoStartTour shouldStart={shouldStartTour} />
    </StoreBaseProvider>
  )
}
