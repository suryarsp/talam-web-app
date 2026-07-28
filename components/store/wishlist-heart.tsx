'use client'

import { useState, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { toggleWishlistAction } from '@/app/store/wishlist/actions'

/**
 * Sits on top of the product card's full-card link, so it stops propagation —
 * tapping the heart must not navigate to the product.
 */
export function WishlistHeart({ productId, initialSaved }: { productId: string; initialSaved: boolean }) {
  const [saved, setSaved] = useState(initialSaved)
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      aria-label={saved ? 'Remove from saved items' : 'Save item'}
      aria-pressed={saved}
      disabled={pending}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        const next = !saved
        setSaved(next)
        startTransition(async () => {
          const result = await toggleWishlistAction(productId)
          // requireAuth redirects a signed-out visitor, so only a real mismatch lands here.
          setSaved(result.saved)
        })
      }}
      className="z-10 flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface shadow-sm sm:size-8"
    >
      <Heart className={`size-4 text-[#E8577E] ${saved ? 'fill-[#E8577E]' : ''}`} strokeWidth={2} />
    </button>
  )
}
