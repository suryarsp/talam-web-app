import { requireSuperAdminSection } from '@/lib/auth-guard'
import { getAllTenants } from '@/lib/data/super-admin'
import { TenantsListClient } from './tenants-list-client'

export default async function SuperAdminTenantsPage() {
  await requireSuperAdminSection('tenants')
  const tenants = await getAllTenants()
  return <TenantsListClient tenants={tenants} />
}
