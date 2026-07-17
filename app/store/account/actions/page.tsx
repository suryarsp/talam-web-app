import { LogOut, Trash2, AlertTriangle } from 'lucide-react'
import { SettingsBreadcrumb } from '@/components/store/settings-breadcrumb'
import { SettingsShell } from '@/components/store/settings-shell'
import { requireAuth, requireTenant } from '@/lib/auth-guard'
import { getSidebarUser, type SidebarUser } from '@/lib/data/customer-account'

export const dynamic = 'force-dynamic'

function Content({ user }: { user: SidebarUser }) {
  return (
    <>
      <SettingsBreadcrumb current="Account" />

      {/* Readonly profile */}
      <div className="mt-4 rounded-xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-lg font-bold text-fg mb-4">Profile</h2>
        <div className="space-y-3">
          <div>
            <div className="font-body text-xs text-muted-warm">Name</div>
            <div className="font-body text-sm text-fg">{user.name}</div>
          </div>
          <div>
            <div className="font-body text-xs text-muted-warm">Phone</div>
            <div className="font-body text-sm text-fg">{user.phone}</div>
          </div>
          <div>
            <div className="font-body text-xs text-muted-warm">Email</div>
            <div className="font-body text-sm text-fg">{user.email}</div>
          </div>
        </div>
      </div>

      {/* Account actions */}
      <div className="mt-4 rounded-xl border border-border bg-surface p-5 sm:p-6 space-y-0 divide-y divide-border">
        <button className="flex w-full items-center gap-3 py-3.5 first:pt-0 font-body text-sm text-fg hover:text-store-primary transition-colors">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Deactivate Account
        </button>
        <button className="flex w-full items-center gap-3 py-3.5 font-body text-sm text-danger hover:text-danger/80 transition-colors">
          <Trash2 className="h-4 w-4" />
          Delete Account
        </button>
        <button className="flex w-full items-center gap-3 py-3.5 last:pb-0 font-body text-sm text-danger hover:text-danger/80 transition-colors">
          <LogOut className="h-4 w-4" />
          Log Out
        </button>
      </div>
    </>
  )
}

export default async function ActionsPage() {
  const authUser = await requireAuth('/account/actions')
  const { tenantId } = await requireTenant()
  const sidebarUser = await getSidebarUser(tenantId, authUser)

  return (
    <>
      <div className="lg:hidden min-h-screen bg-bg px-0 pb-6">
        <Content user={sidebarUser} />
      </div>
      <SettingsShell user={sidebarUser}>
        <Content user={sidebarUser} />
      </SettingsShell>
    </>
  )
}
