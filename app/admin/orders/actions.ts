'use server'

import { revalidatePath } from 'next/cache'
import type { OrderStatus } from '@prisma/client'
import { requireOwnerTenant } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import { listOrdersForAdmin, updateOrderStatus, type AdminOrder } from '@/lib/data/orders'

export async function getOrdersAction(): Promise<AdminOrder[]> {
  const { tenantId } = await requireOwnerTenant()
  return listOrdersForAdmin(tenantId)
}

export async function updateOrderStatusAction(orderId: string, status: OrderStatus, trackingId?: string): Promise<{ error?: string }> {
  const { tenantId } = await requireOwnerTenant()
  await updateOrderStatus(tenantId, orderId, status, trackingId)
  revalidatePath('/admin/orders')
  revalidatePath('/admin/dashboard')
  return {}
}

/**
 * Manually confirms payment for orders that can't be verified any other way (UPI's UTR is
 * self-reported, COD is collected offline). Razorpay orders are confirmed by webhook only —
 * this must never let an owner short-circuit that flow.
 */
export async function markOrderPaidAction(orderId: string): Promise<{ error?: string }> {
  const { tenantId } = await requireOwnerTenant()

  const order = await withTenant(tenantId, (db) =>
    db.order.findFirst({ where: { id: orderId, tenantId }, select: { paymentProvider: true, paymentStatus: true } })
  )
  if (!order) return { error: 'Order not found.' }
  if (order.paymentProvider !== 'upi_manual' && order.paymentProvider !== 'cod') {
    return { error: 'Only UPI or Pay-on-Delivery orders can be marked paid manually.' }
  }
  if (order.paymentStatus !== 'pending') {
    return { error: 'This order is not awaiting payment.' }
  }

  await withTenant(tenantId, (db) => db.order.update({ where: { id: orderId }, data: { paymentStatus: 'paid' } }))
  revalidatePath('/admin/orders')
  return {}
}
