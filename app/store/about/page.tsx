import { notFound } from 'next/navigation'
import { getRequestTenantId, getTenantStorefront, getBranches } from '@/lib/data/tenant'
import { cacheForTenant } from '@/lib/storefront-cache'
import { AboutHero } from '@/components/store/about-hero'
import { VisitUs } from '@/components/store/visit-us'

export default async function AboutPage() {
  const tenantId = await getRequestTenantId()
  if (!tenantId) notFound()

  const [tenant, branches] = await cacheForTenant(
    () => Promise.all([getTenantStorefront(tenantId), getBranches(tenantId)]),
    ['about-page', tenantId],
    tenantId,
    3600
  )
  if (!tenant) notFound()

  return (
    <main className="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:px-16 sm:py-12">
      <AboutHero tenant={tenant} />
      <VisitUs branches={branches} />
    </main>
  )
}
