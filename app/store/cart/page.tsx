import { notFound } from 'next/navigation'
import { getRequestTenantId, getTenantStorefront } from '@/lib/data/tenant'
import { CartClient } from './cart-client'

export const dynamic = 'force-dynamic'

export default async function CartPage() {
  const tenantId = await getRequestTenantId()
  if (!tenantId) notFound()

  const tenant = await getTenantStorefront(tenantId)
  if (!tenant) notFound()

  return (
    <CartClient
      tenant={{ name: tenant.name, freeDeliveryAbove: tenant.freeDeliveryAbove, shippingFee: tenant.shippingFee }}
    />
  )
}
