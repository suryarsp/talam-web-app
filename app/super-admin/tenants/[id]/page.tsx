import { notFound } from 'next/navigation'
import { getTenantDetail } from '@/lib/data/super-admin'
import { TenantDetailClient } from './tenant-detail-client'

export default async function SuperAdminTenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tenant = await getTenantDetail(id)
  if (!tenant) notFound()

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-foreground">{tenant.name}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{tenant.slug}</p>
      <TenantDetailClient tenant={tenant} />
    </div>
  )
}
