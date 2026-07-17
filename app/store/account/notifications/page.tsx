import { Bell } from 'lucide-react'
import { SettingsBreadcrumb } from '@/components/store/settings-breadcrumb'
import { SettingsShell } from '@/components/store/settings-shell'
import { NotificationsContent } from '@/components/store/settings-sections'
import { requireAuth, requireTenant } from '@/lib/auth-guard'
import { getSidebarUser } from '@/lib/data/customer-account'

export const dynamic = 'force-dynamic'

function Content() {
  return (
    <>
      <SettingsBreadcrumb current="Notifications" />
      <div className="mt-4 rounded-xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="h-5 w-5 text-muted-warm" />
          <h2 className="font-heading text-lg font-bold text-fg">Notifications</h2>
        </div>
        <NotificationsContent />
      </div>
    </>
  )
}

export default async function NotificationsPage() {
  const authUser = await requireAuth('/account/notifications')
  const { tenantId } = await requireTenant()
  const sidebarUser = await getSidebarUser(tenantId, authUser)

  return (
    <>
      <div className="lg:hidden min-h-screen bg-bg px-0 pb-6">
        <Content />
      </div>
      <SettingsShell user={sidebarUser}>
        <Content />
      </SettingsShell>
    </>
  )
}
