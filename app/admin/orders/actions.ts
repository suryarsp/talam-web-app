'use server'

import { revalidatePath } from 'next/cache'
import type { OrderStatus } from '@prisma/client'
import { requireOwnerTenant } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import { listOrdersForAdmin, updateOrderStatus, type AdminOrder, type AdminOrderAddress } from '@/lib/data/orders'
import { createShiprocketShipment } from '@/lib/shipping/shiprocket'
import { getShippingConfig } from '@/lib/shipping/shiprocket-account'

export async function getOrdersAction(): Promise<AdminOrder[]> {
  const { tenantId } = await requireOwnerTenant()
  return listOrdersForAdmin(tenantId)
}

export async function updateOrderStatusAction(
  orderId: string,
  status: OrderStatus,
  trackingId?: string,
  cancelReason?: string
): Promise<{ error?: string }> {
  const { tenantId } = await requireOwnerTenant()
  try {
    await updateOrderStatus(tenantId, orderId, status, trackingId, cancelReason)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not update this order.' }
  }
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

/**
 * Pushes a confirmed order to Shiprocket, gets back a real AWB, and moves the order to
 * "shipped" with that AWB as trackingId — the auto-fill alternative to the manual
 * tracking-number entry in updateOrderStatusAction.
 */
export async function shipViaShiprocketAction(orderId: string): Promise<{ error?: string; trackingId?: string }> {
  const { tenantId } = await requireOwnerTenant()

  // Checked before the order is even loaded: a store with no Shiprocket account of its own
  // gets the one error it can act on, rather than an address complaint it can't fix yet.
  const shipping = await getShippingConfig(tenantId)
  if (shipping.mode !== 'connected') {
    return { error: 'Connect your own Shiprocket account in Settings → Shipping before shipping orders.' }
  }

  const order = await withTenant(tenantId, (db) =>
    db.order.findFirst({
      where: { id: orderId, tenantId },
      include: {
        items: { select: { productId: true, productName: true, quantity: true, unitPrice: true } },
        customer: { select: { email: true } },
      },
    })
  )
  if (!order) return { error: 'Order not found.' }
  if (order.status !== 'confirmed') return { error: 'Only confirmed orders can be shipped.' }

  const address = (order.shippingAddress ?? {}) as AdminOrderAddress
  if (!address.name || !address.line1 || !address.city || !address.state || !address.pincode || !address.phone) {
    return { error: 'This order is missing a complete shipping address.' }
  }

  let shipment
  try {
    shipment = await createShiprocketShipment(tenantId, {
      orderId: order.id,
      orderDate: order.createdAt,
      paymentMethod: order.paymentProvider === 'cod' ? 'COD' : 'Prepaid',
      subTotal: Number(order.total),
      billing: {
        name: address.name,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        phone: address.phone,
        email: order.customer.email ?? undefined,
      },
      items: order.items.map((item) => ({
        name: item.productName,
        sku: item.productId,
        units: item.quantity,
        sellingPrice: Number(item.unitPrice),
      })),
    })
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not create the Shiprocket shipment.' }
  }

  await updateOrderStatus(tenantId, orderId, 'shipped', shipment.awbCode, undefined, {
    shiprocketOrderId: String(shipment.shiprocketOrderId),
    shipmentId: String(shipment.shipmentId),
    courierName: shipment.courierName,
  })
  revalidatePath('/admin/orders')
  revalidatePath('/admin/dashboard')
  return { trackingId: shipment.awbCode }
}
