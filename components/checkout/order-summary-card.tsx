import Image from 'next/image'
import { Lock, RotateCcw, Truck } from 'lucide-react'
import type { CartItem } from '@/lib/store/cart'
import { formatCurrency } from '@/lib/utils'

export function OrderSummaryCard({
  items,
  subtotal,
  discount,
  shippingFee,
  total,
  totalLabel = 'Total',
}: {
  items: CartItem[]
  subtotal: number
  discount: number
  shippingFee: number
  total: number
  totalLabel?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-heading text-sm font-bold text-fg">Order Summary</h3>
        <span className="font-body text-xs text-muted-warm">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
      </div>

      <div className="space-y-3 mb-3">
        {items.map(item => (
          <div key={`${item.productId}-${item.size ?? ''}`} className="flex items-center gap-3">
            <div className="relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-lg bg-bg">
              {item.image && <Image src={item.image} alt={item.name} fill sizes="52px" className="object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-body text-sm font-bold text-fg line-clamp-1">{item.name}</p>
              <p className="font-body text-xs text-muted-warm">
                {item.size ? `Size: ${item.size}` : ''}{item.size ? ' · ' : ''}Qty: {item.quantity}
              </p>
            </div>
            <p className="shrink-0 font-body text-sm font-bold text-fg">{formatCurrency(item.price * item.quantity)}</p>
          </div>
        ))}
      </div>

      <dl className="space-y-1.5 border-t border-border pt-3 font-body text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-warm">Subtotal</dt>
          <dd className="text-fg">{formatCurrency(subtotal)}</dd>
        </div>
        {discount > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted-warm">Discount (MRP)</dt>
            <dd className="font-medium text-success">−{formatCurrency(discount)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-muted-warm">Delivery</dt>
          <dd className={shippingFee === 0 ? 'font-medium text-success' : 'text-fg'}>
            {shippingFee === 0 ? 'Free' : formatCurrency(shippingFee)}
          </dd>
        </div>
        <div className="mt-1 flex justify-between border-t border-border pt-2.5">
          <dt className="font-heading text-[17px] font-bold text-fg">{totalLabel}</dt>
          <dd className="font-heading text-[17px] font-bold text-fg">{formatCurrency(total)}</dd>
        </div>
      </dl>
    </div>
  )
}

export function TrustBar() {
  return (
    <div className="space-y-2.5 rounded-xl border border-border bg-surface p-4 font-body text-xs text-muted-warm sm:p-5">
      <div className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 shrink-0" /> Secure checkout — your data is encrypted</div>
      <div className="flex items-center gap-2"><RotateCcw className="h-3.5 w-3.5 shrink-0" /> Easy 7-day returns on all orders</div>
      <div className="flex items-center gap-2"><Truck className="h-3.5 w-3.5 shrink-0" /> Free delivery on this order</div>
    </div>
  )
}
