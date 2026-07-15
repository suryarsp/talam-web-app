'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Clock, MessageCircle, ShieldCheck } from 'lucide-react'
import { CheckoutHeader } from '@/components/checkout/checkout-header'
import { StepIndicator } from '@/components/checkout/step-indicator'
import { OrderSummaryCard } from '@/components/checkout/order-summary-card'
import type { CartItem } from '@/lib/store/cart'

// ponytail: inline tenant config until SSR wrapper is added
const tenant = { name: 'Talam Store' }

type Order = {
  orderId: string
  placedAt: string
  items: CartItem[]
  subtotal: number
  discount: number
  shippingFee: number
  total: number
  address: { name: string; phone: string; line1: string; line2: string; pincode: string; city: string; state: string }
  paymentMethod: 'upi' | 'instamojo' | 'razorpay'
}

const PAYMENT_LABEL: Record<Order['paymentMethod'], string> = {
  upi: 'UPI',
  instamojo: 'Instamojo',
  razorpay: 'Razorpay',
}

export default function OrderConfirmedPage() {
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('talam-last-order')
    if (!raw) {
      router.replace('/')
      return
    }
    setOrder(JSON.parse(raw))
  }, [router])

  if (!order) return null

  const estimatedDelivery = new Date(Date.now() + 4 * 86400_000).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div className="min-h-screen bg-bg pb-10">
      <CheckoutHeader storeName={tenant.name} />
      <StepIndicator current={3} />

      <main className="mx-auto max-w-lg px-4 pb-4">
        {/* Success hero */}
        <div className="relative overflow-hidden rounded-xl bg-success/10 px-6 py-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-success">
            <Check className="h-8 w-8 text-surface" strokeWidth={3} />
          </div>
          <h1 className="font-heading text-xl font-bold text-fg">Order Confirmed! 🎉</h1>
          <p className="mt-1 font-body text-sm text-muted-warm">
            Thanks {order.address.name.split(' ')[0] || 'there'}! Your order is packed and on its way.
          </p>
        </div>

        {/* Order ID card */}
        <div className="mt-4 rounded-xl border border-border bg-surface p-4 text-center sm:p-5">
          <p className="font-body text-[11px] uppercase tracking-[0.04em] text-muted-warm">Order ID</p>
          <p className="font-body text-base font-bold text-fg">#{order.orderId}</p>
          <div className="my-3 h-px bg-border" />
          <p className="font-body text-[11px] uppercase tracking-[0.04em] text-muted-warm">Estimated Delivery</p>
          <p className="font-body text-sm font-semibold text-success">{estimatedDelivery} · Standard delivery</p>
        </div>

        <div className="mt-4">
          <OrderSummaryCard
            items={order.items}
            subtotal={order.subtotal}
            discount={order.discount}
            shippingFee={order.shippingFee}
            total={order.total}
            totalLabel="Total Paid"
          />
        </div>

        {/* Delivering to */}
        <div className="mt-4 rounded-xl border border-border bg-surface p-4 sm:p-5">
          <p className="mb-1.5 font-body text-[13px] font-bold text-fg">Delivering To</p>
          <p className="font-body text-sm text-fg">{order.address.name}</p>
          <p className="font-body text-sm text-muted-warm">
            {[order.address.line1, order.address.line2, order.address.city, order.address.state, order.address.pincode].filter(Boolean).join(', ')}
          </p>
        </div>

        {/* Payment */}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-surface p-4 sm:p-5">
          <div>
            <p className="mb-1 font-body text-[13px] font-bold text-fg">Payment</p>
            <p className="font-body text-sm text-muted-warm">{PAYMENT_LABEL[order.paymentMethod]} · ₹{order.total.toLocaleString('en-IN')}</p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1">
            <Check className="h-3 w-3 text-success" />
            <span className="font-body text-[11px] font-medium text-success">Verified</span>
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-5 flex flex-col gap-2.5">
          <button className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-store-primary font-body text-sm font-bold text-surface hover:opacity-90">
            <Clock className="h-4 w-4" /> Track My Order
          </button>
          <button className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[#25D366] font-body text-sm font-bold text-surface hover:opacity-90">
            <MessageCircle className="h-4 w-4" /> Share on WhatsApp
          </button>
          <button onClick={() => router.push('/')} className="flex h-12 w-full items-center justify-center rounded-[10px] border-[1.5px] border-border font-body text-sm font-semibold text-fg hover:bg-bg">
            Continue Shopping
          </button>
        </div>

        {/* Reassurance */}
        <div className="mt-5 space-y-2 rounded-xl border border-success/20 bg-success/5 p-4 font-body text-xs text-fg">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
            You&apos;ll get a call from {tenant.name} to confirm your order.
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
            7-day hassle-free return if you&apos;re not satisfied.
          </div>
        </div>

        <p className="mt-5 text-center font-body text-xs text-muted-warm">Powered by talam</p>
      </main>
    </div>
  )
}
