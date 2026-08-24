import { notFound } from 'next/navigation'
import { getRequestTenantId, getTenantStorefront } from '@/lib/data/tenant'
import { cacheForTenant } from '@/lib/storefront-cache'

export default async function ShippingPage() {
  const tenantId = await getRequestTenantId()
  if (!tenantId) notFound()

  const tenant = await cacheForTenant(() => getTenantStorefront(tenantId), ['shipping-page', tenantId], tenantId, 3600)
  if (!tenant) notFound()

  const rows = [
    { label: 'Delivery estimate', value: tenant.deliveryEstimateText ?? '5-7 business days' },
    {
      label: 'Shipping fee',
      value: tenant.shippingFee > 0 ? `₹${tenant.shippingFee.toLocaleString('en-IN')}` : 'Free',
    },
    ...(tenant.freeDeliveryAbove
      ? [{ label: 'Free delivery', value: `On orders above ₹${tenant.freeDeliveryAbove.toLocaleString('en-IN')}` }]
      : []),
  ]

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-16 sm:py-12">
      <div>
        <h1 className="mb-2 font-heading text-2xl font-bold text-fg sm:text-3xl">Shipping policy</h1>
        <p className="font-body text-sm text-muted-warm">How we get your order to your door.</p>
      </div>

      <div className="divide-y divide-border rounded-lg border border-border">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 p-6">
            <p className="font-body text-sm font-bold text-fg">{row.label}</p>
            <p className="font-body text-sm text-muted-warm">{row.value}</p>
          </div>
        ))}
      </div>

      <p className="font-body text-sm leading-[150%] text-muted-warm">
        Orders are processed and dispatched from our store once payment is confirmed. You&apos;ll receive updates by
        SMS or email as your order moves through packing, dispatch, and delivery. Delivery times may vary slightly
        for remote locations.
      </p>
    </main>
  )
}
