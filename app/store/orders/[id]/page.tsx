import Image from 'next/image'
import { notFound } from 'next/navigation'
import { StoreLink } from '@/components/store/store-context'
import { ArrowLeft, CheckCircle, FileText, Package, RotateCcw, Truck, XCircle } from 'lucide-react'
import { requireAuth, requireTenant } from '@/lib/auth-guard'
import { getCustomerOrder } from '@/lib/data/storefront-orders'
import { ORDER_STATUS_LABEL, timelineFor } from '@/lib/order-status'
import type { OrderStatus } from '@prisma/client'
import { BuyAgainButton } from '../buy-again-button'
import { CopyButton } from './copy-button'

export const dynamic = 'force-dynamic'

const STEP_ICON: Record<OrderStatus, typeof Package> = {
  pending: Package,
  confirmed: CheckCircle,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: XCircle,
  returned: RotateCcw,
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireAuth(`/orders/${id}`)
  const { tenantId } = await requireTenant()

  const order = await getCustomerOrder(tenantId, user.id, id)
  if (!order) notFound()

  const { steps, currentIndex } = timelineFor(order.status)
  const isTerminalBad = order.status === 'cancelled' || order.status === 'returned'

  return (
    <main className="mx-auto max-w-3xl overflow-x-hidden px-3 py-4 sm:px-8 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <StoreLink
          href="/orders"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border transition-colors hover:bg-bg"
        >
          <ArrowLeft className="h-4 w-4 text-fg" />
        </StoreLink>
        <div className="min-w-0">
          <h1 className="font-heading text-lg font-bold text-fg sm:text-xl">Order {order.code}</h1>
          <p className="font-body text-xs text-muted-warm">Placed on {formatDate(order.createdAt)}</p>
        </div>
      </div>

      <div className="mb-5 rounded-xl border border-border bg-surface p-4 sm:p-6">
        <h2 className="mb-4 font-heading text-sm font-bold text-fg">Order Status</h2>
        <div className="flex items-start justify-between gap-1">
          {steps.map((step, i) => {
            const done = i <= currentIndex
            const StepIcon = STEP_ICON[step]
            const bad = isTerminalBad && i === currentIndex
            return (
              <div key={step} className="flex flex-1 flex-col items-center text-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    done ? (bad ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success') : 'bg-bg text-muted-warm'
                  }`}
                >
                  <StepIcon className="h-4 w-4" />
                </div>
                <p
                  className={`mt-1.5 font-body text-[10px] font-medium leading-tight sm:text-xs ${
                    done ? 'text-fg' : 'text-muted-warm'
                  }`}
                >
                  {ORDER_STATUS_LABEL[step]}
                </p>
              </div>
            )
          })}
        </div>
        {order.paymentStatus !== 'paid' && order.status === 'pending' && (
          <p className="mt-4 rounded-lg bg-amber/10 px-3 py-2 font-body text-xs text-fg">
            We&apos;re confirming your payment. You&apos;ll get an update as soon as it clears.
          </p>
        )}
      </div>

      <div className="mb-5 rounded-xl border border-border bg-surface p-4 sm:p-6">
        <h2 className="mb-3 font-heading text-sm font-bold text-fg">Items ({order.items.length})</h2>
        <div className="divide-y divide-border">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-bg">
                {item.image && <Image src={item.image} alt={item.productName} fill sizes="64px" className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                {item.slug ? (
                  <StoreLink
                    href={`/product/${item.slug}`}
                    className="line-clamp-1 font-body text-sm font-semibold text-fg hover:text-store-primary"
                  >
                    {item.productName}
                  </StoreLink>
                ) : (
                  <p className="line-clamp-1 font-body text-sm font-semibold text-fg">{item.productName}</p>
                )}
                <p className="font-body text-xs text-muted-warm">
                  {item.size ? `Size: ${item.size} · ` : ''}Qty: {item.quantity}
                </p>
              </div>
              <p className="shrink-0 font-body text-sm font-bold text-fg">
                ₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-5 rounded-xl border border-border bg-surface p-4 sm:p-6">
        <h2 className="mb-3 font-heading text-sm font-bold text-fg">Price Details</h2>
        <div className="space-y-2">
          <div className="flex justify-between font-body text-sm text-fg">
            <span>Items</span>
            <span>₹{order.itemsTotal.toLocaleString('en-IN')}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between font-body text-sm text-success">
              <span>Discount{order.discountCode ? ` (${order.discountCode})` : ''}</span>
              <span>−₹{order.discount.toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className={`flex justify-between font-body text-sm ${order.shippingFee === 0 ? 'text-success' : 'text-fg'}`}>
            <span>Delivery</span>
            <span>{order.shippingFee === 0 ? 'FREE' : `₹${order.shippingFee.toLocaleString('en-IN')}`}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 font-body text-sm font-bold text-fg">
            <span>Total</span>
            <span>₹{order.total.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      <div className="mb-5 rounded-xl border border-border bg-surface p-4 sm:p-6">
        <h2 className="mb-2 font-heading text-sm font-bold text-fg">Delivery Address</h2>
        <p className="font-body text-sm text-fg">{order.address.name}</p>
        <p className="font-body text-sm text-muted-warm">
          {[order.address.line1, order.address.line2, order.address.city, order.address.state, order.address.pincode]
            .filter(Boolean)
            .join(', ')}
        </p>
        <p className="font-body text-sm text-muted-warm">{order.address.phone}</p>
      </div>

      {order.trackingId && (
        <div className="mb-5 rounded-xl border border-border bg-surface p-4 sm:p-6">
          <h2 className="mb-2 font-heading text-sm font-bold text-fg">Tracking</h2>
          <div className="flex items-center gap-2">
            <span className="font-body text-sm font-medium text-fg">#{order.trackingId}</span>
            <CopyButton value={order.trackingId} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <BuyAgainButton order={order} tenantId={tenantId} />
        <StoreLink
          href={`/orders/${order.id}/invoice`}
          className="flex items-center gap-1.5 rounded-lg border border-border px-5 py-2.5 font-body text-sm font-medium text-fg hover:bg-bg"
        >
          <FileText className="h-4 w-4" /> Invoice
        </StoreLink>
        <StoreLink
          href="/orders"
          className="flex-1 rounded-lg border border-border px-5 py-2.5 text-center font-body text-sm font-medium text-fg hover:bg-bg sm:flex-none"
        >
          Back to Orders
        </StoreLink>
      </div>
    </main>
  )
}
