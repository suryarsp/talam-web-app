'use client'

import { useState } from 'react'
import { SizePicker } from './size-picker'
import { ShinyButton } from '@/components/ui/shiny-button'
import { useCartStore } from '@/lib/store/cart'
import { showCartToast } from './cart-toast'

type Props = {
  product: { id: string; tenantId: string; name: string; slug: string; price: number | string; comparePrice?: number | null; sizes: string[]; images: string[]; description?: string | null }
  stockBySize: Record<string, number>
}

export function AddToCartButton({ product, stockBySize }: Props) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [added, setAdded] = useState(false)
  const addItem = useCartStore((s) => s.addItem)

  function handleAddToCart() {
    if (product.sizes.length > 0 && !selectedSize) {
      setError('Please select a size')
      return
    }
    setError('')
    const desc = product.description ?? ''
    const fabricMatch = desc.match(/Fabric:\s*(.+)/i)
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: Number(product.price),
      comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
      size: selectedSize ?? undefined,
      fabric: fabricMatch?.[1]?.trim(),
      image: product.images[0] ?? '',
      tenantId: product.tenantId,
    })
    showCartToast({ name: product.name, size: selectedSize ?? undefined })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="space-y-4">
      {product.sizes.length > 0 && (
        <SizePicker
          sizes={product.sizes}
          stockBySize={stockBySize}
          selected={selectedSize}
          onSelect={(size) => {
            setSelectedSize(size)
            setError('')
          }}
        />
      )}
      {error && <p className="font-body text-sm text-danger">{error}</p>}
      <div className="flex gap-3">
        <ShinyButton
          className="h-12 flex-1 rounded-lg bg-store-primary font-body text-md font-semibold text-surface hover:bg-store-primary/90"
          onClick={handleAddToCart}
        >
          {added ? 'Added to Cart ✓' : 'Add to Cart'}
        </ShinyButton>
        {/* ponytail: decorative only — wishlist needs a signed-in customer session, wire up once storefront auth + wishlist backend exist */}
        <button
          type="button"
          aria-label="Add to wishlist"
          className="flex h-12 items-center gap-1.5 rounded-lg border border-store-primary px-4 font-body text-md font-semibold text-store-primary"
        >
          ♡ Wishlist
        </button>
      </div>
    </div>
  )
}
