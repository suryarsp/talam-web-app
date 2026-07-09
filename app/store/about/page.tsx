import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getTenantStorefront, getBranches } from '@/lib/data/tenant'
import { AboutHero } from '@/components/store/about-hero'
import { VisitUs } from '@/components/store/visit-us'

export default async function AboutPage() {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  if (!tenantId) notFound()

  const [tenant, branches] = await Promise.all([getTenantStorefront(tenantId), getBranches(tenantId)])
  if (!tenant) notFound()

  return (
    <main className="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:px-16 sm:py-12">
      <AboutHero tenant={tenant} />
      <VisitUs branches={branches} />
    </main>
  )
}
