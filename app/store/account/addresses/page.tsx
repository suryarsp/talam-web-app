import { MapPin } from 'lucide-react'
import { SettingsBreadcrumb } from '@/components/store/settings-breadcrumb'
import { SettingsShell } from '@/components/store/settings-shell'
import { requireAuth, requireTenant } from '@/lib/auth-guard'
import { getAddresses } from '@/lib/data/addresses'
import { getSidebarUser } from '@/lib/data/customer-account'
import { AddressesView } from './addresses-view'

export const dynamic = 'force-dynamic'

export default async function AddressesPage() {
  const authUser = await requireAuth('/account/addresses')
  const { tenantId } = await requireTenant()
  const [addresses, sidebarUser] = await Promise.all([
    getAddresses(tenantId, authUser.id),
    getSidebarUser(tenantId, authUser),
  ])

  return (
    <>
      <div className="lg:hidden min-h-screen bg-bg px-0 pb-6">
        <SettingsBreadcrumb current="Addresses" />
        <div className="mt-4 rounded-xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="h-5 w-5 text-muted-warm" />
            <h2 className="font-heading text-lg font-bold text-fg">Addresses</h2>
          </div>
          <AddressesView initialAddresses={addresses} />
        </div>
      </div>
      <SettingsShell user={sidebarUser}>
        <SettingsBreadcrumb current="Addresses" />
        <div className="mt-4 rounded-xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="h-5 w-5 text-muted-warm" />
            <h2 className="font-heading text-lg font-bold text-fg">Addresses</h2>
          </div>
          <AddressesView initialAddresses={addresses} />
        </div>
      </SettingsShell>
    </>
  )
}
