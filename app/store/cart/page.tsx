'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCartStore, type CartItem } from '@/lib/store/cart'
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Heart, Lock, RotateCcw, Truck, Tag, Star, Check, X } from 'lucide-react'

// ponytail: inline tenant config until SSR wrapper is added
const tenant = { name: 'Talam Store', freeDeliveryAbove: 999, shippingFee: 99 }

function DiscountBadge({ price, comparePrice }: { price: number; comparePrice?: number | null }) {
  if (!comparePrice || comparePrice <= price) return null
  const pct = Math.round(((comparePrice - price) / comparePrice) * 100)
  return (
    <span className="absolute left-1.5 top-1.5 z-10 rounded bg-store-primary px-1.5 py-0.5 font-body text-[10px] font-bold text-surface">
      {pct}% OFF
    </span>
  )
}

function CartItemRow({ item }: { item: CartItem }) {
  const updateQuantity = useCartStore(s => s.updateQuantity)
  const removeItem = useCartStore(s => s.removeItem)
  const savings = item.comparePrice && item.comparePrice > item.price ? item.comparePrice - item.price : 0

  return (
    <div className="flex gap-3 border-b border-border px-3 py-4 last:border-b-0 sm:gap-4 sm:px-6 sm:py-5">
      <Link href={`/product/${item.slug}`} className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-bg sm:h-28 sm:w-24">
        <DiscountBadge price={item.price} comparePrice={item.comparePrice} />
        {item.image ? (
          <Image src={item.image} alt={item.name} fill sizes="96px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-warm">No image</div>
        )}
      </Link>

      <div className="flex flex-1 flex-col justify-between min-w-0">
        <div>
          <Link href={`/product/${item.slug}`} className="font-body text-[15px] font-semibold leading-[18px] text-fg line-clamp-2 hover:text-store-primary">
            {item.name}
          </Link>
          <p className="mt-0.5 font-body text-xs text-muted-warm">
            {item.size ? `Size: ${item.size}` : ''}{item.size && item.fabric ? ' · ' : ''}{item.fabric ?? ''}
          </p>
        </div>

        <div className="mt-1.5">
          <div className="flex items-center gap-2">
            <span className="font-body text-[18px] font-extrabold leading-[22px] text-store-primary">
              ₹{item.price.toLocaleString('en-IN')}
            </span>
            {item.comparePrice && item.comparePrice > item.price && (
              <span className="font-body text-xs text-muted-warm line-through">
                ₹{item.comparePrice.toLocaleString('en-IN')}
              </span>
            )}
            {savings > 0 && (
              <span className="font-body text-xs font-medium text-success">
                Save ₹{savings.toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 gap-1 flex-wrap">
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}
              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-l-lg border border-border text-fg hover:bg-bg transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
            <span className="flex h-7 w-7 sm:h-8 sm:w-9 items-center justify-center border-y border-border font-body text-xs sm:text-sm font-semibold text-fg tabular-nums">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}
              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-r-lg border border-border text-fg hover:bg-bg transition-colors"
              aria-label="Increase quantity"
            >
              <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1">
            <button
              className="flex items-center gap-0.5 sm:gap-1 rounded px-1.5 sm:px-2 py-1 font-body text-[11px] sm:text-xs text-muted-warm hover:text-store-primary transition-colors"
              aria-label="Save for later"
            >
              <Heart className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Save
            </button>
            <button
              onClick={() => removeItem(item.productId, item.size)}
              className="flex items-center gap-0.5 sm:gap-1 rounded px-1.5 sm:px-2 py-1 font-body text-[11px] sm:text-xs text-store-primary hover:text-danger transition-colors"
              aria-label="Remove item"
            >
              <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CouponSection() {
  const [code, setCode] = useState('')
  const [applied, setApplied] = useState<string | null>(null)

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <h3 className="mb-3 font-heading text-sm font-bold text-fg">Have a coupon?</h3>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-warm" />
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="ENTER COUPON CODE"
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 font-body text-sm text-fg placeholder:text-muted-warm/60 focus:border-store-primary focus:outline-none"
          />
        </div>
        <button
          onClick={() => { if (code.trim()) setApplied(code.trim()) }}
          className="h-10 rounded-lg bg-success px-5 font-body text-sm font-semibold text-surface hover:opacity-90 transition-opacity"
        >
          Apply
        </button>
      </div>
      {applied && (
        <div className="mt-2 flex items-center justify-between rounded-lg border border-success/30 bg-success/5 px-3 py-2">
          <span className="flex items-center gap-1.5 font-body text-xs text-success">
            <Check className="h-3.5 w-3.5" /> {applied} applied · You save ₹1,179!
          </span>
          <button onClick={() => setApplied(null)} className="text-muted-warm hover:text-fg"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
    </div>
  )
}

function TrustBadges() {
  return (
    <div className="space-y-2.5 font-body text-xs text-muted-warm">
      <div className="flex items-center gap-2"><Lock className="h-3.5 w-3.5" /> Secure checkout — data encrypted</div>
      <div className="flex items-center gap-2"><RotateCcw className="h-3.5 w-3.5" /> Easy 30-day returns</div>
      <div className="flex items-center gap-2 lg:hidden"><Truck className="h-3.5 w-3.5" /> Free delivery on orders above ₹{tenant.freeDeliveryAbove?.toLocaleString('en-IN')}</div>
    </div>
  )
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <ShoppingBag className="mb-4 h-16 w-16 text-border" strokeWidth={1} />
      <h2 className="mb-2 font-heading text-xl font-bold text-fg">Your cart is empty</h2>
      <p className="mb-6 font-body text-sm text-muted-warm">Looks like you haven&apos;t added anything yet.</p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-lg bg-store-primary px-6 py-3 font-body text-sm font-semibold text-surface hover:opacity-90 transition-opacity"
      >
        Continue Shopping
      </Link>
    </div>
  )
}

export default function CartPage() {
  const items = useCartStore(s => s.items)
  const total = useCartStore(s => s.total)
  const count = useCartStore(s => s.count)
  const clear = useCartStore(s => s.clear)

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-12 sm:py-10">
        <EmptyCart />
      </main>
    )
  }

  const itemCount = count()
  const subtotal = items.reduce((s, i) => s + (i.comparePrice && i.comparePrice > i.price ? i.comparePrice : i.price) * i.quantity, 0)
  const saleTotal = total()
  const mrpDiscount = subtotal - saleTotal
  const freeDeliveryThreshold = tenant.freeDeliveryAbove ?? 0
  const shippingFee = saleTotal >= freeDeliveryThreshold && freeDeliveryThreshold > 0 ? 0 : Number(tenant.shippingFee)
  const grandTotal = saleTotal + shippingFee
  const totalSavings = mrpDiscount
  const amountToFreeDelivery = freeDeliveryThreshold > 0 && saleTotal < freeDeliveryThreshold
    ? freeDeliveryThreshold - saleTotal
    : 0

  return (
    <main className="mx-auto max-w-6xl px-3 py-4 sm:px-12 sm:py-10 overflow-x-hidden">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link href="/" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border hover:bg-bg transition-colors lg:hidden">
            <ArrowLeft className="h-4 w-4 text-fg" />
          </Link>
          <h1 className="font-heading text-lg sm:text-[22px] font-bold leading-7 text-muted-warm truncate">
            My Cart <span className="font-body text-xs sm:text-sm font-normal">({items.length} {items.length === 1 ? 'item' : 'items'})</span>
          </h1>
        </div>
        <button onClick={clear} className="shrink-0 font-body text-[12px] sm:text-[13px] font-semibold text-danger hover:text-danger/80 transition-colors">
          Clear all
        </button>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Left column — items + coupon */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Free delivery banner */}
          {amountToFreeDelivery > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-success/10 px-4 py-2.5">
              <Truck className="h-4 w-4 shrink-0 text-success" />
              <p className="font-body text-sm text-fg">
                Add <span className="font-bold">₹{amountToFreeDelivery.toLocaleString('en-IN')}</span> more to get free delivery on this order!
              </p>
            </div>
          )}

          {/* Cart items */}
          <div className="rounded-xl border border-border bg-surface">
            {items.map(item => (
              <CartItemRow key={`${item.productId}-${item.size ?? ''}`} item={item} />
            ))}
          </div>

          {/* Coupon */}
          <CouponSection />
        </div>

        {/* Right column — order summary (desktop sidebar) */}
        <div className="hidden lg:block w-80 shrink-0 sticky top-24">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-4 font-heading text-base font-bold text-fg">Order Summary</h2>
            <dl className="space-y-2 font-body text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-warm">Items ({itemCount})</dt>
                <dd className="text-fg">₹{subtotal.toLocaleString('en-IN')}</dd>
              </div>
              {mrpDiscount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-warm">MRP Discount</dt>
                  <dd className="font-medium text-success">−₹{mrpDiscount.toLocaleString('en-IN')}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-warm">Delivery</dt>
                <dd className={shippingFee === 0 ? 'font-medium text-success' : 'text-fg'}>
                  {shippingFee === 0 ? 'Free' : `₹${shippingFee.toLocaleString('en-IN')}`}
                </dd>
              </div>
              <div className="border-t border-border pt-3 flex justify-between">
                <dt className="text-base font-bold text-fg">Total</dt>
                <dd className="text-base font-bold text-fg">₹{grandTotal.toLocaleString('en-IN')}</dd>
              </div>
            </dl>

            {totalSavings > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-success/5 border border-success/20 px-3 py-2">
                <Star className="h-4 w-4 shrink-0 text-success" />
                <span className="font-body text-xs font-medium text-success">
                  You&apos;re saving ₹{totalSavings.toLocaleString('en-IN')} on this order!
                </span>
              </div>
            )}

            <Link
              href="/checkout"
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-store-primary font-body text-md font-semibold text-surface hover:opacity-90 transition-opacity"
            >
              Proceed to Checkout <ArrowLeft className="h-4 w-4 rotate-180" />
            </Link>

            <Link
              href="/"
              className="mt-3 flex items-center justify-center gap-1.5 font-body text-sm text-store-primary hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Continue Shopping
            </Link>

            <div className="mt-5 border-t border-border pt-4">
              <TrustBadges />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: trust badges + bottom summary */}
      <div className="mt-6 space-y-4 lg:hidden">
        <div className="rounded-xl border border-border bg-surface p-4">
          <TrustBadges />
        </div>

        {/* Mobile price details */}
        <div className="border-t border-border pt-4">
          <h3 className="mb-3 font-heading text-sm font-bold text-fg">Price Details</h3>
          <dl className="space-y-1.5 font-body text-sm">
            <div className="flex justify-between"><dt className="text-muted-warm">Items ({itemCount})</dt><dd className="text-fg">₹{subtotal.toLocaleString('en-IN')}</dd></div>
            {mrpDiscount > 0 && <div className="flex justify-between"><dt className="text-muted-warm">MRP Discount</dt><dd className="text-success">−₹{mrpDiscount.toLocaleString('en-IN')}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted-warm">Delivery</dt><dd className={shippingFee === 0 ? 'text-success' : 'text-fg'}>{shippingFee === 0 ? 'Free' : `₹${shippingFee}`}</dd></div>
            <div className="border-t border-border pt-2 flex justify-between"><dt className="font-bold text-fg">Total</dt><dd className="font-bold text-fg">₹{grandTotal.toLocaleString('en-IN')}</dd></div>
          </dl>
        </div>

        {totalSavings > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-success/5 border border-success/20 px-3 py-2.5">
            <Star className="h-4 w-4 shrink-0 text-success" />
            <span className="font-body text-xs font-medium text-success">You&apos;re saving ₹{totalSavings.toLocaleString('en-IN')} on this order 🎉</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-body text-[11px] sm:text-xs text-muted-warm">Total ({itemCount} items)</p>
            <p className="font-body text-lg sm:text-xl font-bold text-store-primary">₹{grandTotal.toLocaleString('en-IN')}</p>
          </div>
          {totalSavings > 0 && <p className="shrink-0 font-body text-xs sm:text-sm font-semibold text-success">Saved ₹{totalSavings.toLocaleString('en-IN')}</p>}
        </div>

        <Link
          href="/checkout"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-store-primary font-body text-md font-semibold text-surface hover:opacity-90 transition-opacity"
        >
          Proceed to Checkout <ArrowLeft className="h-4 w-4 rotate-180" />
        </Link>

        <Link href="/" className="flex items-center justify-center gap-1.5 pb-4 font-body text-sm text-store-primary hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Continue Shopping
        </Link>
      </div>
    </main>
  )
}
