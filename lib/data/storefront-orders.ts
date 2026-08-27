import { withTenant } from '@/lib/prisma'
import type { OrderStatus, PaymentStatus } from '@prisma/client'
import type { AdminOrderAddress } from '@/lib/data/orders'

export type { OrderStatus }

export type CustomerOrderItem = {
  id: string
  productId: string
  productName: string
  slug: string
  image: string | null
  size: string | null
  quantity: number
  unitPrice: number
}

export type CustomerOrder = {
  id: string
  code: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentProvider: string | null
  itemsTotal: number
  discount: number
  shippingFee: number
  discountCode: string | null
  total: number
  trackingId: string | null
  createdAt: Date
  disputeFlaggedAt: Date | null
  estimatedDeliveryDays: number | null
  address: AdminOrderAddress
  items: CustomerOrderItem[]
  statusEvents: { status: OrderStatus; changedAt: Date }[]
}

/** Same `#XXXXXXXX` short code the admin list shows, so both sides name an order identically. */
export function orderCode(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`
}

const ORDER_INCLUDE = {
  items: {
    select: {
      id: true,
      productId: true,
      productName: true,
      size: true,
      quantity: true,
      unitPrice: true,
      product: { select: { slug: true, images: true } },
    },
  },
  statusEvents: {
    select: { status: true, changedAt: true },
    orderBy: { changedAt: 'asc' as const },
  },
} as const

type OrderRow = {
  id: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentProvider: string | null
  itemsTotal: unknown
  discount: unknown
  shippingFee: unknown
  discountCode: string | null
  total: unknown
  trackingId: string | null
  createdAt: Date
  disputeFlaggedAt: Date | null
  estimatedDeliveryDays: number | null
  shippingAddress: unknown
  items: {
    id: string
    productId: string
    productName: string
    size: string | null
    quantity: number
    unitPrice: unknown
    product: { slug: string; images: string[] } | null
  }[]
  statusEvents: { status: OrderStatus; changedAt: Date }[]
}

function toCustomerOrder(order: OrderRow): CustomerOrder {
  return {
    id: order.id,
    code: orderCode(order.id),
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentProvider: order.paymentProvider,
    itemsTotal: Number(order.itemsTotal),
    discount: Number(order.discount),
    shippingFee: Number(order.shippingFee),
    discountCode: order.discountCode,
    total: Number(order.total),
    trackingId: order.trackingId,
    createdAt: order.createdAt,
    disputeFlaggedAt: order.disputeFlaggedAt,
    estimatedDeliveryDays: order.estimatedDeliveryDays,
    address: (order.shippingAddress ?? {}) as AdminOrderAddress,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      // productName is denormalised on OrderItem so a renamed or deleted product
      // never rewrites order history — prefer it over product.name.
      productName: item.productName,
      slug: item.product?.slug ?? '',
      image: item.product?.images[0] ?? null,
      size: item.size,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
    })),
    statusEvents: order.statusEvents,
  }
}

export async function listCustomerOrders(tenantId: string, customerId: string): Promise<CustomerOrder[]> {
  const orders = await withTenant(tenantId, (db) =>
    db.order.findMany({
      where: { tenantId, customerId },
      orderBy: { createdAt: 'desc' },
      include: ORDER_INCLUDE,
    })
  )
  return (orders as unknown as OrderRow[]).map(toCustomerOrder)
}

/** Scoped by customerId as well as tenantId — a guessed order id must not leak someone else's order. */
export async function getCustomerOrder(
  tenantId: string,
  customerId: string,
  orderId: string
): Promise<CustomerOrder | null> {
  const order = await withTenant(tenantId, (db) =>
    db.order.findFirst({
      where: { id: orderId, tenantId, customerId },
      include: ORDER_INCLUDE,
    })
  )
  return order ? toCustomerOrder(order as unknown as OrderRow) : null
}
