'use client'

import { useSyncExternalStore } from 'react'
import { useCartStore } from '@/lib/store/cart'
import { StoreLink } from '@/components/store/store-context'

const noopSubscribe = () => () => {}

export function CartBadge() {
  const items = useCartStore(s => s.items)
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false)
  const c = mounted ? items.reduce((sum, i) => sum + i.quantity, 0) : 0

  return (
    <StoreLink
      href="/cart"
      className="relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-border-light sm:size-10"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="21" r="1" stroke="#8B7D7A" strokeWidth="2" />
        <circle cx="20" cy="21" r="1" stroke="#8B7D7A" strokeWidth="2" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke="#8B7D7A" strokeWidth="2" />
      </svg>
      {c > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-store-primary font-body text-[9px] font-bold leading-3 text-white">
          {c > 9 ? '9+' : c}
        </span>
      )}
    </StoreLink>
  )
}
