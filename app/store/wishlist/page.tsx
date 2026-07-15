'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCartStore } from '@/lib/store/cart'
import { showCartToast } from '@/components/store/cart-toast'
import { ArrowLeft, Heart, ShoppingCart, Share2, Check } from 'lucide-react'

// ponytail: inline mock until real wishlist API exists
type WishlistItem = {
  id: string
  tenantId: string
  name: string
  slug: string
  price: number
  comparePrice: number | null
  sizes: string[]
  images: string[]
  isNew: boolean
  averageRating: number | null
  reviewCount: number
  totalStock: number
  category: { name: string } | null
}

const initialItems: WishlistItem[] = [
  { id: 'prod-001', tenantId: 'dev-tenant', name: 'Kanjivaram Silk Saree', slug: 'kanjivaram-silk-saree', price: 2499, comparePrice: 3299, sizes: ['XS', 'S', 'M', 'L', 'XL'], images: ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600'], isNew: false, averageRating: 4.8, reviewCount: 4, totalStock: 20, category: { name: 'Sarees' } },
  { id: 'prod-003', tenantId: 'dev-tenant', name: 'Zari Border Dupatta', slug: 'zari-border-dupatta', price: 699, comparePrice: 999, sizes: ['Free Size'], images: ['https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600'], isNew: false, averageRating: 5, reviewCount: 2, totalStock: 20, category: { name: 'Dupattas' } },
  { id: 'prod-009', tenantId: 'dev-tenant', name: 'Embroidered Kurti', slug: 'embroidered-kurti', price: 999, comparePrice: null, sizes: ['S', 'M', 'L', 'XL', 'XXL'], images: ['https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600'], isNew: true, averageRating: 4.5, reviewCount: 2, totalStock: 39, category: { name: 'Kurtis' } },
]

type FilterTab = 'All Items' | 'In Stock' | 'Price ↑' | 'On Sale'

function WishlistCard({ item, onRemove }: { item: WishlistItem; onRemove: () => void }) {
  const addItem = useCartStore(s => s.addItem)
  const outOfStock = item.totalStock === 0
  const discount = item.comparePrice && item.comparePrice > item.price
    ? Math.round(((item.comparePrice - item.price) / item.comparePrice) * 100)
    : 0

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
      <Link href={`/product/${item.slug}`} className="relative block aspect-[3/4] overflow-hidden bg-bg">
        {item.images[0] && (
          <Image src={item.images[0]} alt={item.name} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover transition-transform group-hover:scale-105" />
        )}
        {discount > 0 && (
          <span className="absolute left-2 top-2 rounded bg-store-primary px-2 py-0.5 font-body text-[11px] font-bold text-surface">{discount}% OFF</span>
        )}
        {item.isNew && !discount && (
          <span className="absolute left-2 top-2 rounded bg-success px-2 py-0.5 font-body text-[11px] font-bold text-surface">NEW</span>
        )}
        {outOfStock && (
          <span className="absolute bottom-3 left-3 rounded-md bg-fg/70 px-3 py-1 font-body text-xs font-semibold text-surface">Out of Stock</span>
        )}
        {!outOfStock && item.totalStock <= 3 && (
          <span className="absolute bottom-3 left-3 rounded-md bg-store-primary px-3 py-1 font-body text-[11px] font-bold text-surface">Only {item.totalStock} left!</span>
        )}
        <button onClick={onRemove} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface/80">
          <Heart className="h-4 w-4 fill-store-primary text-store-primary" />
        </button>
      </Link>

      <div className="flex flex-1 flex-col p-3">
        {item.category && (
          <p className="font-body text-[11px] font-medium uppercase tracking-wide text-muted-warm">{item.category.name}</p>
        )}
        <Link href={`/product/${item.slug}`} className="mt-0.5 block font-body text-sm font-semibold text-fg leading-tight line-clamp-1 hover:text-store-primary">
          {item.name}
        </Link>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="font-body text-sm font-bold text-store-primary">₹{item.price.toLocaleString('en-IN')}</span>
          {item.comparePrice && item.comparePrice > item.price && (
            <span className="font-body text-xs text-muted-warm line-through">₹{item.comparePrice.toLocaleString('en-IN')}</span>
          )}
        </div>
        {item.averageRating && (
          <p className="mt-1 font-body text-[11px] text-muted-warm">
            {'★'.repeat(Math.round(item.averageRating))} {item.averageRating.toFixed(1)} ({item.reviewCount})
          </p>
        )}
        <div className="mt-auto pt-2.5">
          <button
            onClick={outOfStock ? undefined : handleAddToCart}
            disabled={outOfStock}
            className={`flex h-9 w-full items-center justify-center rounded-lg font-body text-sm font-semibold transition-opacity ${
              outOfStock
                ? 'border border-border text-muted-warm'
                : 'bg-store-primary text-surface hover:opacity-90'
            }`}
          >
            {outOfStock ? 'Notify Me' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function WishlistPage() {
  const [items, setItems] = useState(initialItems)
  const [activeTab, setActiveTab] = useState<FilterTab>('All Items')
  const [showCount, setShowCount] = useState(8)
  const [addedAll, setAddedAll] = useState(false)
  const addItem = useCartStore(s => s.addItem)

  let filtered = [...items]
  if (activeTab === 'In Stock') filtered = filtered.filter(i => i.totalStock > 0)
  if (activeTab === 'On Sale') filtered = filtered.filter(i => i.comparePrice && i.comparePrice > i.price)
  if (activeTab === 'Price ↑') filtered.sort((a, b) => a.price - b.price)

  const totalValue = items.reduce((s, i) => s + i.price, 0)
  const visible = filtered.slice(0, showCount)
  const remaining = filtered.length - showCount

  function handleAddAll() {
    const inStock = items.filter(i => i.totalStock > 0)
    inStock.forEach(i => {
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
    })
    setItems([])
    setAddedAll(true)
    showCartToast({ name: `${inStock.length} items`, size: '' })
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const tabs: FilterTab[] = ['All Items', 'In Stock', 'Price ↑', 'On Sale']

  return (
    <main className="mx-auto max-w-6xl px-3 py-4 sm:px-12 sm:py-10 overflow-x-hidden">
      {/* Header */}
      <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link href="/" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border hover:bg-bg transition-colors lg:hidden">
            <ArrowLeft className="h-4 w-4 text-fg" />
          </Link>
          <div className="min-w-0">
            <h1 className="font-heading text-lg sm:text-[22px] font-bold leading-7 text-fg">Saved Items</h1>
            <p className="mt-0.5 font-body text-xs sm:text-sm text-muted-warm truncate">{items.length} items · ₹{totalValue.toLocaleString('en-IN')} total value</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-4 font-body text-sm font-medium text-fg hover:bg-bg transition-colors">
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
          <span className="hidden sm:block">
            <button
              onClick={handleAddAll}
              disabled={items.length === 0}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-store-primary px-4 font-body text-sm font-semibold text-surface hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {addedAll ? <><Check className="h-3.5 w-3.5" /> Added</> : <><ShoppingCart className="h-3.5 w-3.5" /> Add All to Cart</>}
            </button>
          </span>
          <span className="sm:hidden flex-1">
            <button
              onClick={handleAddAll}
              disabled={items.length === 0}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-store-primary px-4 font-body text-sm font-semibold text-surface hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {addedAll ? <><Check className="h-3.5 w-3.5" /> Added</> : <><ShoppingCart className="h-3.5 w-3.5" /> Add All to Cart</>}
            </button>
          </span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mt-4 mb-5 flex gap-2 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 rounded-full px-4 py-1.5 font-body text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-fg text-surface'
                : 'border border-border text-fg hover:bg-bg'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {visible.map(item => (
          <WishlistCard key={item.id} item={item} onRemove={() => removeItem(item.id)} />
        ))}
      </div>

      {remaining > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowCount(s => s + 8)}
            className="rounded-lg border border-store-primary px-6 py-2.5 font-body text-sm font-semibold text-store-primary hover:bg-store-primary/5 transition-colors"
          >
            View {remaining} more saved items
          </button>
        </div>
      )}
    </main>
  )
}
