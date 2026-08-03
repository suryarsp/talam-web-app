'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { StoreLink, useStoreHref } from '@/components/store/store-context'
import { ShinyButton } from '@/components/ui/shiny-button'
import { formatCurrency } from '@/lib/utils'
import { useCartStore, type CartItem } from '@/lib/store/cart'
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Heart, Lock, RotateCcw, Truck, Tag, Star, Check, X, ChevronDown } from 'lucide-react'

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
      <StoreLink href={`/product/${item.slug}`} className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-bg sm:h-28 sm:w-24">
        <DiscountBadge price={item.price} comparePrice={item.comparePrice} />
        {item.image ? (
          <Image src={item.image} alt={item.name} fill sizes="96px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-warm">No image</div>
        )}
      </StoreLink>

      <div className="flex flex-1 flex-col justify-between min-w-0">
        <div>
          <StoreLink href={`/product/${item.slug}`} className="font-body text-base font-bold leading-[19px] text-fg line-clamp-2 hover:text-store-primary">
            {item.name}
          </StoreLink>
          <p className="mt-0.5 font-body text-xs text-muted-warm">
            {item.size ? `Size: ${item.size}` : ''}{item.size && item.fabric ? ' · ' : ''}{item.fabric ?? ''}
          </p>
        </div>

        <div className="mt-1.5">
          <div className="flex items-center gap-2">
            <span className="font-body text-[18px] font-extrabold leading-[22px] text-store-primary">
              {formatCurrency(item.price)}
            </span>
            {item.comparePrice && item.comparePrice > item.price && (
              <span className="font-body text-xs text-muted-warm line-through">
                {formatCurrency(item.comparePrice)}
              </span>
            )}
            {savings > 0 && (
              <span className="font-body text-xs font-medium text-success">
                Save {formatCurrency(savings)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 gap-1 flex-wrap">
          <div className="flex items-center gap-1 rounded-full border border-border px-0.5 py-0.5">
            <button
              onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}
              className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-fg hover:bg-bg transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
            <span className="flex w-5 items-center justify-center font-body text-xs sm:text-sm font-semibold text-fg tabular-nums">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}
              className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-fg hover:bg-bg transition-colors"
              aria-label="Increase quantity"
            >
              <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-warm hover:bg-bg hover:text-store-primary transition-colors"
              aria-label="Save for later"
            >
              <Heart className="h-4 w-4" />
            </button>
            <button
              onClick={() => removeItem(item.productId, item.size)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-store-primary hover:bg-danger/10 hover:text-danger transition-colors"
              aria-label="Remove item"
            >
              <Trash2 className="h-4 w-4" />
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
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-warm" />
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="Have a coupon? Enter code"
            className="h-11 w-full rounded-lg border border-border bg-surface pl-9 pr-3 font-body text-sm text-fg placeholder:text-muted-warm/60 focus:outline-none"
          />
        </div>
        <button
          onClick={() => { if (code.trim()) setApplied(code.trim()) }}
          className="h-11 shrink-0 rounded-lg bg-success px-5 font-body text-sm font-semibold text-surface hover:opacity-90 transition-opacity"
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
    <div className="flex gap-2 overflow-x-auto no-scrollbar font-body text-xs text-muted-warm lg:flex-col lg:gap-2.5 lg:overflow-visible">
      <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 lg:border-0 lg:px-0 lg:py-0"><Lock className="h-3.5 w-3.5" /> Secure checkout</div>
      <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 lg:border-0 lg:px-0 lg:py-0"><RotateCcw className="h-3.5 w-3.5" /> Easy 30-day returns</div>
      <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 lg:hidden"><Truck className="h-3.5 w-3.5" /> Free delivery above {formatCurrency(tenant.freeDeliveryAbove)}</div>
    </div>
  )
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <ShoppingBag className="mb-4 h-20 w-20 text-border animate-[pulse_2.5s_ease-in-out_infinite]" strokeWidth={1} />
      <h2 className="mb-2 font-heading text-xl font-bold text-fg">Your cart is empty</h2>
      <p className="mb-6 font-body text-sm text-muted-warm">Looks like you haven&apos;t added anything yet.</p>
      <StoreLink
        href="/"
        className="inline-flex items-center gap-2 rounded-lg bg-store-primary px-6 py-3 font-body text-sm font-semibold text-surface hover:opacity-90 transition-opacity"
      >
        Continue Shopping
      </StoreLink>
    </div>
  )
}

export default function CartPage() {
  const router = useRouter()
  const checkoutHref = useStoreHref('/checkout')
  const items = useCartStore(s => s.items)
  const total = useCartStore(s => s.total)
  const count = useCartStore(s => s.count)
  const clear = useCartStore(s => s.clear)
  const [detailsOpen, setDetailsOpen] = useState(false)

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
    <main className="mx-auto max-w-6xl px-3 py-4 pb-24 sm:px-12 sm:py-10 sm:pb-10 lg:pb-10 overflow-x-hidden">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <StoreLink href="/" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border hover:bg-bg transition-colors lg:hidden">
            <ArrowLeft className="h-4 w-4 text-fg" />
          </StoreLink>
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
                Add <span className="font-bold">{formatCurrency(amountToFreeDelivery)}</span> more to get free delivery on this order!
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
                <dd className="text-fg">{formatCurrency(subtotal)}</dd>
              </div>
              {mrpDiscount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-warm">MRP Discount</dt>
                  <dd className="font-medium text-success">−{formatCurrency(mrpDiscount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-warm">Delivery</dt>
                <dd className={shippingFee === 0 ? 'font-medium text-success' : 'text-fg'}>
                  {shippingFee === 0 ? 'Free' : formatCurrency(shippingFee)}
                </dd>
              </div>
              <div className="border-t border-border pt-3 flex justify-between">
                <dt className="text-base font-bold text-fg">Total</dt>
                <dd className="text-base font-bold text-fg">{formatCurrency(grandTotal)}</dd>
              </div>
            </dl>

            {totalSavings > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-success/5 border border-success/20 px-3 py-2">
                <Star className="h-4 w-4 shrink-0 text-success" />
                <span className="font-body text-xs font-medium text-success">
                  You&apos;re saving {formatCurrency(totalSavings)} on this order!
                </span>
              </div>
            )}

            <ShinyButton
              onClick={() => router.push(checkoutHref)}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-store-primary font-body text-md font-semibold text-surface"
            >
              Proceed to Checkout <ArrowLeft className="h-4 w-4 rotate-180" />
            </ShinyButton>

            <StoreLink
              href="/"
              className="mt-3 flex items-center justify-center gap-1.5 font-body text-sm text-store-primary hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Continue Shopping
            </StoreLink>

            <div className="mt-5 border-t border-border pt-4">
              <TrustBadges />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: trust badges + collapsible price details */}
      <div className="mt-6 space-y-4 lg:hidden">
        <TrustBadges />

        {/* Price details accordion */}
        <div className="rounded-xl border border-border bg-surface">
          <button
            onClick={() => setDetailsOpen(v => !v)}
            className="flex w-full items-center justify-between px-4 py-3"
          >
            <span className="font-heading text-sm font-bold text-fg">Price Details</span>
            <ChevronDown className={`h-4 w-4 text-muted-warm transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
          </button>
          {detailsOpen && (
            <dl className="space-y-1.5 border-t border-border px-4 py-3 font-body text-sm">
              <div className="flex justify-between"><dt className="text-muted-warm">Items ({itemCount})</dt><dd className="text-fg">{formatCurrency(subtotal)}</dd></div>
              {mrpDiscount > 0 && <div className="flex justify-between"><dt className="text-muted-warm">MRP Discount</dt><dd className="text-success">−{formatCurrency(mrpDiscount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted-warm">Delivery</dt><dd className={shippingFee === 0 ? 'text-success' : 'text-fg'}>{shippingFee === 0 ? 'Free' : formatCurrency(shippingFee)}</dd></div>
              <div className="border-t border-border pt-2 flex justify-between"><dt className="font-bold text-fg">Total</dt><dd className="font-bold text-fg">{formatCurrency(grandTotal)}</dd></div>
            </dl>
          )}
        </div>

        {totalSavings > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-success/5 border border-success/20 px-3 py-2.5">
            <Star className="h-4 w-4 shrink-0 text-success" />
            <span className="font-body text-xs font-medium text-success">You&apos;re saving {formatCurrency(totalSavings)} on this order 🎉</span>
          </div>
        )}

        <StoreLink href="/" className="flex items-center justify-center gap-1.5 pb-4 font-body text-sm text-store-primary hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Continue Shopping
        </StoreLink>
      </div>

      {/* Mobile fixed bottom checkout bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between gap-3 border-t border-border/40 bg-surface/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="min-w-0">
          <p className="font-body text-[11px] text-muted-warm">Total ({itemCount} items)</p>
          <p className="font-body text-lg font-bold text-store-primary">{formatCurrency(grandTotal)}</p>
        </div>
        <ShinyButton
          onClick={() => router.push(checkoutHref)}
          className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-store-primary px-6 font-body text-sm font-semibold text-surface"
        >
          Checkout <ArrowLeft className="h-4 w-4 rotate-180" />
        </ShinyButton>
      </div>
    </main>
  )
}
