import { headers } from 'next/headers'
import { withTenant } from '@/lib/prisma'
import type { OrderStatus, PaymentStatus } from '@prisma/client'
import { isValidTransition } from '@/lib/order-status'
import { orderCode } from '@/lib/data/storefront-orders'
import { getStoreUrl, isLocalDevHost } from '@/lib/tenant-url'
import {
  sendOrderCancelledEmail,
  sendOrderDeliveredEmail,
  sendOrderReturnedEmail,
  sendOrderShippedEmail,
} from '@/lib/resend'

export type { OrderStatus }

export type AdminOrderAddress = {
  name?: string
  line1?: string
  line2?: string
  city?: string
  state?: string
  pincode?: string
  phone?: string
}

export type AdminOrder = {
  id: string
  code: string
  customerId: string
  customerName: string
  email: string | null
  phone: string | null
  itemsSummary: string
  itemCount: number
  total: number
  status: OrderStatus
  paymentProvider: string | null
  paymentStatus: PaymentStatus
  paymentId: string | null
  paymentProofUrl: string | null
  trackingId: string | null
  cancelReason: string | null
  createdAt: Date
  address: AdminOrderAddress
  statusEvents: { status: OrderStatus; changedAt: Date }[]
}

function summarizeItems(items: { productName: string; size: string | null; quantity: number }[]) {
  const count = items.reduce((sum, i) => sum + i.quantity, 0)
  const first = items[0]
  if (!first) return { summary: 'No items', count: 0 }
  const label = `${first.productName}${first.size ? ` (${first.size})` : ''}`
  const summary = items.length > 1 ? `${label} + ${items.length - 1} more · ${count} items` : `${label} · ${count} item${count === 1 ? '' : 's'}`
  return { summary, count }
}

export async function listOrdersForAdmin(tenantId: string): Promise<AdminOrder[]> {
  const orders = await withTenant(tenantId, (db) =>
    db.order.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, email: true, phone: true } },
        items: { select: { productName: true, size: true, quantity: true } },
        statusEvents: { select: { status: true, changedAt: true }, orderBy: { changedAt: 'asc' } },
      },
    })
  )

  return orders.map((order) => {
    const { summary, count } = summarizeItems(order.items)
    return {
      id: order.id,
      code: orderCode(order.id),
      customerId: order.customerId,
      customerName: order.customer.name ?? 'Guest',
      email: order.customer.email,
      phone: order.customer.phone,
      itemsSummary: summary,
      itemCount: count,
      total: Number(order.total),
      status: order.status,
      paymentProvider: order.paymentProvider,
      paymentStatus: order.paymentStatus,
      paymentId: order.paymentId,
      paymentProofUrl: order.paymentProofUrl,
      trackingId: order.trackingId,
      cancelReason: order.cancelReason,
      createdAt: order.createdAt,
      address: (order.shippingAddress ?? {}) as AdminOrderAddress,
      statusEvents: order.statusEvents,
    }
  })
}

const STATUS_NOTIFIES_CUSTOMER: OrderStatus[] = ['shipped', 'delivered', 'cancelled', 'returned']

export async function updateOrderStatus(
  tenantId: string,
  orderId: string,
  status: OrderStatus,
  trackingId?: string,
  cancelReason?: string
): Promise<void> {
  await withTenant(tenantId, async (db) => {
    const current = await db.order.findFirst({ where: { id: orderId, tenantId }, select: { status: true } })
    if (!current) throw new Error('Order not found.')
    if (!isValidTransition(current.status, status)) {
      throw new Error(`Cannot move an order from "${current.status}" to "${status}".`)
    }
    await db.order.update({
      where: { id: orderId, tenantId },
      data: {
        status,
        ...(trackingId ? { trackingId } : {}),
        ...(status === 'cancelled' && cancelReason ? { cancelReason } : {}),
      },
    })
    await db.orderStatusEvent.create({ data: { tenantId, orderId, status } })
  })

  // Must run after the transaction above has committed — withTenant holds a real DB
  // transaction open for its callback, and a network call (email send) has no business
  // sitting inside that window.
  if (STATUS_NOTIFIES_CUSTOMER.includes(status)) {
    await notifyCustomerOfStatus(tenantId, orderId, status, trackingId, cancelReason)
  }
}

async function notifyCustomerOfStatus(
  tenantId: string,
  orderId: string,
  status: OrderStatus,
  trackingId?: string,
  cancelReason?: string
): Promise<void> {
  const order = await withTenant(tenantId, (db) =>
    db.order.findFirst({
      where: { id: orderId, tenantId },
      include: { customer: { select: { email: true } }, tenant: { select: { name: true, slug: true } } },
    })
  )
  if (!order?.customer?.email) return

  const host = (await headers()).get('host')
  const isLocalDev = isLocalDevHost(host)
  const origin = isLocalDev ? `http://${host ?? 'localhost:3000'}` : ''
  const storeUrl = `${origin}${getStoreUrl(order.tenant.slug, isLocalDev)}`
  const trackUrl = `${storeUrl}/orders/${orderId}`
  const code = orderCode(orderId)
  const to = order.customer.email

  switch (status) {
    case 'shipped':
      if (trackingId) await sendOrderShippedEmail(to, { storeName: order.tenant.name, orderCode: code, trackingId, trackUrl })
      return
    case 'delivered':
      await sendOrderDeliveredEmail(to, { storeName: order.tenant.name, orderCode: code, trackUrl })
      return
    case 'cancelled':
      await sendOrderCancelledEmail(to, { storeName: order.tenant.name, orderCode: code, cancelReason, storeUrl })
      return
    case 'returned':
      await sendOrderReturnedEmail(to, { storeName: order.tenant.name, orderCode: code, storeUrl })
      return
  }
}
