import { notFound } from 'next/navigation'
import { getRequestTenantId, getTenantStorefront } from '@/lib/data/tenant'
import { cacheForTenant } from '@/lib/storefront-cache'

export default async function ReturnsPage() {
  const tenantId = await getRequestTenantId()
  if (!tenantId) notFound()

  const tenant = await cacheForTenant(() => getTenantStorefront(tenantId), ['returns-page', tenantId], tenantId, 3600)
  if (!tenant) notFound()

  const windowDays = tenant.returnWindowDays ?? 7

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-16 sm:py-12">
      <div>
        <h1 className="mb-2 font-heading text-2xl font-bold text-fg sm:text-3xl">Returns &amp; exchange</h1>
        <p className="font-body text-sm text-muted-warm">Changed your mind? Here&apos;s how returns work.</p>
      </div>

      <div className="rounded-lg border border-border p-6">
        <p className="mb-1.5 font-body text-sm font-bold text-fg">Return window</p>
        <p className="font-body text-sm text-muted-warm">
          Items can be returned within {windowDays} day{windowDays === 1 ? '' : 's'} of delivery.
        </p>
      </div>

      {tenant.trustBadgeText && (
        <div className="rounded-lg border border-border p-6">
          <p className="mb-1.5 font-body text-sm font-bold text-fg">Our promise</p>
          <p className="font-body text-sm text-muted-warm">{tenant.trustBadgeText}</p>
        </div>
      )}

      <p className="font-body text-sm leading-[150%] text-muted-warm">
        To start a return, contact us with your order number and reason for return. Items should be unused, unwashed,
        and in their original packaging with tags attached. Once we receive and inspect the item, we&apos;ll process
        your refund or exchange.
      </p>
    </main>
  )
}
