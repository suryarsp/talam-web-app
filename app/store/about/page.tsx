import { notFound } from 'next/navigation'
import { getDevTenantId, getTenantStorefront, getBranches } from '@/lib/data/tenant'
import { AboutHero } from '@/components/store/about-hero'
import { VisitUs } from '@/components/store/visit-us'

export default async function AboutPage() {
  const tenantId = await getDevTenantId()
  const tenant = tenantId ? await getTenantStorefront(tenantId) : null
  if (!tenant) notFound()
  const branches = await getBranches(tenantId!)

  return (
    <main className="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:px-16 sm:py-12">
      <AboutHero tenant={tenant} />
      <VisitUs branches={branches} />
    </main>
  )
}
