import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireSuperAdminSection } from '@/lib/auth-guard'
import { getTenantDetail, getTenantStats, getTenantOwnerEmail } from '@/lib/data/super-admin'
import { daysUntil } from '@/lib/utils'
import { TenantDetailClient } from './tenant-detail-client'

export default async function SuperAdminTenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdminSection('tenants')
  const { id } = await params
  const tenant = await getTenantDetail(id)
  if (!tenant) notFound()

  const [stats, ownerEmail] = await Promise.all([getTenantStats(id), getTenantOwnerEmail(id)])
  const daysLeft = daysUntil(tenant.trialEndsAt)

  return (
    <div>
      <p className="mb-1 text-sm text-muted-foreground">
        <Link href="/super-admin/tenants" className="hover:underline">
          All Stores
        </Link>
        {' / '}
        {tenant.name}
      </p>
      <h1 className="mb-4 text-xl font-semibold text-foreground">{tenant.name}</h1>
      <TenantDetailClient tenant={tenant} stats={stats} ownerEmail={ownerEmail} daysLeft={daysLeft} />
    </div>
  )
}
