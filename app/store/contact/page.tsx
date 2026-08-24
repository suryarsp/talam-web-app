import { notFound } from 'next/navigation'
import { getRequestTenantId, getTenantStorefront, getBranches } from '@/lib/data/tenant'
import { cacheForTenant } from '@/lib/storefront-cache'
import { VisitUs } from '@/components/store/visit-us'

export default async function ContactPage() {
  const tenantId = await getRequestTenantId()
  if (!tenantId) notFound()

  const [tenant, branches] = await cacheForTenant(
    () => Promise.all([getTenantStorefront(tenantId), getBranches(tenantId)]),
    ['contact-page', tenantId],
    tenantId,
    3600
  )
  if (!tenant) notFound()

  return (
    <main className="mx-auto max-w-3xl space-y-10 px-4 py-8 sm:px-16 sm:py-12">
      <div>
        <h1 className="mb-2 font-heading text-2xl font-bold text-fg sm:text-3xl">Contact us</h1>
        <p className="font-body text-sm text-muted-warm">We&apos;re happy to help — reach out any way that works for you.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {tenant.contactPhone && (
          <div className="rounded-lg border border-border p-6">
            <p className="mb-1.5 font-body text-sm font-bold text-fg">Phone</p>
            <p className="font-body text-sm text-muted-warm">{tenant.contactPhone}</p>
          </div>
        )}
        {tenant.contactEmail && (
          <div className="rounded-lg border border-border p-6">
            <p className="mb-1.5 font-body text-sm font-bold text-fg">Email</p>
            <p className="font-body text-sm text-muted-warm">{tenant.contactEmail}</p>
          </div>
        )}
        {tenant.whatsappNumber && (
          <div className="rounded-lg border border-border p-6">
            <p className="mb-1.5 font-body text-sm font-bold text-fg">WhatsApp</p>
            <p className="font-body text-sm text-muted-warm">{tenant.whatsappNumber}</p>
          </div>
        )}
      </div>

      <VisitUs branches={branches} />
    </main>
  )
}
