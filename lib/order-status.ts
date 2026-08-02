import type { OrderStatus } from '@prisma/client'

/**
 * Display rules for the six real OrderStatus values. The storefront mock used to invent
 * "Out for Delivery" and "Return Pickup", which nothing in the schema can ever produce —
 * these are the states an order can actually be in.
 */

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
}

export const ORDER_STATUS_BADGE: Record<OrderStatus, string> = {
  pending: 'bg-amber/10 text-amber border-amber/30',
  confirmed: 'bg-blue-50 text-blue-600 border-blue-200',
  shipped: 'bg-blue-50 text-blue-600 border-blue-200',
  delivered: 'bg-success/10 text-success border-success/30',
  cancelled: 'bg-danger/10 text-danger border-danger/30',
  returned: 'bg-purple-50 text-purple-600 border-purple-200',
}

export const ORDER_STATUS_DOT: Record<OrderStatus, string> = {
  pending: 'bg-amber',
  confirmed: 'bg-blue-500',
  shipped: 'bg-blue-500',
  delivered: 'bg-success',
  cancelled: 'bg-danger',
  returned: 'bg-purple-500',
}

/** Left accent on the mobile cards. */
export const ORDER_STATUS_BORDER: Record<OrderStatus, string> = {
  pending: 'border-l-amber',
  confirmed: 'border-l-blue-500',
  shipped: 'border-l-blue-500',
  delivered: 'border-l-success',
  cancelled: 'border-l-danger',
  returned: 'border-l-purple-500',
}

export const ORDER_TABS = ['All', 'Active', 'Delivered', 'Cancelled', 'Returns'] as const
export type OrderTab = (typeof ORDER_TABS)[number]

const TAB_STATUSES: Record<Exclude<OrderTab, 'All'>, OrderStatus[]> = {
  Active: ['pending', 'confirmed', 'shipped'],
  Delivered: ['delivered'],
  Cancelled: ['cancelled'],
  Returns: ['returned'],
}

export function matchesTab(status: OrderStatus, tab: OrderTab): boolean {
  return tab === 'All' || TAB_STATUSES[tab].includes(status)
}

/** Timeline steps shown on the order detail page, and how far along the order is. */
const HAPPY_PATH: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered']

export function timelineFor(status: OrderStatus): { steps: OrderStatus[]; currentIndex: number } {
  if (status === 'cancelled') return { steps: ['pending', 'cancelled'], currentIndex: 1 }
  if (status === 'returned') return { steps: ['delivered', 'returned'], currentIndex: 1 }
  return { steps: HAPPY_PATH, currentIndex: HAPPY_PATH.indexOf(status) }
}
