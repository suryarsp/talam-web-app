import type { AdminStaffRole, OrderStatus, PaymentStatus, Prisma } from '@prisma/client'
import { withTenant } from '@/lib/prisma'
import { refundRazorpayPayment } from '@/lib/payments/razorpay'
import { sendOrderCancelledWithRefundEmail } from '@/lib/resend'
import { canVerifyRefund } from '@/lib/data/admin-permissions'

/**
 * Super-admin order cancellation, including how the customer's money gets back to them.
 *
 * Three shapes of cancellation, decided by how the order was paid (see refundRouteFor):
 *  - never paid            → cancel outright, nothing to return
 *  - paid via Razorpay     → refund through the API first, then cancel; a failed refund
 *                            aborts the whole thing rather than half-cancelling the order
 *  - paid any other way    → two steps: a staffer uploads the UPI-transfer screenshot
 *    (COD, manual UPI)       (submitRefundProof), then an owner/support agent signs it off
 *                            (confirmRefundVerification). Only that second step cancels.
 *
 * The middle state is *not* a new OrderStatus — an order awaiting refund verification still
 * reads as pending/confirmed everywhere else, and is identified by
 * `refundProofUrl IS NOT NULL AND refundVerifiedAt IS NULL`. Adding a status value would have
 * meant teaching every status filter, badge and timeline in the app about it.
 */

/** Cancellable strictly before an AWB exists — once Shiprocket has the parcel, this flow can't
 *  recall it, and nothing here talks to Shiprocket's own cancellation API. */
export const CANCELLABLE_STATUSES: OrderStatus[] = ['pending', 'confirmed']

export function isCancellable(status: OrderStatus): boolean {
  return CANCELLABLE_STATUSES.includes(status)
}

export type RefundRoute = 'none' | 'razorpay' | 'manual'

/** Anything paid outside Razorpay lands on 'manual' — including a null provider, so an order
 *  with a missing provider errs towards a human looking at it rather than an API call. */
export function refundRouteFor(order: { paymentStatus: PaymentStatus; paymentProvider: string | null }): RefundRoute {
  if (order.paymentStatus !== 'paid') return 'none'
  return order.paymentProvider === 'razorpay' ? 'razorpay' : 'manual'
}

export type CancellationResult = { error?: string }

const ORDER_SELECT = {
  id: true,
  status: true,
  total: true,
  paymentStatus: true,
  paymentProvider: true,
  paymentId: true,
  cancelReason: true,
  refundProofUrl: true,
  refundVerifiedAt: true,
  customer: { select: { email: true } },
  tenant: { select: { name: true } },
} as const

type CancellableOrder = {
  id: string
  status: OrderStatus
  total: Prisma.Decimal
  paymentStatus: PaymentStatus
  paymentProvider: string | null
  paymentId: string | null
  cancelReason: string | null
  refundProofUrl: string | null
  refundVerifiedAt: Date | null
  customer: { email: string | null }
  tenant: { name: string }
}

function loadOrder(tenantId: string, orderId: string): Promise<CancellableOrder | null> {
  return withTenant(tenantId, (db) =>
    db.order.findFirst({ where: { id: orderId, tenantId }, select: ORDER_SELECT })
  ) as Promise<CancellableOrder | null>
}

/**
 * The one write that ends a cancellation, in a single transaction (withTenant wraps its
 * callback in one). The status is re-asserted in the WHERE clause rather than trusted from
 * the earlier read: an order that shipped in between comes back as count 0 and throws, so a
 * shipped order can never be flipped to cancelled by a stale page.
 */
async function finalizeCancellation(
  tenantId: string,
  orderId: string,
  data: Prisma.OrderUpdateManyMutationInput
): Promise<void> {
  await withTenant(tenantId, async (db) => {
    const { count } = await db.order.updateMany({
      where: { id: orderId, tenantId, status: { in: CANCELLABLE_STATUSES } },
      data,
    })
    if (count === 0) throw new Error('This order moved on before the cancellation went through — reload and try again.')
    await db.orderStatusEvent.create({ data: { tenantId, orderId, status: 'cancelled' } })
  })
}

async function notifyCustomer(order: CancellableOrder, reason: string, refunded: boolean): Promise<void> {
  if (!order.customer.email) return
  await sendOrderCancelledWithRefundEmail(order.customer.email, {
    storeName: order.tenant.name,
    orderCode: `#${order.id.slice(0, 8).toUpperCase()}`,
    reason,
    refundStatus: refunded ? 'refunded' : 'not_applicable',
  })
}

function toPaise(total: Prisma.Decimal): number {
  return Math.round(Number(total) * 100)
}

function message(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

/**
 * Cancels an unpaid order outright, or a Razorpay-paid one after a successful full refund.
 * Paid COD/manual-UPI orders are rejected here and must go through submitRefundProof.
 */
export async function cancelOrder(tenantId: string, orderId: string, reason: string): Promise<CancellationResult> {
  const order = await loadOrder(tenantId, orderId)
  if (!order) return { error: 'Order not found.' }
  if (!isCancellable(order.status)) {
    return { error: `An order that is already ${order.status} can no longer be cancelled.` }
  }

  const route = refundRouteFor(order)
  if (route === 'manual') {
    return { error: 'This order was paid outside Razorpay — upload the refund screenshot to cancel it.' }
  }

  if (route === 'razorpay') {
    if (!order.paymentId) return { error: 'This order has no Razorpay payment to refund.' }
    try {
      // Before any write: a refund that fails must leave the order exactly as it was.
      await refundRazorpayPayment(order.paymentId, toPaise(order.total))
    } catch (err) {
      return { error: message(err, 'The Razorpay refund failed — the order was not cancelled.') }
    }
  }

  const refunded = route === 'razorpay'
  try {
    await finalizeCancellation(tenantId, orderId, {
      status: 'cancelled',
      cancelReason: reason,
      ...(refunded ? { paymentStatus: 'refunded' as PaymentStatus } : {}),
    })
  } catch (err) {
    return { error: message(err, 'Could not cancel this order.') }
  }

  await notifyCustomer(order, reason, refunded)
  return {}
}

/**
 * Step A of the manual refund: staff transfers the money by UPI out-of-band and files the
 * screenshot here. Deliberately changes neither status nor paymentStatus — the order stays
 * live until someone verifies the proof.
 */
export async function submitRefundProof(
  tenantId: string,
  orderId: string,
  reason: string,
  proofUrl: string
): Promise<CancellationResult> {
  const order = await loadOrder(tenantId, orderId)
  if (!order) return { error: 'Order not found.' }
  if (!isCancellable(order.status)) {
    return { error: `An order that is already ${order.status} can no longer be cancelled.` }
  }
  if (refundRouteFor(order) !== 'manual') {
    return { error: 'This order does not need a manual refund.' }
  }

  await withTenant(tenantId, (db) =>
    db.order.update({ where: { id: orderId, tenantId }, data: { refundProofUrl: proofUrl, cancelReason: reason } })
  )
  return {}
}

/**
 * Step B of the manual refund. Can be the same staffer who uploaded the screenshot — the
 * proof plus the recorded verifier identity is the audit trail, not a maker-checker split.
 */
export async function confirmRefundVerification(
  tenantId: string,
  orderId: string,
  verifier: { email: string; role: AdminStaffRole }
): Promise<CancellationResult> {
  if (!canVerifyRefund(verifier.role)) {
    return { error: 'Only an owner or support agent can confirm a manual refund.' }
  }

  const order = await loadOrder(tenantId, orderId)
  if (!order) return { error: 'Order not found.' }
  if (!order.refundProofUrl) {
    return { error: 'Upload the refund screenshot before confirming this refund.' }
  }
  if (order.refundVerifiedAt) return { error: 'This refund has already been verified.' }
  if (!isCancellable(order.status)) {
    return { error: `An order that is already ${order.status} can no longer be cancelled.` }
  }

  const reason = order.cancelReason ?? 'Cancelled by Talam support'
  try {
    await finalizeCancellation(tenantId, orderId, {
      status: 'cancelled',
      paymentStatus: 'refunded',
      cancelReason: reason,
      refundVerifiedBy: verifier.email,
      refundVerifiedAt: new Date(),
    })
  } catch (err) {
    return { error: message(err, 'Could not cancel this order.') }
  }

  await notifyCustomer(order, reason, true)
  return {}
}
