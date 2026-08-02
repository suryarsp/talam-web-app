import type { DiscountType } from '@prisma/client'

/**
 * Pure pricing rules for checkout. Kept out of the server action so the arithmetic
 * that decides what a customer is charged can be tested without a database.
 *
 * Every number here is derived from DB rows — the client's cart only ever supplies
 * product ids, sizes and quantities.
 */

export type QuoteLine = {
  productId: string
  size: string | null
  quantity: number
  /** Current DB price. */
  unitPrice: number
  /** DB comparePrice, used only to show "you saved X" — never to charge. */
  compareAtPrice: number | null
}

export type Quote = {
  /** Sum at compare-price where one exists, so the savings line has something to subtract from. */
  subtotal: number
  itemsTotal: number
  productDiscount: number
  couponDiscount: number
  shippingFee: number
  total: number
}

export type CouponRow = {
  type: DiscountType
  value: number
  minOrder: number | null
  usesLimit: number | null
  usesCount: number
  expiresAt: Date | null
  isActive: boolean
}

export function computeQuote(params: {
  lines: QuoteLine[]
  shippingFee: number
  freeDeliveryAbove: number | null
  coupon: CouponRow | null
}): Quote {
  const itemsTotal = params.lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0)
  const subtotal = params.lines.reduce(
    (sum, l) => sum + (l.compareAtPrice && l.compareAtPrice > l.unitPrice ? l.compareAtPrice : l.unitPrice) * l.quantity,
    0
  )

  const couponDiscount = params.coupon ? Math.min(couponAmount(params.coupon, itemsTotal), itemsTotal) : 0
  const payable = itemsTotal - couponDiscount

  // Free-delivery threshold is checked against what the customer actually pays,
  // so a coupon that drops them under the threshold reinstates the shipping fee.
  const shippingFee =
    params.freeDeliveryAbove !== null && params.freeDeliveryAbove > 0 && payable >= params.freeDeliveryAbove
      ? 0
      : params.shippingFee

  return {
    subtotal,
    itemsTotal,
    productDiscount: subtotal - itemsTotal,
    couponDiscount,
    shippingFee,
    total: payable + shippingFee,
  }
}

function couponAmount(coupon: CouponRow, itemsTotal: number): number {
  const raw = coupon.type === 'percent' ? (itemsTotal * coupon.value) / 100 : coupon.value
  // Whole rupees: Indian retail doesn't discount in paise, and it keeps every total an
  // integer so the plain toLocaleString('en-IN') used across the UI stays correct.
  return Math.round(raw)
}

export type CouponRejection = 'not_found' | 'inactive' | 'expired' | 'exhausted' | 'below_min_order'

export const COUPON_ERROR_MESSAGE: Record<CouponRejection, string> = {
  not_found: 'That coupon code is not valid.',
  inactive: 'That coupon is no longer active.',
  expired: 'That coupon has expired.',
  exhausted: 'That coupon has reached its usage limit.',
  below_min_order: 'Your order does not meet this coupon’s minimum value.',
}

/** Returns null when the coupon is usable, otherwise why it was rejected. */
export function checkCoupon(coupon: CouponRow, itemsTotal: number, now = new Date()): CouponRejection | null {
  if (!coupon.isActive) return 'inactive'
  if (coupon.expiresAt && coupon.expiresAt <= now) return 'expired'
  if (coupon.usesLimit !== null && coupon.usesCount >= coupon.usesLimit) return 'exhausted'
  if (coupon.minOrder !== null && itemsTotal < coupon.minOrder) return 'below_min_order'
  return null
}

/**
 * stockBySize is a JSON blob keyed by size label. A sizeless product still has one
 * bucket under whatever label the owner used (onboarding writes 'Free Size'), and
 * add-to-cart only omits `size` when the product has no sizes — so a null size
 * resolves to that single bucket rather than to a missing key.
 */
function stockKey(map: Record<string, number>, size: string | null): string | null {
  if (size !== null) return size
  const keys = Object.keys(map)
  return keys.length === 1 ? keys[0] : null
}

function asMap(stockBySize: unknown): Record<string, number> {
  return (stockBySize ?? {}) as Record<string, number>
}

export function stockFor(stockBySize: unknown, size: string | null): number {
  const map = asMap(stockBySize)
  const key = stockKey(map, size)
  if (key === null) return Object.values(map).reduce((sum, qty) => sum + (typeof qty === 'number' ? qty : 0), 0)
  return typeof map[key] === 'number' ? map[key] : 0
}

export function decrementStock(stockBySize: unknown, size: string | null, quantity: number): Record<string, number> {
  const map = { ...asMap(stockBySize) }
  const key = stockKey(map, size)
  if (key === null) return map
  map[key] = (typeof map[key] === 'number' ? map[key] : 0) - quantity
  return map
}
