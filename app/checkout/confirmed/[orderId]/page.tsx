import { notFound } from 'next/navigation'
import { Check, ShieldCheck } from 'lucide-react'
import { CheckoutHeader } from '@/components/checkout/checkout-header'
import { StepIndicator } from '@/components/checkout/step-indicator'
import { OrderSummaryCard } from '@/components/checkout/order-summary-card'
import { requireAuth, requireTenant } from '@/lib/auth-guard'
import { getTenantStorefront } from '@/lib/data/tenant'
import { getCustomerOrder } from '@/lib/data/storefront-orders'
import { formatDeliveryDate } from '@/lib/shipping/delivery-estimate'
import type { CartItem } from '@/lib/store/cart'
import { ConfirmedActions } from './confirmed-actions'

export const dynamic = 'force-dynamic'

const PAYMENT_LABEL: Record<string, string> = {
  upi_manual: 'UPI',
  instamojo: 'Instamojo',
  razorpay: 'Razorpay',
}

export default async function OrderConfirmedPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  const user = await requireAuth(`/checkout/confirmed/${orderId}`)
  const { tenantId } = await requireTenant()

  const [order, tenant] = await Promise.all([
    getCustomerOrder(tenantId, user.id, orderId),
    getTenantStorefront(tenantId),
  ])
  if (!order || !tenant) notFound()

  const summaryItems: CartItem[] = order.items.map((item) => ({
    productId: item.productId,
    name: item.productName,
    slug: item.slug,
    price: item.unitPrice,
    size: item.size ?? undefined,
    image: item.image ?? '',
    tenantId,
    quantity: item.quantity,
  }))

  // The courier's own ETA when Shiprocket answered at order time; otherwise the store's typed
  // blurb, and only failing that the four-day guess this page has always shown.
  const estimatedDelivery =
    order.estimatedDeliveryDays !== null
      ? `${formatDeliveryDate(order.createdAt, order.estimatedDeliveryDays)} · Standard delivery`
      : (tenant.deliveryEstimateText ?? `${formatDeliveryDate(order.createdAt, 4)} · Standard delivery`)

  const paid = order.paymentStatus === 'paid'

  return (
    <div className="min-h-screen bg-bg pb-10">
      <CheckoutHeader storeName={tenant.name} />
      <StepIndicator current={4} />

      <main className="mx-auto max-w-lg px-4 pb-4">
        <div className="relative overflow-hidden rounded-xl bg-success/10 px-6 py-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-success">
            <Check className="h-8 w-8 text-surface" strokeWidth={3} />
          </div>
          <h1 className="font-heading text-xl font-bold text-fg">Order Confirmed! 🎉</h1>
          <p className="mt-1 font-body text-sm text-muted-warm">
            Thanks {order.address.name?.split(' ')[0] ?? 'there'}! Your order is packed and on its way.
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-surface p-4 text-center sm:p-5">
          <p className="font-body text-[11px] uppercase tracking-[0.04em] text-muted-warm">Order ID</p>
          <p className="font-body text-base font-bold text-fg">{order.code}</p>
          <div className="my-3 h-px bg-border" />
          <p className="font-body text-[11px] uppercase tracking-[0.04em] text-muted-warm">Estimated Delivery</p>
          <p className="font-body text-sm font-semibold text-success">{estimatedDelivery}</p>
        </div>

        <div className="mt-4">
          <OrderSummaryCard
            items={summaryItems}
            subtotal={order.itemsTotal}
            discount={order.discount}
            shippingFee={order.shippingFee}
            total={order.total}
            totalLabel={paid ? 'Total Paid' : order.paymentProvider === 'upi_manual' ? 'Total Paid (pending confirmation)' : 'Total Due'}
          />
        </div>

        <div className="mt-4 rounded-xl border border-border bg-surface p-4 sm:p-5">
          <p className="mb-1.5 font-body text-[13px] font-bold text-fg">Delivering To</p>
          <p className="font-body text-sm text-fg">{order.address.name}</p>
          <p className="font-body text-sm text-muted-warm">
            {[order.address.line1, order.address.line2, order.address.city, order.address.state, order.address.pincode]
              .filter(Boolean)
              .join(', ')}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-surface p-4 sm:p-5">
          <div>
            <p className="mb-1 font-body text-[13px] font-bold text-fg">Payment</p>
            <p className="font-body text-sm text-muted-warm">
              {PAYMENT_LABEL[order.paymentProvider ?? ''] ?? 'Payment'} · ₹{order.total.toLocaleString('en-IN')}
            </p>
          </div>
          <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 ${paid ? 'bg-success/10' : 'bg-amber/10'}`}>
            <Check className={`h-3 w-3 ${paid ? 'text-success' : 'text-amber'}`} />
            <span className={`font-body text-[11px] font-medium ${paid ? 'text-success' : 'text-amber'}`}>
              {paid ? 'Verified' : 'Awaiting confirmation'}
            </span>
          </div>
        </div>

        <ConfirmedActions
          orderId={order.id}
          orderCode={order.code}
          storeName={tenant.name}
          whatsappNumber={tenant.whatsappNumber}
        />

        <div className="mt-5 space-y-2 rounded-xl border border-success/20 bg-success/5 p-4 font-body text-xs text-fg">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
            You&apos;ll get a call from {tenant.name} to confirm your order.
          </div>
          {tenant.returnWindowDays ? (
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
              {tenant.returnWindowDays}-day hassle-free return if you&apos;re not satisfied.
            </div>
          ) : null}
        </div>

        <p className="mt-5 text-center font-body text-xs text-muted-warm">Powered by talam</p>
      </main>
    </div>
  )
}
