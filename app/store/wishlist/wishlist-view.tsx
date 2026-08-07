'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { StoreLink } from '@/components/store/store-context'
import { useCartStore } from '@/lib/store/cart'
import { showCartToast } from '@/components/store/cart-toast'
import { ArrowLeft, Heart, ShoppingCart, Share2, Check } from 'lucide-react'
import type { WishlistProduct } from '@/lib/data/wishlist'
import { toggleWishlistAction } from './actions'

type FilterTab = 'All Items' | 'In Stock' | 'Price ↑' | 'On Sale'

const TABS: FilterTab[] = ['All Items', 'In Stock', 'Price ↑', 'On Sale']

function WishlistCard({ item, onRemove }: { item: WishlistProduct; onRemove: () => void }) {
  const addItem = useCartStore((s) => s.addItem)
  const outOfStock = item.totalStock === 0
  const discount =
    item.comparePrice && item.comparePrice > item.price
      ? Math.round(((item.comparePrice - item.price) / item.comparePrice) * 100)
      : 0
  const priceDropped = item.priceAtSave !== null && item.price < item.priceAtSave
  const priceDrop = priceDropped ? Math.round(((item.priceAtSave! - item.price) / item.priceAtSave!) * 100) : 0

  function handleAddToCart() {
    addItem({
      productId: item.id,
      name: item.name,
      slug: item.slug,
      price: item.price,
      comparePrice: item.comparePrice,
      size: item.sizes[0],
      image: item.images[0] ?? '',
      tenantId: item.tenantId,
    })
    showCartToast({ name: item.name, size: item.sizes[0] })
  }

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface">
      <div className="relative aspect-[3/4] overflow-hidden bg-bg">
        <StoreLink href={`/product/${item.slug}`} className="absolute inset-0 z-[5]" aria-label={item.name} />
        {item.images[0] && (
          <Image
            src={item.images[0]}
            alt={item.name}
            fill
            sizes="(min-width:1024px) 25vw, 50vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
        )}
        {discount > 0 && (
          <span className="absolute left-2 top-2 rounded bg-store-primary px-2 py-0.5 font-body text-[11px] font-bold text-surface">
            {discount}% OFF
          </span>
        )}
        {item.isNew && !discount && (
          <span className="absolute left-2 top-2 rounded bg-success px-2 py-0.5 font-body text-[11px] font-bold text-surface">
            NEW
          </span>
        )}
        {outOfStock && (
          <span className="absolute bottom-3 left-3 rounded-md bg-fg/70 px-3 py-1 font-body text-xs font-semibold text-surface">
            Out of Stock
          </span>
        )}
        {priceDropped && (
          <span className="absolute bottom-10 left-3 rounded-md bg-success px-3 py-1 font-body text-[11px] font-bold text-surface">
            Price dropped {priceDrop}%!
          </span>
        )}
        {!outOfStock && item.totalStock <= 3 && (
          <span className="absolute bottom-3 left-3 rounded-md bg-store-primary px-3 py-1 font-body text-[11px] font-bold text-surface">
            Only {item.totalStock} left — selling fast!
          </span>
        )}
        {item.averageRating && (
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-success px-1.5 py-0.5 font-body text-[11px] font-bold text-surface">
            {item.averageRating.toFixed(1)} ★ <span className="font-normal opacity-80">| {item.reviewCount}</span>
          </span>
        )}
        <button
          aria-label={`Remove ${item.name} from saved items`}
          onClick={onRemove}
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface/80"
        >
          <Heart className="h-4 w-4 fill-store-primary text-store-primary" />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-3">
        {item.category && (
          <p className="font-body text-[11px] font-medium uppercase tracking-wide text-muted-warm">{item.category.name}</p>
        )}
        <StoreLink
          href={`/product/${item.slug}`}
          className="mt-0.5 line-clamp-1 block font-body text-sm font-semibold leading-tight text-fg hover:text-store-primary"
        >
          {item.name}
        </StoreLink>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="font-body text-base font-extrabold text-store-primary">
            ₹{item.price.toLocaleString('en-IN')}
          </span>
          {item.comparePrice && item.comparePrice > item.price && (
            <span className="font-body text-xs text-muted-warm line-through">
              ₹{item.comparePrice.toLocaleString('en-IN')}
            </span>
          )}
        </div>
        <div className="mt-auto pt-2.5">
          <button
            onClick={outOfStock ? undefined : handleAddToCart}
            disabled={outOfStock}
            className={`flex h-9 w-full items-center justify-center rounded-xl font-body text-sm font-semibold transition-opacity ${
              outOfStock ? 'border border-border text-muted-warm' : 'bg-store-primary text-surface hover:opacity-90'
            }`}
          >
            {outOfStock ? 'Notify Me' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function WishlistView({ initialItems }: { initialItems: WishlistProduct[] }) {
  const [items, setItems] = useState(initialItems)
  const [activeTab, setActiveTab] = useState<FilterTab>('All Items')
  const [showCount, setShowCount] = useState(8)
  const [addedAll, setAddedAll] = useState(false)
  const [, startTransition] = useTransition()
  const addItem = useCartStore((s) => s.addItem)

  let filtered = [...items]
  if (activeTab === 'In Stock') filtered = filtered.filter((i) => i.totalStock > 0)
  if (activeTab === 'On Sale') filtered = filtered.filter((i) => i.comparePrice && i.comparePrice > i.price)
  if (activeTab === 'Price ↑') filtered.sort((a, b) => a.price - b.price)

  const totalValue = items.reduce((s, i) => s + i.price, 0)
  const visible = filtered.slice(0, showCount)
  const remaining = filtered.length - showCount

  function handleAddAll() {
    const inStock = items.filter((i) => i.totalStock > 0)
    for (const i of inStock) {
      addItem({
        productId: i.id,
        name: i.name,
        slug: i.slug,
        price: i.price,
        comparePrice: i.comparePrice,
        size: i.sizes[0],
        image: i.images[0] ?? '',
        tenantId: i.tenantId,
      })
    }
    setAddedAll(true)
    showCartToast({ name: `${inStock.length} items`, size: '' })
  }

  function removeItem(id: string) {
    // Optimistic: the row disappears immediately, the delete follows.
    setItems((prev) => prev.filter((i) => i.id !== id))
    startTransition(async () => {
      await toggleWishlistAction(id)
    })
  }

  return (
    <main className="mx-auto max-w-6xl overflow-x-hidden px-3 py-4 sm:px-12 sm:py-10">
      <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <StoreLink
            href="/"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border transition-colors hover:bg-bg lg:hidden"
          >
            <ArrowLeft className="h-4 w-4 text-fg" />
          </StoreLink>
          <div className="min-w-0">
            <h1 className="font-heading text-lg font-bold leading-7 text-fg sm:text-[22px]">Saved Items</h1>
            <p className="mt-0.5 truncate font-body text-xs text-muted-warm sm:text-sm">
              {items.length} {items.length === 1 ? 'item' : 'items'} · ₹{totalValue.toLocaleString('en-IN')} total value
            </p>
          </div>
        </div>
        {items.length > 0 && (
          <div className="flex items-center gap-2">
            <button className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-4 font-body text-sm font-medium text-fg transition-colors hover:bg-bg">
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
            <button
              onClick={handleAddAll}
              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-store-primary px-4 font-body text-sm font-semibold text-surface transition-opacity hover:opacity-90 sm:flex-none"
            >
              {addedAll ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Added
                </>
              ) : (
                <>
                  <ShoppingCart className="h-3.5 w-3.5" /> Add All to Cart
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-body text-sm text-muted-warm">You haven&apos;t saved anything yet.</p>
          <StoreLink href="/" className="mt-3 inline-block font-body text-sm font-semibold text-store-primary">
            Browse products →
          </StoreLink>
        </div>
      ) : (
        <>
          <div className="no-scrollbar mb-5 mt-4 flex gap-5 overflow-x-auto border-b border-border">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 border-b-2 pb-2.5 font-body text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-store-primary font-semibold text-fg'
                    : 'border-transparent text-muted-warm hover:text-fg'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {visible.map((item) => (
              <WishlistCard key={item.id} item={item} onRemove={() => removeItem(item.id)} />
            ))}
          </div>

          {remaining > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setShowCount((s) => s + 8)}
                className="rounded-lg border border-store-primary px-6 py-2.5 font-body text-sm font-semibold text-store-primary transition-colors hover:bg-store-primary/5"
              >
                View {remaining} more saved items
              </button>
            </div>
          )}
        </>
      )}
    </main>
  )
}
