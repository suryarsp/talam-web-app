'use client'

import { use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Package, Truck, CheckCircle, XCircle, RotateCcw, Copy } from 'lucide-react'

// ponytail: inline mock until real order history API exists (same data as /orders)
type MockOrderStatus = 'Out for Delivery' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Return Pickup'
type MockOrder = {
  id: string
  orderId: string
  date: Date
  status: MockOrderStatus
  items: { product: { name: string; slug: string; images: string[] }; size: string; quantity: number; price: number }[]
  total: number
  trackingId?: string
  carrier?: string
  expectedDate?: string
  refundAmount?: number
  returnWindow?: string
}

const allOrders: MockOrder[] = [
  {
    id: 'order-001', orderId: 'ORD-2649', date: new Date('2026-06-28'),
    status: 'Out for Delivery',
    items: [
      { product: { name: 'Kanjivaram Silk Saree', slug: 'kanjivaram-silk-saree', images: ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600'] }, size: 'M', quantity: 1, price: 2499 },
      { product: { name: 'Zari Border Dupatta', slug: 'zari-border-dupatta', images: ['https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600'] }, size: 'Free Size', quantity: 1, price: 699 },
    ],
    total: 2998, expectedDate: 'Arrives today by 7 PM',
  },
  {
    id: 'order-002', orderId: 'ORD-2641', date: new Date('2026-06-24'),
    status: 'Shipped',
    items: [{ product: { name: 'Pochampally Ikat Saree', slug: 'pochampally-ikat-saree', images: ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600'] }, size: 'L', quantity: 1, price: 1899 }],
    total: 1899, trackingId: '9876543210', carrier: 'DTDC', expectedDate: 'Expected 2 Jul',
  },
  {
    id: 'order-003', orderId: 'ORD-2618', date: new Date('2026-06-10'),
    status: 'Delivered',
    items: [{ product: { name: 'Zari Border Dupatta', slug: 'zari-border-dupatta', images: ['https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600'] }, size: 'Free Size', quantity: 1, price: 699 }],
    total: 699, expectedDate: 'Delivered on 13 Jun 2026',
  },
  {
    id: 'order-004', orderId: 'ORD-2605', date: new Date('2026-06-02'),
    status: 'Cancelled',
    items: [{ product: { name: 'Block Print Kurti Set', slug: 'block-print-kurti-set', images: ['https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=600'] }, size: 'M', quantity: 1, price: 1299 }],
    total: 1299, refundAmount: 1299,
  },
  {
    id: 'order-005', orderId: 'ORD-2590', date: new Date('2026-05-18'),
    status: 'Return Pickup',
    items: [{ product: { name: 'Anarkali Suit Set', slug: 'anarkali-suit-set', images: ['https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600'] }, size: 'L', quantity: 1, price: 2099 }],
    total: 2099, returnWindow: 'Pickup scheduled: 30 Jun · 10 AM – 2 PM',
  },
]

const statusSteps: Record<string, { label: string; icon: typeof Package }[]> = {
  'Out for Delivery': [
    { label: 'Ordered', icon: Package },
    { label: 'Shipped', icon: Truck },
    { label: 'Out for Delivery', icon: Truck },
    { label: 'Delivered', icon: CheckCircle },
  ],
  'Shipped': [
    { label: 'Ordered', icon: Package },
    { label: 'Shipped', icon: Truck },
    { label: 'Out for Delivery', icon: Truck },
    { label: 'Delivered', icon: CheckCircle },
  ],
  'Delivered': [
    { label: 'Ordered', icon: Package },
    { label: 'Shipped', icon: Truck },
    { label: 'Out for Delivery', icon: Truck },
    { label: 'Delivered', icon: CheckCircle },
  ],
  'Cancelled': [
    { label: 'Ordered', icon: Package },
    { label: 'Cancelled', icon: XCircle },
  ],
  'Return Pickup': [
    { label: 'Return Requested', icon: RotateCcw },
    { label: 'Pickup Scheduled', icon: Truck },
    { label: 'Returned', icon: CheckCircle },
  ],
}

function activeStep(status: string) {
  const steps = statusSteps[status] ?? []
  return steps.findIndex(s => s.label === status || s.label.startsWith(status.split(' ')[0]))
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const order = allOrders.find(o => o.id === id)

  if (!order) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="font-body text-sm text-muted-warm">Order not found.</p>
        <Link href="/orders" className="mt-4 inline-block font-body text-sm font-semibold text-store-primary">← Back to Orders</Link>
      </main>
    )
  }

  const steps = statusSteps[order.status] ?? []
  const currentStep = activeStep(order.status)
  const isCancelled = order.status === 'Cancelled'

  return (
    <main className="mx-auto max-w-3xl px-3 py-4 sm:px-8 sm:py-10 overflow-x-hidden">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/orders" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border hover:bg-bg transition-colors">
          <ArrowLeft className="h-4 w-4 text-fg" />
        </Link>
        <div className="min-w-0">
          <h1 className="font-heading text-lg sm:text-xl font-bold text-fg">Order #{order.orderId}</h1>
          <p className="font-body text-xs text-muted-warm">Placed on {formatDate(order.date)}</p>
        </div>
      </div>

      {/* Status tracker */}
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-6 mb-5">
        <h2 className="font-heading text-sm font-bold text-fg mb-4">Order Status</h2>
        <div className="flex items-start justify-between gap-1">
          {steps.map((step, i) => {
            const done = i <= currentStep
            const StepIcon = step.icon
            return (
              <div key={step.label} className="flex flex-1 flex-col items-center text-center">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  done
                    ? isCancelled && i === currentStep ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
                    : 'bg-bg text-muted-warm'
                }`}>
                  <StepIcon className="h-4 w-4" />
                </div>
                <p className={`mt-1.5 font-body text-[10px] sm:text-xs font-medium leading-tight ${done ? 'text-fg' : 'text-muted-warm'}`}>
                  {step.label}
                </p>
                {i < steps.length - 1 && (
                  <div className={`absolute h-0.5 ${done ? 'bg-success' : 'bg-border'}`} />
                )}
              </div>
            )
          })}
        </div>
        {order.expectedDate && (
          <p className="mt-4 rounded-lg bg-bg px-3 py-2 font-body text-xs text-fg">{order.expectedDate}</p>
        )}
      </div>

      {/* Items */}
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-6 mb-5">
        <h2 className="font-heading text-sm font-bold text-fg mb-3">Items ({order.items.length})</h2>
        <div className="divide-y divide-border">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-bg">
                {item.product.images[0] && (
                  <Image src={item.product.images[0]} alt={item.product.name} fill sizes="64px" className="object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/product/${item.product.slug}`} className="font-body text-sm font-semibold text-fg line-clamp-1 hover:text-store-primary">
                  {item.product.name}
                </Link>
                <p className="font-body text-xs text-muted-warm">Size: {item.size} · Qty: {item.quantity}</p>
              </div>
              <p className="shrink-0 font-body text-sm font-bold text-fg">₹{item.price.toLocaleString('en-IN')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Price breakdown */}
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-6 mb-5">
        <h2 className="font-heading text-sm font-bold text-fg mb-3">Price Details</h2>
        <div className="space-y-2">
          <div className="flex justify-between font-body text-sm text-fg">
            <span>Subtotal</span>
            <span>₹{order.total.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between font-body text-sm text-success">
            <span>Delivery</span>
            <span>FREE</span>
          </div>
          <div className="border-t border-border pt-2 flex justify-between font-body text-sm font-bold text-fg">
            <span>Total</span>
            <span>₹{order.total.toLocaleString('en-IN')}</span>
          </div>
        </div>
        {order.refundAmount && (
          <div className="mt-3 flex justify-between rounded-lg bg-success/5 px-3 py-2 font-body text-sm text-success">
            <span>Refund</span>
            <span className="font-bold">₹{order.refundAmount.toLocaleString('en-IN')}</span>
          </div>
        )}
      </div>

      {/* Tracking info */}
      {order.trackingId && (
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-6 mb-5">
          <h2 className="font-heading text-sm font-bold text-fg mb-2">Tracking</h2>
          <div className="flex items-center gap-2">
            <span className="font-body text-sm text-muted-warm">{order.carrier}</span>
            <span className="font-body text-sm font-medium text-fg">#{order.trackingId}</span>
            <button
              onClick={() => navigator.clipboard.writeText(order.trackingId!)}
              className="text-muted-warm hover:text-fg"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {(order.status === 'Out for Delivery' || order.status === 'Shipped') && (
          <button className="flex-1 sm:flex-none rounded-lg bg-store-primary px-5 py-2.5 font-body text-sm font-semibold text-surface hover:opacity-90">
            Track Package
          </button>
        )}
        {order.status === 'Delivered' && (
          <>
            <button className="flex-1 sm:flex-none rounded-lg border border-border px-5 py-2.5 font-body text-sm font-medium text-fg hover:bg-bg">
              Buy Again
            </button>
            <button className="flex-1 sm:flex-none rounded-lg border border-border px-5 py-2.5 font-body text-sm font-medium text-fg hover:bg-bg">
              Return / Exchange
            </button>
          </>
        )}
        {order.status === 'Return Pickup' && (
          <button className="flex-1 sm:flex-none rounded-lg bg-store-primary px-5 py-2.5 font-body text-sm font-semibold text-surface hover:opacity-90">
            Track Return
          </button>
        )}
        <Link href="/orders" className="flex-1 sm:flex-none rounded-lg border border-border px-5 py-2.5 text-center font-body text-sm font-medium text-fg hover:bg-bg">
          Back to Orders
        </Link>
      </div>
    </main>
  )
}
