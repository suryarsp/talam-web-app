'use client'

import { useState } from 'react'
import { SizePicker } from './size-picker'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/store/cart'

type Props = {
  product: { id: string; tenantId: string; name: string; price: number | string; sizes: string[]; images: string[] }
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
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      size: selectedSize ?? undefined,
      image: product.images[0] ?? '',
      tenantId: product.tenantId,
    })
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
        <Button
          className="h-12 flex-1 rounded-lg bg-store-primary font-body text-md font-semibold text-surface hover:bg-store-primary/90"
          onClick={handleAddToCart}
        >
          {added ? 'Added to Cart ✓' : 'Add to Cart'}
        </Button>
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
