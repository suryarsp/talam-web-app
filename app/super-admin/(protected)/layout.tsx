import { requireSuperAdmin, getSuperAdminRole } from '@/lib/auth-guard'
import { sectionsForRole } from '@/lib/data/admin-permissions'
import { SuperAdminNavShell } from '@/components/super-admin/super-admin-nav-shell'

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireSuperAdmin()
  const role = await getSuperAdminRole(user.email!)
  return (
    <SuperAdminNavShell user={user} sections={sectionsForRole(role)}>
      {children}
    </SuperAdminNavShell>
  )
}
