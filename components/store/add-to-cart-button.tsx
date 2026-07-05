'use client'

import { useState } from 'react'
import type { Product } from '@prisma/client'
import { SizePicker } from './size-picker'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/store/cart'

type Props = {
  product: Product
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
      <Button
        className="h-12 w-full rounded-lg bg-store-primary font-body text-md font-semibold text-surface hover:bg-store-primary/90"
        onClick={handleAddToCart}
      >
        {added ? 'Added to Cart ✓' : 'Add to Cart'}
      </Button>
    </div>
  )
}
