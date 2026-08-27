'use server'

import { getRequestTenantId } from '@/lib/data/tenant'
import { searchProducts } from '@/lib/data/search'
import { withTenant } from '@/lib/prisma'
import { getDeliveryEstimate } from '@/lib/shipping/shiprocket'
import { formatDeliveryDate } from '@/lib/shipping/delivery-estimate'
import type { DeliveryCheckResult } from '@/components/store/pincode-delivery-check'

export async function searchProductsAction(query: string) {
  const tenantId = await getRequestTenantId()
  if (!tenantId || !query.trim()) return []
  return searchProducts(tenantId, query)
}

/**
 * Serviceability and an ETA for a single unit of one product — what the product page can honestly
 * promise before a cart exists. The rate the courier also returns is deliberately dropped: the
 * real charge depends on the whole cart's weight and the store's free-delivery threshold, both
 * unknown here, so showing a number now would only contradict the checkout summary later.
 */
export async function checkProductDeliveryAction(productId: string, pincode: string): Promise<DeliveryCheckResult> {
  if (!/^\d{6}$/.test(pincode)) return { error: 'Enter a 6-digit pincode.' }

  const tenantId = await getRequestTenantId()
  if (!tenantId) return { error: 'Store not found.' }

  const [tenant, product] = await withTenant(tenantId, (db) =>
    Promise.all([
      db.tenant.findUnique({ where: { id: tenantId }, select: { defaultShippingWeight: true } }),
      db.product.findFirst({
        where: { id: productId, tenantId, isActive: true, status: 'published', deletedAt: null },
        select: { weight: true },
      }),
    ])
  )
  if (!tenant || !product) return { error: 'Product not found.' }

  const estimate = await getDeliveryEstimate(tenantId, {
    pincode,
    weightKg: Number(product.weight ?? tenant.defaultShippingWeight),
  })
  if ('error' in estimate) return { error: estimate.error }
  if (!estimate.serviceable) return { serviceable: false }

  return {
    serviceable: true,
    deliveryBy: estimate.etaDays === undefined ? null : formatDeliveryDate(new Date(), estimate.etaDays),
  }
}
