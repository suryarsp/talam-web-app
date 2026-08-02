'use client'

import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/store/cart'
import { useStoreHref } from '@/components/store/store-context'
import type { CustomerOrder } from '@/lib/data/storefront-orders'

/**
 * Re-adds an order's line items to the cart. Prices are deliberately not carried over —
 * addItem stores what the item costs now, and checkout re-prices from the DB anyway.
 */
export function BuyAgainButton({
  order,
  tenantId,
  compact,
}: {
  order: CustomerOrder
  tenantId: string
  compact?: boolean
}) {
  const router = useRouter()
  const addItem = useCartStore((s) => s.addItem)
  const cartHref = useStoreHref('/cart')

  function buyAgain() {
    for (const item of order.items) {
      if (!item.slug) continue // product was deleted — nothing to re-add
      addItem({
        productId: item.productId,
        name: item.productName,
        slug: item.slug,
        price: item.unitPrice,
        size: item.size ?? undefined,
        image: item.image ?? '',
        tenantId,
      })
    }
    router.push(cartHref)
  }

  return (
    <button
      onClick={buyAgain}
      className={
        compact
          ? 'flex-1 rounded-lg bg-store-primary px-3 py-2.5 font-body text-xs font-semibold text-surface hover:opacity-90 sm:flex-none sm:px-4'
          : 'rounded-lg border border-border px-3 py-1.5 font-body text-xs font-medium text-fg hover:bg-bg'
      }
    >
      Buy Again
    </button>
  )
}
